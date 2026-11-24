import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '../stores/auth'

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
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth()
  if (!to.meta.public && !isAuthenticated.value) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.name === 'login' && isAuthenticated.value) {
    return { name: 'overview' }
  }
  return true
})

export default router
