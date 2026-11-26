<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import ChannelCard from '../components/ChannelCard.vue'
import ChannelDetailDrawer from '../components/ChannelDetailDrawer.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import { useDeviceStore } from '../stores/device'
import { formatDateTime, timeAgo } from '../utils/format'

const { state, refresh } = useDeviceStore()

const statusFilter = ref('')
const moduleFilter = ref('')
const keyword = ref('')
const viewMode = ref('table')
const drawerOpen = ref(false)
const activeChannel = ref(null)

const statusMeta = [
  { key: '', label: '全部' },
  { key: 'NORMAL', label: '正常', tone: 'ok' },
  { key: 'ALARM', label: '触发/锁存', tone: 'warn' },
  { key: 'FAIL', label: '接口异常', tone: 'danger' },
  { key: 'OFFLINE', label: '模块离线', tone: 'muted' },
  { key: 'UNKNOWN', label: '未知', tone: 'info' }
]

const toneMap = {
  NORMAL: 'ok',
  ALARM: 'warn',
  FAIL: 'danger',
  OFFLINE: 'muted',
  UNKNOWN: 'info'
}

const channels = computed(() => state.channels)

const counts = computed(() => {
  const base = { '': channels.value.length }
  channels.value.forEach((c) => {
    base[c.status] = (base[c.status] || 0) + 1
  })
  return base
})

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return channels.value.filter((c) => {
    if (statusFilter.value && c.status !== statusFilter.value) return false
    if (moduleFilter.value && c.module_id !== Number(moduleFilter.value)) return false
    if (kw && !`${c.name} ${c.kind_name} ${c.state_label} M${c.module_id} ${c.module_address}`.toLowerCase().includes(kw)) return false
    return true
  })
})

function openChannel(ch) {
  activeChannel.value = ch.channel_id
  drawerOpen.value = true
}

function resetFilters() {
  statusFilter.value = ''
  moduleFilter.value = ''
  keyword.value = ''
}

onMounted(refresh)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">通道状态</h1>
      <div class="row">
        <div class="segmented" role="group" aria-label="视图切换">
          <button :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">
            <AppIcon name="events" :size="14" />表格
          </button>
          <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
            <AppIcon name="channels" :size="14" />卡片
          </button>
        </div>
      </div>
    </div>

    <section class="card filter-card">
      <div class="chips">
        <button
          v-for="s in statusMeta"
          :key="s.key"
          class="chip"
          :class="{ active: statusFilter === s.key }"
          @click="statusFilter = s.key"
        >
          <i v-if="s.tone" class="dot" :class="s.tone"></i>
          {{ s.label }}
          <em>{{ counts[s.key] || 0 }}</em>
        </button>
      </div>
      <div class="filter-right">
        <div class="field">
          <select v-model="moduleFilter" class="select">
            <option value="">全部模块</option>
            <option v-for="m in 4" :key="m" :value="String(m)">模块 {{ m }}</option>
          </select>
        </div>
        <div class="search">
          <AppIcon name="search" :size="15" />
          <input v-model="keyword" class="input" type="search" placeholder="搜索通道 / 接口类型" />
        </div>
        <button class="btn sm ghost" @click="resetFilters">重置</button>
      </div>
    </section>

    <div v-if="viewMode === 'table'" class="card table-card">
      <div class="table-wrap">
        <table class="data channel-table">
          <thead>
            <tr>
              <th>通道</th>
              <th>接口类型</th>
              <th>所属模块</th>
              <th style="min-width: 120px">模块寿命</th>
              <th class="num">事件次数</th>
              <th>最近事件</th>
              <th>接口状态</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch in filtered" :key="ch.channel_id" class="clickable" @click="openChannel(ch)">
              <td>
                <span class="ch-name">{{ ch.name }}</span>
              </td>
              <td>{{ ch.kind_name }}</td>
              <td>
                <span class="mono">{{ ch.module_address }}</span>
                <span class="muted"> · M{{ ch.module_id }}</span>
              </td>
              <td>
                <span class="mono" :class="{ 'life-low': ch.module_life_percent < 80 }">
                  {{ Math.round(ch.module_life_percent) }}%
                </span>
              </td>
              <td class="num strong">{{ ch.event_count.toLocaleString() }}</td>
              <td class="nowrap">{{ ch.last_event_time ? timeAgo(ch.last_event_time) : '—' }}</td>
              <td><StatusBadge :tone="toneMap[ch.status]" :label="ch.state_label" /></td>
              <td class="col-op">
                <button class="link-btn" @click.stop="openChannel(ch)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState
        v-if="!filtered.length"
        icon="filter"
        title="没有符合条件的通道"
        desc="调整状态、模块或搜索条件后重试"
      />
      <div v-else class="table-foot">
        显示 {{ filtered.length }} / {{ channels.length }} 路通道 · 点击行查看通道详情
      </div>
    </div>

    <div v-else>
      <div class="grid channels">
        <ChannelCard v-for="ch in filtered" :key="ch.channel_id" :channel="ch" @select="openChannel" />
      </div>
      <EmptyState
        v-if="!filtered.length"
        icon="filter"
        title="没有符合条件的通道"
        desc="调整状态、模块或搜索条件后重试"
      />
    </div>

    <section class="card note-card">
      <AppIcon name="info" :size="18" class="note-icon" />
      <div>
        <b>状态口径说明</b>
        <p>
          正常：模块在线、监测信号有效；事件触发：检测到霍尔阈值事件；状态异常：光敏反馈异常；
          监测失效：模块离线或传感器不可确认；未知：刚启动或数据尚未初始化。
          模块寿命为依据浪涌计数与器件冲击次数的参考估算，不表示精确剩余寿命。
        </p>
      </div>
    </section>

    <ChannelDetailDrawer :open="drawerOpen" :channel-id="activeChannel" @close="drawerOpen = false" />
  </div>
</template>

<style scoped>
.life-low {
  color: var(--danger);
  font-weight: 700;
}
.filter-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip em {
  font-style: normal;
  font-size: 10.5px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  padding: 1px 6px;
  font-variant-numeric: tabular-nums;
}
.chip.active em {
  background: rgba(255, 255, 255, 0.22);
}
.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-right .field {
  width: 130px;
}
.search {
  position: relative;
  width: 190px;
}
.search svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-3);
}
.search .input {
  padding-left: 31px;
}

.segmented {
  display: inline-flex;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 2px;
  gap: 2px;
}
.segmented button {
  height: 28px;
  padding: 0 11px;
  border: none;
  background: transparent;
  border-radius: 3px;
  color: var(--ink-3);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.segmented button.active {
  background: var(--brand);
  color: #fff;
}

.channel-table th.num {
  text-align: right;
}
.channel-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ch-name {
  font-weight: 600;
  color: var(--ink);
  font-size: 13px;
  letter-spacing: 0;
}
.loc {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.table-foot {
  padding: 11px 16px;
  font-size: 11.5px;
  color: var(--ink-3);
  border-top: 1px solid var(--line);
}

.note-card {
  margin-top: 18px;
  display: flex;
  gap: 12px;
  padding: 15px 18px;
  background: var(--surface-2);
}
.note-icon {
  color: var(--brand);
  flex: none;
  margin-top: 2px;
}
.note-card b {
  font-size: 13px;
}
.note-card p {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.75;
  color: var(--ink-3);
}

@media (max-width: 900px) {
  .filter-card {
    align-items: flex-start;
  }
  .filter-right {
    width: 100%;
  }
  .search {
    flex: 1;
    min-width: 150px;
  }
}
</style>
