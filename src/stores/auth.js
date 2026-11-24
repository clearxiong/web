import { computed, reactive } from 'vue'
import api from '../mock/api'

const STORAGE_KEY = 'spd.session'

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

const state = reactive({
  user: loadSession(),
  loading: false,
  error: ''
})

const isAuthenticated = computed(() => Boolean(state.user && state.user.token))

async function login(username, password) {
  state.loading = true
  state.error = ''
  try {
    const session = await api.login({ username, password })
    state.user = session
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    return session
  } catch (err) {
    state.error = err.message || '登录失败'
    throw err
  } finally {
    state.loading = false
  }
}

function logout() {
  state.user = null
  localStorage.removeItem(STORAGE_KEY)
}

function touch() {
  if (!state.user) return
  state.user = { ...state.user, last_active: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.user))
}

export function useAuth() {
  return { state, isAuthenticated, login, logout, touch }
}
