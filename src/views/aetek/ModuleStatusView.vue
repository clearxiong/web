<script setup>
import { computed, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import StatCard from '../../components/StatCard.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import { useAetek } from '../../stores/aetek'
import { useToast } from '../../stores/toast'
import { AETEK_STATUS } from '../../mock/aetek'
import { timeAgo } from '../../utils/format'

const { state, simulateSurge, refreshModules } = useAetek()
const toast = useToast()

const busyId = ref(0)
const refreshing = ref(false)

const modules = computed(() => state.modules)

const stats = computed(() => ({
  total: modules.value.length,
  online: modules.value.filter((m) => m.status !== 'OFFLINE').length,
  alarm: modules.value.filter((m) => m.status === 'ALARM').length,
  surges: modules.value.reduce((sum, m) => sum + m.surge_count, 0)
}))

const legend = Object.values(AETEK_STATUS)

function barTone(module) {
  if (module.status === 'ALARM') return 'danger'
  if (module.status === 'FAIL' || module.status === 'OFFLINE') return 'warn'
  return 'ok'
}

async function onSimulate(module) {
  if (busyId.value) return
  busyId.value = module.module_id
  try {
    const updated = await simulateSurge(module.module_id)
    toast.warn(
      `${updated.label} 模拟雷击：计数 ${updated.surge_count}，寿命已用 ${updated.life_used}%（${updated.status_code}）`
    )
  } catch (err) {
    toast.error(err.message || '模拟雷击失败')
  } finally {
    busyId.value = 0
  }
}

async function onRandom() {
  if (busyId.value) return
  busyId.value = -1
  try {
    const updated = await simulateSurge()
    toast.warn(
      `${updated.label} 模拟雷击：计数 ${updated.surge_count}，寿命已用 ${updated.life_used}%（${updated.status_code}）`
    )
  } catch (err) {
    toast.error(err.message || '模拟雷击失败')
  } finally {
    busyId.value = 0
  }
}

async function refresh() {
  refreshing.value = true
  try {
    await refreshModules()
    toast.success('模块状态已刷新')
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">模块状态</h1>
        <p class="page-sub">防雷监测 › 模块状态：每个防雷模块的寿命、雷击计数与状态（Module Status，手册 3-2）</p>
      </div>
      <div class="row">
        <button class="btn" :disabled="refreshing" @click="refresh">
          <AppIcon name="refresh" :size="15" :class="{ spin: refreshing }" />刷新
        </button>
        <button class="btn primary" :disabled="Boolean(busyId)" @click="onRandom">
          <AppIcon name="bolt" :size="15" />模拟雷击
        </button>
      </div>
    </div>

    <div class="grid cols-4">
      <StatCard label="防雷模块" :value="stats.total" unit="个" icon="channels" accent="var(--brand)" foot="SD-504 · 4 通道" />
      <StatCard label="在线模块" :value="`${stats.online}/${stats.total}`" icon="wifi" accent="var(--ok)" foot="OFFLINE 不计入" />
      <StatCard
        label="告警模块"
        :value="stats.alarm"
        unit="个"
        icon="alert"
        :accent="stats.alarm ? 'var(--warn)' : 'var(--ok)'"
        :tone="stats.alarm ? 'warn' : 'ok'"
        foot="寿命已用达到阈值"
      />
      <StatCard label="累计雷击" :value="stats.surges" unit="次" icon="bolt" accent="#0f9d8f" foot="4 个模块雷击次数合计" />
    </div>

    <section class="card table-card">
      <div class="card-head">
        <div>
          <h3 class="card-title">模块状态表</h3>
          <p class="card-sub">一模块一行：剩余寿命条达到告警阈值时，状态变为 ALARM</p>
        </div>
        <span class="mono muted" style="font-size: 11px">SD-504 · 4 个模块</span>
      </div>
      <div class="card-body flush">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th style="width: 80px">模块</th>
                <th style="width: 150px">安装位置</th>
                <th style="width: 240px">剩余寿命</th>
                <th style="width: 130px">雷击次数</th>
                <th style="width: 130px">状态</th>
                <th>最近雷击</th>
                <th style="width: 110px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="module in modules" :key="module.module_id">
                <td class="strong mono">{{ module.label }}</td>
                <td>{{ module.location }}</td>
                <td>
                  <template v-if="module.status === 'OFFLINE' || module.status === 'UNKNOWN'">
                    <span class="muted">—</span>
                  </template>
                  <template v-else>
                    <div class="life">
                      <div class="progress" :class="barTone(module)">
                        <span :style="{ width: module.life_remaining + '%' }"></span>
                      </div>
                      <span class="life-text mono">{{ module.life_remaining }}%</span>
                    </div>
                    <span class="life-sub">已用 {{ module.life_used }}% · 阈值 {{ module.alarm_trigger }}%</span>
                  </template>
                </td>
                <td>
                  <b class="mono count">{{ module.surge_count }}</b>
                  <span class="unit">次</span>
                </td>
                <td>
                  <span class="status-cell">
                    <StatusBadge :tone="module.status_tone" :label="module.status_code" plain />
                    <em>{{ module.status_label }}</em>
                  </span>
                </td>
                <td class="muted">{{ module.last_surge_time ? timeAgo(module.last_surge_time) : '—' }}</td>
                <td>
                  <button
                    class="btn sm"
                    :disabled="Boolean(busyId) || module.status === 'OFFLINE'"
                    @click="onSimulate(module)"
                  >
                    <AppIcon name="bolt" :size="13" />模拟
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="grid cols-2 lower">
      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">状态取值说明</h3>
            <p class="card-sub">手册列出的 7 种模块状态取值</p>
          </div>
          <AppIcon name="info" :size="18" class="head-icon" />
        </div>
        <div class="card-body">
          <ul class="status-list">
            <li v-for="item in legend" :key="item.code">
              <StatusBadge :tone="item.tone" :label="item.code" plain />
              <div>
                <b>{{ item.label }}</b>
                <p>{{ item.desc }}</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">口径与限制</h3>
            <p class="card-sub">这套原厂 UI 的取舍</p>
          </div>
          <AppIcon name="alert" :size="18" class="head-icon" />
        </div>
        <div class="card-body">
          <ul class="notes">
            <li>
              <i class="dot warn"></i>
              <span><b>ALARM 与 FAIL 同列：</b>ALARM 表示寿命已用超阈值但仍在工作，FAIL 表示模块失效需更换，手册未明确边界。</span>
            </li>
            <li>
              <i class="dot info"></i>
              <span><b>没有趋势：</b>页面只给当前值，没有雷击幅值、波形与最近雷击时间线，追溯依赖 SysLog 文本。</span>
            </li>
            <li>
              <i class="dot ok"></i>
              <span><b>显式保存：</b>所有修改都在右上角「保存配置」时统一提交，配合自动登出避免误改。</span>
            </li>
            <li>
              <i class="dot"></i>
              <span><b>计数可重置：</b>更换模块后在浪涌设置勾选「重置计数」，本次寿命周期的计数重新开始。</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.head-icon {
  color: var(--ink-3);
}
.table-card {
  margin-top: 16px;
}
.life {
  display: flex;
  align-items: center;
  gap: 10px;
}
.life .progress {
  flex: 1;
  height: 9px;
}
.life-text {
  font-size: 12px;
  font-weight: 700;
  width: 38px;
  text-align: right;
}
.life-sub {
  display: block;
  margin-top: 4px;
  font-size: 10.5px;
  color: var(--ink-3);
}
.count {
  font-size: 16px;
}
.unit {
  margin-left: 3px;
  font-size: 11px;
  color: var(--ink-3);
}
.status-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}
.status-cell em {
  font-style: normal;
  font-size: 11px;
  color: var(--ink-3);
}
.spin {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.lower {
  margin-top: 16px;
}
.status-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--line);
}
.status-list li:last-child {
  border-bottom: none;
}
.status-list b {
  font-size: 12.5px;
}
.status-list p {
  font-size: 11.5px;
  color: var(--ink-3);
  line-height: 1.5;
}
.notes li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-2);
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.notes li:last-child {
  border-bottom: none;
}
.notes .dot {
  margin-top: 7px;
}
</style>
