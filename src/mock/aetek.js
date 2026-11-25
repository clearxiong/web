// AETEK SD-504 本地 Web 管理界面 Mock 数据层
// 页面结构对齐官方 SD504_524 用户手册：System ×5 + IP PoE Surge ×2，共 7 个页面。
// 接真实固件时，只需替换 aetekApi.js 里的实现为 fetch('/api/v1/aetek/...')。

import { formatDateTime } from '../utils/format'

export const AETEK_STATUS = {
  NORMAL: { code: 'NORMAL', label: '正常', tone: 'ok', desc: '模块工作正常，寿命余量充足' },
  ONLINE: { code: 'ONLINE', label: '在线', tone: 'ok', desc: '模块在线，尚未达到告警阈值' },
  ALARM: { code: 'ALARM', label: '告警', tone: 'warn', desc: '寿命已用比例达到 Alarm Log Trigger 阈值' },
  FAIL: { code: 'FAIL', label: '失效', tone: 'danger', desc: '模块失效，需要更换' },
  OFFLINE: { code: 'OFFLINE', label: '离线', tone: 'muted', desc: '模块无响应：未安装或通信中断' },
  UNKNOWN: { code: 'UNKNOWN', label: '未知', tone: 'info', desc: '尚未取得有效状态，等待下一次轮询' },
  QUESTION: { code: '?', label: '未定义', tone: 'muted', desc: '手册列出的保留取值，语义未说明' }
}

export function statusOf(module) {
  if (module.hardware !== 'NORMAL') return module.hardware
  return module.life_used >= module.alarm_trigger ? 'ALARM' : 'NORMAL'
}

function iso(ms) {
  return new Date(ms).toISOString()
}

const NOW = Date.now()

