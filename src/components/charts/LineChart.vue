<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  height: { type: Number, default: 230 },
  color: { type: String, default: '#1d5fd6' },
  unit: { type: String, default: '次' },
  area: { type: Boolean, default: true },
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

const M = { top: 18, right: 12, bottom: 28, left: 42 }
const gradId = `line-grad-${Math.random().toString(36).slice(2, 8)}`

const plotW = computed(() => Math.max(10, width.value - M.left - M.right))
const plotH = computed(() => Math.max(10, props.height - M.top - M.bottom))

function niceMax(value) {
  if (!value || value <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

const items = computed(() =>
  props.data.map((d) => ({ ...d, value: Number(d.value ?? d.count ?? 0) }))
)

const maxValue = computed(() => niceMax(Math.max(...items.value.map((d) => d.value))))
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxValue.value * r)))

const points = computed(() => {
  const n = items.value.length
  const stepX = n > 1 ? plotW.value / (n - 1) : 0
  return items.value.map((d, i) => ({
    ...d,
    px: M.left + stepX * i,
    py: M.top + plotH.value - (d.value / maxValue.value) * plotH.value
  }))
})

const linePath = computed(() => {
  const pts = points.value
  if (!pts.length) return ''
  let d = `M ${pts[0].px.toFixed(2)} ${pts[0].py.toFixed(2)}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const cur = pts[i]
    const cx = (prev.px + cur.px) / 2
    d += ` C ${cx.toFixed(2)} ${prev.py.toFixed(2)}, ${cx.toFixed(2)} ${cur.py.toFixed(2)}, ${cur.px.toFixed(
      2
    )} ${cur.py.toFixed(2)}`
  }
  return d
})

const areaPath = computed(() => {
  const pts = points.value
  if (!pts.length || !props.area) return ''
  const base = M.top + plotH.value
  return `${linePath.value} L ${pts[pts.length - 1].px.toFixed(2)} ${base} L ${pts[0].px.toFixed(
    2
  )} ${base} Z`
})

const labelEvery = computed(() => {
  const n = props.data.length
  const target = width.value < 520 ? 4 : 7
  return Math.max(1, Math.ceil(n / target))
})

const lastPoint = computed(() => points.value[points.value.length - 1])
const showDots = computed(() => props.data.length <= 15)
</script>

<template>
  <div ref="wrap" class="chart">
    <svg :width="width" :height="height" role="img">
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.22" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.01" />
        </linearGradient>
      </defs>

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

      <path v-if="area && areaPath" :d="areaPath" :fill="`url(#${gradId})`" />
      <path :d="linePath" fill="none" :stroke="color" stroke-width="2" stroke-linecap="round" />

      <g>
        <template v-for="(p, i) in points" :key="p.label + i">
          <circle
            v-if="showDots"
            :cx="p.px"
            :cy="p.py"
            r="2.6"
            :fill="'#fff'"
            :stroke="color"
            stroke-width="1.8"
          />
          <circle :cx="p.px" :cy="p.py" r="9" fill="transparent">
            <title>{{ p.label }}：{{ p.value }} {{ unit }}</title>
          </circle>
          <text
            v-if="i % labelEvery === 0 || i === points.length - 1"
            :x="p.px"
            :y="height - 8"
            class="axis x-label"
            text-anchor="middle"
          >
            {{ p.label }}
          </text>
        </template>
      </g>

      <g v-if="lastPoint">
        <circle :cx="lastPoint.px" :cy="lastPoint.py" r="5.5" :fill="color" opacity="0.18" />
        <circle :cx="lastPoint.px" :cy="lastPoint.py" r="3" :fill="color" stroke="#fff" stroke-width="1.5" />
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
</style>
