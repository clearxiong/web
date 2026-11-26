<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import StatCard from '../components/StatCard.vue'
import BarChart from '../components/charts/BarChart.vue'
import LineChart from '../components/charts/LineChart.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import api from '../mock/api'
import { formatClock } from '../utils/format'

const stats = ref(null)
const diagnostics = ref(null)
const loading = ref(false)
const updatedAt = ref(null)

const typeColors = {
  阈值触发: '#1d5fd6',
  光敏变化: '#d97706',
  通信异常: '#7c3aed',
  模块离线: '#dc2626',
  队列溢出: '#64748b'
}

const typeData = computed(() =>
  (stats.value?.type_distribution || []).map((t) => ({
    label: t.label,
    value: t.count,
    color: typeColors[t.label]
  }))
)

const recentEventTotal = computed(() =>
  typeData.value.reduce((sum, t) => sum + t.value, 0)
)

const dailyMax = computed(() =>
  Math.max(1, ...(stats.value?.daily || []).map((d) => d.count))
)

const slotColors = ['#1d5fd6', '#0f9d8f', '#d97706', '#7c3aed']
const slotNames = ['霍尔', '光敏', '锁存', 'I²C']

const channelData = computed(() =>
  (stats.value?.channel_event_count || []).map((c, i) => ({
    ...c,
    label: c.label.split(' ')[0],
    title: c.label,
    color: slotColors[i % slotColors.length]
  }))
)

