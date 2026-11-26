<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import api from '../mock/api'
import { useToast } from '../stores/toast'
import { downloadFile } from '../utils/format'

const toast = useToast()

const importInput = ref(null)
const upgradeInput = ref(null)
const importFile = ref(null)
const upgradeFile = ref(null)
const action = ref('')
const busy = ref(false)
const upgrading = ref(false)
const upgradeProgress = ref(0)
const upgradeStage = ref('')
const exporting = ref(false)
let upgradeTimer = null

const currentVersion = ref('v1.0.0')
const targetVersion = 'v1.1.0'

// ---------- STM32 模块固件升级 ----------
const STM32_TARGET = '1.5.0'

const stm32Input = ref(null)
const stm32File = ref(null)
const stm32Modules = ref([])
const stm32Selected = ref([])
const stm32Busy = ref(false)
const stm32Overall = ref(0)
const stm32Stage = ref('')
const stm32Status = ref({})
let stm32Aborted = false

const selectableModules = computed(() => stm32Modules.value.filter((m) => m.online))
const allSelected = computed(
  () =>
    selectableModules.value.length > 0 &&
    selectableModules.value.every((m) => stm32Selected.value.includes(m.module_id))
)

async function loadModules() {
  const device = await api.getDevice()
  stm32Modules.value = (device.modules || []).map((m) => ({
    module_id: m.module_id,
    address: m.address,
    firmware: m.firmware,
    online: m.online,
    channel_ids: m.channel_ids || []
  }))
  stm32Selected.value = stm32Modules.value
    .filter((m) => m.online && m.firmware !== STM32_TARGET)
    .map((m) => m.module_id)
}

function toggleAll() {
  if (stm32Busy.value) return
  stm32Selected.value = allSelected.value
    ? []
    : selectableModules.value.map((m) => m.module_id)
}

function pickStm32() {
  if (stm32Busy.value) return
  stm32Input.value?.click()
}

function onStm32Change(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!/\.(bin|hex)$/i.test(file.name)) {
    toast.error('请选择 .bin 或 .hex 模块固件')
    return
  }
  if (file.size > 1024 * 1024) {
    toast.error('模块固件不能超过 1 MB')
    return
  }
  stm32File.value = file
}

