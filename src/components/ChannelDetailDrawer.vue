<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import StatusBadge from './StatusBadge.vue'
import LifeBar from './LifeBar.vue'
import LineChart from './charts/LineChart.vue'
import api from '../mock/api'
import { formatDateTime, timeAgo } from '../utils/format'

const props = defineProps({
  open: { type: Boolean, default: false },
  channelId: { type: [Number, String], default: null }
})
const emit = defineEmits(['close'])
const router = useRouter()

const loading = ref(false)
const detail = ref(null)

const toneMap = {
  NORMAL: 'ok',
  ALARM: 'warn',
  FAIL: 'danger',
  OFFLINE: 'muted',
  UNKNOWN: 'info'
}
const levelTone = { 1: 'muted', 2: 'warn', 3: 'danger' }

watch(
  () => [props.open, props.channelId],
  async ([open, id]) => {
    if (!open || !id) return
    loading.value = true
    detail.value = null
    try {
      detail.value = await api.getChannel(id)
    } finally {
      loading.value = false
    }
  }
)

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (!open) document.removeEventListener('keydown', onKey)
    else document.addEventListener('keydown', onKey)
  }
)

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
})

function goEvents() {
  const id = detail.value?.channel?.channel_id
  emit('close')
  router.push({ name: 'events', query: id ? { channel_id: id } : {} })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-overlay" @click.self="emit('close')">
        <aside class="drawer" role="dialog" aria-modal="true">
          <header class="drawer-head">
            <div v-if="detail" class="head-main">
              <div class="head-id">
                <h3>{{ detail.channel.name }} · {{ detail.channel.kind_name }}</h3>
                <span class="head-mod">模块 {{ detail.channel.module_id }} · {{ detail.channel.module_address }}</span>
              </div>
              <StatusBadge
                :tone="toneMap[detail.channel.status] || 'muted'"
                :label="detail.channel.state_label"
              />
            </div>
            <div v-else class="head-main"><h3>通道详情</h3></div>
            <button class="close" aria-label="关闭" @click="emit('close')">
              <AppIcon name="close" :size="18" />
            </button>
          </header>

          <div v-if="loading" class="drawer-loading">正在读取通道数据…</div>

          <div v-else-if="detail && detail.module" class="drawer-body">
            <section class="life-card">
              <div class="life-top">
                <div>
                  <p class="mini-label">所属模块 M{{ detail.module.module_id }} · 剩余寿命</p>
                  <div
                    class="life-big"
                    :class="detail.module.life_percent < detail.module.alarm_threshold ? 'warning' : 'good'"
                  >
                    {{ Math.round(detail.module.life_percent) }}<small>%</small>
                  </div>
                </div>
                <div class="life-side">
                  <p class="mini-label">模块告警阈值</p>
                  <b>{{ detail.module.alarm_threshold }}%</b>
                  <p class="mini-label" style="margin-top: 6px">本接口事件次数</p>
                  <b>{{ detail.channel.event_count.toLocaleString() }}</b>
                </div>
              </div>
              <LifeBar :percent="detail.module.life_percent" :threshold="detail.module.alarm_threshold" />
              <p class="life-note">{{ detail.channel.health_text }}</p>
            </section>

            <section class="info-grid">
              <div class="info-item">
                <span>接口类型</span>
                <b>{{ detail.channel.kind_name }}</b>
              </div>
              <div class="info-item">
                <span>接口状态</span>
                <b>
                  <i class="dot" :class="toneMap[detail.channel.status]"></i>
                  {{ detail.channel.state_label }}
                </b>
              </div>
              <div class="info-item">
                <span>事件次数</span>
                <b class="mono">{{ detail.channel.event_count.toLocaleString() }}</b>
              </div>
              <div class="info-item">
                <span>所属模块</span>
                <b class="mono">M{{ detail.module.module_id }} · {{ detail.module.address }}</b>
              </div>
              <div class="info-item">
                <span>最近事件</span>
                <b>{{ detail.channel.last_event_time ? timeAgo(detail.channel.last_event_time) : '暂无事件' }}</b>
              </div>
              <div class="info-item">
                <span>故障码</span>
                <b class="mono">{{ detail.channel.fault_code ? '0x' + detail.channel.fault_code.toString(16).padStart(4, '0') : '—' }}</b>
              </div>
              <div class="info-item span-2">
                <span>模块安装位置</span>
                <b>{{ detail.module.location }}</b>
              </div>
              <div class="info-item span-2">
                <span>接口说明</span>
                <b class="kind-desc">{{ detail.channel.kind_desc }}</b>
              </div>
            </section>

            <section class="sub-card">
              <div class="sub-head">
                <h4>近 14 天事件趋势</h4>
                <span class="muted">次</span>
              </div>
              <LineChart :data="detail.daily" :height="140" unit="次" color="#409eff" />
            </section>

            <section class="sub-card">
              <div class="sub-head">
                <h4>最近事件</h4>
                <button class="btn sm ghost" @click="goEvents">查看全部</button>
              </div>
              <ul v-if="detail.events.length" class="event-list">
                <li v-for="ev in detail.events" :key="ev.event_id">
                  <span class="ev-dot" :class="levelTone[ev.event_level]"></span>
                  <div class="ev-main">
                    <b>{{ ev.type_label }}</b>
                    <span class="mono">{{ ev.time_text }}</span>
                  </div>
                  <StatusBadge :tone="levelTone[ev.event_level]" :label="ev.level_label" plain />
                </li>
              </ul>
              <p v-else class="muted" style="font-size: 13px">该通道暂无事件记录。</p>
            </section>

            <p class="disclaimer">
              说明：模块寿命为依据累计浪涌计数与器件冲击次数的参考估算，健康提示仅用于运维风险参考，
              不代表器件损伤百分比或精确剩余寿命。
            </p>
          </div>

          <footer class="drawer-foot">
            <button class="btn" @click="emit('close')">关闭</button>
            <button class="btn primary" @click="goEvents">
              <AppIcon name="events" :size="15" />查看事件记录
            </button>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.kind-desc {
  font-weight: 500;
  color: var(--ink-2);
  line-height: 1.6;
}
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: rgba(10, 20, 35, 0.42);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: flex-end;
}
.drawer {
  width: min(480px, 100vw);
  height: 100%;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
.drawer-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.head-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.head-id h3 {
  font-size: 20px;
  font-weight: 700;
}
.head-mod {
  font-size: 11px;
  color: var(--ink-3);
}
.close {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: none;
  background: var(--surface-3);
  color: var(--ink-3);
  cursor: pointer;
  display: grid;
  place-items: center;
  flex: none;
}
.close:hover {
  background: var(--line);
  color: var(--ink);
}
.drawer-loading {
  padding: 60px 20px;
  text-align: center;
  color: var(--ink-3);
  font-size: 13px;
}
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--surface-2);
}
.life-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 16px;
}
.life-top {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
}
.mini-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--ink-3);
}
.life-big {
  font-size: 38px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.life-big small {
  font-size: 16px;
  margin-left: 2px;
  color: var(--ink-3);
}
.life-big.ok,
.life-big.good {
  color: var(--ok);
}
.life-big.warning,
.life-big.attention {
  color: var(--warn);
}
.life-big.fault {
  color: var(--danger);
}
.life-side {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.life-side b {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}
.life-note {
  margin-top: 9px;
  font-size: 12px;
  color: var(--ink-3);
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}
.info-item {
  background: var(--surface);
  padding: 11px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-item span {
  font-size: 10.5px;
  color: var(--ink-3);
  font-weight: 600;
  letter-spacing: 0.3px;
}
.info-item b {
  font-size: 13px;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 6px;
}
.info-item.span-2 {
  grid-column: span 2;
}
.sub-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 14px 16px;
}
.sub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.sub-head h4 {
  font-size: 13px;
  font-weight: 700;
}
.sub-head span {
  font-size: 11px;
}
.event-list {
  display: flex;
  flex-direction: column;
}
.event-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line);
}
.event-list li:last-child {
  border-bottom: none;
}
.ev-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
  flex: none;
}
.ev-dot.warn {
  background: var(--warn);
}
.ev-dot.danger {
  background: var(--danger);
}
.ev-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ev-main b {
  font-size: 12.5px;
  color: var(--ink);
  font-weight: 600;
}
.ev-main span {
  font-size: 10.5px;
  color: var(--ink-3);
}
.disclaimer {
  font-size: 11px;
  line-height: 1.7;
  color: var(--ink-3);
  padding: 0 2px;
}
.drawer-foot {
  flex: none;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.22s ease;
}
.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.24s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(30px);
}

@media (max-width: 560px) {
  .drawer {
    width: 100vw;
  }
  .info-grid {
    grid-template-columns: 1fr;
  }
  .info-item.span-2 {
    grid-column: auto;
  }
}
</style>
