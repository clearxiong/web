<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  height: { type: Number, default: 230 },
  color: { type: String, default: 'var(--brand)' },
  unit: { type: String, default: '次' },
  highlight: { type: String, default: '' },
  caption: { type: String, default: '' }
})

const wrap = ref(null)
const width = ref(620)
let ro = null

onMounted(() => {
  if (!wrap.value) return
  ro = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect?.width || 620
    width.value = Math.max(260, w)
  })
  ro.observe(wrap.value)
})
onBeforeUnmount(() => ro && ro.disconnect())

const M = { top: 20, right: 8, bottom: 30, left: 42 }

const items = computed(() =>
  props.data.map((d) => ({ ...d, value: Number(d.value ?? d.count ?? 0) }))
)

const plotW = computed(() => Math.max(10, width.value - M.left - M.right))
const plotH = computed(() => Math.max(10, props.height - M.top - M.bottom))

function niceMax(value) {
  if (!value || value <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

const maxValue = computed(() => niceMax(Math.max(...items.value.map((d) => d.value))))
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxValue.value * r)))
const slot = computed(() => plotW.value / Math.max(1, items.value.length))
const barW = computed(() => Math.max(5, Math.min(34, slot.value * 0.58)))
const labelStep = computed(() => (slot.value < 28 ? 2 : 1))

function barHeight(v) {
  return (Number(v) || 0) / maxValue.value * plotH.value
}

function x(i) {
  return M.left + slot.value * i + slot.value / 2
}

function y(v) {
  return M.top + plotH.value - barHeight(v)
}

const dimmed = (d) => props.highlight && d.label !== props.highlight
</script>

<template>
  <div ref="wrap" class="chart">
    <svg :width="width" :height="height" role="img">
      <text v-if="caption" :x="M.left" :y="12" class="chart-caption">{{ caption }}</text>

      <g>
        <template v-for="(t, i) in ticks" :key="i">
          <line
            :x1="M.left"
            :x2="width - M.right"
            :y1="M.top + plotH - (t / maxValue) * plotH"
            :y2="M.top + plotH - (t / maxValue) * plotH"
            class="grid"
            :class="{ base: i === 0 }"
          />
          <text :x="M.left - 8" :y="M.top + plotH - (t / maxValue) * plotH + 4" class="axis" text-anchor="end">
            {{ t }}
          </text>
        </template>
      </g>

      <g>
        <g v-for="(d, i) in items" :key="d.label" class="bar-group" :class="{ dim: dimmed(d) }">
          <title>{{ d.title || d.label }}：{{ d.value }} {{ unit }}</title>
          <rect
            :x="x(i) - barW / 2"
            :y="y(d.value)"
            :width="barW"
            :height="Math.max(2, barHeight(d.value))"
            :rx="Math.min(4, barW / 3)"
            :fill="d.color || color"
          />
          <text
            v-if="barW >= 18 && items.length <= 20"
            :x="x(i)"
            :y="y(d.value) - 6"
            class="bar-value"
            text-anchor="middle"
          >
            {{ d.value }}
          </text>
          <text
            v-if="i % labelStep === 0 || items.length <= 8"
            :x="x(i)"
            :y="height - 9"
            class="axis x-label"
            text-anchor="middle"
          >
            {{ d.label }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.chart {
  width: 100%;
  overflow: hidden;
}
svg {
  display: block;
}
.grid {
  stroke: var(--line);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}
.grid.base {
  stroke: var(--line-strong);
  stroke-dasharray: none;
}
.axis {
  font-size: 10px;
  fill: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.x-label {
  font-size: 10px;
}
.chart-caption {
  font-size: 10px;
  fill: var(--ink-3);
}
.bar-value {
  font-size: 9px;
  fill: var(--ink-3);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.bar-group rect {
  transition: opacity 0.2s, filter 0.2s;
}
.bar-group:hover rect {
  filter: brightness(0.9);
}
.bar-group.dim rect {
  opacity: 0.28;
}
.bar-group.dim text {
  opacity: 0.4;
}
</style>
