<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import StatCard from '../components/StatCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import PaginationBar from '../components/PaginationBar.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import EmptyState from '../components/EmptyState.vue'
import api from '../mock/api'
import { useToast } from '../stores/toast'
import { formatTemp, timeAgo } from '../utils/format'

const toast = useToast()

const diag = ref(null)
const loading = ref(false)
const syslog = ref([])
const logTotal = ref(0)
const logPage = ref(1)
const logPageSize = 10
const logPageCount = ref(1)
const logLevel = ref('')
const logLoading = ref(false)
const clearOpen = ref(false)
const clearing = ref(false)

let timer = null

const temp = computed(() =>
  diag.value ? formatTemp(diag.value.system.temperature_c, diag.value.system.temp_unit) : '—'
)

const storageTone = (percent) => (percent >= 80 ? 'danger' : percent >= 60 ? 'warn' : 'ok')
const levelTone = { INFO: 'info', WARN: 'warn', ERROR: 'danger' }

async function loadDiagnostics() {
  loading.value = true
  try {
    diag.value = await api.getDiagnostics()
  } finally {
    loading.value = false
  }
}

async function loadSyslog() {
  logLoading.value = true
  try {
    const res = await api.getSyslog({
      page: logPage.value,
      page_size: logPageSize,
      level: logLevel.value
    })
    syslog.value = res.items
    logTotal.value = res.total
    logPageCount.value = Math.max(1, Math.ceil(res.total / logPageSize))
  } finally {
    logLoading.value = false
  }
}

function onLevelChange() {
  logPage.value = 1
  loadSyslog()
}

function setLogPage(p) {
  logPage.value = p
  loadSyslog()
}

async function doClear() {
  clearing.value = true
  try {
    const res = await api.clearSyslog()
    clearOpen.value = false
    logPage.value = 1
    await Promise.all([loadSyslog(), loadDiagnostics()])
    toast.success(`已清除 ${res.cleared} 条系统日志`)
  } finally {
    clearing.value = false
  }
}

function refreshAll() {
  loadDiagnostics()
  loadSyslog()
}

