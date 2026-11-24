<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import BrandLogo from '../components/BrandLogo.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useAuth } from '../stores/auth'
import { useDeviceStore } from '../stores/device'
import { useToast } from '../stores/toast'
import api from '../mock/api'
import { formatClock } from '../utils/format'

const route = useRoute()
const router = useRouter()
const { state: authState, logout } = useAuth()
const { state: deviceState, startPolling, stopPolling, simulateEvent } = useDeviceStore()
const toast = useToast()

const navGroups = [
  {
    title: '监测',
    items: [
      { name: 'overview', to: '/', label: '设备总览', icon: 'dashboard' },
      { name: 'channels', to: '/channels', label: '通道状态', icon: 'channels' },
      { name: 'events', to: '/events', label: '事件历史', icon: 'events' },
      { name: 'stats', to: '/stats', label: '统计分析', icon: 'stats' }
    ]
  },
  {
    title: '配置',
    items: [
      { name: 'surge-settings', to: '/surge-settings', label: '浪涌设置', icon: 'shield' },
      { name: 'system', to: '/system', label: '系统设置', icon: 'settings' }
    ]
  },
  {
    title: '运维',
    items: [
      { name: 'diagnostics', to: '/diagnostics', label: '通信诊断', icon: 'diagnostics' },
      { name: 'maintenance', to: '/maintenance', label: '维护', icon: 'maintenance' }
    ]
  }
]

const drawerOpen = ref(false)
const now = ref(new Date())
const idleSeconds = ref(300)
const simulating = ref(false)
const saving = ref(false)

let timer = null

const deviceName = computed(() => deviceState.device?.name || '16CH-SPD-001')
const username = computed(() => authState.user?.username || 'admin')
const online = computed(() => Boolean(deviceState.device))

const clock = computed(() => formatClock(now.value))
const idleText = computed(() => {
  const s = Math.max(0, idleSeconds.value)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

function isActive(item) {
  return route.name === item.name
}

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  }
)

function resetIdle() {
  idleSeconds.value = authState.user?.auto_logout || 300
}

function doLogout(message) {
  stopPolling()
  logout()
  if (message) toast.info(message)
  router.replace({ name: 'login' })
}

function tick() {
  now.value = new Date()
  idleSeconds.value -= 1
  if (idleSeconds.value <= 0) {
    doLogout('会话已超时，请重新登录')
  }
}

async function onSimulate() {
  if (simulating.value) return
  simulating.value = true
  try {
    const event = await simulateEvent()
    toast.warn(`已模拟 ${event.channel_name} 阈值触发事件（ID ${event.event_id_text}）`)
    resetIdle()
  } catch (err) {
    toast.error(err.message || '模拟事件失败')
  } finally {
    simulating.value = false
  }
}

async function onSaveConfig() {
  if (saving.value) return
  saving.value = true
  try {
    const config = await api.getConfig()
    await api.saveConfig(config)
    toast.success('系统配置已保存')
    resetIdle()
  } catch (err) {
    toast.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  startPolling()
  resetIdle()
  timer = setInterval(tick, 1000)
  window.addEventListener('pointerdown', resetIdle)
  window.addEventListener('keydown', resetIdle)
  window.addEventListener('wheel', resetIdle, { passive: true })
})

onBeforeUnmount(() => {
  stopPolling()
  if (timer) clearInterval(timer)
  window.removeEventListener('pointerdown', resetIdle)
  window.removeEventListener('keydown', resetIdle)
  window.removeEventListener('wheel', resetIdle)
})
</script>

<template>
  <div class="shell" :class="{ 'drawer-open': drawerOpen }">
    <header class="topbar">
      <button class="hamburger" aria-label="打开菜单" @click="drawerOpen = true">
        <AppIcon name="menu" :size="20" />
      </button>

      <RouterLink to="/" class="logo-link" aria-label="Procet 首页">
        <BrandLogo :size="30" :word-size="21" />
      </RouterLink>

      <span class="topbar-divider"></span>

      <div class="crumb">
        <span class="crumb-root">{{ deviceName }}</span>
        <AppIcon name="chevron" :size="11" class="crumb-sep" />
        <b>{{ route.meta.title }}</b>
      </div>

      <div class="top-actions">
        <StatusBadge :tone="online ? 'ok' : 'muted'" :live="online" :label="online ? '设备在线' : '连接中'" />
        <span class="top-clock mono">{{ clock }}</span>
        <span class="idle-chip mono" title="自动登出倒计时">登出 {{ idleText }}</span>
        <button class="btn sm" :disabled="simulating" @click="onSimulate">
          <AppIcon name="bolt" :size="14" />
          <span class="hide-sm">{{ simulating ? '模拟中…' : '模拟事件' }}</span>
        </button>
        <button class="btn sm ghost save-btn" :disabled="saving" @click="onSaveConfig">
          <AppIcon name="save" :size="14" />
          <span class="hide-md">{{ saving ? '保存中…' : '保存配置' }}</span>
        </button>
        <div class="user">
          <span class="user-avatar">{{ username.slice(0, 1).toUpperCase() }}</span>
          <span class="user-name">{{ username }}</span>
          <button class="logout" title="退出登录" @click="doLogout('已安全退出')">
            <AppIcon name="logout" :size="16" />
          </button>
        </div>
      </div>
    </header>

    <div class="scrim" @click="drawerOpen = false"></div>

    <aside class="sidebar">
      <nav class="nav">
        <div v-for="group in navGroups" :key="group.title" class="nav-group">
          <p class="nav-group-title">{{ group.title }}</p>
          <RouterLink
            v-for="item in group.items"
            :key="item.name"
            :to="item.to"
            class="nav-item"
            :class="{ active: isActive(item) }"
          >
            <AppIcon :name="item.icon" :size="17" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <div class="sidebar-foot">
        <div class="foot-status">
          <span class="foot-dot" :class="{ on: online }"></span>
          <span>{{ online ? '设备运行中' : '正在连接…' }}</span>
          <span class="mock-tag">MOCK</span>
        </div>
        <div class="foot-meta">
          <span>固件 {{ deviceState.device?.firmware || 'v1.0.0' }}</span>
          <span>Boot #{{ deviceState.device?.boot_id ?? '—' }}</span>
        </div>
        <p class="foot-copy">Copyright © 2026 Procet<br />保留所有权利。</p>
      </div>
    </aside>

    <div class="main">
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  background: var(--bg);
}

