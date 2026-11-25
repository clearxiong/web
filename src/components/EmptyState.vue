<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  icon: { type: String, default: 'search' },
  title: { type: String, default: '暂无数据' },
  desc: { type: String, default: '' }
})
</script>

<template>
  <div class="empty-state">
    <span class="empty-icon"><AppIcon :name="icon" :size="26" /></span>
    <p class="empty-title">{{ title }}</p>
    <p v-if="desc" class="empty-desc">{{ desc }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 46px 20px;
  text-align: center;
}
.empty-icon {
  width: 54px;
  height: 54px;
  border-radius: 4px;
  background: var(--surface-3);
  color: var(--ink-3);
  display: grid;
  place-items: center;
  margin-bottom: 12px;
}
.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-2);
}
.empty-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-3);
}
</style>
