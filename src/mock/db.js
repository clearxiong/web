// Mock 数据源：模拟 ESP32 本地数据快照。
// 所有页面只通过 api.js 取数，接入真实固件时替换 api.js 即可。

const CHANNEL_COUNT = 16
const MODULE_COUNT = 4
const QUEUE_CAPACITY = 64

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20261124)
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min
const pick = (list) => list[Math.floor(rand() * list.length)]
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

const START = Date.now()
const DAY = 24 * 60 * 60 * 1000
const pad = (n) => String(n).padStart(2, '0')

function iso(ms) {
  return new Date(ms).toISOString()
}

function formatDate(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateTime(ms) {
  const d = new Date(ms)
  return `${formatDate(ms)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const EVENT_TYPES = {
  HALL_TRIGGER: { key: 'HALL_TRIGGER', label: '阈值触发事件', short: '阈值触发' },
  OPTICAL_CHANGE: { key: 'OPTICAL_CHANGE', label: '光敏状态变化', short: '光敏变化' },
  COMM_ERROR: { key: 'COMM_ERROR', label: '通信异常', short: '通信异常' },
  MODULE_OFFLINE: { key: 'MODULE_OFFLINE', label: '模块离线', short: '模块离线' },
  QUEUE_OVERFLOW: { key: 'QUEUE_OVERFLOW', label: '队列溢出', short: '队列溢出' }
}

export const EVENT_LEVELS = {
  1: { label: '一般', tone: 'muted' },
  2: { label: '重要', tone: 'warn' },
  3: { label: '严重', tone: 'danger' }
}

export const CHANNEL_STATUS = {
  NORMAL: { key: 'NORMAL', label: '正常', tone: 'ok' },
  ALARM: { key: 'ALARM', label: '事件触发', tone: 'warn' },
  FAIL: { key: 'FAIL', label: '状态异常', tone: 'danger' },
  OFFLINE: { key: 'OFFLINE', label: '监测失效', tone: 'muted' },
  UNKNOWN: { key: 'UNKNOWN', label: '未知', tone: 'info' }
}

export const OPTICAL_STATE = {
  NORMAL: { label: '正常', tone: 'ok' },
  ABNORMAL: { label: '异常', tone: 'danger' },
  UNKNOWN: { label: '未知', tone: 'muted' }
}

const HALL_LABEL = ['未触发', '已触发']

const MODULE_META = [
  { module_id: 1, address: '0x20', firmware: '1.4.2' },
  { module_id: 2, address: '0x21', firmware: '1.4.2' },
  { module_id: 3, address: '0x22', firmware: '1.4.1' },
  { module_id: 4, address: '0x23', firmware: '1.4.2' }
]

// 防雷模块（可更换的 SPD 单元）：寿命、雷击计数、告警阈值、安装位置都在模块级
const MODULE_BASE = [
  { life_percent: 86, location: 'A 区弱电井 · 1F', reset_mode: 'Accumulate' },
  { life_percent: 94, location: 'B 区机柜 · 1F', reset_mode: 'Accumulate' },
  { life_percent: 72, location: 'C 区室外立杆 · 东侧', reset_mode: 'Reset' },
  { life_percent: 91, location: 'D 区监控机房', reset_mode: 'Accumulate' }
]


// 每个 STM32 模块的 4 个接口通道：霍尔 GPIO / 光敏采集 / 事件锁存 / I2C 从机
const INTERFACE_SLOTS = [
  {
    slot: 1,
    kind: 'HALL',
    name: '霍尔比较器',
    desc: '霍尔比较器 GPIO，外部中断捕获浪涌阈值触发'
  },
  {
    slot: 2,
    kind: 'OPTICAL',
    name: '光敏采集',
    desc: '周期性读取光敏检测状态，识别器件劣化'
  },
  {
    slot: 3,
    kind: 'LATCH',
    name: '事件锁存',
    desc: 'STM32 锁存事件序号与时间，等待 ESP32 读取'
  },
  {
    slot: 4,
    kind: 'I2C',
    name: 'I2C 从机',
    desc: '与 ESP32 主机的 I²C 从机通信通道'
  }
]

const SLOT_OF_TYPE = {
  HALL_TRIGGER: 1,
  OPTICAL_CHANGE: 2,
  QUEUE_OVERFLOW: 3,
  MODULE_OFFLINE: 4,
  COMM_ERROR: 4
}

// 每个接口通道的基准事件计数（模拟长期累计值），顺序：M1~M4 × 4 个接口
const BASE_COUNTS = [
  1280, 12, 61, 8,
  1120, 24, 55, 37,
  1105, 15, 48, 12,
  1005, 9, 37, 6
]
const state = {
  bootId: 47,
  bootedAt: START - (6 * DAY + 4 * 60 * 60 * 1000 + 23 * 60 * 1000),
  tempC: 38.4,
  totalTx: 0,
  events: [],
  nextEventId: 1,
  syslog: [],
  nextLogId: 1,
  channels: [],
  modules: [],
  config: null,
  eventsGenerated: false
}

// ---------------- 通道与模块 ----------------
function buildChannels() {
  const list = []
  for (let i = 1; i <= CHANNEL_COUNT; i++) {
    const moduleId = Math.ceil(i / 4)
    const slot = INTERFACE_SLOTS[(i - 1) % 4]
    let optical = 'NORMAL'
    let forced = ''
    let fault = 0
    if (i === 6) {
      // 模块 2 的光敏采集通道反馈异常
      optical = 'ABNORMAL'
      forced = 'FAIL'
      fault = 0x0310
    } else if (i === 9) {
      // 模块 3 的霍尔输入状态暂不可确认
      forced = 'UNKNOWN'
      fault = 0x0500
    }
    list.push({
      channel_id: i,
      name: `CH${pad(i)}`,
      module_id: moduleId,
      module_address: MODULE_META[moduleId - 1].address,
      slot: slot.slot,
      kind: slot.kind,
      kind_name: slot.name,
      kind_desc: slot.desc,
      hall_state: 0,
      optical_state: optical,
      communication_state: 'ONLINE',
      forced_status: forced,
      fault_code: fault,
      event_count: BASE_COUNTS[i - 1],
      last_event_time: null,
      last_event_at: 0,
      alarm_until: 0
    })
  }
  return list
}

function buildModules() {
  return MODULE_META.map((meta, idx) => {
    const channelIds = [idx * 4 + 1, idx * 4 + 2, idx * 4 + 3, idx * 4 + 4]
    const base = MODULE_BASE[idx]
    return {
      ...meta,
      ...base,
      alarm_threshold: 80,
      online: true,
      heartbeat_counter: randInt(180000, 420000),
      communication_error_count: idx === 2 ? 37 : randInt(0, 9),
      crc_error_count: idx === 2 ? 12 : randInt(0, 3),
      restart_count: idx === 1 ? 2 : randInt(0, 1),
      pending_event_count: randInt(0, 3),
      queue_capacity: QUEUE_CAPACITY,
      event_overflow_count: idx === 1 ? 1 : 0,
      last_communication_time: iso(START - randInt(1, 4) * 1000),
      channel_ids: channelIds
    }
  })
}

// ---------------- 事件 ----------------
function makeEvent(ms, channelId, type, level) {
  const channel = state.channels[channelId - 1]
  const hallState = type === 'HALL_TRIGGER' ? 1 : 0
  const opticalState =
    type === 'OPTICAL_CHANGE'
      ? rand() > 0.5
        ? 'ABNORMAL'
        : 'NORMAL'
      : channel.optical_state
  const id = state.nextEventId++
  return {
    event_id: id,
    event_id_text: pad(id).padStart(6, '0'),
    boot_id: state.bootId,
    event_counter: channel.event_count + 1,
    module_id: channel.module_id,
    channel_id: channelId,
    channel_name: channel.name,
    event_type: type,
    event_level: level,
    device_timestamp: iso(ms),
    timestamp_ms: ms,
    time_quality: 'TIME_VALID',
    module_tick: randInt(120000, 990000),
    hall_state: hallState,
    optical_state: opticalState,
    event_flags: type === 'QUEUE_OVERFLOW' ? '0x0081' : type === 'COMM_ERROR' ? '0x0040' : '0x0001',
    acknowledged: rand() > 0.12,
    uploaded: rand() > 0.3
  }
}

function seedEvents() {
  const moduleWeights = state.modules.map(
    (m) => state.channels.filter((c) => c.module_id === m.module_id).reduce((sum, c) => sum + c.event_count, 0) + 40
  )
  const totalWeight = moduleWeights.reduce((a, b) => a + b, 0)
  const modulePick = () => {
    let r = rand() * totalWeight
    for (let i = 0; i < moduleWeights.length; i++) {
      r -= moduleWeights[i]
      if (r <= 0) return i + 1
    }
    return 1
  }

  const list = []
  const TOTAL = 306
  for (let i = 0; i < TOTAL; i++) {
    const r = rand()
    let type = 'HALL_TRIGGER'
    if (r > 0.97) type = 'QUEUE_OVERFLOW'
    else if (r > 0.94) type = 'MODULE_OFFLINE'
    else if (r > 0.86) type = 'COMM_ERROR'
    else if (r > 0.78) type = 'OPTICAL_CHANGE'

    let level = 1
    if (type === 'QUEUE_OVERFLOW') level = 3
    else if (type === 'MODULE_OFFLINE') level = 3
    else if (type === 'COMM_ERROR') level = 2
    else if (type === 'OPTICAL_CHANGE') level = 2
    else if (rand() > 0.78) level = 2

    // 事件按类型落到对应的接口通道：霍尔 1 / 光敏 2 / 锁存 3 / I2C 4
    const channelId = (modulePick() - 1) * 4 + (SLOT_OF_TYPE[type] || 1)
    const ms = START - Math.floor(rand() * 30 * DAY) - randInt(0, 3600 * 1000)
    list.push(makeEvent(ms, channelId, type, level))
  }

  list.sort((a, b) => a.timestamp_ms - b.timestamp_ms)
  list.forEach((e) => {
    const ch = state.channels[e.channel_id - 1]
    ch.event_count = Math.max(ch.event_count, e.event_counter)
    if (e.timestamp_ms > ch.last_event_at) {
      ch.last_event_at = e.timestamp_ms
      ch.last_event_time = e.device_timestamp
    }
  })
  state.events = list
}

// ---------------- 系统日志 ----------------
const LOG_TEMPLATES = [
  { level: 'INFO', source: 'system', message: '系统启动完成，进入正常监测状态' },
  { level: 'INFO', source: 'i2c', message: 'I²C 总线扫描完成，发现 4 个采集模块' },
  { level: 'WARN', source: 'i2c', message: '模块 3（0x22）CRC 校验失败，已触发重传' },
  { level: 'INFO', source: 'event', message: '事件队列巡检完成，无积压' },
  { level: 'WARN', source: 'optical', message: '通道 CH06 光敏反馈异常，状态置为故障' },
  { level: 'INFO', source: 'storage', message: '事件日志追加写入成功（4 条）' },
  { level: 'ERROR', source: 'storage', message: '统计文件校验失败，已从事件日志重建' },
  { level: 'INFO', source: 'upload', message: 'HTTP 上报连接正常，批次确认成功' },
  { level: 'WARN', source: 'upload', message: '上报对端响应超时，已加入重试队列' },
  { level: 'INFO', source: 'network', message: 'DHCP 租约续期成功' },
  { level: 'WARN', source: 'event', message: '模块 2 事件队列剩余空间低于 20%' },
  { level: 'INFO', source: 'system', message: 'NTP 时间同步完成，时间可信度为 TIME_VALID' },
  { level: 'ERROR', source: 'i2c', message: '模块 3 连续 5 次无响应，判定为离线 4.2 秒' },
  { level: 'INFO', source: 'system', message: '模块 3 恢复上线，补读未确认事件 2 条' },
  { level: 'INFO', source: 'diagnostics', message: '设备自检完成，未发现硬件故障' }
]
const SOURCE_LABEL = {
  system: '系统',
  i2c: 'I²C',
  event: '事件',
  optical: '光敏',
  storage: '存储',
  upload: '上报',
  network: '网络',
  diagnostics: '自检',
  module: '模块'
}

function seedSyslog() {
  const list = []
  const COUNT = 36
  for (let i = 0; i < COUNT; i++) {
    const tpl = LOG_TEMPLATES[Math.floor(rand() * LOG_TEMPLATES.length)]
    const ms = START - randInt(0, 7 * DAY)
    list.push({
      log_id: state.nextLogId++,
      level: tpl.level,
      source: tpl.source,
      source_label: SOURCE_LABEL[tpl.source],
      message: tpl.message,
      timestamp_ms: ms,
      time: formatDateTime(ms)
    })
  }
  list.sort((a, b) => b.timestamp_ms - a.timestamp_ms)
  state.syslog = list
}

// ---------------- 配置 ----------------
function seedConfig() {
  const nowMs = Date.now()
  state.config = {
    system: {
      name: '16CH-SPD-001',
      description: '16 Channel IP PoE Surge Protector',
      model: 'Procet SD-504/524 系列 · 16 通道版本',
      serial: 'PROCET-SD16-2026-0001',
      mac: 'A4:CF:12:8D:6E:20',
      location: 'A 区弱电井 · 1F',
      contact: '运维一组 · 王工'
    },
    time: {
      mode: 'NTP',
      ntp_server: 'ntp.aliyun.com',
      timezone: 'UTC+08:00 中国标准时间',
      manual_time: formatDateTime(nowMs),
      quality: 'TIME_VALID',
      last_sync: formatDateTime(nowMs - 26 * 60 * 1000)
    },
    network: {
      dhcp: true,
      ip: '192.168.1.1',
      mask: '255.255.255.0',
      gateway: '192.168.1.254',
      dns: '223.5.5.5'
    },
    account: {
      username: 'admin',
      auto_logout: 300,
      last_login: formatDateTime(nowMs - 12 * 60 * 1000)
    },
    environment: {
      temp_unit: 'C'
    },
    upload: {
      protocol: 'HTTP',
      host: '10.20.0.15',
      port: 8080,
      interval_seconds: 30,
      enabled: true,
      secret: '••••••••',
      state: 'connected',
      last_success: formatDateTime(nowMs - 18 * 1000)
    }
  }
}

// ---------------- 初始化 ----------------
function ensureInit() {
  if (state.eventsGenerated) return
  state.channels = buildChannels()
  state.modules = buildModules()
  seedEvents()
  seedSyslog()
  seedConfig()
  state.eventsGenerated = true
}

ensureInit()

// ---------------- 派生数据 ----------------
function channelView(ch) {
  const mod = state.modules.find((m) => m.module_id === ch.module_id)
  const now = Date.now()
  let status = 'NORMAL'
  let stateLabel = '正常'

  if (!mod || !mod.online) {
    status = 'OFFLINE'
    stateLabel = '模块离线'
  } else if (ch.forced_status) {
    status = ch.forced_status
    stateLabel = status === 'FAIL' ? '异常' : '未知'
  } else if (ch.kind === 'HALL') {
    const triggered = ch.alarm_until > now
    status = triggered ? 'ALARM' : 'NORMAL'
    stateLabel = triggered ? '已触发' : '未触发'
  } else if (ch.kind === 'OPTICAL') {
    if (ch.optical_state === 'ABNORMAL') {
      status = 'FAIL'
      stateLabel = '异常'
    } else if (ch.optical_state === 'UNKNOWN') {
      status = 'UNKNOWN'
      stateLabel = '未知'
    }
  } else if (ch.kind === 'LATCH') {
    const pending = mod.pending_event_count || 0
    status = pending > 0 ? 'ALARM' : 'NORMAL'
    stateLabel = pending > 0 ? `锁存 ${pending} 条` : '空闲'
  } else {
    status = ch.communication_state === 'OFFLINE' ? 'OFFLINE' : 'NORMAL'
    stateLabel = status === 'NORMAL' ? '在线' : '通信异常'
  }

  const health =
    status === 'FAIL' || status === 'OFFLINE' ? 'fault' : status === 'UNKNOWN' ? 'unknown' : status === 'ALARM' ? 'attention' : 'good'

  const healthText =
    status === 'OFFLINE'
      ? '所属模块离线，该接口不可用'
      : status === 'FAIL'
        ? '光敏反馈异常，请检查光敏检测回路'
        : status === 'UNKNOWN'
          ? '输入状态暂不可确认，等待下一次采集'
          : status === 'ALARM'
            ? ch.kind === 'LATCH'
              ? '有事件已锁存，等待 ESP32 读取'
              : '刚捕获到阈值触发，模块仍在正常工作'
            : {
                HALL: '霍尔比较器输入正常，可捕获阈值触发',
                OPTICAL: '光敏检测状态正常',
                LATCH: '事件锁存空闲，无待读取事件',
                I2C: 'I2C 从机通信正常'
              }[ch.kind]

  return {
    ...ch,
    location: mod ? mod.location : '—',
    module_life_percent: mod ? mod.life_percent : 0,
    module_life_text: mod ? `模块 ${mod.module_id} 剩余寿命 ${mod.life_percent}%` : '—',
    status,
    status_label: CHANNEL_STATUS[status]?.label || status,
    state_label: stateLabel,
    hall_label: HALL_LABEL[ch.hall_state] || '未知',
    optical_label: OPTICAL_STATE[ch.optical_state]?.label || '未知',
    optical_tone: OPTICAL_STATE[ch.optical_state]?.tone || 'muted',
    health,
    health_text: healthText
  }
}

function moduleView(m) {
  const pending = Math.min(m.queue_capacity, m.pending_event_count)
  const hall = state.channels.find((c) => c.module_id === m.module_id && c.kind === 'HALL')
  const eventCount = hall ? hall.event_count : 0
  const status = !m.online ? 'OFFLINE' : m.life_percent < m.alarm_threshold ? 'ALARM' : 'NORMAL'
  const statusLabel = { NORMAL: '正常', ALARM: '寿命告警', OFFLINE: '离线' }[status] || status
  return {
    ...m,
    event_count: eventCount,
    status,
    status_label: statusLabel,
    life_remaining: m.life_percent,
    online_label: m.online ? '在线' : '离线',
    queue_used: pending,
    queue_free: m.queue_capacity - pending,
    last_comm_ago: Math.max(1, Math.round((Date.now() - new Date(m.last_communication_time).getTime()) / 1000))
  }
}

function deviceView() {
  const channels = state.channels.map(channelView)
  const onlineModules = state.modules.filter((m) => m.online).length
  const faultChannels = channels.filter((c) => ['FAIL', 'OFFLINE'].includes(c.status))
  const unknownChannels = channels.filter((c) => c.status === 'UNKNOWN')
  const lastEvent = state.events[state.events.length - 1]
  const uptime = Math.floor((Date.now() - state.bootedAt) / 1000)
  const totalEvents = state.channels
    .filter((c) => c.kind === 'HALL')
    .reduce((sum, c) => sum + c.event_count, 0)
  return {
    device: {
      ...state.config.system,
      firmware: 'v1.0.0',
      firmware_build: '2026-11-12',
      boot_id: state.bootId,
      uptime_seconds: uptime,
      uptime_text: formatUptime(uptime),
      system_time: formatDateTime(Date.now()),
      temperature_c: Number(state.tempC.toFixed(1)),
      temp_unit: state.config.environment.temp_unit,
      online_modules: onlineModules,
      total_modules: MODULE_COUNT,
      channel_count: CHANNEL_COUNT,
      total_event_count: totalEvents,
      fault_count: faultChannels.length + unknownChannels.length,
      last_event_time: lastEvent ? formatDateTime(lastEvent.timestamp_ms) : '—',
      last_event_ago: lastEvent ? ago(lastEvent.timestamp_ms) : '—',
      upload_state: state.config.upload.enabled ? state.config.upload.state : 'disabled',
      upload_protocol: state.config.upload.protocol,
      network_state: 'connected',
      storage_state: 'normal'
    },
    modules: state.modules.map(moduleView),
    channels
  }
}

function formatUptime(sec) {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return d > 0 ? `${d} 天 ${h} 小时 ${m} 分` : `${h} 小时 ${m} 分`
}

function ago(ms) {
  const diff = Math.max(0, Date.now() - ms)
  if (diff < 60 * 1000) return `${Math.max(1, Math.floor(diff / 1000))} 秒前`
  if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}

function statistics() {
  const channels = state.channels
  const daily = []
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(START - i * DAY)
    dayStart.setHours(0, 0, 0, 0)
    const key = formatDate(dayStart.getTime())
    const count = state.events.filter(
      (e) => e.event_type === 'HALL_TRIGGER' && formatDate(e.timestamp_ms) === key
    ).length
    daily.push({ date: key, label: key.slice(5), count })
  }

  const monthly = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    const base = 26 + Math.abs(Math.sin((d.getMonth() + 3) * 1.7)) * 90
    monthly.push({ month: key, label: `${d.getMonth() + 1}月`, count: Math.round(base + i * 3) })
  }
  monthly[monthly.length - 1].count = state.events.filter(
    (e) => formatDate(e.timestamp_ms).slice(0, 7) === formatDate(Date.now()).slice(0, 7)
  ).length

  const typeCount = {}
  Object.keys(EVENT_TYPES).forEach((k) => (typeCount[k] = 0))
  state.events.forEach((e) => (typeCount[e.event_type] = (typeCount[e.event_type] || 0) + 1))

  const moduleCounts = state.modules.map((m) => ({
    module_id: m.module_id,
    label: `模块 ${m.module_id}`,
    count: channels
      .filter((c) => c.module_id === m.module_id)
      .reduce((sum, c) => sum + c.event_count, 0)
  }))

  return {
    total_event_count: channels
      .filter((c) => c.kind === 'HALL')
      .reduce((sum, c) => sum + c.event_count, 0),
    channel_event_count: channels.map((c) => ({
      channel_id: c.channel_id,
      label: `${c.name} ${c.kind_name}`,
      count: c.event_count
    })),
    module_event_count: moduleCounts,
    daily_event_count: daily[daily.length - 1].count,
    monthly_event_count: monthly[monthly.length - 1].count,
    high_level_count: state.events.filter((e) => e.event_level >= 2).length,
    optical_fault_count: state.channels.filter((c) => c.optical_state === 'ABNORMAL').length,
    module_offline_count: state.syslog.filter((l) => l.message.includes('离线')).length,
    event_overflow_count: state.modules.reduce((s, m) => s + m.event_overflow_count, 0),
    daily,
    monthly,
    type_distribution: Object.entries(typeCount).map(([key, count]) => ({
      key,
      label: EVENT_TYPES[key].short,
      count
    })),
    health_summary: {
      good: state.modules.filter((m) => m.life_percent >= 90).length,
      attention: state.modules.filter((m) => m.life_percent < 90 && m.life_percent >= 80).length,
      warning: state.modules.filter((m) => m.life_percent < 80).length
    }
  }
}

function diagnostics() {
  const storage = [
    { name: '事件日志', used: 1568, total: 4096, unit: 'KB' },
    { name: '统计文件', used: 24, total: 512, unit: 'KB' },
    { name: '设备配置', used: 8, total: 256, unit: 'KB' },
    { name: '系统日志', used: 96, total: 1024, unit: 'KB' }
  ]
  return {
    modules: state.modules.map(moduleView),
    storage: storage.map((s) => ({
      ...s,
      percent: Math.round((s.used / s.total) * 100)
    })),
    network: {
      state: 'connected',
      link: '1 Gbps 全双工',
      ip: state.config.network.ip,
      mac: state.config.system.mac,
      dhcp: state.config.network.dhcp,
      upload: state.config.upload
    },
    system: {
      firmware: 'v1.0.0',
      uptime_text: formatUptime(Math.floor((Date.now() - state.bootedAt) / 1000)),
      boot_id: state.bootId,
      temperature_c: Number(state.tempC.toFixed(1)),
      temp_unit: state.config.environment.temp_unit,
      i2c_speed: '100 kHz',
      storage_state: 'normal'
    },
    i2c_error_total: state.modules.reduce((s, m) => s + m.communication_error_count, 0),
    crc_error_total: state.modules.reduce((s, m) => s + m.crc_error_count, 0),
    queue_pending_total: state.modules.reduce((s, m) => s + m.pending_event_count, 0),
    event_total_stored: state.events.length
  }
}

// ---------------- 实时模拟 ----------------
let lastTick = Date.now()

export function tick() {
  const now = Date.now()
  const dt = Math.max(0, now - lastTick)
  lastTick = now
  if (dt > 0) {
    state.tempC = clamp(state.tempC + (rand() - 0.5) * 0.12, 34, 44)
    state.modules.forEach((m) => {
      m.heartbeat_counter += Math.round(dt / 1000)
      if (m.pending_event_count > 0 && rand() > 0.7) {
        m.pending_event_count = Math.max(0, m.pending_event_count - 1)
      }
    })
    state.channels.forEach((c) => {
      if (c.alarm_until && c.alarm_until < now) {
        c.alarm_until = 0
        c.hall_state = 0
      }
    })
  }
}

export function injectEvent(channelId) {
  ensureInit()
  tick()
  // 浪涌事件只落在霍尔比较器接口通道上；传入其它接口时取同模块的霍尔通道
  const requested = state.channels.find((c) => c.channel_id === channelId)
  const moduleId = requested ? requested.module_id : randInt(1, MODULE_COUNT)
  const ch = state.channels.find((c) => c.module_id === moduleId && c.kind === 'HALL')
  const now = Date.now()
  const owner = state.modules.find((m) => m.module_id === ch.module_id)
  ch.event_count += 1
  if (owner) {
    owner.life_percent = clamp(Number((owner.life_percent - 0.15).toFixed(1)), 1, 100)
  }
  ch.last_event_at = now
  ch.last_event_time = iso(now)
  ch.alarm_until = now + 4000
  ch.hall_state = 1
  setTimeout(() => {
    ch.hall_state = 0
  }, 1200)
  const event = makeEvent(now, ch.channel_id, 'HALL_TRIGGER', 2)
  event.acknowledged = true
  event.uploaded = false
  state.events.push(event)
  state.modules.find((m) => m.module_id === ch.module_id).pending_event_count = Math.min(
    QUEUE_CAPACITY,
    (state.modules.find((m) => m.module_id === ch.module_id).pending_event_count || 0) + 1
  )
  pushLog(
    'WARN',
    'event',
    `${ch.name} 检测到阈值触发事件，事件 ID ${event.event_id_text}，等待持久化确认`
  )
  return event
}

export function pushLog(level, source, message) {
  const now = Date.now()
  const log = {
    log_id: state.nextLogId++,
    level,
    source,
    source_label: SOURCE_LABEL[source] || source,
    message,
    timestamp_ms: now,
    time: formatDateTime(now)
  }
  state.syslog.unshift(log)
  return log
}

export function getSyslogPage({ page = 1, page_size = 12, level = '' } = {}) {
  tick()
  let list = state.syslog
  if (level) list = list.filter((l) => l.level === level)
  const total = list.length
  const start = (page - 1) * page_size
  return {
    items: list.slice(start, start + page_size),
    total,
    page,
    page_size
  }
}

export function clearSyslog() {
  const count = state.syslog.length
  state.syslog = []
  pushLog('INFO', 'system', `已清除系统日志，共 ${count} 条记录`)
  return { cleared: count }
}

export function getEventsPage(query = {}) {
  tick()
  const {
    page = 1,
    page_size = 20,
    channel_id = '',
    module_id = '',
    event_type = '',
    event_level = '',
    start = '',
    end = ''
  } = query
  let list = [...state.events].sort((a, b) => b.timestamp_ms - a.timestamp_ms)
  if (channel_id) list = list.filter((e) => e.channel_id === Number(channel_id))
  if (module_id) list = list.filter((e) => e.module_id === Number(module_id))
  if (event_type) list = list.filter((e) => e.event_type === event_type)
  if (event_level) list = list.filter((e) => e.event_level === Number(event_level))
  if (start) {
    const t = new Date(`${start}T00:00:00`).getTime()
    if (!Number.isNaN(t)) list = list.filter((e) => e.timestamp_ms >= t)
  }
  if (end) {
    const t = new Date(`${end}T23:59:59`).getTime()
    if (!Number.isNaN(t)) list = list.filter((e) => e.timestamp_ms <= t)
  }
  const total = list.length
  const startIdx = (page - 1) * page_size
  return {
    items: list.slice(startIdx, startIdx + page_size).map((e) => ({
      ...e,
      type_label: EVENT_TYPES[e.event_type]?.label || e.event_type,
      level_label: EVENT_LEVELS[e.event_level]?.label || e.event_level,
      time_text: formatDateTime(e.timestamp_ms)
    })),
    total,
    page,
    page_size,
    page_count: Math.max(1, Math.ceil(total / page_size))
  }
}

export function getChannelDetail(channelId) {
  tick()
  const ch = state.channels.find((c) => c.channel_id === Number(channelId))
  if (!ch) return null
  const view = channelView(ch)
  const mod = state.modules.find((m) => m.module_id === ch.module_id)
  const events = state.events
    .filter((e) => e.channel_id === ch.channel_id)
    .sort((a, b) => b.timestamp_ms - a.timestamp_ms)
    .slice(0, 8)
    .map((e) => ({
      ...e,
      type_label: EVENT_TYPES[e.event_type]?.label,
      level_label: EVENT_LEVELS[e.event_level]?.label,
      time_text: formatDateTime(e.timestamp_ms)
    }))

  const daily = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY)
    const key = formatDate(d.getTime())
    daily.push({
      date: key,
      label: key.slice(5),
      count: state.events.filter(
        (e) => e.channel_id === ch.channel_id && formatDate(e.timestamp_ms) === key
      ).length
    })
  }
  return { channel: view, module: mod ? moduleView(mod) : null, events, daily }
}

export function getDevice() {
  tick()
  return deviceView()
}

export function getStatistics() {
  tick()
  return statistics()
}

export function getDiagnostics() {
  tick()
  return diagnostics()
}

export function getConfig() {
  tick()
  return JSON.parse(JSON.stringify(state.config))
}

export function saveConfig(next) {
  state.config = {
    ...state.config,
    ...JSON.parse(JSON.stringify(next)),
    account: {
      ...state.config.account,
      ...next.account,
      password: undefined
    }
  }
  pushLog('INFO', 'system', '系统配置已保存')
  return getConfig()
}

export function getSurgeSettings() {
  tick()
  return state.modules.map((m) => {
    const view = moduleView(m)
    return {
      module_id: m.module_id,
      module_name: `模块 ${m.module_id}`,
      address: m.address,
      reset_mode: m.reset_mode,
      alarm_threshold: m.alarm_threshold,
      location: m.location,
      life_percent: m.life_percent,
      event_count: view.event_count,
      online: m.online,
      status: view.status,
      status_label: view.status_label
    }
  })
}

export function saveSurgeSettings(rows) {
  rows.forEach((row) => {
    const mod = state.modules.find((m) => m.module_id === row.module_id)
    if (!mod) return
    mod.reset_mode = row.reset_mode
    mod.alarm_threshold = Number(row.alarm_threshold)
    mod.location = row.location
    if (row.reset_mode === 'Reset') {
      state.channels
        .filter((c) => c.module_id === mod.module_id)
        .forEach((c) => (c.event_count = 0))
    }
  })
  pushLog('INFO', 'system', '浪涌模块设置已应用')
  return getSurgeSettings()
}

export function rebootDevice() {
  state.bootId += 1
  state.bootedAt = Date.now()
  state.tempC = 36.2
  pushLog('WARN', 'system', '设备收到重启指令，系统正在重启')
  setTimeout(() => pushLog('INFO', 'system', '系统重启完成，采集与监测已恢复'), 1200)
  return { boot_id: state.bootId }
}

export function factoryReset() {
  seedConfig()
  pushLog('WARN', 'system', '设备配置已恢复出厂默认值')
  return { ok: true }
}

export function exportConfigText() {
  return JSON.stringify(
    {
      exported_at: formatDateTime(Date.now()),
      device: state.config.system,
      network: state.config.network,
      time: state.config.time,
      environment: state.config.environment,
      upload: { ...state.config.upload, secret: undefined },
      surge_settings: getSurgeSettings()
    },
    null,
    2
  )
}

export function upgradeFirmware(version = 'v1.1.0') {
  pushLog('WARN', 'system', `固件升级开始，目标版本 ${version}`)
  return { version }
}

// 通过 I²C 逐模块烧写 STM32 从机固件
export function upgradeStm32Firmware(moduleIds = [], version = '1.5.0') {
  const ids = Array.isArray(moduleIds) ? moduleIds : [moduleIds]
  const targets = state.modules.filter((m) => ids.includes(m.module_id))
  if (!targets.length) throw new Error('请选择需要升级的模块')
  const offline = targets.find((m) => !m.online)
  if (offline) throw new Error(`模块 ${offline.module_id} 当前离线，无法升级`)
  const done = []
  targets.forEach((m) => {
    m.firmware = version
    m.restart_count += 1
    m.last_communication_time = iso(Date.now())
    done.push({ module_id: m.module_id, firmware: m.firmware })
  })
  pushLog(
    'WARN',
    'module',
    `STM32 模块固件升级完成：M${targets.map((m) => m.module_id).join(' / M')} → v${version}`
  )
  return { version, modules: done }
}

export { formatDateTime, formatDate, formatUptime, MODULE_COUNT, CHANNEL_COUNT }
