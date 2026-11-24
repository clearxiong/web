import { reactive } from 'vue'

const state = reactive({
  items: []
})

let seq = 0

const ICONS = {
  info: 'info',
  success: 'check',
  warn: 'alert',
  error: 'alert'
}

export function useToast() {
  function push(message, tone = 'info', timeout = 3400) {
    const id = ++seq
    state.items.push({ id, message, tone, icon: ICONS[tone] || 'info' })
    if (timeout > 0) {
      setTimeout(() => dismiss(id), timeout)
    }
    return id
  }

  function dismiss(id) {
    const idx = state.items.findIndex((t) => t.id === id)
    if (idx >= 0) state.items.splice(idx, 1)
  }

  const success = (msg, timeout) => push(msg, 'success', timeout)
  const info = (msg, timeout) => push(msg, 'info', timeout)
  const warn = (msg, timeout) => push(msg, 'warn', timeout)
  const error = (msg, timeout) => push(msg, 'error', timeout)

  return { state, push, dismiss, success, info, warn, error }
}

export const toast = {
  info: (msg, timeout) => useToast().push(msg, 'info', timeout),
  success: (msg, timeout) => useToast().push(msg, 'success', timeout),
  warn: (msg, timeout) => useToast().push(msg, 'warn', timeout),
  error: (msg, timeout) => useToast().push(msg, 'error', timeout)
}
