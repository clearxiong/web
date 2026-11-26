<script setup>
const slotNames = ['霍尔比较器', '光敏采集', '事件锁存', 'I2C 从机']

import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import StatusBadge from '../components/StatusBadge.vue'
import PaginationBar from '../components/PaginationBar.vue'
import EmptyState from '../components/EmptyState.vue'
import Modal from '../components/Modal.vue'
import api from '../mock/api'
import { useToast } from '../stores/toast'
import { downloadFile, toCsv } from '../utils/format'

const route = useRoute()
const toast = useToast()
const { EVENT_TYPES, EVENT_LEVELS } = api.meta

const filters = reactive({
  start: '',
  end: '',
  channel_id: '',
  module_id: '',
  event_type: '',
  event_level: ''
})

const page = ref(1)
const pageSize = 20
const total = ref(0)
const pageCount = ref(1)
const items = ref([])
const loading = ref(false)
const exporting = ref(false)
const selected = ref(null)

const levelTone = { 1: 'muted', 2: 'warn', 3: 'danger' }
const typeEntries = Object.values(EVENT_TYPES)

const hasFilters = computed(() =>
  Object.values(filters).some((v) => v !== '')
)

async function load() {
  loading.value = true
  try {
    const res = await api.getEvents({
      page: page.value,
      page_size: pageSize,
      ...filters
    })
    items.value = res.items
    total.value = res.total
    pageCount.value = res.page_count
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  page.value = 1
  load()
}

function onReset() {
  Object.keys(filters).forEach((k) => (filters[k] = ''))
  page.value = 1
  load()
}

function setPage(p) {
  page.value = p
  load()
}

async function exportCsv() {
  exporting.value = true
  try {
    const res = await api.getEvents({ page: 1, page_size: 5000, ...filters })
    const csv = toCsv(res.items, [
      { key: 'event_id_text', label: '事件ID' },
      { key: 'time_text', label: '设备时间' },
      { key: 'boot_id', label: 'Boot ID' },
      { key: 'event_counter', label: '事件序号' },
      { key: 'module_id', label: '模块' },
      { key: 'channel_name', label: '通道' },
      { key: 'type_label', label: '事件类型' },
      { key: 'level_label', label: '事件等级' },
      { key: 'hall_state', label: '霍尔状态' },
      { key: 'optical_state', label: '光敏状态' },
      { key: 'acknowledged', label: '已确认' },
      { key: 'uploaded', label: '已上报' },
      { key: 'event_flags', label: '事件标志' }
    ])
    downloadFile(`surge-events-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8')
    toast.success(`已导出 ${res.items.length} 条事件记录`)
  } finally {
    exporting.value = false
  }
}

function openDetail(ev) {
  selected.value = ev
}

function applyRouteChannel() {
  const id = route.query.channel_id
  if (id && !filters.channel_id) {
    filters.channel_id = String(id)
    load()
  }
}

watch(
  () => route.query.channel_id,
  (id) => {
    if (id) {
      filters.channel_id = String(id)
      page.value = 1
      load()
    }
  }
)

onMounted(() => {
  applyRouteChannel()
  load()
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">事件记录</h1>
      <button class="btn" :disabled="exporting" @click="exportCsv">
        <AppIcon name="download" :size="15" />
        {{ exporting ? '导出中…' : '导出 CSV' }}
      </button>
    </div>

    <section class="card filter-card">
      <div class="filter-grid">
        <div class="field">
          <label>开始日期</label>
          <input v-model="filters.start" class="input" type="date" @change="onFilterChange" />
        </div>
        <div class="field">
          <label>结束日期</label>
          <input v-model="filters.end" class="input" type="date" @change="onFilterChange" />
        </div>
        <div class="field">
          <label>通道</label>
          <select v-model="filters.channel_id" class="select" @change="onFilterChange">
            <option value="">全部通道</option>
            <option v-for="i in 16" :key="i" :value="String(i)">
              CH{{ String(i).padStart(2, '0') }} · {{ slotNames[(i - 1) % 4] }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>模块</label>
          <select v-model="filters.module_id" class="select" @change="onFilterChange">
            <option value="">全部模块</option>
            <option v-for="i in 4" :key="i" :value="String(i)">模块 {{ i }}</option>
          </select>
        </div>
        <div class="field">
          <label>事件类型</label>
          <select v-model="filters.event_type" class="select" @change="onFilterChange">
            <option value="">全部类型</option>
            <option v-for="t in typeEntries" :key="t.key" :value="t.key">{{ t.label }}</option>
          </select>
        </div>
        <div class="field">
          <label>事件等级</label>
          <select v-model="filters.event_level" class="select" @change="onFilterChange">
            <option value="">全部等级</option>
            <option v-for="(l, k) in EVENT_LEVELS" :key="k" :value="String(k)">{{ l.label }}</option>
          </select>
        </div>
      </div>
      <div class="filter-foot">
        <span class="muted" style="font-size: 12px">
          共 {{ total }} 条记录<template v-if="hasFilters"> · 已应用筛选条件</template>
        </span>
        <button class="btn sm ghost" @click="onReset">清除筛选</button>
      </div>
    </section>

    <section class="card table-card">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>事件时间</th>
              <th>事件 ID</th>
              <th>通道</th>
              <th>模块</th>
              <th>事件类型</th>
              <th>等级</th>
              <th>霍尔</th>
              <th>光敏</th>
              <th>确认 / 上报</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in items" :key="ev.event_id" class="clickable" @click="openDetail(ev)">
              <td class="mono nowrap">{{ ev.time_text }}</td>
              <td class="mono">{{ ev.event_id_text }}</td>
              <td><b class="ch">{{ ev.channel_name }}</b></td>
              <td>M{{ ev.module_id }}</td>
              <td>{{ ev.type_label }}</td>
              <td><StatusBadge :tone="levelTone[ev.event_level]" :label="ev.level_label" plain /></td>
              <td>{{ ev.hall_state ? '触发' : '未触发' }}</td>
              <td>{{ { NORMAL: '正常', ABNORMAL: '异常', UNKNOWN: '未知' }[ev.optical_state] || '—' }}</td>
              <td>
                <span class="ack">
                  <i class="dot" :class="ev.acknowledged ? 'ok' : 'warn'"></i>
                  {{ ev.acknowledged ? '已确认' : '未确认' }}
                </span>
                <span class="ack">
                  <i class="dot" :class="ev.uploaded ? 'ok' : 'muted'"></i>
                  {{ ev.uploaded ? '已上报' : '待上报' }}
                </span>
              </td>
              <td class="col-op">
                <button class="link-btn" @click.stop="openDetail(ev)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="empty">正在查询事件记录…</div>
      <EmptyState
        v-else-if="!items.length"
        icon="events"
        title="没有符合条件的事件"
        desc="尝试放宽时间范围或清除筛选条件"
      />
      <PaginationBar
        v-else
        :page="page"
        :page-count="pageCount"
        :total="total"
        :page-size="pageSize"
        @update:page="setPage"
      />
    </section>

    <Modal :open="Boolean(selected)" title="事件详情" width="520px" @close="selected = null">
      <div v-if="selected" class="detail">
        <div class="detail-top">
          <div>
            <span class="detail-id mono">#{{ selected.event_id_text }}</span>
            <p class="detail-time mono">{{ selected.time_text }}</p>
          </div>
          <div class="row" style="gap: 6px">
            <StatusBadge :tone="levelTone[selected.event_level]" :label="selected.level_label" />
            <StatusBadge tone="info" :label="selected.type_label" plain />
          </div>
        </div>

        <dl class="detail-grid">
          <div><dt>通道</dt><dd>{{ selected.channel_name }} · 模块 {{ selected.module_id }}</dd></div>
          <div><dt>Boot ID</dt><dd class="mono">{{ selected.boot_id }}</dd></div>
          <div><dt>事件序号</dt><dd class="mono">{{ selected.event_counter }}</dd></div>
          <div><dt>模块时钟</dt><dd class="mono">{{ selected.module_tick }}</dd></div>
          <div><dt>时间可信度</dt><dd>{{ { TIME_VALID: 'TIME_VALID 可靠', TIME_ESTIMATED: 'TIME_ESTIMATED 推算', TIME_UNKNOWN: 'TIME_UNKNOWN 未知' }[selected.time_quality] || selected.time_quality }}</dd></div>
          <div><dt>事件标志</dt><dd class="mono">{{ selected.event_flags }}</dd></div>
          <div><dt>霍尔状态</dt><dd>{{ selected.hall_state ? '已触发' : '未触发' }}</dd></div>
          <div><dt>光敏状态</dt><dd>{{ { NORMAL: '正常', ABNORMAL: '异常', UNKNOWN: '未知' }[selected.optical_state] || '—' }}</dd></div>
          <div><dt>持久化</dt><dd><StatusBadge :tone="selected.acknowledged ? 'ok' : 'warn'" :label="selected.acknowledged ? '已确认' : '未确认'" plain /></dd></div>
          <div><dt>上报状态</dt><dd><StatusBadge :tone="selected.uploaded ? 'ok' : 'muted'" :label="selected.uploaded ? '已上报' : '待上报'" plain /></dd></div>
        </dl>

        <p class="detail-note">
          阈值触发事件表示霍尔比较器检测到超过设定阈值的信号，不能据此直接计算 TVS/GDT 吸收能量，
          也不能等同于一次雷击。事件先持久化再向采集模块 ACK，确保掉电不丢失。
        </p>
      </div>
      <template #footer>
        <button class="btn" @click="selected = null">关闭</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.filter-card {
  padding: 16px;
  margin-bottom: 16px;
}
.filter-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}
.filter-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px dashed var(--line);
}
.ch {
  color: var(--ink);
  font-weight: 700;
}
.ack {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--ink-3);
  margin-right: 10px;
  white-space: nowrap;
}
.table-card {
  overflow: hidden;
}

.detail-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}
.detail-id {
  font-size: 18px;
  font-weight: 700;
}
.detail-time {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 18px;
  margin: 4px 0 0;
}
.detail-grid > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line);
}
.detail-grid dt {
  font-size: 12px;
  color: var(--ink-3);
  flex: none;
}
.detail-grid dd {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  text-align: right;
  color: var(--ink);
}
.detail-note {
  margin-top: 14px;
  padding: 11px 13px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

@media (max-width: 1100px) {
  .filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