function askStm32() {
  if (stm32Busy.value) return
  if (!stm32File.value) {
    toast.error('请先选择模块固件文件')
    return
  }
  if (!stm32Selected.value.length) {
    toast.error('请至少选择一个待升级模块')
    return
  }
  ask('stm32')
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function runStm32Upgrade() {
  const ids = [...stm32Selected.value]
  stm32Aborted = false
  stm32Busy.value = true
  stm32Overall.value = 0
  stm32Stage.value = '正在准备升级…'
  stm32Status.value = Object.fromEntries(ids.map((id) => [id, { state: 'pending', progress: 0 }]))

  try {
    for (let i = 0; i < ids.length; i++) {
      if (stm32Aborted) return
      const id = ids[i]
      const mod = stm32Modules.value.find((m) => m.module_id === id)
      stm32Status.value[id] = { state: 'running', progress: 0 }
      await api.log('INFO', 'module', `开始升级模块 ${id}（${mod?.address || '—'}）固件至 v${STM32_TARGET}`)

      for (let p = 0; p <= 100; p += 4) {
        if (stm32Aborted) return
        stm32Status.value[id].progress = p
        stm32Overall.value = Math.round(((i + p / 100) / ids.length) * 100)
        stm32Stage.value =
          p < 25
            ? `模块 ${id}：正在校验镜像…`
            : p < 70
              ? `模块 ${id}：正在通过 I²C 传输…`
              : p < 96
                ? `模块 ${id}：正在写入 Flash…`
                : `模块 ${id}：正在重启模块…`
        await sleep(45)
      }

      await api.upgradeStm32Firmware([id], STM32_TARGET)
      if (mod) mod.firmware = STM32_TARGET
      stm32Status.value[id] = { state: 'done', progress: 100 }
    }

    stm32Overall.value = 100
    stm32Stage.value = '升级完成'
    stm32File.value = null
    stm32Selected.value = []
    toast.success(`已将 ${ids.length} 个模块升级至 v${STM32_TARGET}`)
  } catch (err) {
    toast.error(err.message || '模块升级失败')
  } finally {
    stm32Busy.value = false
  }
}

const dialog = computed(() => {
  if (action.value === 'reboot') {
    return {
      title: '重启设备？',
      message: '设备将立即重启，Web 管理页面会短暂不可用。',
      detail: '已保存的配置与本地事件日志在重启后仍然可用。',
      confirmText: '重启设备',
      tone: 'danger'
    }
  }
  if (action.value === 'reset') {
    return {
      title: '恢复出厂默认？',
      message: '全部系统配置将恢复为出厂默认值，包括网络、账户与上报参数。',
      detail: '事件日志与统计数据不会删除，但自定义配置无法撤销。',
      confirmText: '恢复默认',
      tone: 'danger'
    }
  }
  if (action.value === 'import') {
    return {
      title: '导入配置文件？',
      message: `将使用「${importFile.value?.name || '所选文件'}」覆盖当前设备配置。`,
      detail: '导入前请确认文件来自可信来源，导入后需要重启设备生效。',
      confirmText: '导入配置',
      tone: 'warn'
    }
  }
  if (action.value === 'stm32') {
    return {
      title: '升级避雷模块固件？',
      message: `将向 M${stm32Selected.value.join(' / M')} 共 ${stm32Selected.value.length} 个模块写入「${stm32File.value?.name || '所选固件'}」，目标版本 v${STM32_TARGET}。`,
      detail: '升级按模块依次进行，期间对应 4 路通道暂停采集，状态短暂显示为「未知」。',
      confirmText: '开始升级',
      tone: 'warn'
    }
  }
  return { title: '', message: '', detail: '', confirmText: '确认', tone: 'danger' }
})

function pickImport() {
  if (busy.value) return
  importInput.value?.click()
}

function pickUpgrade() {
  if (upgrading.value) return
  upgradeInput.value?.click()
}

function onImportChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (file.size > 1024 * 1024) {
    toast.error('配置文件不能超过 1 MB')
    return
  }
  importFile.value = file
}

function onUpgradeChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!/\.bin$/i.test(file.name)) {
    toast.error('请选择 .bin 固件文件')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    toast.error('固件文件不能超过 8 MB')
    return
  }
  upgradeFile.value = file
}

async function exportConfig() {
  exporting.value = true
  try {
    const text = await api.exportConfig()
    downloadFile(`sd16-config-${new Date().toISOString().slice(0, 10)}.json`, text, 'application/json')
    toast.success('配置文件已导出')
    await api.log('INFO', 'system', '导出了设备配置')
  } finally {
    exporting.value = false
  }
}

function ask(actionName) {
  action.value = actionName
}

async function onConfirm() {
  if (action.value === 'stm32') {
    action.value = ''
    runStm32Upgrade()
    return
  }
  busy.value = true
  try {
    if (action.value === 'reboot') {
      await api.reboot()
      toast.success('重启指令已下发，设备将在约 30 秒内恢复')
    } else if (action.value === 'reset') {
      await api.factoryReset()
      toast.success('已恢复出厂默认配置')
    } else if (action.value === 'import') {
      await api.log('WARN', 'system', `导入了配置文件：${importFile.value?.name || '未知文件'}`)
      await new Promise((r) => setTimeout(r, 500))
      toast.success('配置导入成功，请重启设备使其生效')
      importFile.value = null
    }
    action.value = ''
  } catch (err) {
    toast.error(err.message || '操作失败')
  } finally {
    busy.value = false
  }
}

