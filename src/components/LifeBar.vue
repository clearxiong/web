<script setup>
import { computed } from 'vue'
import { clampPercent } from '../utils/format'

const props = defineProps({
  percent: { type: Number, default: 0 },
  threshold: { type: Number, default: 80 },
  showValue: { type: Boolean, default: true },
  thin: { type: Boolean, default: false }
})

const value = computed(() => clampPercent(props.percent))
const tone = computed(() => {
  if (value.value < props.threshold) return 'danger'
  if (value.value < props.threshold + 10) return 'warn'
  return 'ok'
})
</script>

<template>
  <div class="life">
    <div class="life-track" :class="{ thin }">
      <span class="life-fill" :class="tone" :style="{ width: value + '%' }"></span>
      <i class="life-mark" :style="{ left: clampPercent(threshold) + '%' }" :title="`告警阈值 ${threshold}%`"></i>
    </div>
    <span v-if="showValue" class="life-text" :class="tone">{{ value.toFixed(0) }}%</span>
  </div>
</template>

<style scoped>
.life {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.life-track {
  position: relative;
  flex: 1;
  height: 8px;
  border-radius: 99px;
  background: var(--surface-3);
  overflow: hidden;
}
.life-track.thin {
  height: 5px;
}
.life-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.5s ease;
}
.life-fill.ok {
  background: linear-gradient(90deg, #34a463, var(--ok));
}
.life-fill.warn {
  background: linear-gradient(90deg, #e9ab4a, var(--warn));
}
.life-fill.danger {
  background: linear-gradient(90deg, #e06464, var(--danger));
}
.life-mark {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background: rgba(15, 27, 45, 0.28);
  transform: translateX(-50%);
}
.life-text {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 32px;
  text-align: right;
}
.life-text.ok {
  color: var(--ok);
}
.life-text.warn {
  color: var(--warn);
}
.life-text.danger {
  color: var(--danger);
}
</style>