const state = {
  system: {
    model_name: 'SD-504',
    description: 'Modular Surge Protector 4 Channel',
    firmware: 'v1.0.4',
    firmware_build: '2025-12-18',
    mac: '00:1A:2B:3C:4D:5E',
    name: 'SD-504-SITE-A',
    location: 'Building A · IDF-2',
    contact: 'ops@example.com'
  },
  time: {
    manual: '2026-11-25T10:30:00',
    ntp: false,
    ntp_server: 'pool.ntp.org',
    timezone: 'UTC+08:00',
    dst: false
  },
  ip: {
    dhcp: true,
    address: '192.168.1.1',
    mask: '255.255.255.0',
    gateway: '192.168.1.254',
    dns: '8.8.8.8',
    hostname: 'sd-504-01'
  },
  account: {
    users: [{ username: 'admin', role: '管理员', last_login: iso(NOW - 26 * 60 * 60 * 1000) }],
    auto_logout: 300
  },
  modules: [
    {
      id: 1,
      location: 'Camera-01',
      life_used: 18,
      surge_count: 12,
      hardware: 'NORMAL',
      alarm_trigger: 80,
      last_surge: iso(NOW - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 2,
      location: 'Camera-02',
      life_used: 36,
      surge_count: 7,
      hardware: 'NORMAL',
      alarm_trigger: 80,
      last_surge: iso(NOW - 12 * 24 * 60 * 60 * 1000)
    },
    {
      id: 3,
      location: 'Camera-03',
      life_used: 92,
      surge_count: 31,
      hardware: 'NORMAL',
      alarm_trigger: 80,
      last_surge: iso(NOW - 9 * 60 * 60 * 1000)
    },
    {
      id: 4,
      location: 'Camera-04',
      life_used: 0,
      surge_count: 0,
      hardware: 'OFFLINE',
      alarm_trigger: 80,
      last_surge: null
    }
  ],
  syslog: [],
  nextLogId: 1
}

function pushLog(message, level = 'INFO') {
  state.syslog.unshift({
    id: state.nextLogId++,
    level,
    time: new Date().toISOString(),
    message
  })
  if (state.syslog.length > 200) state.syslog.length = 200
}

function seedSyslog() {
  const rows = [
    ['INFO', 3, '系统启动完成，固件 v1.0.4'],
    ['INFO', 3, 'DHCP 获取地址 192.168.1.1'],
    ['WARN', 9, 'CH03 寿命已用达到告警阈值（80%），雷击计数 31'],
    ['INFO', 15, '管理员重置了 CH02 的雷击计数'],
    ['WARN', 27, 'CH04 模块无响应，已标记为离线'],
    ['INFO', 30, '管理员保存了配置']
  ]
  rows.forEach(([level, hoursAgo, message], idx) => {
    state.syslog.push({
      id: state.nextLogId++,
      level,
      time: iso(NOW - hoursAgo * 60 * 60 * 1000 - idx * 60 * 1000),
      message
    })
  })
}
seedSyslog()

// ---------------- 视图 ----------------
export function moduleView(m) {
  const status = statusOf(m)
  const meta = AETEK_STATUS[status]
  return {
    module_id: m.id,
    label: `CH${m.id}`,
    location: m.location,
    life_used: m.life_used,
    life_remaining: Math.max(0, 100 - m.life_used),
    surge_count: m.surge_count,
    alarm_trigger: m.alarm_trigger,
    hardware: m.hardware,
    status,
    status_label: meta.label,
    status_code: meta.code,
    status_tone: meta.tone,
    status_desc: meta.desc,
    last_surge_time: m.last_surge
  }
}

export function getModules() {
  return state.modules.map(moduleView)
}

export function getSyslog() {
  return state.syslog.map((log) => ({ ...log, time_text: formatDateTime(log.time) }))
}

export function getSnapshot() {
  return {
    system: { ...state.system },
    time: { ...state.time },
    ip: { ...state.ip },
    account: {
      users: state.account.users.map((u) => ({
        ...u,
        last_login_text: formatDateTime(u.last_login)
      })),
      auto_logout: state.account.auto_logout
    },
    surge: state.modules.map((m) => ({
      module_id: m.id,
      label: `CH${m.id}`,
      location: m.location,
      alarm_trigger: m.alarm_trigger,
      reset_counter: false
    })),
    modules: getModules(),
    syslog_total: state.syslog.length
  }
}

function numbersOnly(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// 显式保存：把 draft 整体合并进设备状态；Reset Counter 勾选的模块计数归零
export function saveConfig(draft) {
  if (!draft) throw new Error('没有可保存的配置')

  state.system = { ...state.system, ...draft.system }
  state.time = { ...state.time, ...draft.time }
  state.ip = { ...state.ip, ...draft.ip }
  state.account = {
    ...state.account,
    auto_logout: numbersOnly(draft.account?.auto_logout, state.account.auto_logout)
  }
  const nextUser = String(draft.account?.username || '').trim()
  if (nextUser && state.account.users[0]) {
    state.account.users[0] = { ...state.account.users[0], username: nextUser.slice(0, 31) }
  }

  const resetLabels = []
  ;(draft.surge || []).forEach((row) => {
    const target = state.modules.find((m) => m.id === row.module_id)
    if (!target) return
    target.location = String(row.location ?? target.location).slice(0, 64)
    target.alarm_trigger = Math.min(100, Math.max(0, numbersOnly(row.alarm_trigger, target.alarm_trigger)))
    if (row.reset_counter) {
      target.surge_count = 0
      resetLabels.push(`CH${target.id}`)
    }
  })

  if (resetLabels.length) {
    pushLog(`重置雷击计数：${resetLabels.join('、')}`, 'WARN')
  }
  pushLog('管理员保存了配置')

  return {
    config: getSnapshot(),
    reset_modules: resetLabels
  }
}

export function simulateSurge(moduleId) {
  const alive = state.modules.filter((m) => m.hardware !== 'OFFLINE')
  const target = moduleId
    ? state.modules.find((m) => m.id === Number(moduleId))
    : alive[Math.floor(Math.random() * alive.length)]

  if (!target) throw new Error('没有可用的防雷模块')
  if (target.hardware === 'OFFLINE') throw new Error(`CH${target.id} 当前离线，无法模拟雷击`)

  const before = statusOf(target)
  target.surge_count += 1
  target.life_used = Math.min(100, target.life_used + 1 + Math.round(Math.random()))
  target.last_surge = new Date().toISOString()

  const after = statusOf(target)
  pushLog(
    `CH${target.id} 检测到雷击，雷击计数 ${target.surge_count}，寿命已用 ${target.life_used}%`,
    'WARN'
  )
  if (before !== 'ALARM' && after === 'ALARM') {
    pushLog(
      `CH${target.id} 寿命已用达到告警阈值（${target.alarm_trigger}%）`,
      'ERROR'
    )
  }

  return moduleView(target)
}

export function clearSyslog() {
  const count = state.syslog.length
  state.syslog = []
  pushLog(`已清除系统日志，共 ${count} 条`)
  return { cleared: count }
}

export function login({ username, password }) {
  const name = String(username || '').trim()
  if (!name) throw new Error('请输入用户名')
  if (!password) throw new Error('请输入密码')
  if (name.length > 31) throw new Error('用户名不能超过 31 个字符')
  for (const ch of name + password) {
    const code = ch.charCodeAt(0)
    if (code < 32 || code > 126) throw new Error('仅支持 ASCII 32–126 字符')
  }
  pushLog(`管理员 ${name} 从 192.168.1.100 登录`)
  return {
    username: name,
    role: '管理员',
    auto_logout: state.account.auto_logout,
    login_at: new Date().toISOString()
  }
}

export { formatDateTime }
