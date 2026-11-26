<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import ChannelCard from '../components/ChannelCard.vue'
import ChannelDetailDrawer from '../components/ChannelDetailDrawer.vue'
import StatCard from '../components/StatCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import { useDeviceStore } from '../stores/device'
import { useToast } from '../stores/toast'
import api from '../mock/api'
import { formatClock, formatTemp, timeAgo } from '../utils/format'

const router = useRouter()
const toast = useToast()
const { state, refresh } = useDeviceStore()

const recentEvents = ref([])
const refreshing = ref(false)
const drawerOpen = ref(false)
const activeChannel = ref(null)

const device = computed(() => state.device)
const channels = computed(() => state.channels)
const modules = computed(() => state.modules)

const temp = computed(() => {
  if (!device.value) return '—'
  return formatTemp(device.value.temperature_c, device.value.temp_unit)
})

const health = computed(() => {
  const mods = modules.value
  const list = channels.value
  return {
    good: mods.filter((m) => m.life_percent >= 90).length,
    attention: mods.filter((m) => m.life_percent < 90 && m.life_percent >= 80).length,
    warning: mods.filter((m) => m.life_percent < 80).length,
    fail: list.filter((c) => ['FAIL', 'OFFLINE'].includes(c.status)).length,
    unknown: list.filter((c) => c.status === 'UNKNOWN').length
  }
})

const healthTotal = computed(() => Math.max(1, modules.value.length))

const canRefresh = computed(() => !refreshing.value && !state.loading)

async function doRefresh() {
  refreshing.value = true
  try {
    await refresh()
    recentEvents.value = (await api.getEvents({ page: 1, page_size: 5 })).items
    toast.success('设备状态已刷新')
  } finally {
    refreshing.value = false
  }
}

function openChannel(ch) {
  activeChannel.value = ch.channel_id
  drawerOpen.value = true
}

function goEvents() {
  router.push({ name: 'events' })
}

const levelTone = { 1: 'muted', 2: 'warn', 3: 'danger' }

watch(
  () => device.value?.total_event_count,
  async () => {
    if (!device.value) return
    recentEvents.value = (await api.getEvents({ page: 1, page_size: 5 })).items
  }
)

