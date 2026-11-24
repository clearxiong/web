<script setup>
import Modal from './Modal.vue'
import AppIcon from './AppIcon.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '' },
  detail: { type: String, default: '' },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' },
  tone: { type: String, default: 'danger' },
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Modal
    :open="open"
    :width="'430px'"
    :closable="!busy"
    @close="emit('cancel')"
  >
    <template #header>
      <div class="confirm-head">
        <span class="confirm-icon" :class="tone">
          <AppIcon :name="tone === 'danger' ? 'alert' : 'info'" :size="20" />
        </span>
        <div>
          <h3 class="modal-title">{{ title }}</h3>
          <p v-if="message" class="confirm-msg">{{ message }}</p>
        </div>
      </div>
    </template>
    <p v-if="detail" class="confirm-detail">{{ detail }}</p>
    <slot />
    <template #footer>
      <button class="btn" :disabled="busy" @click="emit('cancel')">{{ cancelText }}</button>
      <button
        class="btn"
        :class="tone === 'danger' ? 'danger' : 'primary'"
        :disabled="busy"
        @click="emit('confirm')"
      >
        {{ busy ? '处理中…' : confirmText }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.confirm-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.confirm-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex: none;
  background: var(--danger-soft);
  color: var(--danger);
}
.confirm-icon.primary {
  background: var(--brand-soft);
  color: var(--brand);
}
.confirm-icon.warn {
  background: var(--warn-soft);
  color: var(--warn);
}
.confirm-msg {
  margin-top: 4px;
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.55;
}
.confirm-detail {
  font-size: 13px;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
  line-height: 1.6;
}
</style>
