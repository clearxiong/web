<script setup>
defineProps({
  tone: { type: String, default: 'muted' },
  label: { type: String, default: '' },
  live: { type: Boolean, default: false },
  plain: { type: Boolean, default: false }
})
</script>

<template>
  <span class="badge" :class="[tone, { live, plain }]">{{ label }}</span>
</template>
