import { reactive } from 'vue'
import api from '../mock/api'

const state = reactive({
  device: null,
  modules: [],
  channels: [],
  loading: true,
  refreshedAt: null,
  error: ''
})

let timer = null
let inFlight = false

async function refresh() {
  if (inFlight) return
  inFlight = true
  try {
    const snapshot = await api.getDevice()
    state.device = snapshot.device
    state.modules = snapshot.modules
    state.channels = snapshot.channels
    state.refreshedAt = new Date()
    state.error = ''
  } catch (err) {
    state.error = err.message || '获取设备状态失败'
  } finally {
    state.loading = false
    inFlight = false
  }
}

function startPolling(interval = 1500) {
  if (timer) return
  refresh()
  timer = setInterval(refresh, interval)
}

function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

async function simulateEvent(channelId) {
  const event = await api.injectEvent(channelId)
  await refresh()
  return event
}

export function useDeviceStore() {
  return { state, refresh, startPolling, stopPolling, simulateEvent }
}
