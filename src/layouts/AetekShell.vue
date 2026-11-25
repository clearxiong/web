<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAetek } from '../stores/aetek'
import { useToast } from '../stores/toast'
import { formatClock } from '../utils/format'
import { validateDraft } from '../utils/aetekValidate'

const route = useRoute()
const router = useRouter()
const { state, load, save, discard, isDirty, logout, touch } = useAetek()
const toast = useToast()

const navGroups = [
  {
    title: '系统',
    items: [
      { name: 'aetek-system-info', to: '/aetek/system/information', label: '设备信息', icon: 'info' },
      { name: 'aetek-system-time', to: '/aetek/system/time', label: '系统时间', icon: 'clock' },
      { name: 'aetek-system-ip', to: '/aetek/system/ip', label: 'IP 地址', icon: 'wifi' },
      { name: 'aetek-system-account', to: '/aetek/system/account', label: '账户', icon: 'user' },
      { name: 'aetek-system-syslog', to: '/aetek/system/syslog', label: '系统日志', icon: 'file' }
    ]
  },
  {
    title: '防雷监测',
    items: [
      { name: 'aetek-surge-settings', to: '/aetek/surge/settings', label: '浪涌设置', icon: 'settings' },
      { name: 'aetek-module-status', to: '/aetek/surge/module-status', label: '模块状态', icon: 'gauge' }
    ]
  }
]

const drawerOpen = ref(false)
const now = ref(new Date())
const idleSeconds = ref(300)
const saving = ref(false)
const leaving = ref(false)

let timer = null

const deviceName = computed(() => state.draft?.system?.name || state.config?.system?.name || 'SD-504')
const username = computed(() => state.user?.username || 'admin')
const idleLimit = computed(() => Number(state.draft?.account?.auto_logout ?? state.user?.auto_logout ?? 300))
const clock = computed(() => formatClock(now.value))
const idleText = computed(() => {
  if (idleLimit.value === 0) return '不超时'
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
  idleSeconds.value = idleLimit.value
}

function doLogout(message) {
  logout()
  if (message) toast.info(message)
  router.replace({ name: 'aetek-login' })
}

function tick() {
  now.value = new Date()
  if (idleLimit.value === 0) return
  idleSeconds.value -= 1
  if (idleSeconds.value <= 0) {
    doLogout('会话已超时（自动登出），请重新登录')
  }
}

async function onSave() {
  if (saving.value || !isDirty.value) return
  const invalid = validateDraft(state.draft)
  if (invalid) {
    toast.error(invalid)
    return
  }
  saving.value = true
  try {
    const resetModules = await save()
    if (resetModules.length) {
      toast.success(`配置已保存，${resetModules.join('、')} 浪涌计数已归零`)
    } else {
      toast.success('配置已保存')
    }
    resetIdle()
  } catch (err) {
    toast.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function askLeave() {
  leaving.value = true
}

function confirmLeave() {
  discard()
  leaving.value = false
  doLogout('未保存的修改已丢弃，已退出 AETEK 演示')
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    toast.error(err.message || '读取设备配置失败')
  }
  resetIdle()
  timer = setInterval(tick, 1000)
  window.addEventListener('pointerdown', onActivity)
  window.addEventListener('keydown', onActivity)
  window.addEventListener('wheel', onActivity, { passive: true })
})

function onActivity() {
  touch()
  resetIdle()
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('pointerdown', onActivity)
  window.removeEventListener('keydown', onActivity)
  window.removeEventListener('wheel', onActivity)
})
</script>