onMounted(async () => {
  await refresh()
  recentEvents.value = (await api.getEvents({ page: 1, page_size: 5 })).items
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">设备总览</h1>
      <div class="row">
        <span class="updated">更新于 {{ state.refreshedAt ? formatClock(state.refreshedAt) : '—' }}</span>
        <button class="btn" :disabled="!canRefresh" @click="doRefresh">
          <AppIcon name="refresh" :size="15" :class="{ spin: refreshing }" />
          {{ refreshing ? '刷新中…' : '刷新' }}
        </button>
      </div>
    </div>

    <div v-if="state.loading && !device" class="card">
      <div class="empty">正在读取设备状态…</div>
    </div>

    <template v-else>
      <div class="grid cols-4">
        <StatCard
          label="累计浪涌事件"
          :value="device?.total_event_count ?? '—'"
          unit="次"
          icon="bolt"
          accent="var(--brand)"
        />
        <StatCard
          label="在线模块"
          :value="`${device?.online_modules ?? 0}/${device?.total_modules ?? 4}`"
          icon="channels"
          accent="var(--ok)"
        />
        <StatCard
          label="监测通道"
          value="16"
          unit="路"
          icon="shield"
          accent="#0f9d8f"
        />
        <StatCard
          label="当前异常"
          :value="device?.fault_count ?? 0"
          unit="路"
          :tone="(device?.fault_count ?? 0) > 0 ? 'warn' : 'ok'"
          icon="alert"
          :accent="(device?.fault_count ?? 0) > 0 ? 'var(--warn)' : 'var(--ok)'"
        />
      </div>

      <div class="grid cols-2 top-cards">
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">设备信息</h3>
            <StatusBadge tone="ok" label="运行正常" live />
          </div>
          <div class="card-body">
            <dl class="info-list">
              <div><dt>设备名称</dt><dd>{{ device?.name || '—' }}</dd></div>
              <div><dt>MAC 地址</dt><dd class="mono">{{ device?.mac || '—' }}</dd></div>
              <div class="wide"><dt>系统描述</dt><dd class="muted">{{ device?.description || '—' }}</dd></div>
              <div><dt>ESP32 固件</dt><dd class="mono">{{ device?.firmware }} · {{ device?.firmware_build }}</dd></div>
              <div><dt>运行时间</dt><dd>{{ device?.uptime_text || '—' }}</dd></div>
              <div><dt>系统时间</dt><dd class="mono">{{ device?.system_time || '—' }}</dd></div>
              <div><dt>环境温度</dt><dd>{{ temp }}</dd></div>
              <div>
                <dt>数据上报</dt>
                <dd>
                  <span class="row" style="gap: 6px">
                    <i class="dot" :class="device?.upload_state === 'connected' ? 'ok' : 'warn'"></i>
                    {{ device?.upload_protocol }} ·
                    {{ device?.upload_state === 'connected' ? '已连接' : device?.upload_state === 'disabled' ? '已关闭' : '异常' }}
                  </span>
                </dd>
              </div>
              <div><dt>最近事件</dt><dd>{{ device?.last_event_time || '—' }}</dd></div>
            </dl>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3 class="card-title">采集模块状态</h3>
            <span class="muted" style="font-size: 12px">0x20 – 0x23</span>
          </div>
          <div class="card-body module-list">
            <div v-for="m in modules" :key="m.module_id" class="module-row">
              <span class="mod-id">M{{ m.module_id }}</span>
              <div class="mod-main">
                <div class="mod-title">
                  <b>模块 {{ m.module_id }}</b>
                  <span class="mono">{{ m.address }} · FW {{ m.firmware }}</span>
                </div>
                <div class="mod-meta">
                  <span>心跳 {{ m.heartbeat_counter.toLocaleString() }}</span>
                  <span>{{ timeAgo(m.last_communication_time) }}</span>
                  <span class="mod-life" :class="m.life_percent < m.alarm_threshold ? 'danger' : ''">
                    剩余寿命 {{ Math.round(m.life_percent) }}%
                  </span>
                </div>
                <div class="queue">
                  <span class="queue-label">事件队列 {{ m.queue_used }}/{{ m.queue_capacity }}</span>
                  <div class="progress" :class="m.queue_used > m.queue_capacity * 0.7 ? 'warn' : 'ok'">
                    <span :style="{ width: (m.queue_used / m.queue_capacity) * 100 + '%' }"></span>
                  </div>
                </div>
              </div>
              <StatusBadge :tone="m.online ? 'ok' : 'muted'" :label="m.online ? '在线' : '离线'" />
            </div>
          </div>
        </section>
      </div>

      <div class="section-head">
        <h2 class="section-title">16 个模块接口通道</h2>
        <div class="legend">
          <span><i class="dot ok"></i>正常 / 未触发 / 空闲</span>
          <span><i class="dot warn"></i>已触发 / 待读取</span>
          <span><i class="dot danger"></i>接口异常</span>
          <span><i class="dot"></i>模块离线</span>
          <span><i class="dot info"></i>未知</span>
        </div>
      </div>

      <div class="grid channels">
        <ChannelCard v-for="ch in channels" :key="ch.channel_id" :channel="ch" @select="openChannel" />
      </div>

      <div class="grid cols-2 bottom-cards">
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">最近事件</h3>
            <button class="btn sm ghost" @click="goEvents">全部事件<AppIcon name="chevron" :size="13" /></button>
          </div>
          <div class="card-body flush">
            <ul v-if="recentEvents.length" class="recent-list">
              <li v-for="ev in recentEvents" :key="ev.event_id">
                <span class="ev-time mono">{{ ev.time_text }}</span>
                <span class="ev-ch">{{ ev.channel_name }}</span>
                <span class="ev-type">{{ ev.type_label }}</span>
                <StatusBadge :tone="levelTone[ev.event_level]" :label="ev.level_label" plain />
              </li>
            </ul>
            <EmptyState v-else icon="events" title="暂无事件记录" desc="发生阈值触发或状态变化后会在此显示" />
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3 class="card-title">健康风险摘要</h3>
            <AppIcon name="gauge" :size="18" style="color: var(--ink-3)" />
          </div>
          <div class="card-body">
            <div class="health-bar">
              <span class="hb good" :style="{ width: (health.good / healthTotal) * 100 + '%' }"></span>
              <span class="hb attention" :style="{ width: (health.attention / healthTotal) * 100 + '%' }"></span>
              <span class="hb warning" :style="{ width: (health.warning / healthTotal) * 100 + '%' }"></span>
            </div>
            <div class="health-stats">
              <div>
                <b class="ok">{{ health.good }}</b>
                <span>寿命充足</span>
              </div>
              <div>
                <b class="warn">{{ health.attention }}</b>
                <span>建议巡检</span>
              </div>
              <div>
                <b class="danger">{{ health.warning }}</b>
                <span>接近阈值</span>
              </div>
            </div>
            <ul class="risk-list">
              <li v-if="health.warning">
                <i class="dot danger"></i>
                {{ health.warning }} 个模块剩余寿命低于告警阈值，建议安排模块更换计划。
              </li>
              <li v-if="health.fail">
                <i class="dot danger"></i>
                {{ health.fail }} 个接口通道异常，请检查光敏检测回路或 I²C 通信。
              </li>
              <li v-if="health.unknown">
                <i class="dot info"></i>
                {{ health.unknown }} 个接口通道状态暂不可确认，等待下一次采集。
              </li>
              <li v-if="!health.warning && !health.fail && !health.unknown">
                <i class="dot ok"></i>
                全部通道状态正常，模块寿命余量充足。
              </li>
            </ul>
            <button class="btn sm ghost view-all" @click="router.push({ name: 'channels' })">
              查看通道详情<AppIcon name="chevron" :size="13" />
            </button>
          </div>
        </section>
      </div>
    </template>

    <ChannelDetailDrawer
      :open="drawerOpen"
      :channel-id="activeChannel"
      @close="drawerOpen = false"
    />
  </div>
</template>

<style scoped>
.updated {
  font-size: 12px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.spin {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.top-cards {
  margin-top: 16px;
}
.bottom-cards {
  margin-top: 20px;
}

/* Device info list */
.info-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 28px;
  margin: 0;
}
.info-list > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.info-list > div.wide {
  grid-column: span 2;
}
.info-list dt {
  font-size: 12px;
  color: var(--ink-3);
}
.info-list dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.info-list dd.muted {
  font-weight: 400;
  color: var(--ink-2);
}

/* Module list */
.module-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 10px;
  padding-bottom: 12px;
}
.module-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.module-row:last-child {
  border-bottom: none;
}
.mod-id {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  background: var(--surface-3);
  color: var(--ink-2);
  font-weight: 700;
  font-size: 12.5px;
  flex: none;
}
.mod-main {
  flex: 1;
  min-width: 0;
}
.mod-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.mod-title b {
  font-size: 13px;
}
.mod-title span {
  font-size: 10.5px;
  color: var(--ink-3);
}
.mod-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--ink-3);
  margin: 2px 0 6px;
}
.mod-life {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.mod-life.danger {
  color: var(--danger);
  font-weight: 600;
}
.queue {
  display: flex;
  align-items: center;
  gap: 8px;
}
.queue-label {
  font-size: 10.5px;
  color: var(--ink-3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.queue .progress {
  flex: 1;
  height: 4px;
}

/* Recent events */
.recent-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 20px;
  border-bottom: 1px solid var(--line);
  font-size: 12.5px;
}
.recent-list li:last-child {
  border-bottom: none;
}
.ev-time {
  font-size: 11px;
  color: var(--ink-3);
  white-space: nowrap;
}
.ev-ch {
  font-weight: 700;
  color: var(--ink);
  width: 42px;
}
.ev-type {
  flex: 1;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Health */
.health-bar {
  display: flex;
  height: 10px;
  border-radius: 100px;
  overflow: hidden;
  background: var(--surface-3);
  gap: 2px;
}
.hb {
  display: block;
  height: 100%;
}
.hb.good {
  background: var(--ok);
}
.hb.attention {
  background: var(--warn);
  opacity: 0.72;
}
.hb.warning {
  background: var(--danger);
}
.health-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 14px;
}
.health-stats div {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
}
.health-stats b {
  font-size: 22px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.health-stats b.ok {
  color: var(--ok);
}
.health-stats b.warn {
  color: var(--warn);
}
.health-stats b.danger {
  color: var(--danger);
}
.health-stats span {
  font-size: 11px;
  color: var(--ink-3);
}
.risk-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.risk-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--ink-2);
}
.risk-list .dot {
  margin-top: 6px;
}
.view-all {
  margin-top: 14px;
  padding-left: 0;
  color: var(--brand);
}

.legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--ink-3);
}

@media (max-width: 900px) {
  .bottom-cards {
    margin-top: 16px;
  }
}
@media (max-width: 640px) {
  .info-list {
    grid-template-columns: 1fr;
  }
  .info-list > div.wide {
    grid-column: auto;
  }
}
</style>
