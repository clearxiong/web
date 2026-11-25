import { computed, reactive } from 'vue'
import aetekApi from '../mock/aetekApi'

const STORAGE_KEY = 'aetek.session'

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !data.token) return null
    return data
  } catch {
    return null
  }
}

const clone = (value) => JSON.parse(JSON.stringify(value))

// 可编辑片段：System ×4 + Surge Settings；模块实时指标与用户列表单独维护
function editableSlice(snapshot) {
  return {
    system: clone(snapshot.system),
    time: clone(snapshot.time),
    ip: clone(snapshot.ip),
    account: {
      username: snapshot.account.users[0]?.username || 'admin',
      auto_logout: snapshot.account.auto_logout
    },
    surge: clone(snapshot.surge)
  }
}

const state = reactive({
  user: loadSession(),
  loading: false,
  saving: false,
  loaded: false,
  config: null,
  draft: null,
  modules: [],
  users: [],
  syslogTotal: 0,
  error: ''
})

const isAuthenticated = computed(() => Boolean(state.user && state.user.token))

const isDirty = computed(() => {
  if (!state.config || !state.draft) return false
  return JSON.stringify(state.config) !== JSON.stringify(state.draft)
})

async function login(username, password) {
  state.loading = true
  state.error = ''
  try {
    const session = await aetekApi.login({ username, password })
    state.user = { ...session, token: `aetek-${Date.now()}` }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.user))
    state.loaded = false
    return state.user
  } catch (err) {
    state.error = err.message || '登录失败'
    throw err
  } finally {
    state.loading = false
  }
}

function logout() {
  state.user = null
  state.loaded = false
  state.config = null
  state.draft = null
  state.modules = []
  state.users = []
  localStorage.removeItem(STORAGE_KEY)
}

function touch() {
  if (!state.user) return
  state.user = { ...state.user, last_active: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.user))
}

async function load(force = false) {
  if (state.loaded && !force) return
  state.loading = true
  try {
    const snapshot = await aetekApi.getSnapshot()
    state.config = editableSlice(snapshot)
    state.draft = clone(state.config)
    state.modules = snapshot.modules
    state.users = snapshot.account.users
    state.syslogTotal = snapshot.syslog_total
    state.loaded = true
  } finally {
    state.loading = false
  }
}

// 全局唯一的保存动作：把 draft 提交到设备，返回被重置计数的模块标签
async function save() {
  if (!state.draft) return []
  state.saving = true
  try {
    const result = await aetekApi.saveConfig(clone(state.draft))
    state.config = editableSlice(result.config)
    state.draft = clone(state.config)
    state.modules = result.config.modules
    state.users = result.config.account.users
    state.syslogTotal = result.config.syslog_total
    return result.reset_modules || []
  } finally {
    state.saving = false
  }
}

function discard() {
  if (!state.config) return
  state.draft = clone(state.config)
}

async function refreshModules() {
  state.modules = await aetekApi.getModules()
  return state.modules
}

async function simulateSurge(moduleId) {
  const module = await aetekApi.simulateSurge(moduleId)
  await refreshModules()
  state.syslogTotal += 1
  return module
}

export function useAetek() {
  return {
    state,
    isAuthenticated,
    isDirty,
    login,
    logout,
    touch,
    load,
    save,
    discard,
    refreshModules,
    simulateSurge
  }
}
