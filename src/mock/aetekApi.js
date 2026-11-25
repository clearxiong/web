// Mock API 层：对应 AETEK SD-504 的 /api/v1/aetek/* 接口。
// 接真实固件时，把这里的方法改成 fetch 调用即可，页面与 store 无需改动。

import {
  login as doLogin,
  getSnapshot,
  getModules,
  getSyslog,
  saveConfig,
  simulateSurge,
  clearSyslog,
  AETEK_STATUS,
  statusOf
} from './aetek'

const LATENCY = [150, 350]

function delay() {
  const ms = LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function respond(fn) {
  await delay()
  return fn()
}

export const aetekApi = {
  // POST /api/v1/aetek/session
  login({ username, password }) {
    return respond(() => doLogin({ username, password }))
  },

  // GET /api/v1/aetek/config
  getSnapshot() {
    return respond(getSnapshot)
  },

  // GET /api/v1/aetek/modules
  getModules() {
    return respond(getModules)
  },

  // GET /api/v1/aetek/syslog
  getSyslog() {
    return respond(getSyslog)
  },

  // PUT /api/v1/aetek/config
  saveConfig(draft) {
    return respond(() => saveConfig(draft))
  },

  // POST /api/v1/aetek/modules/:id/surge（仅 mock 演示）
  simulateSurge(moduleId) {
    return respond(() => simulateSurge(moduleId))
  },

  // DELETE /api/v1/aetek/syslog
  clearSyslog() {
    return respond(clearSyslog)
  },

  meta: {
    AETEK_STATUS,
    statusOf
  }
}

export default aetekApi