async function load() {
  loading.value = true
  try {
    const [s, d] = await Promise.all([api.getStatistics(), api.getDiagnostics()])
    stats.value = s
    diagnostics.value = d
    updatedAt.value = new Date()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">统计分析</h1>
      <div class="row">
        <span class="updated">统计于 {{ updatedAt ? formatClock(updatedAt) : '—' }}</span>
        <button class="btn" :disabled="loading" @click="load">
          <AppIcon name="refresh" :size="15" :class="{ spin: loading }" />
          {{ loading ? '统计中…' : '刷新统计' }}
        </button>
      </div>
    </div>

    <div v-if="!stats" class="card"><div class="empty">正在汇总统计数据…</div></div>

    <template v-else>
      <div class="grid cols-4">
        <StatCard
          label="累计浪涌事件"
          :value="stats.total_event_count"
          unit="次"
          icon="bolt"
          accent="var(--brand)"
        />
        <StatCard
          label="今日事件"
          :value="stats.daily_event_count"
          unit="次"
          icon="clock"
          accent="#0f9d8f"
        />
        <StatCard
          label="本月事件"
          :value="stats.monthly_event_count"
          unit="次"
          icon="stats"
          accent="#7c3aed"
        />
        <StatCard
          label="高等级事件"
          :value="stats.high_level_count"
          unit="次"
          icon="alert"
          accent="var(--warn)"
          :tone="stats.high_level_count > 0 ? 'warn' : 'ok'"
        />
      </div>

      <div class="grid cols-2 chart-row">
        <section class="card">
          <div class="card-head">
            <div>
              <h3 class="card-title">每日事件趋势</h3>
            </div>
            <span class="peak">峰值 {{ dailyMax }} 次</span>
          </div>
          <div class="card-body">
            <LineChart
              :data="stats.daily"
              :height="238"
              color="#1d5fd6"
              unit="次"
              caption="近 30 天 · 阈值触发（次）"
            />
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h3 class="card-title">事件类型分布</h3>
            </div>
          </div>
          <div class="card-body donut-body">
            <DonutChart
              :data="typeData"
              :size="182"
              center-label="近 30 天事件"
              :center-value="recentEventTotal"
              unit="次"
            />
          </div>
        </section>
      </div>

      <section class="card full-row">
        <div class="card-head">
          <h3 class="card-title">16 个接口通道事件次数</h3>
        </div>
        <div class="card-body">
          <div class="chart-legend">
            <span v-for="(name, i) in slotNames" :key="name">
              <i :style="{ background: slotColors[i] }"></i>{{ name }}
            </span>
          </div>
          <BarChart :data="channelData" :height="250" unit="次" caption="单位：次" />
        </div>
      </section>

      <div class="grid cols-3 chart-row">
        <section class="card">
          <div class="card-head">
            <div>
              <h3 class="card-title">模块事件对比</h3>
            </div>
          </div>
          <div class="card-body">
            <BarChart :data="stats.module_event_count" :height="200" color="#0f9d8f" unit="次" />
            <ul class="module-legend">
              <li v-for="m in stats.module_event_count" :key="m.module_id">
                <span>{{ m.label }}</span>
                <b>{{ m.count }}</b>
              </li>
            </ul>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h3 class="card-title">每月事件统计</h3>
            </div>
          </div>
          <div class="card-body">
            <BarChart :data="stats.monthly" :height="200" color="#7c3aed" unit="次" caption="近 12 个月（次）" />
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h3 class="card-title">异常与故障统计</h3>
            </div>
          </div>
          <div class="card-body">
            <ul class="abnormal-list">
              <li>
                <span class="ab-icon warn"><AppIcon name="alert" :size="15" /></span>
                <div>
                  <b>{{ stats.optical_fault_count }}</b>
                  <span>光敏异常通道</span>
                </div>
                <em>当前</em>
              </li>
              <li>
                <span class="ab-icon danger"><AppIcon name="diagnostics" :size="15" /></span>
                <div>
                  <b>{{ diagnostics?.i2c_error_total ?? '—' }}</b>
                  <span>I²C 通信错误</span>
                </div>
                <em>累计</em>
              </li>
              <li>
                <span class="ab-icon danger"><AppIcon name="shield" :size="15" /></span>
                <div>
                  <b>{{ diagnostics?.crc_error_total ?? '—' }}</b>
                  <span>CRC 校验错误</span>
                </div>
                <em>累计</em>
              </li>
              <li>
                <span class="ab-icon muted"><AppIcon name="events" :size="15" /></span>
                <div>
                  <b>{{ stats.event_overflow_count }}</b>
                  <span>事件队列溢出</span>
                </div>
                <em>累计</em>
              </li>
            </ul>
            <p class="abnormal-note">
              通信与队列异常来源于采集模块与 I²C 总线诊断；异常次数用于运维排查，不参与寿命百分比计算。
            </p>
          </div>
        </section>
      </div>

      <section class="card health-card">
        <div class="card-head">
          <div>
            <h3 class="card-title">健康风险分布</h3>
          </div>
          <AppIcon name="gauge" :size="18" style="color: var(--ink-3)" />
        </div>
        <div class="card-body health-body">
          <div class="health-col">
            <div class="hcol-top"><b class="ok">{{ stats.health_summary.good }}</b><span>寿命充足 ≥90%</span></div>
            <div class="progress ok"><span :style="{ width: (stats.health_summary.good / 4) * 100 + '%' }"></span></div>
          </div>
          <div class="health-col">
            <div class="hcol-top"><b class="warn">{{ stats.health_summary.attention }}</b><span>建议巡检 80–90%</span></div>
            <div class="progress warn"><span :style="{ width: (stats.health_summary.attention / 4) * 100 + '%' }"></span></div>
          </div>
          <div class="health-col">
            <div class="hcol-top"><b class="danger">{{ stats.health_summary.warning }}</b><span>接近阈值 &lt;80%</span></div>
            <div class="progress danger"><span :style="{ width: (stats.health_summary.warning / 4) * 100 + '%' }"></span></div>
          </div>
        </div>
      </section>

      <p class="disclaimer">
        统计以事件日志为事实来源。事件先持久化再更新统计，掉电后可从日志恢复；
        健康分层仅为风险提示，不表示器件损伤百分比。
      </p>
    </template>
  </div>
</template>

<style scoped>
.updated {
  font-size: 12px;
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
.chart-row {
  margin-top: 16px;
}
.full-row {
  margin-top: 16px;
}
.peak {
  font-size: 11px;
  color: var(--ink-3);
  background: var(--surface-3);
  border-radius: 4px;
  padding: 4px 10px;
}
.donut-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 274px;
}
.chart-legend {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-bottom: 6px;
  font-size: 11.5px;
  color: var(--ink-3);
}
.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.chart-legend i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.module-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 14px;
  margin-top: 12px;
}
.module-legend li {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ink-3);
  border-bottom: 1px dashed var(--line);
  padding-bottom: 5px;
}
.module-legend b {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.abnormal-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.abnormal-list li {
  display: flex;
  align-items: center;
  gap: 11px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--line);
}
.abnormal-list li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.ab-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  flex: none;
  background: var(--muted-soft);
  color: var(--muted);
}
.ab-icon.warn {
  background: var(--warn-soft);
  color: var(--warn);
}
.ab-icon.danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.abnormal-list div {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.abnormal-list b {
  font-size: 18px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.abnormal-list span {
  font-size: 11px;
  color: var(--ink-3);
}
.abnormal-list em {
  font-style: normal;
  font-size: 10px;
  color: var(--ink-3);
  background: var(--surface-3);
  border-radius: 4px;
  padding: 2px 7px;
}
.abnormal-note {
  margin-top: 12px;
  font-size: 11px;
  line-height: 1.65;
  color: var(--ink-3);
}

.health-card {
  margin-top: 16px;
}
.health-body {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.health-col {
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 13px 14px;
  background: var(--surface-2);
}
.hcol-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 9px;
}
.hcol-top b {
  font-size: 24px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.hcol-top b.ok {
  color: var(--ok);
}
.hcol-top b.warn {
  color: var(--warn);
}
.hcol-top b.danger {
  color: var(--danger);
}
.hcol-top span {
  font-size: 12px;
  color: var(--ink-2);
  font-weight: 600;
}
.disclaimer {
  margin-top: 18px;
  font-size: 11px;
  color: var(--ink-3);
  line-height: 1.7;
}

@media (max-width: 1024px) {
  .health-body {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