function startUpgrade() {
  if (!upgradeFile.value) {
    toast.error('请先选择固件文件')
    return
  }
  upgrading.value = true
  upgradeProgress.value = 0
  upgradeStage.value = '正在校验固件…'
  api.log('WARN', 'system', `固件升级开始：${upgradeFile.value.name}`)

  upgradeTimer = setInterval(() => {
    upgradeProgress.value = Math.min(100, upgradeProgress.value + Math.random() * 11 + 4)
    if (upgradeProgress.value < 30) upgradeStage.value = '正在校验固件…'
    else if (upgradeProgress.value < 75) upgradeStage.value = '正在写入 Flash…'
    else if (upgradeProgress.value < 100) upgradeStage.value = '正在校验写入结果…'
    else {
      clearInterval(upgradeTimer)
      upgradeTimer = null
      upgradeStage.value = '升级完成，正在重启…'
      finishUpgrade()
    }
  }, 260)
}

async function finishUpgrade() {
  await api.upgradeFirmware(targetVersion)
  currentVersion.value = targetVersion
  setTimeout(() => {
    upgrading.value = false
    upgradeFile.value = null
    toast.success(`固件已升级至 ${targetVersion}，设备正在重启`)
  }, 900)
}

onMounted(loadModules)

onBeforeUnmount(() => {
  stm32Aborted = true
  if (upgradeTimer) clearInterval(upgradeTimer)
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">维护</h1>
    </div>

    <div class="grid cols-2">
      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">配置导入 / 导出</h3>
            <p class="card-sub">备份或以文本文件恢复设备配置</p>
          </div>
          <span class="card-icon"><AppIcon name="file" :size="18" /></span>
        </div>
        <div class="card-body">
          <div class="op-block">
            <div class="op-text">
              <b>导出当前配置</b>
              <p>将系统信息、网络、时间、环境、上报与浪涌设置导出为 JSON 文本文件。</p>
            </div>
            <button class="btn" :disabled="exporting" @click="exportConfig">
              <AppIcon name="download" :size="15" />
              {{ exporting ? '导出中…' : '导出配置' }}
            </button>
          </div>

          <div class="divider"></div>

          <div class="op-block">
            <div class="op-text">
              <b>导入配置文件</b>
              <p>选择此前备份的配置文件，导入后将覆盖当前设备设置。</p>
            </div>
            <div class="import-actions">
              <input ref="importInput" class="file-hidden" type="file" accept=".json,.txt,.cfg" @change="onImportChange" />
              <button class="btn" :disabled="busy" @click="pickImport">
                <AppIcon name="upload" :size="15" />选择文件
              </button>
              <button class="btn primary" :disabled="!importFile || busy" @click="ask('import')">导入</button>
            </div>
          </div>

          <div v-if="importFile" class="file-chip">
            <AppIcon name="file" :size="15" />
            <span>{{ importFile.name }}</span>
            <em>{{ (importFile.size / 1024).toFixed(1) }} KB</em>
            <button class="file-clear" aria-label="移除" @click="importFile = null">
              <AppIcon name="close" :size="13" />
            </button>
          </div>
          <p v-else class="hint">支持 JSON / TXT / CFG，最大 1 MB。导入后需重启设备生效。</p>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">重启设备</h3>
            <p class="card-sub">重新启动 ESP32 主控与采集任务</p>
          </div>
          <span class="card-icon"><AppIcon name="power" :size="18" /></span>
        </div>
        <div class="card-body">
          <div class="op-block">
            <div class="op-text">
              <b>立即重启</b>
              <p>重启期间采集与 Web 服务会短暂中断，事件与配置不会丢失。</p>
            </div>
            <button class="btn" :disabled="busy" @click="ask('reboot')">
              <AppIcon name="power" :size="15" />重启设备
            </button>
          </div>
          <div class="divider"></div>
          <div class="op-block">
            <div class="op-text">
              <b>恢复出厂默认</b>
              <p>清除自定义系统配置并恢复默认网络参数，事件日志保留。</p>
            </div>
            <button class="btn danger" :disabled="busy" @click="ask('reset')">
              <AppIcon name="factory" :size="15" />恢复默认
            </button>
          </div>
          <p class="hint warn-hint">
            <AppIcon name="alert" :size="14" />恢复默认后当前网络地址可能改变，请记录默认地址。
          </p>
        </div>
      </section>

      <section class="card span-2 upgrade-card">
        <div class="card-head">
          <div>
            <h3 class="card-title">固件升级</h3>
            <p class="card-sub">通过 HTTP 上传固件镜像并升级设备</p>
          </div>
          <span class="card-icon"><AppIcon name="upload" :size="18" /></span>
        </div>
        <div class="card-body">
          <div class="version-row">
            <div class="version-box">
              <span>当前版本</span>
              <b class="mono">{{ currentVersion }}</b>
              <em>2026-11-12</em>
            </div>
            <AppIcon name="chevron" :size="16" class="version-arrow" />
            <div class="version-box next">
              <span>待升级版本</span>
              <b class="mono">{{ targetVersion }}</b>
              <em>演示固件</em>
            </div>
            <div class="version-actions">
              <input ref="upgradeInput" class="file-hidden" type="file" accept=".bin" @change="onUpgradeChange" />
              <button class="btn" :disabled="upgrading" @click="pickUpgrade">
                <AppIcon name="file" :size="15" />选择固件
              </button>
              <button class="btn primary" :disabled="!upgradeFile || upgrading" @click="startUpgrade">
                <AppIcon name="upload" :size="15" />开始升级
              </button>
            </div>
          </div>

          <div v-if="upgradeFile" class="file-chip">
            <AppIcon name="file" :size="15" />
            <span>{{ upgradeFile.name }}</span>
            <em>{{ (upgradeFile.size / 1024).toFixed(1) }} KB</em>
          </div>

          <div v-if="upgrading" class="upgrade-progress">
            <div class="upgrade-top">
              <span>{{ upgradeStage }}</span>
              <b class="mono">{{ Math.round(upgradeProgress) }}%</b>
            </div>
            <div class="progress"><span :style="{ width: upgradeProgress + '%' }"></span></div>
            <p class="hint">升级过程中请勿关闭设备电源。演示环境使用模拟进度。</p>
          </div>

          <div class="warn-box">
            <AppIcon name="alert" :size="16" />
            <p>固件升级过程中请勿断电。升级失败时设备应自动回滚到上一可用版本。</p>
          </div>
        </div>
      </section>

      <section class="card span-2 stm32-card">
        <div class="card-head">
          <div>
            <h3 class="card-title">避雷模块固件升级</h3>
            <p class="card-sub">通过 I²C 逐模块烧写 4 个避雷模块的固件</p>
          </div>
          <span class="card-icon"><AppIcon name="channels" :size="18" /></span>
        </div>
        <div class="card-body">
          <div class="stm32-table">
            <div class="stm32-head">
              <label class="cb">
                <input type="checkbox" :checked="allSelected" :disabled="stm32Busy" @change="toggleAll" />
                <span>模块</span>
              </label>
              <span>I²C 地址</span>
              <span>监测通道</span>
              <span>当前固件</span>
              <span>运行状态</span>
              <span>升级状态</span>
            </div>

            <label
              v-for="m in stm32Modules"
              :key="m.module_id"
              class="stm32-row"
              :class="{ disabled: !m.online || stm32Busy }"
            >
              <span class="cb">
                <input
                  v-model="stm32Selected"
                  type="checkbox"
                  :value="m.module_id"
                  :disabled="!m.online || stm32Busy"
                />
                <b>M{{ m.module_id }}</b>
              </span>
              <span class="mono">{{ m.address }}</span>
              <span class="mono">
                CH{{ String(m.channel_ids[0] ?? 0).padStart(2, '0') }}–CH{{
                  String(m.channel_ids[m.channel_ids.length - 1] ?? 0).padStart(2, '0')
                }}
              </span>
              <span class="mono">{{ m.firmware }}</span>
              <StatusBadge :tone="m.online ? 'ok' : 'muted'" :label="m.online ? '在线' : '离线'" plain />
              <span class="stm32-state">
                <template v-if="stm32Status[m.module_id]?.state === 'running'">
                  <span class="state-run mono">{{ stm32Status[m.module_id].progress }}%</span>
                </template>
                <template v-else-if="stm32Status[m.module_id]?.state === 'done'">
                  <span class="state-ok">已完成</span>
                </template>
                <template v-else>
                  <span class="muted">{{ m.firmware === STM32_TARGET ? '已是最新' : '待升级' }}</span>
                </template>
              </span>
            </label>

            <div v-if="!stm32Modules.length" class="stm32-empty">正在读取模块信息…</div>
          </div>

          <div class="version-row stm32-actions">
            <div class="version-box">
              <span>已选模块</span>
              <b>{{ stm32Selected.length }} / {{ selectableModules.length }}</b>
              <em>仅在线模块可升级</em>
            </div>
            <AppIcon name="chevron" :size="16" class="version-arrow" />
            <div class="version-box next">
              <span>目标版本</span>
              <b class="mono">v{{ STM32_TARGET }}</b>
              <em>避雷模块固件</em>
            </div>
            <div class="version-actions">
              <input ref="stm32Input" class="file-hidden" type="file" accept=".bin,.hex" @change="onStm32Change" />
              <button class="btn" :disabled="stm32Busy" @click="pickStm32">
                <AppIcon name="file" :size="15" />选择固件
              </button>
              <button
                class="btn primary"
                :disabled="!stm32File || !stm32Selected.length || stm32Busy"
                @click="askStm32"
              >
                <AppIcon name="upload" :size="15" />开始升级
              </button>
            </div>
          </div>

          <div v-if="stm32File" class="file-chip">
            <AppIcon name="file" :size="15" />
            <span>{{ stm32File.name }}</span>
            <em>{{ (stm32File.size / 1024).toFixed(1) }} KB</em>
            <button class="file-clear" aria-label="移除" @click="stm32File = null">
              <AppIcon name="close" :size="13" />
            </button>
          </div>
          <p v-else class="hint">
            支持 .bin / .hex，最大 1 MB。默认勾选固件版本低于 v{{ STM32_TARGET }} 的在线模块。
          </p>

          <div v-if="stm32Busy" class="upgrade-progress">
            <div class="upgrade-top">
              <span>{{ stm32Stage }}</span>
              <b class="mono">{{ stm32Overall }}%</b>
            </div>
            <div class="progress"><span :style="{ width: stm32Overall + '%' }"></span></div>
            <p class="hint">升级按模块依次进行，请勿关闭设备电源。演示环境使用模拟进度。</p>
          </div>

          <div class="warn-box">
            <AppIcon name="alert" :size="16" />
            <p>
              模块升级期间对应 4 路通道暂停采集，状态短暂显示为「未知」。升级失败的固件会停留在
              Bootloader 中等待新固件，需重新发起升级写入。
            </p>
          </div>
        </div>
      </section>
    </div>

    <section class="notice">
      <AppIcon name="info" :size="17" />
      <p>
        维护操作执行前均会二次确认。演示环境中的所有操作均为 mock，
        不会真正重启设备或写入固件，但会写入系统日志以便在「通信诊断」中查看。
      </p>
    </section>

    <ConfirmDialog
      :open="Boolean(action)"
      :title="dialog.title"
      :message="dialog.message"
      :detail="dialog.detail"
      :confirm-text="dialog.confirmText"
      :tone="dialog.tone"
      :busy="busy"
      @confirm="onConfirm"
      @cancel="action = ''"
    />
  </div>
</template>

<style scoped>
.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background: var(--surface-3);
  color: var(--ink-2);
  display: grid;
  place-items: center;
}
.op-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.op-text {
  flex: 1;
  min-width: 200px;
}
.op-text b {
  font-size: 13px;
  color: var(--ink);
}
.op-text p {
  margin-top: 3px;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--ink-3);
}
.import-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.file-hidden {
  display: none;
}
.file-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 9px 11px;
  border-radius: 4px;
  background: var(--brand-soft);
  border: 1px solid var(--brand-line);
  color: var(--brand-strong);
  font-size: 12px;
}
.file-chip span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-chip em {
  font-style: normal;
  font-size: 11px;
  color: var(--ink-3);
}
.file-clear {
  border: none;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.warn-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  color: var(--warn);
}
.span-2 {
  grid-column: span 2;
}
.version-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.version-box {
  padding: 11px 14px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.version-box.next {
  border-color: var(--brand-line);
  background: var(--brand-soft);
}
.version-box span {
  font-size: 10.5px;
  color: var(--ink-3);
  font-weight: 600;
}
.version-box b {
  font-size: 18px;
  color: var(--ink);
}
.version-box em {
  font-style: normal;
  font-size: 10.5px;
  color: var(--ink-3);
}
.version-arrow {
  color: var(--ink-3);
}
.version-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.upgrade-progress {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--brand-line);
  background: var(--brand-soft);
  border-radius: 4px;
}

