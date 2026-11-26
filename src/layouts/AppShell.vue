<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import BrandLogo from '../components/BrandLogo.vue'
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
    title: '设备状态',
    icon: 'dashboard',
    items: [
      { name: 'overview', to: '/', label: '设备总览', icon: 'dashboard' },
      { name: 'channels', to: '/channels', label: '通道状态', icon: 'channels' }
    ]
  },
  {
    title: '数据记录',
    icon: 'database',
    items: [
      { name: 'events', to: '/events', label: '事件记录', icon: 'events' },
      { name: 'stats', to: '/stats', label: '统计分析', icon: 'stats' }
    ]
  },
  {
    title: '设备配置',
    icon: 'settings',
    items: [
      { name: 'surge-settings', to: '/surge-settings', label: '浪涌设置', icon: 'shield' },
      { name: 'system', to: '/system', label: '系统设置', icon: 'system' }
    ]
  },
  {
    title: '运维管理',
    icon: 'maintenance',
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
const userMenuOpen = ref(false)
const userMenuRef = ref(null)

const activeGroupTitle = computed(
  () => navGroups.find((group) => group.items.some((item) => item.name === route.name))?.title || ''
)
const openGroup = ref(activeGroupTitle.value)

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

function toggleGroup(group) {
  openGroup.value = openGroup.value === group.title ? '' : group.title
}

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
    userMenuOpen.value = false
  }
)

watch(activeGroupTitle, (title) => {
  if (title) openGroup.value = title
})

function resetIdle() {
  idleSeconds.value = authState.user?.auto_logout || 300
}

function doLogout(message) {
  userMenuOpen.value = false
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

function onDocumentClick(event) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target)) {
    userMenuOpen.value = false
  }
}

onMounted(() => {
  document.body.classList.add('procet-body')
  startPolling()
  resetIdle()
  timer = setInterval(tick, 1000)
  window.addEventListener('pointerdown', resetIdle)
  window.addEventListener('keydown', resetIdle)
  window.addEventListener('wheel', resetIdle, { passive: true })
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.body.classList.remove('procet-body')
  stopPolling()
  if (timer) clearInterval(timer)
  window.removeEventListener('pointerdown', resetIdle)
  window.removeEventListener('keydown', resetIdle)
  window.removeEventListener('wheel', resetIdle)
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div class="shell procet" :class="{ 'drawer-open': drawerOpen }">
    <header class="topbar">
      <button class="hamburger" aria-label="打开菜单" @click="drawerOpen = true">
        <AppIcon name="menu" :size="20" />
      </button>

      <RouterLink to="/" class="logo-link" aria-label="Procet 首页">
        <BrandLogo :size="28" :word-size="19" />
      </RouterLink>

      <span class="topbar-divider"></span>

      <div class="device-chip">
        <span class="dot" :class="online ? 'ok' : 'muted'"></span>
        <b>{{ deviceName }}</b>
        <span class="device-state">{{ online ? '设备在线' : '连接中…' }}</span>
      </div>

      <div class="top-actions">
        <span class="top-clock mono">{{ clock }}</span>
        <span class="idle-chip">自动登出 {{ idleText }}</span>
        <button class="btn sm top-btn" :disabled="simulating" @click="onSimulate">
          <AppIcon name="bolt" :size="14" />
          <span class="hide-sm">{{ simulating ? '模拟中…' : '模拟事件' }}</span>
        </button>
        <button class="btn sm top-btn" :disabled="saving" @click="onSaveConfig">
          <AppIcon name="save" :size="14" />
          <span class="hide-sm">{{ saving ? '保存中…' : '保存配置' }}</span>
        </button>

        <div ref="userMenuRef" class="user-menu">
          <button class="user-trigger" @click="userMenuOpen = !userMenuOpen">
            <span class="user-avatar">{{ username.slice(0, 1).toUpperCase() }}</span>
            <span class="user-name">{{ username }}</span>
            <AppIcon name="chevron" :size="11" class="user-caret" />
          </button>
          <transition name="drop">
            <div v-if="userMenuOpen" class="user-dropdown">
              <button class="dropdown-item" @click="doLogout('已安全退出')">
                <AppIcon name="logout" :size="15" />
                退出登录
              </button>
            </div>
          </transition>
        </div>
      </div>
    </header>

    <div class="scrim" @click="drawerOpen = false"></div>

    <aside class="sidebar">
      <nav class="nav">
        <div v-for="group in navGroups" :key="group.title" class="nav-group">
          <button
            class="nav-parent"
            :class="{ open: openGroup === group.title, 'has-active': group.items.some(isActive) }"
            @click="toggleGroup(group)"
          >
            <AppIcon :name="group.icon" :size="17" class="nav-parent-icon" />
            <span class="nav-parent-label">{{ group.title }}</span>
            <AppIcon name="chevron" :size="12" class="nav-arrow" />
          </button>

          <transition name="submenu">
            <div v-show="openGroup === group.title" class="nav-sub">
              <RouterLink
                v-for="item in group.items"
                :key="item.name"
                :to="item.to"
                class="nav-item"
                :class="{ active: isActive(item) }"
              >
                <AppIcon :name="item.icon" :size="15" class="nav-item-icon" />
                <span>{{ item.label }}</span>
              </RouterLink>
            </div>
          </transition>
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
        <p class="foot-copy">Copyright © 2026 Procet</p>
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
  background: var(--surface);
  font-size: 14px;
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
  padding: 0 20px;
  background: var(--surface);
  border-bottom: 1px solid #ddd;
}

.hamburger {
  display: none;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
  place-items: center;
  flex: none;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  flex: none;
}

.topbar-divider {
  width: 1px;
  height: 20px;
  background: #e4e7ed;
  flex: none;
}

.device-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  color: var(--ink-3);
}
.device-chip b {
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.device-state {
  white-space: nowrap;
}

.top-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.top-clock {
  font-size: 13px;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}

.idle-chip {
  font-size: 12px;
  color: var(--ink-3);
  background: var(--surface-3);
  border-radius: 4px;
  padding: 3px 8px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.top-btn {
  color: var(--ink-2);
}

/* ---------- User dropdown ---------- */
.user-menu {
  position: relative;
  padding-left: 12px;
  border-left: 1px solid #e4e7ed;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ink-2);
  font-size: 13px;
  cursor: pointer;
}
.user-trigger:hover {
  background: var(--surface-3);
}

.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex: none;
}

.user-caret {
  color: #c0c4cc;
  transform: rotate(90deg);
  transition: transform 0.2s;
}
.user-trigger:hover .user-caret {
  transform: rotate(90deg);
}

.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 148px;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 200;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ink-2);
  font-size: 13px;
  cursor: pointer;
}
.dropdown-item:hover {
  background: var(--brand-soft);
  color: var(--brand);
}