/* ---------- Topbar ---------- */
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 130;
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 22px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.hamburger {
  display: none;
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
  place-items: center;
  flex: none;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  flex: none;
}

.topbar-divider {
  width: 1px;
  height: 22px;
  background: var(--line);
  flex: none;
}

.crumb {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--ink-3);
  min-width: 0;
}
.crumb-root {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.crumb-sep {
  color: var(--line-strong);
  flex: none;
}
.crumb b {
  color: var(--ink);
  font-weight: 600;
  white-space: nowrap;
}

.top-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-clock {
  font-size: 12px;
  color: var(--ink-2);
  font-weight: 600;
  letter-spacing: 0.3px;
  font-variant-numeric: tabular-nums;
}

.idle-chip {
  font-size: 11px;
  color: var(--ink-3);
  background: var(--surface-3);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 3px 9px;
  font-weight: 600;
}

.save-btn {
  color: var(--ink-2);
}

.user {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-left: 10px;
  border-left: 1px solid var(--line);
}
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  font-weight: 800;
  display: grid;
  place-items: center;
}
.user-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-2);
}
.logout {
  width: 28px;
  height: 28px;
  border-radius: var(--r-md);
  border: none;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.logout:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

/* ---------- Sidebar ---------- */
.sidebar {
  position: fixed;
  top: var(--topbar-h);
  left: 0;
  bottom: 0;
  width: var(--sidebar-w);
  background: var(--sidebar);
  color: var(--sidebar-ink);
  display: flex;
  flex-direction: column;
  z-index: 120;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px 8px;
}

.nav-group + .nav-group {
  margin-top: 16px;
}

.nav-group-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.3px;
  color: #6d8095;
  text-transform: uppercase;
  padding: 0 12px 7px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  height: 40px;
  padding: 0 12px;
  border-radius: var(--r-md);
  color: var(--sidebar-ink);
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.nav-item.active {
  background: var(--brand);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(47, 124, 246, 0.28);
}

.sidebar-foot {
  flex: none;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.foot-status {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #cfe0f3;
  font-weight: 600;
  font-size: 11.5px;
}
.foot-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6b7f96;
  flex: none;
}
.foot-dot.on {
  background: #3ecf7a;
  box-shadow: 0 0 0 3px rgba(62, 207, 122, 0.15);
}
.mock-tag {
  margin-left: auto;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #7fb0ff;
  background: rgba(77, 141, 255, 0.13);
  border: 1px solid rgba(96, 155, 245, 0.22);
  border-radius: 4px;
  padding: 1px 5px;
}
.foot-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 7px;
  font-size: 10.5px;
  color: var(--sidebar-ink-dim);
  font-variant-numeric: tabular-nums;
}
.foot-copy {
  margin-top: 12px;
  text-align: center;
  font-size: 10px;
  line-height: 1.7;
  color: #67798f;
}

/* ---------- Main ---------- */
.main {
  margin-left: var(--sidebar-w);
  padding-top: var(--topbar-h);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.content {
  flex: 1;
  min-width: 0;
}
.scrim {
  display: none;
}

/* ---------- Responsive ---------- */
@media (max-width: 1180px) {
  .top-clock,
  .idle-chip {
    display: none;
  }
}

@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.24s ease;
    box-shadow: var(--shadow-lg);
  }
  .shell.drawer-open .sidebar {
    transform: none;
  }
  .shell.drawer-open .scrim {
    display: block;
    position: fixed;
    top: var(--topbar-h);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 115;
    background: rgba(10, 20, 35, 0.4);
  }
  .main {
    margin-left: 0;
  }
  .hamburger {
    display: grid;
  }
  .crumb,
  .topbar-divider {
    display: none;
  }
  .topbar {
    padding: 0 16px;
  }
}

@media (max-width: 720px) {
  .hide-sm {
    display: none;
  }
  .save-btn {
    display: none;
  }
  .user-name {
    display: none;
  }
  .top-actions {
    gap: 8px;
  }
  .user {
    padding-left: 8px;
  }
}

@media (max-width: 480px) {
  .hide-md {
    display: none;
  }
  .topbar {
    gap: 9px;
    padding: 0 12px;
  }
}
</style>