/* ---------- STM32 模块升级 ---------- */
.stm32-table {
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow-x: auto;
  background: var(--surface);
}
.stm32-head,
.stm32-row {
  display: grid;
  grid-template-columns: 1.05fr 0.85fr 1.15fr 0.85fr 0.85fr 0.9fr;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  min-width: 620px;
  font-size: 12px;
}
.stm32-head {
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
  color: var(--ink-3);
  font-size: 11px;
  font-weight: 600;
}
.stm32-row {
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background 0.15s ease;
}
.stm32-row:last-of-type {
  border-bottom: none;
}
.stm32-row:hover:not(.disabled) {
  background: var(--surface-2);
}
.stm32-row.disabled {
  cursor: not-allowed;
  color: var(--ink-3);
}
.cb {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cb input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: var(--brand);
  cursor: inherit;
  flex: none;
}
.cb b {
  font-size: 12.5px;
  color: var(--ink);
}
.stm32-state {
  font-size: 11.5px;
}
.state-run {
  color: var(--brand);
  font-weight: 700;
}
.state-ok {
  color: var(--ok);
  font-weight: 600;
}
.stm32-empty {
  padding: 18px;
  text-align: center;
  font-size: 12px;
  color: var(--ink-3);
}
.stm32-actions {
  margin-top: 16px;
}
.upgrade-top {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--brand-strong);
  margin-bottom: 8px;
  font-weight: 600;
}
.upgrade-progress .progress {
  height: 9px;
  background: rgba(64, 158, 255, 0.18);
}
.warn-box {
  display: flex;
  gap: 9px;
  margin-top: 16px;
  padding: 11px 13px;
  border-radius: 4px;
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  color: var(--warn);
}
.warn-box p {
  font-size: 11.5px;
  line-height: 1.65;
  color: #8a5207;
}
.warn-box svg {
  flex: none;
  margin-top: 1px;
}
.notice {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: var(--r-lg);
  border: 1px solid var(--brand-line);
  background: var(--brand-soft);
}
.notice p {
  font-size: 12px;
  line-height: 1.7;
  color: #2a4f8f;
}
.notice svg {
  flex: none;
  color: var(--brand);
  margin-top: 1px;
}

@media (max-width: 900px) {
  .span-2 {
    grid-column: auto;
  }
  .version-actions {
    margin-left: 0;
    width: 100%;
  }
}
</style>
