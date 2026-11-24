<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  unit: { type: String, default: '' },
  foot: { type: String, default: '' },
  accent: { type: String, default: 'var(--brand)' },
  icon: { type: String, default: '' },
  tone: { type: String, default: '' }
})
</script>

<template>
  <div class="kpi" :style="{ '--kpi-accent': accent }">
    <div class="kpi-top">
      <span class="kpi-label">{{ label }}</span>
      <AppIcon v-if="icon" :name="icon" :size="18" class="kpi-icon" />
    </div>
    <div class="kpi-value" :class="tone">
      {{ value }}<small v-if="unit">{{ unit }}</small>
    </div>
    <div v-if="foot || $slots.foot" class="kpi-foot">
      <slot name="foot">{{ foot }}</slot>
    </div>
  </div>
</template>

<style scoped>
.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kpi-icon {
  color: var(--ink-3);
  opacity: 0.7;
}
.kpi-value.ok {
  color: var(--ok);
}
.kpi-value.warn {
  color: var(--warn);
}
.kpi-value.danger {
  color: var(--danger);
}
</style>