<template>
  <div class="shell" :class="{ 'drawer-open': drawerOpen }">
    <header class="topbar">
      <button class="hamburger" aria-label="打开菜单" @click="drawerOpen = true">
        <AppIcon name="menu" :size="20" />
      </button>

      <RouterLink to="/aetek/surge/module-status" class="brand" aria-label="AETEK SD-504 首页">
        <span class="brand-mark">AE</span>
        <span class="brand-text">
          <b>AETEK</b>
          <em>SD-504</em>
        </span>
      </RouterLink>

      <span class="topbar-divider"></span>

      <div class="crumb">
        <span class="crumb-root">{{ deviceName }}</span>
        <AppIcon name="chevron" :size="11" class="crumb-sep" />
        <b>{{ route.meta.title }}</b>
      </div>

      <div class="top-actions">
        <span v-if="isDirty" class="dirty-chip">未保存的更改</span>
        <span class="idle-chip mono" title="自动登出倒计时">自动登出 {{ idleText }}</span>
        <button class="btn sm primary" :disabled="saving || !isDirty" @click="onSave">
          <AppIcon name="save" :size="14" />
          <span class="hide-sm">{{ saving ? '保存中…' : '保存配置' }}</span>
        </button>
        <div class="user">
          <span class="user-avatar">{{ username.slice(0, 1).toUpperCase() }}</span>
          <span class="user-name hide-md">{{ username }}</span>
          <button class="logout" title="退出登录" @click="isDirty ? askLeave() : doLogout('已安全退出')">
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
            <AppIcon :name="item.icon" :size="16" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <div class="sidebar-foot">
        <div class="foot-status">
          <span class="foot-dot"></span>
          <span>设备运行中</span>
          <span class="mock-tag">MOCK</span>
        </div>
        <div class="foot-meta">
          <span>固件 {{ state.draft?.system?.firmware || 'v1.0.4' }}</span>
          <span>SD-504</span>
        </div>
        <RouterLink to="/" class="back-link">
          <AppIcon name="chevron" :size="12" />
          返回 Procet 16 通道演示
        </RouterLink>
        <p class="foot-copy">AETEK SD-504 界面演示<br />仅供对照参考</p>
      </div>
    </aside>

    <div class="main">
      <main class="content">
        <RouterView />
      </main>
    </div>

    <ConfirmDialog
      :open="leaving"
      title="放弃未保存的修改？"
      message="当前有尚未保存的配置更改，退出登录后将丢失。"
      detail="AETEK 采用全局显式保存模型：只有点击右上角「保存配置」才会写入设备。"
      confirm-text="丢弃并退出"
      tone="danger"
      @confirm="confirmLeave"
      @cancel="leaving = false"
    />
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

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: none;
}
.brand-mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--sidebar);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.brand-text b {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.4px;
  color: var(--ink);
}
.brand-text em {
  font-style: normal;
  font-size: 10px;
  color: var(--ink-3);
  letter-spacing: 0.8px;
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
  max-width: 200px;
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

.dirty-chip {
  font-size: 11px;
  font-weight: 700;
  color: var(--warn);
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  border-radius: var(--r-pill);
  padding: 3px 9px;
  white-space: nowrap;
}

.idle-chip {
  font-size: 11px;
  color: var(--ink-3);
  background: var(--surface-3);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 3px 9px;
  font-weight: 600;
  white-space: nowrap;
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
  padding: 14px 12px;
}

.nav-group + .nav-group {
  margin-top: 18px;
}

.nav-group-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--sidebar-ink-dim);
  padding: 0 10px 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 10px;
  border-radius: var(--r-md);
  color: var(--sidebar-ink);
  font-size: 12.8px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover {
  background: var(--sidebar-2);
  color: #fff;
}
.nav-item.active {
  background: var(--brand);
  color: #fff;
  font-weight: 600;
}

.sidebar-foot {
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.foot-status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  color: var(--sidebar-ink-dim);
}
.foot-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3ecf6b;
  box-shadow: 0 0 0 3px rgba(62, 207, 107, 0.16);
}
.mock-tag {
  margin-left: auto;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: var(--sidebar-ink-dim);
  border: 1px solid rgba(255, 255, 255, 0.16);
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
  font-family: var(--font-mono);
}
.back-link {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--sidebar-ink);
  padding: 6px 8px;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.05);
}
.back-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.back-link :deep(svg) {
  transform: rotate(180deg);
}
.foot-copy {
  margin-top: 10px;
  font-size: 10px;
  line-height: 1.6;
  color: var(--sidebar-ink-dim);
  opacity: 0.75;
}

/* ---------- Main ---------- */
.main {
  padding-left: var(--sidebar-w);
  padding-top: var(--topbar-h);
  min-height: 100vh;
}
.content {
  min-height: calc(100vh - var(--topbar-h));
}

.scrim {
  display: none;
}

/* ---------- Responsive ---------- */
@media (max-width: 1023px) {
  .hamburger {
    display: grid;
  }
  .main {
    padding-left: 0;
  }
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    width: 264px;
    box-shadow: var(--shadow-lg);
  }
  .drawer-open .sidebar {
    transform: translateX(0);
  }
  .drawer-open .scrim {
    display: block;
    position: fixed;
    inset: var(--topbar-h) 0 0 0;
    background: rgba(12, 22, 36, 0.42);
    z-index: 110;
  }
  .crumb-root {
    display: none;
  }
}

@media (max-width: 720px) {
  .hide-md,
  .hide-sm {
    display: none;
  }
  .topbar {
    gap: 10px;
    padding: 0 14px;
  }
  .top-actions {
    flex: none;
    gap: 8px;
  }
  .idle-chip,
  .topbar-divider,
  .brand-text {
    display: none;
  }
  .crumb {
    flex: 1;
    min-width: 0;
  }
  .crumb b {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
