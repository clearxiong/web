// Mock API 层：方法名与文档建议的 /api/v1/* 接口对应。
// 接入真实固件时，只需把这里的实现替换为 fetch('/api/v1/...')，页面代码无需改动。

import {
  getDevice,
  getStatistics,
  getDiagnostics,
  getConfig,
  saveConfig,
  getSurgeSettings,
  saveSurgeSettings,
  getEventsPage,
  getChannelDetail,
  getSyslogPage,
  clearSyslog,
  rebootDevice,
  factoryReset,
  exportConfigText,
  upgradeFirmware,
  injectEvent,
  pushLog,
  EVENT_TYPES,
  EVENT_LEVELS,
  CHANNEL_STATUS,
  OPTICAL_STATE
} from './db'

const LATENCY = [160, 380]

function delay() {
  const ms = LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function respond(fn) {
  await delay()
  return fn()
}

export const api = {
  // POST /api/v1/session
  login({ username, password }) {
    return respond(() => {
      if (!username || !password) {
        throw new Error('请输入用户名和密码')
      }
      return {
        token: `mock-${Date.now()}`,
        username,
        role: 'admin',
        auto_logout: 300,
        login_at: new Date().toISOString()
      }
    })
  },

  // GET /api/v1/device
  getDevice() {
    return respond(getDevice)
  },

  // GET /api/v1/channels
  getChannels() {
    return respond(() => getDevice().channels)
  },

  // GET /api/v1/channels/:id
  getChannel(id) {
    return respond(() => getChannelDetail(id))
  },

  // GET /api/v1/events?page=&page_size=&...
  getEvents(query) {
    return respond(() => getEventsPage(query))
  },

  // GET /api/v1/statistics
  getStatistics() {
    return respond(getStatistics)
  },

  // GET /api/v1/config
  getConfig() {
    return respond(getConfig)
  },

  // PUT /api/v1/config
  saveConfig(next) {
    return respond(() => saveConfig(next))
  },

  // GET /api/v1/surge-settings
  getSurgeSettings() {
    return respond(getSurgeSettings)
  },

  // PUT /api/v1/surge-settings
  saveSurgeSettings(rows) {
    return respond(() => saveSurgeSettings(rows))
  },

  // GET /api/v1/diagnostics
  getDiagnostics() {
    return respond(getDiagnostics)
  },

  // GET /api/v1/syslog
  getSyslog(query) {
    return respond(() => getSyslogPage(query))
  },

  // DELETE /api/v1/syslog
  clearSyslog() {
    return respond(clearSyslog)
  },

  // POST /api/v1/maintenance/reboot
  reboot() {
    return respond(rebootDevice)
  },

  // POST /api/v1/maintenance/factory-reset
  factoryReset() {
    return respond(factoryReset)
  },

  // GET /api/v1/maintenance/config-export
  exportConfig() {
    return respond(() => exportConfigText())
  },

  // POST /api/v1/maintenance/upgrade
  upgradeFirmware(version) {
    return respond(() => upgradeFirmware(version))
  },

  // POST /api/v1/debug/inject-event（仅 mock 演示）
  injectEvent(channelId) {
    return respond(() => injectEvent(channelId))
  },

  // POST /api/v1/system/log
  log(level, source, message) {
    return respond(() => pushLog(level, source, message))
  },

  meta: {
    EVENT_TYPES,
    EVENT_LEVELS,
    CHANNEL_STATUS,
    OPTICAL_STATE
  }
}

export default api
