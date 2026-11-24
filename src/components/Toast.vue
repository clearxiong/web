<script setup>
import { useToast } from '../stores/toast'
import AppIcon from './AppIcon.vue'

const { state, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="item in state.items" :key="item.id" class="toast-item" :class="item.tone">
          <span class="toast-icon"><AppIcon :name="item.icon" :size="16" /></span>
          <span class="toast-msg">{{ item.message }}</span>
          <button class="toast-close" aria-label="关闭" @click="dismiss(item.id)">
            <AppIcon name="close" :size="13" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 76px;
  right: 22px;
  z-index: 4000;
  display: flex;
  flex-direction: column;
  gap: 9px;
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}
.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 11px;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-md);
  font-size: 13px;
  color: var(--ink);
  border-left: 3px solid var(--brand);
}
.toast-item.success {
  border-left-color: var(--ok);
}
.toast-item.warn {
  border-left-color: var(--warn);
}
.toast-item.error {
  border-left-color: var(--danger);
}
.toast-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--brand-soft);
  color: var(--brand);
  flex: none;
}
.toast-item.success .toast-icon {
  background: var(--ok-soft);
  color: var(--ok);
}
.toast-item.warn .toast-icon {
  background: var(--warn-soft);
  color: var(--warn);
}
.toast-item.error .toast-icon {
  background: var(--danger-soft);
  color: var(--danger);
}
.toast-msg {
  flex: 1;
  line-height: 1.45;
}
.toast-close {
  border: none;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  padding: 2px;
  display: grid;
  place-items: center;
}
.toast-close:hover {
  color: var(--ink);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(14px);
}
</style>
