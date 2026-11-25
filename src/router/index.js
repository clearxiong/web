import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '../stores/auth'
import { useAetek } from '../stores/aetek'

import LoginView from '../views/LoginView.vue'
import AppShell from '../layouts/AppShell.vue'
import OverviewView from '../views/OverviewView.vue'
import ChannelsView from '../views/ChannelsView.vue'
import EventsView from '../views/EventsView.vue'
import StatsView from '../views/StatsView.vue'
import SurgeSettingsView from '../views/SurgeSettingsView.vue'
import SystemView from '../views/SystemView.vue'
import DiagnosticsView from '../views/DiagnosticsView.vue'
import MaintenanceView from '../views/MaintenanceView.vue'

import AetekLoginView from '../views/aetek/LoginView.vue'
import AetekShell from '../layouts/AetekShell.vue'
import AetekSystemInfoView from '../views/aetek/SystemInfoView.vue'
import AetekSystemTimeView from '../views/aetek/SystemTimeView.vue'
import AetekIpAddressView from '../views/aetek/IpAddressView.vue'
import AetekAccountView from '../views/aetek/AccountView.vue'
import AetekSysLogView from '../views/aetek/SysLogView.vue'
import AetekSurgeSettingsView from '../views/aetek/SurgeSettingsView.vue'
import AetekModuleStatusView from '../views/aetek/ModuleStatusView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true, title: '登录' }
  },
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', name: 'overview', component: OverviewView, meta: { title: '设备总览' } },
      { path: 'channels', name: 'channels', component: ChannelsView, meta: { title: '通道状态' } },
      { path: 'events', name: 'events', component: EventsView, meta: { title: '事件历史' } },
      { path: 'stats', name: 'stats', component: StatsView, meta: { title: '统计分析' } },
      {
        path: 'surge-settings',
        name: 'surge-settings',
        component: SurgeSettingsView,
        meta: { title: '浪涌设置' }
      },
      { path: 'system', name: 'system', component: SystemView, meta: { title: '系统设置' } },
      {
        path: 'diagnostics',
        name: 'diagnostics',
        component: DiagnosticsView,
        meta: { title: '通信诊断' }
      },
      {
        path: 'maintenance',
        name: 'maintenance',
        component: MaintenanceView,
        meta: { title: '维护' }
      }
    ]
  },

  // ---------- AETEK SD-504 演示（按官方手册的 7 页结构）----------
  {
    path: '/aetek/login',
    name: 'aetek-login',
    component: AetekLoginView,
    meta: { product: 'aetek', public: true, title: '登录' }
  },
  {
    path: '/aetek',
    component: AetekShell,
    meta: { product: 'aetek' },
    children: [
      { path: '', redirect: '/aetek/surge/module-status' },
      {
        path: 'system/information',
        name: 'aetek-system-info',
        component: AetekSystemInfoView,
        meta: { title: '设备信息' }
      },
      {
        path: 'system/time',
        name: 'aetek-system-time',
        component: AetekSystemTimeView,
        meta: { title: '系统时间' }
      },
      {
        path: 'system/ip',
        name: 'aetek-system-ip',
        component: AetekIpAddressView,
        meta: { title: 'IP 地址' }
      },
      {
        path: 'system/account',
        name: 'aetek-system-account',
        component: AetekAccountView,
        meta: { title: '账户' }
      },
      {
        path: 'system/syslog',
        name: 'aetek-system-syslog',
        component: AetekSysLogView,
        meta: { title: '系统日志' }
      },
      {
        path: 'surge/settings',
        name: 'aetek-surge-settings',
        component: AetekSurgeSettingsView,
        meta: { title: '浪涌设置' }
      },
      {
        path: 'surge/module-status',
        name: 'aetek-module-status',
        component: AetekModuleStatusView,
        meta: { title: '模块状态' }
      }
    ]
  },

  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to) => {
  if (to.meta.product === 'aetek') {
    const { isAuthenticated: isAetekAuthed } = useAetek()
    if (!to.meta.public && !isAetekAuthed.value) {
      return { name: 'aetek-login', query: { redirect: to.fullPath } }
    }
    if (to.name === 'aetek-login' && isAetekAuthed.value) {
      return { name: 'aetek-module-status' }
    }
    return true
  }

  const { isAuthenticated } = useAuth()
  if (!to.meta.public && !isAuthenticated.value) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.name === 'login' && isAuthenticated.value) {
    return { name: 'overview' }
  }
  return true
})

router.afterEach((to) => {
  const title = to.meta.title
  if (to.meta.product === 'aetek') {
    document.title = title ? `${title} · AETEK SD-504` : 'AETEK SD-504'
  } else {
    document.title = title
      ? `${title} · Procet 16通道智能防雷监测终端`
      : 'Procet · 16通道智能防雷监测终端'
  }
})

export default router