onMounted(() => {
  refreshAll()
  timer = setInterval(loadDiagnostics, 5000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">通信诊断</h1>
      <button class="btn" :disabled="loading" @click="refreshAll">
        <AppIcon name="refresh" :size="15" :class="{ spin: loading }" />
        {{ loading ? '诊断中…' : '刷新诊断' }}
      </button>
    </div>

    <div v-if="!diag" class="card"><div class="empty">正在执行通信诊断…</div></div>

    <template v-else>
      <div class="grid cols-4">
        <StatCard
          label="在线模块"
          :value="`${diag.modules.filter((m) => m.online).length}/4`"
          icon="channels"
          accent="var(--ok)"
        />
        <StatCard
          label="I²C 错误累计"
          :value="diag.i2c_error_total"
          unit="次"
          icon="diagnostics"
          accent="var(--warn)"
          :tone="diag.i2c_error_total > 0 ? 'warn' : 'ok'"
        />
        <StatCard
          label="CRC 校验错误"
          :value="diag.crc_error_total"
          unit="次"
          icon="shield"
          accent="var(--danger)"
          :tone="diag.crc_error_total > 0 ? 'warn' : 'ok'"
        />
        <StatCard
          label="队列待处理"
          :value="diag.queue_pending_total"
          unit="条"
          icon="events"
          accent="var(--brand)"
        />
      </div>

      <section class="card rows-card">
        <div class="card-head">
          <h3 class="card-title">STM32 模块通信状态</h3>
          <span class="muted" style="font-size: 12px">最近通信自动刷新</span>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>模块</th>
                <th>地址</th>
                <th>状态</th>
                <th style="min-width: 110px">剩余寿命</th>
                <th>固件</th>
                <th class="num">心跳</th>
                <th class="num">I²C 错误</th>
                <th class="num">CRC 错误</th>
                <th class="num">重启</th>
                <th style="min-width: 150px">事件队列</th>
                <th class="num">溢出</th>
                <th>最近通信</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in diag.modules" :key="m.module_id">
                <td><b class="mod-name">M{{ m.module_id }}</b></td>
                <td class="mono">{{ m.address }}</td>
                <td><StatusBadge :tone="m.online ? 'ok' : 'muted'" :label="m.online ? '在线' : '离线'" live /></td>
                <td>
                  <span class="mono" :class="{ alert: m.life_percent < m.alarm_threshold }">{{ Math.round(m.life_percent) }}%</span>
                </td>
                <td class="mono">{{ m.firmware }}</td>
                <td class="num">{{ m.heartbeat_counter.toLocaleString() }}</td>
                <td class="num" :class="{ alert: m.communication_error_count > 20 }">{{ m.communication_error_count }}</td>
                <td class="num" :class="{ alert: m.crc_error_count > 5 }">{{ m.crc_error_count }}</td>
                <td class="num">{{ m.restart_count }}</td>
                <td>
                  <div class="queue-cell">
                    <div class="progress" :class="m.queue_used > m.queue_capacity * 0.7 ? 'warn' : 'ok'">
                      <span :style="{ width: (m.queue_used / m.queue_capacity) * 100 + '%' }"></span>
                    </div>
                    <span class="mono">{{ m.queue_used }}/{{ m.queue_capacity }}</span>
                  </div>
                </td>
                <td class="num" :class="{ alert: m.event_overflow_count > 0 }">{{ m.event_overflow_count }}</td>
                <td class="nowrap">{{ timeAgo(m.last_communication_time) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid cols-2 mid-grid">
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">存储使用情况</h3>
            <AppIcon name="database" :size="18" style="color: var(--ink-3)" />
          </div>
          <div class="card-body">
            <ul class="storage-list">
              <li v-for="s in diag.storage" :key="s.name">
                <div class="storage-top">
                  <span>{{ s.name }}</span>
                  <b class="mono">{{ s.used }} / {{ s.total }} {{ s.unit }} · {{ s.percent }}%</b>
                </div>
                <div class="progress" :class="storageTone(s.percent)">
                  <span :style="{ width: s.percent + '%' }"></span>
                </div>
              </li>
            </ul>
            <div class="storage-note">
              <AppIcon name="info" :size="15" />
              <span>存储空间不足时产生告警，不会静默删除未上报事件。</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3 class="card-title">网络与主控</h3>
            <StatusBadge tone="ok" label="网络已连接" live />
          </div>
          <div class="card-body">
            <dl class="sys-list">
              <div><dt>链路速率</dt><dd>{{ diag.network.link }}</dd></div>
              <div><dt>IP 地址</dt><dd class="mono">{{ diag.network.ip }}</dd></div>
              <div><dt>MAC 地址</dt><dd class="mono">{{ diag.network.mac }}</dd></div>
              <div><dt>DHCP</dt><dd>{{ diag.network.dhcp ? '已启用' : '手动配置' }}</dd></div>
              <div><dt>固件版本</dt><dd class="mono">{{ diag.system.firmware }}</dd></div>
              <div><dt>运行时间</dt><dd>{{ diag.system.uptime_text }}</dd></div>
              <div><dt>Boot ID</dt><dd class="mono">#{{ diag.system.boot_id }}</dd></div>
              <div><dt>环境温度</dt><dd>{{ temp }}</dd></div>
              <div><dt>I²C 速率</dt><dd>{{ diag.system.i2c_speed }}</dd></div>
              <div><dt>已存事件</dt><dd class="mono">{{ diag.event_total_stored }} 条</dd></div>
            </dl>
          </div>
        </section>
      </div>

      <section class="card log-card">
        <div class="card-head">
          <h3 class="card-title">系统日志（Syslog）</h3>
          <div class="row">
            <select v-model="logLevel" class="select log-select" @change="onLevelChange">
              <option value="">全部级别</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
            <button class="btn sm" :disabled="logLoading" @click="loadSyslog">
              <AppIcon name="refresh" :size="14" />刷新
            </button>
            <button class="btn sm danger" :disabled="!logTotal" @click="clearOpen = true">
              <AppIcon name="close" :size="14" />清除
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data log-table">
            <thead>
              <tr>
                <th style="width: 90px">级别</th>
                <th style="width: 170px">时间</th>
                <th style="width: 110px">来源</th>
                <th>消息</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in syslog" :key="log.log_id">
                <td><StatusBadge :tone="levelTone[log.level]" :label="log.level" plain /></td>
                <td class="mono nowrap">{{ log.time }}</td>
                <td>{{ log.source_label }}</td>
                <td class="log-msg">{{ log.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-if="!logLoading && !syslog.length" icon="events" title="暂无系统日志" desc="清除后新的日志会在此显示" />
        <div v-if="logLoading" class="empty">正在读取系统日志…</div>
        <PaginationBar
          v-else-if="syslog.length"
          :page="logPage"
          :page-count="logPageCount"
          :total="logTotal"
          :page-size="logPageSize"
          @update:page="setLogPage"
        />
      </section>
    </template>

    <ConfirmDialog
      :open="clearOpen"
      title="清除系统日志？"
      message="将删除当前设备保存的全部 Syslog 记录，此操作不可恢复。"
      detail="事件日志与统计数据不受影响，清除后仍会写入一条操作记录。"
      confirm-text="清除日志"
      tone="danger"
      :busy="clearing"
      @confirm="doClear"
      @cancel="clearOpen = false"
    />
  </div>
</template>

<style scoped>
.spin {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.rows-card {
  margin-top: 16px;
  overflow: hidden;
}
.mid-grid {
  margin-top: 16px;
}
.mod-name {
  font-weight: 600;
  color: var(--ink);
}
td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.alert {
  color: var(--danger);
  font-weight: 700;
}
.queue-cell {
  display: flex;
  align-items: center;
  gap: 7px;
}
.queue-cell .progress {
  flex: 1;
  height: 5px;
  min-width: 60px;
}
.queue-cell span {
  font-size: 10.5px;
  color: var(--ink-3);
  white-space: nowrap;
}

.storage-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.storage-list li {
  position: relative;
}
.storage-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--ink-2);
}
.storage-top b {
  font-size: 11px;
  color: var(--ink-3);
}
.storage-note {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 11.5px;
  color: var(--ink-3);
  line-height: 1.6;
}
.storage-note svg {
  flex: none;
  color: var(--brand);
}

.sys-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
  margin: 0;
}
.sys-list div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line);
}
.sys-list dt {
  font-size: 12px;
  color: var(--ink-3);
  flex: none;
}
.sys-list dd {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  text-align: right;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-card {
  margin-top: 16px;
  overflow: hidden;
}
.log-select {
  width: 120px;
  height: 32px;
  font-size: 12px;
}
.log-table td.log-msg {
  color: var(--ink-2);
  min-width: 320px;
}

@media (max-width: 1100px) {
  .sys-list {
    grid-template-columns: 1fr;
  }
}
</style>
