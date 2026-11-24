<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  size: { type: Number, default: 168 },
  thickness: { type: Number, default: 18 },
  centerLabel: { type: String, default: '合计' },
  centerValue: { type: [String, Number], default: '' },
  unit: { type: String, default: '' }
})

const PALETTE = ['#1d5fd6', '#0f9d8f', '#d97706', '#7c3aed', '#dc2626', '#64748b', '#0ea5e9']

const total = computed(() => props.data.reduce((s, d) => s + (Number(d.value) || 0), 0))
const radius = computed(() => (props.size - props.thickness) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const gap = 2.5

const segments = computed(() => {
  let acc = 0
  return props.data.map((d, i) => {
    const value = Number(d.value) || 0
    const frac = total.value ? value / total.value : 0
    const len = Math.max(0, frac * circumference.value - gap)
    const seg = {
      ...d,
      color: d.color || PALETTE[i % PALETTE.length],
      percent: frac * 100,
      dasharray: `${len} ${circumference.value - len}`,
      dashoffset: -acc
    }
    acc += frac * circumference.value
    return seg
  })
})
</script>

<template>
  <div class="donut-wrap">
    <div class="donut" :style="{ width: size + 'px', height: size + 'px' }">
      <svg :width="size" :height="size">
        <g :transform="`rotate(-90 ${size / 2} ${size / 2})`">
          <circle
            :cx="size / 2"
            :cy="size / 2"
            :r="radius"
            fill="none"
            stroke="var(--surface-3)"
            :stroke-width="thickness"
          />
          <circle
            v-for="(s, i) in segments"
            :key="s.label + i"
            :cx="size / 2"
            :cy="size / 2"
            :r="radius"
            fill="none"
            :stroke="s.color"
            :stroke-width="thickness"
            :stroke-dasharray="s.dasharray"
            :stroke-dashoffset="s.dashoffset"
            stroke-linecap="butt"
          >
            <title>{{ s.label }}：{{ s.value }} {{ unit }}（{{ s.percent.toFixed(1) }}%）</title>
          </circle>
        </g>
      </svg>
      <div class="donut-center">
        <span class="donut-value">{{ centerValue !== '' ? centerValue : total }}</span>
        <span class="donut-label">{{ centerLabel }}</span>
      </div>
    </div>

    <ul class="donut-legend">
      <li v-for="(s, i) in segments" :key="s.label + i">
        <i :style="{ background: s.color }"></i>
        <span class="legend-label">{{ s.label }}</span>
        <b>{{ s.value }}</b>
        <em>{{ s.percent.toFixed(0) }}%</em>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.donut-wrap {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}
.donut {
  position: relative;
  flex: none;
}
svg {
  display: block;
}
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.donut-value {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.6px;
  font-variant-numeric: tabular-nums;
}
.donut-label {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 1px;
}
.donut-legend {
  flex: 1;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.donut-legend li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ink-2);
}
.donut-legend i {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  flex: none;
}
.legend-label {
  flex: 1;
}
.donut-legend b {
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.donut-legend em {
  font-style: normal;
  color: var(--ink-3);
  width: 34px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