.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ---------- Sidebar ---------- */
.sidebar {
  position: fixed;
  top: var(--topbar-h);
  left: 0;
  bottom: 0;
  width: var(--sidebar-w);
  background: var(--sidebar);
  display: flex;
  flex-direction: column;
  z-index: 120;
  user-select: none;
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 16px;
}

.nav-group + .nav-group {
  margin-top: 2px;
}

.nav-parent {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 50px;
  padding: 0 20px;
  border: none;
  background: transparent;
  color: var(--sidebar-ink);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.nav-parent:hover {
  background: #263445;
}
.nav-parent.open {
  color: #fff;
}
.nav-parent.has-active {
  color: #fff;
}

.nav-parent-icon {
  flex: none;
  color: #8a9bb0;
}
.nav-parent.open .nav-parent-icon,
.nav-parent.has-active .nav-parent-icon {
  color: var(--brand);
}

.nav-parent-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-arrow {
  flex: none;
  color: #8494a7;
  transform: rotate(0deg);
  transition: transform 0.22s;
}
.nav-parent.open .nav-arrow {
  transform: rotate(90deg);
}

.nav-sub {
  background: var(--sidebar-2);
  overflow: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 44px;
  padding: 0 20px 0 50px;
  color: var(--sidebar-ink);
  font-size: 13px;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover {
  background: var(--sidebar-3);
  color: #fff;
}
.nav-item.active {
  background: var(--sidebar-3);
  color: var(--brand);
}

.nav-item-icon {
  flex: none;
  opacity: 0.85;
}

.submenu-enter-active,
.submenu-leave-active {
  transition: opacity 0.18s ease;
}
.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
}

.sidebar-foot {
  flex: none;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: var(--sidebar-ink-dim);
}

.foot-status {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--sidebar-ink);
  font-size: 12px;
  font-weight: 600;
}

.foot-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6b7f96;
  flex: none;
}
.foot-dot.on {
  background: #67c23a;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.16);
}

.mock-tag {
  margin-left: auto;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #8ab8ff;
  background: rgba(64, 158, 255, 0.14);
  border: 1px solid rgba(64, 158, 255, 0.22);
  border-radius: 3px;
  padding: 1px 5px;
}

.foot-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--sidebar-ink-dim);
  font-variant-numeric: tabular-nums;
}

.foot-copy {
  margin-top: 12px;
  text-align: center;
  font-size: 11px;
  color: #67798f;
}

/* ---------- Main ---------- */
.main {
  margin-left: var(--sidebar-w);
  padding-top: var(--topbar-h);
  min-height: 100vh;
  background: var(--surface);
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

@media (max-width: 900px) {
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
    background: rgba(0, 0, 0, 0.35);
  }
  .main {
    margin-left: 0;
  }
  .hamburger {
    display: grid;
  }
  .device-chip,
  .topbar-divider {
    display: none;
  }
  .topbar {
    padding: 0 16px;
    gap: 10px;
  }
}

@media (max-width: 720px) {
  .hide-sm {
    display: none;
  }
  .top-btn {
    padding: 0 8px;
  }
  .user-name {
    display: none;
  }
  .top-actions {
    gap: 8px;
  }
  .user-menu {
    padding-left: 8px;
  }
  .topbar {
    gap: 8px;
    padding: 0 12px;
  }
}
</style>
