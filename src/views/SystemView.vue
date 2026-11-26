<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import api from '../mock/api'
import { useToast } from '../stores/toast'
import { formatTemp } from '../utils/format'

const toast = useToast()

const form = ref(null)
const original = ref('')
const errors = reactive({})
const saving = ref(false)
const confirmOpen = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const uploadSecret = ref('')
const deviceTemp = ref(null)

const envTemp = computed(() => {
  if (deviceTemp.value == null) return '—'
  return formatTemp(deviceTemp.value, form.value?.environment.temp_unit || 'C')
})

const protocols = ['HTTP', 'TCP', 'MQTT', 'None']
const timezones = ['UTC+08:00 中国标准时间', 'UTC+00:00 UTC', 'UTC+09:00 日本标准时间']

const dirty = computed(() => form.value && JSON.stringify(form.value) !== original.value)
const timeMode = computed(() => form.value?.time.mode || 'NTP')

function clearErrors() {
  Object.keys(errors).forEach((k) => delete errors[k])
}

watch(
  form,
  () => {
    if (Object.keys(errors).length) clearErrors()
  },
  { deep: true }
)

function isValidIp(value) {
  const parts = String(value).split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255)
}

function validate() {
  clearErrors()
  const f = form.value
  if (!f.system.name.trim()) errors.name = '请输入系统名称'
  else if (f.system.name.length > 128) errors.name = '系统名称不能超过 128 字符'
  else if (/\s/.test(f.system.name)) errors.name = '系统名称不能包含空格'

  if (f.system.location.length > 128) errors.location = '位置不能超过 128 字符'
  if (f.system.contact.length > 128) errors.contact = '联系人信息不能超过 128 字符'

  if (timeMode.value === 'NTP' && !f.time.ntp_server.trim()) {
    errors.ntp = '启用 NTP 时需填写服务器地址'
  }

  if (!f.network.dhcp) {
    if (!isValidIp(f.network.ip)) errors.ip = '请输入合法的 IPv4 地址'
    if (!isValidIp(f.network.mask)) errors.mask = '请输入合法的子网掩码'
    if (!isValidIp(f.network.gateway)) errors.gateway = '请输入合法的默认网关'
    if (f.network.dns && !isValidIp(f.network.dns)) errors.dns = '请输入合法的 DNS 地址'
  }

  const logout = Number(f.account.auto_logout)
  if (!Number.isInteger(logout) || logout < 0 || logout > 9999) {
    errors.autoLogout = '自动登出时间需为 0–9999 的整数秒'
  }

  if (newPassword.value) {
    if (newPassword.value.length < 6) errors.password = '新密码至少 6 位'
    else if (newPassword.value.length > 31) errors.password = '新密码不能超过 31 位'
    if (newPassword.value !== confirmPassword.value) errors.confirmPassword = '两次输入的密码不一致'
  }

  if (f.upload.enabled && f.upload.protocol !== 'None') {
    if (!f.upload.host.trim()) errors.uploadHost = '请填写上报地址'
    const port = Number(f.upload.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.uploadPort = '端口需为 1–65535'
    const interval = Number(f.upload.interval_seconds)
    if (!Number.isInteger(interval) || interval < 5 || interval > 3600) {
      errors.uploadInterval = '上报周期需为 5–3600 秒'
    }
  }

  return Object.keys(errors).length === 0
}

async function load() {
  const [config, snapshot] = await Promise.all([api.getConfig(), api.getDevice()])
  config.time.manual_local = config.time.manual_time ? config.time.manual_time.replace(' ', 'T').slice(0, 16) : ''
  form.value = config
  deviceTemp.value = snapshot.device.temperature_c
  original.value = JSON.stringify(config)
  newPassword.value = ''
  confirmPassword.value = ''
  uploadSecret.value = ''
  clearErrors()
}

function askSave() {
  if (!validate()) {
    toast.error('存在无效参数，请检查后再保存')
    return
  }
  confirmOpen.value = true
}

async function doSave() {
  saving.value = true
  try {
    const payload = JSON.parse(JSON.stringify(form.value))
    if (newPassword.value) payload.account.new_password = newPassword.value
    if (uploadSecret.value) payload.upload.secret = uploadSecret.value
    form.value = await api.saveConfig(payload)
    if (!form.value.time.manual_local) {
      form.value.time.manual_local = form.value.time.manual_time
        ? form.value.time.manual_time.replace(' ', 'T').slice(0, 16)
        : ''
    }
    original.value = JSON.stringify(form.value)
    newPassword.value = ''
    confirmPassword.value = ''
    uploadSecret.value = ''
    confirmOpen.value = false
    toast.success('系统配置已保存并生效')
  } catch (err) {
    toast.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">系统设置</h1>
      <div class="row">
        <button class="btn" :disabled="!dirty" @click="load">撤销修改</button>
        <button class="btn primary" :disabled="!dirty || saving" @click="askSave">
          <AppIcon name="save" :size="15" />
          保存配置
        </button>
      </div>
    </div>

    <div v-if="!form" class="card"><div class="empty">正在读取设备配置…</div></div>

    <div v-else class="stack">
      <section class="card">
        <div class="card-head">
          <h3 class="card-title">系统信息</h3>
          <span class="dirty-flag" :class="{ on: dirty }">
            <i class="dot" :class="dirty ? 'warn' : 'ok'"></i>{{ dirty ? '有未保存的修改' : '已同步' }}
          </span>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field">
              <label>系统名称</label>
              <input v-model.trim="form.system.name" class="input" :class="{ invalid: errors.name }" maxlength="128" />
              <p v-if="errors.name" class="error-text">{{ errors.name }}</p>
              <p v-else class="hint">字母、数字与减号组成，不含空格，最长 128 字符</p>
            </div>
            <div class="field">
              <label>物理位置</label>
              <input v-model.trim="form.system.location" class="input" :class="{ invalid: errors.location }" maxlength="128" />
              <p v-if="errors.location" class="error-text">{{ errors.location }}</p>
            </div>
            <div class="field">
              <label>联系人信息</label>
              <input v-model.trim="form.system.contact" class="input" :class="{ invalid: errors.contact }" maxlength="128" />
              <p v-if="errors.contact" class="error-text">{{ errors.contact }}</p>
            </div>
            <div class="field">
              <label>系统描述</label>
              <input v-model="form.system.description" class="input" disabled />
            </div>
          </div>

          <div class="divider"></div>

          <div class="readonly-grid">
            <div><span>型号名称</span><b>{{ form.system.model }}</b></div>
            <div><span>序列号</span><b class="mono">{{ form.system.serial }}</b></div>
            <div><span>MAC 地址</span><b class="mono">{{ form.system.mac }}</b></div>
            <div><span>固件版本</span><b class="mono">v1.0.0 · 2026-11-12</b></div>
          </div>
        </div>
      </section>

      <div class="grid cols-2">
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">系统时间</h3>
            <StatusBadge tone="ok" :label="form.time.quality === 'TIME_VALID' ? '时间可信' : form.time.quality" />
          </div>
          <div class="card-body">
            <div class="segmented full">
              <button :class="{ active: timeMode === 'NTP' }" @click="form.time.mode = 'NTP'">NTP 自动同步</button>
              <button :class="{ active: timeMode === 'Manual' }" @click="form.time.mode = 'Manual'">手动设置</button>
            </div>

            <div class="form-grid" style="margin-top: 16px">
              <div v-if="timeMode === 'NTP'" class="field span-2">
                <label>NTP 服务器</label>
                <input v-model.trim="form.time.ntp_server" class="input" :class="{ invalid: errors.ntp }" placeholder="例如 ntp.aliyun.com" />
                <p v-if="errors.ntp" class="error-text">{{ errors.ntp }}</p>
              </div>
              <div v-else class="field span-2">
                <label>手动时间</label>
                <input v-model="form.time.manual_local" class="input" type="datetime-local" />
              </div>
              <div class="field">
                <label>时区</label>
                <select v-model="form.time.timezone" class="select">
                  <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
                </select>
              </div>
              <div class="field">
                <label>最近同步</label>
                <input :value="form.time.last_sync" class="input mono" disabled />
              </div>
            </div>
            <p class="hint" style="margin-top: 12px">
              时间字段会标注可信度：TIME_VALID 表示已完成可靠同步，TIME_ESTIMATED 为推算时间，TIME_UNKNOWN 表示无可靠时间源。
            </p>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3 class="card-title">IP 地址设置</h3>
            <button class="switch" :class="{ on: form.network.dhcp }" aria-label="DHCP 开关" @click="form.network.dhcp = !form.network.dhcp"></button>
          </div>
          <div class="card-body">
            <div class="row between dhcp-row">
              <span>DHCP 客户端</span>
              <StatusBadge :tone="form.network.dhcp ? 'ok' : 'muted'" :label="form.network.dhcp ? '已启用（自动获取）' : '已关闭（手动）'" plain />
            </div>
            <div class="form-grid">
              <div class="field">
                <label>IPv4 地址</label>
                <input v-model.trim="form.network.ip" class="input mono" :disabled="form.network.dhcp" :class="{ invalid: errors.ip }" />
                <p v-if="errors.ip" class="error-text">{{ errors.ip }}</p>
              </div>
              <div class="field">
                <label>子网掩码</label>
                <input v-model.trim="form.network.mask" class="input mono" :disabled="form.network.dhcp" :class="{ invalid: errors.mask }" />
                <p v-if="errors.mask" class="error-text">{{ errors.mask }}</p>
              </div>
              <div class="field">
                <label>默认网关</label>
                <input v-model.trim="form.network.gateway" class="input mono" :disabled="form.network.dhcp" :class="{ invalid: errors.gateway }" />
                <p v-if="errors.gateway" class="error-text">{{ errors.gateway }}</p>
              </div>
              <div class="field">
                <label>DNS 服务器</label>
                <input v-model.trim="form.network.dns" class="input mono" :disabled="form.network.dhcp" :class="{ invalid: errors.dns }" />
                <p v-if="errors.dns" class="error-text">{{ errors.dns }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="grid cols-2">
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">账户与安全</h3>
            <AppIcon name="lock" :size="18" style="color: var(--ink-3)" />
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="field">
                <label>用户名</label>
                <input v-model.trim="form.account.username" class="input" maxlength="31" />
              </div>
              <div class="field">
                <label>自动登出（秒）</label>
                <input v-model.number="form.account.auto_logout" class="input" type="number" min="0" max="9999" :class="{ invalid: errors.autoLogout }" />
                <p v-if="errors.autoLogout" class="error-text">{{ errors.autoLogout }}</p>
                <p v-else class="hint">0 表示永不自动登出</p>
              </div>
              <div class="field">
                <label>新密码</label>
                <input v-model="newPassword" class="input" type="password" autocomplete="new-password" placeholder="留空表示不修改" :class="{ invalid: errors.password }" />
                <p v-if="errors.password" class="error-text">{{ errors.password }}</p>
              </div>
              <div class="field">
                <label>确认新密码</label>
                <input v-model="confirmPassword" class="input" type="password" autocomplete="new-password" :class="{ invalid: errors.confirmPassword }" />
                <p v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</p>
              </div>
            </div>
            <p class="hint" style="margin-top: 12px">上次登录：{{ form.account.last_login }}</p>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3 class="card-title">环境设置</h3>
            <AppIcon name="temperature" :size="18" style="color: var(--ink-3)" />
          </div>
          <div class="card-body">
            <div class="segmented full">
              <button :class="{ active: form.environment.temp_unit === 'C' }" @click="form.environment.temp_unit = 'C'">摄氏度 °C</button>
              <button :class="{ active: form.environment.temp_unit === 'F' }" @click="form.environment.temp_unit = 'F'">华氏度 °F</button>
            </div>
            <div class="env-preview">
              <span class="env-icon"><AppIcon name="temperature" :size="22" /></span>
              <div>
                <span class="env-label">当前环境温度</span>
                <b>{{ envTemp }}</b>
              </div>
            </div>
            <p class="hint" style="margin-top: 12px">温度单位仅影响显示，不改变采集数据与告警阈值。</p>
          </div>
        </section>
      </div>

      <section class="card">
        <div class="card-head">
          <h3 class="card-title">数据上报</h3>
          <button class="switch" :class="{ on: form.upload.enabled }" aria-label="上报开关" @click="form.upload.enabled = !form.upload.enabled"></button>
        </div>
        <div class="card-body">
          <div class="form-grid cols-3-grid">
            <div class="field">
              <label>上报协议</label>
              <select v-model="form.upload.protocol" class="select" :disabled="!form.upload.enabled">
                <option v-for="p in protocols" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="field">
              <label>上报地址</label>
              <input v-model.trim="form.upload.host" class="input mono" :disabled="!form.upload.enabled || form.upload.protocol === 'None'" :class="{ invalid: errors.uploadHost }" />
              <p v-if="errors.uploadHost" class="error-text">{{ errors.uploadHost }}</p>
            </div>
            <div class="field">
              <label>端口</label>
              <input v-model.number="form.upload.port" class="input mono" type="number" min="1" max="65535" :disabled="!form.upload.enabled || form.upload.protocol === 'None'" :class="{ invalid: errors.uploadPort }" />
              <p v-if="errors.uploadPort" class="error-text">{{ errors.uploadPort }}</p>
            </div>
            <div class="field">
              <label>上报周期（秒）</label>
              <input v-model.number="form.upload.interval_seconds" class="input" type="number" min="5" max="3600" :disabled="!form.upload.enabled || form.upload.protocol === 'None'" :class="{ invalid: errors.uploadInterval }" />
              <p v-if="errors.uploadInterval" class="error-text">{{ errors.uploadInterval }}</p>
            </div>
            <div class="field">
              <label>认证密钥</label>
              <input v-model="uploadSecret" class="input" type="password" :disabled="!form.upload.enabled" placeholder="留空表示不修改" />
              <p class="hint">密钥不回显，修改时重新输入</p>
            </div>
            <div class="field">
              <label>连接状态</label>
              <div class="conn-state">
                <StatusBadge :tone="form.upload.state === 'connected' ? 'ok' : 'warn'" :label="form.upload.state === 'connected' ? '已连接' : '未连接'" />
                <span class="muted">最近成功 {{ form.upload.last_success }}</span>
              </div>
            </div>
          </div>
          <p class="hint" style="margin-top: 12px">
            事件上报采用至少一次投递，接收端需按唯一事件 ID 去重。上报成功确认前不会删除本地事件。
          </p>
        </div>
      </section>

      <section class="notice">
        <AppIcon name="info" :size="17" />
        <p>
          配置修改保存前会进行参数范围校验。网络配置与上报密钥不在此页面明文展示；
          配置写入后需确认保存才生效。
        </p>
      </section>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      title="保存系统配置？"
      message="将写入系统信息、时间、网络、账户与环境设置，并应用到当前设备。"
      detail="网络参数变更可能导致当前会话中断，请确认配置无误后再保存。"
      confirm-text="保存并应用"
      tone="primary"
      :busy="saving"
      @confirm="doSave"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<style scoped>
.stack {
  gap: 16px;
}
.dirty-flag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-3);
}
.dirty-flag.on {
  color: var(--warn);
  font-weight: 600;
}
.readonly-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.readonly-grid div {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.readonly-grid span {
  font-size: 10.5px;
  color: var(--ink-3);
  font-weight: 600;
  letter-spacing: 0.3px;
}
.readonly-grid b {
  font-size: 12.5px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.segmented.full {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  padding: 0;
  gap: 0;
  overflow: hidden;
}
.segmented.full button {
  flex: 1;
  height: 36px;
  border: none;
  border-right: 1px solid var(--line-strong);
  background: transparent;
  border-radius: 0;
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.segmented.full button:last-child {
  border-right: none;
}
.segmented.full button.active {
  background: var(--brand);
  color: #fff;
}
.dhcp-row {
  margin-bottom: 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
}
.cols-3-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.conn-state {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  flex-wrap: wrap;
}
.conn-state span {
  font-size: 11px;
}
.env-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 14px;
  border-radius: 4px;
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
}
.env-icon {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: #fbe7c6;
  color: var(--warn);
  display: grid;
  place-items: center;
  flex: none;
}
.env-preview div {
  display: flex;
  flex-direction: column;
}
.env-label {
  font-size: 11px;
  color: var(--ink-3);
}
.env-preview b {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.notice {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-radius: var(--r-lg);
  border: 1px solid var(--brand-line);
  background: var(--brand-soft);
  color: var(--brand-strong);
}
.notice p {
  font-size: 12px;
  line-height: 1.7;
  color: #2a4f8f;
}

@media (max-width: 1100px) {
  .readonly-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cols-3-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .readonly-grid,
  .cols-3-grid {
    grid-template-columns: 1fr;
  }
}
</style>
