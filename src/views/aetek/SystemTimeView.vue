<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { useAetek } from '../../stores/aetek'
import { formatClock } from '../../utils/format'

const { state, isDirty } = useAetek()

const time = computed(() => state.draft?.time || null)
const now = ref(new Date())
const timer = setInterval(() => (now.value = new Date()), 1000)
onBeforeUnmount(() => clearInterval(timer))

const TIMEZONES = [
  'UTC-08:00',
  'UTC-05:00',
  'UTC+00:00',
  'UTC+01:00',
  'UTC+07:00',
  'UTC+08:00',
  'UTC+09:00',
  'UTC+10:00'
]
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">系统时间</h1>
        <p class="page-sub">时间基准 · 系统 › 系统时间（System Time，手册 2-2）</p>
      </div>
      <span v-if="isDirty" class="edit-hint">
        <AppIcon name="info" :size="14" />修改需点击右上角「保存配置」才会写入设备
      </span>
    </div>

    <div v-if="!time" class="card">
      <div class="empty">正在读取时间配置…</div>
    </div>

    <div v-else class="grid cols-2">
      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">手动时间</h3>
            <p class="card-sub">关闭 NTP 校时时使用</p>
          </div>
          <AppIcon name="clock" :size="18" class="head-icon" />
        </div>
        <div class="card-body">
          <div class="field">
            <label for="manual-time">设备时间（年 / 月 / 日 / 时 / 分 / 秒）</label>
            <input
              id="manual-time"
              v-model="time.manual"
              class="input mono"
              type="datetime-local"
              step="1"
              :disabled="time.ntp"
            />
            <span class="hint">
              {{ time.ntp ? 'NTP 校时已启用，手动时间不可编辑' : '保存后设备时间立即生效' }}
            </span>
          </div>

          <div class="divider"></div>

          <div class="clock-box">
            <span>浏览器当前时间</span>
            <b class="mono">{{ formatClock(now) }}</b>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">NTP 校时</h3>
            <p class="card-sub">启用后由网络时间服务器校时</p>
          </div>
          <AppIcon name="wifi" :size="18" class="head-icon" />
        </div>
        <div class="card-body">
          <div class="switch-row">
            <div>
              <b>启用 NTP 校时</b>
              <p>启用后忽略手动时间，按周期同步服务器时间。</p>
            </div>
            <button
              class="switch"
              :class="{ on: time.ntp }"
              role="switch"
              :aria-checked="time.ntp"
              aria-label="启用 NTP 校时"
              @click="time.ntp = !time.ntp"
            ></button>
          </div>

          <div class="field">
            <label for="ntp-server">NTP 服务器</label>
            <input id="ntp-server" v-model="time.ntp_server" class="input mono" :disabled="!time.ntp" />
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="timezone">时区</label>
              <select id="timezone" v-model="time.timezone" class="select">
                <option v-for="tz in TIMEZONES" :key="tz" :value="tz">{{ tz }}</option>
              </select>
            </div>
            <div class="field">
              <label>夏令时</label>
              <button
                class="switch inline"
                :class="{ on: time.dst }"
                role="switch"
                :aria-checked="time.dst"
                aria-label="夏令时"
                @click="time.dst = !time.dst"
              ></button>
            </div>
          </div>
        </div>
      </section>
    </div>
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
.clock-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}
.clock-box span {
  font-size: 12px;
  color: var(--ink-3);
}
.clock-box b {
  font-size: 20px;
  letter-spacing: 0.5px;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
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
.grid-2 {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 16px;
  margin-top: 16px;
}
.switch.inline {
  margin-bottom: 7px;
}
</style>
