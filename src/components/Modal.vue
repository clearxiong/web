<script setup>
import { onBeforeUnmount, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  width: { type: String, default: '560px' },
  closable: { type: Boolean, default: true }
})
const emit = defineEmits(['close'])

function onKey(e) {
  if (e.key === 'Escape' && props.closable) emit('close')
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) document.addEventListener('keydown', onKey)
    else document.removeEventListener('keydown', onKey)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="closable && emit('close')">
        <div class="modal-card" :style="{ maxWidth: width }" role="dialog" aria-modal="true">
          <header v-if="title || $slots.header" class="modal-head">
            <slot name="header">
              <div>
                <h3 class="modal-title">{{ title }}</h3>
                <p v-if="subtitle" class="modal-sub">{{ subtitle }}</p>
              </div>
            </slot>
            <button v-if="closable" class="modal-close" aria-label="关闭" @click="emit('close')">
              <AppIcon name="close" :size="17" />
            </button>
          </header>
          <div class="modal-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal-foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(10, 20, 35, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 8vh 18px 24px;
  overflow-y: auto;
}
.modal-card {
  width: 100%;
  background: var(--surface);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--line);
  overflow: hidden;
}
.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--line);
}
.modal-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.modal-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--ink-3);
}
.modal-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: var(--surface-3);
  color: var(--ink-3);
  cursor: pointer;
  display: grid;
  place-items: center;
  flex: none;
}
.modal-close:hover {
  background: var(--line);
  color: var(--ink);
}
.modal-body {
  padding: 18px 20px;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--line);
  background: var(--surface-2);
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: translateY(-10px) scale(0.985);
}
</style>
