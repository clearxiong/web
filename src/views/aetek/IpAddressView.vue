<script setup>
import { computed } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { useAetek } from '../../stores/aetek'
import { isIpv4 } from '../../utils/aetekValidate'

const { state, isDirty } = useAetek()

const ip = computed(() => state.draft?.ip || null)

const errors = computed(() => {
  const value = ip.value
  if (!value || value.dhcp) return {}
  return {
    address: value.address && !isIpv4(value.address) ? 'IP 地址格式不正确' : '',
    mask: value.mask && !isIpv4(value.mask) ? '子网掩码格式不正确' : '',
    gateway: value.gateway && !isIpv4(value.gateway) ? '默认网关格式不正确' : '',
    dns: value.dns && !isIpv4(value.dns) ? 'DNS 地址格式不正确' : ''
  }
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">IP 地址</h1>
        <p class="page-sub">网络可达配置 · 系统 › IP 地址（IP Address，手册 2-3，仅支持 IPv4）</p>
      </div>
      <span v-if="isDirty" class="edit-hint">
        <AppIcon name="info" :size="14" />修改需点击右上角「保存配置」才会写入设备
      </span>
    </div>

    <div v-if="!ip" class="card">
      <div class="empty">正在读取网络配置…</div>
    </div>

    <section v-else class="card narrow">
      <div class="card-head">
        <div>
          <h3 class="card-title">IPv4 设置</h3>
          <p class="card-sub">修改后需要重启或在保存后重新连接设备</p>
        </div>
        <AppIcon name="wifi" :size="18" class="head-icon" />
      </div>
      <div class="card-body">
        <div class="switch-row">
          <div>
            <b>DHCP 自动获取</b>
            <p>启用后由上级 DHCP 服务器分配地址，下列字段仅作展示。</p>
          </div>
          <button
            class="switch"
            :class="{ on: ip.dhcp }"
            role="switch"
            :aria-checked="ip.dhcp"
            aria-label="DHCP 自动获取"
            @click="ip.dhcp = !ip.dhcp"
          ></button>
        </div>

        <div class="form-grid">
          <div class="field">
            <label for="ip-address">IPv4 地址</label>
            <input
              id="ip-address"
              v-model="ip.address"
              class="input mono"
              :disabled="ip.dhcp"
              :class="{ invalid: errors.address }"
            />
            <span v-if="errors.address" class="error-text">{{ errors.address }}</span>
          </div>

          <div class="field">
            <label for="ip-mask">子网掩码</label>
            <input
              id="ip-mask"
              v-model="ip.mask"
              class="input mono"
              :disabled="ip.dhcp"
              :class="{ invalid: errors.mask }"
            />
            <span v-if="errors.mask" class="error-text">{{ errors.mask }}</span>
          </div>

          <div class="field">
            <label for="ip-gateway">默认网关</label>
            <input
              id="ip-gateway"
              v-model="ip.gateway"
              class="input mono"
              :disabled="ip.dhcp"
              :class="{ invalid: errors.gateway }"
            />
            <span v-if="errors.gateway" class="error-text">{{ errors.gateway }}</span>
          </div>

          <div class="field">
            <label for="ip-dns">DNS 服务器</label>
            <input
              id="ip-dns"
              v-model="ip.dns"
              class="input mono"
              :disabled="ip.dhcp"
              :class="{ invalid: errors.dns }"
            />
            <span v-if="errors.dns" class="error-text">{{ errors.dns }}</span>
          </div>

          <div class="field span-2">
            <label for="ip-hostname">DHCP 主机名</label>
            <input id="ip-hostname" v-model="ip.hostname" class="input mono" maxlength="63" />
            <span class="hint">在 DHCP 服务器上显示的设备名称，最多 63 字符，仅 ASCII</span>
          </div>
        </div>

        <p class="note">
          <AppIcon name="alert" :size="15" />
          保存后若地址变更，当前浏览器会话将与设备断开，需要用新地址重新打开 192.168.x.x。
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.head-icon {
  color: var(--ink-3);
}
.edit-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--warn);
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  border-radius: var(--r-pill);
  padding: 5px 12px;
}
.narrow {
  max-width: 760px;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--line);
}
.switch-row b {
  font-size: 13px;
}
.switch-row p {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--ink-3);
}
.note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 18px;
  padding: 11px 13px;
  border-radius: 9px;
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  color: #8a5207;
  font-size: 12px;
  line-height: 1.65;
}
.note svg {
  flex: none;
  margin-top: 1px;
}
</style>
