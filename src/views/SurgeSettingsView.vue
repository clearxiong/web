<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import LifeBar from '../components/LifeBar.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import api from '../mock/api'
import { useToast } from '../stores/toast'

const toast = useToast()

const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const confirmOpen = ref(false)
const errors = ref({})
const baseline = ref('')

const statusTone = {
  NORMAL: 'ok',
  ALARM: 'warn',
  FAIL: 'danger',
  OFFLINE: 'muted',
  UNKNOWN: 'info'
}

function editableSnapshot(list) {
  return JSON.stringify(
    list.map((r) => ({
      module_id: r.module_id,
      reset_mode: r.reset_mode,
      alarm_threshold: Number(r.alarm_threshold),
      location: r.location
    }))
  )
}

const dirty = computed(() => rows.value.length > 0 && editableSnapshot(rows.value) !== baseline.value)

const belowThreshold = computed(() =>
  rows.value.filter((r) => Number(r.alarm_threshold) > 0 && r.life_percent < Number(r.alarm_threshold))
    .length
)
const avgLife = computed(() => {
  if (!rows.value.length) return 0
  return Math.round(rows.value.reduce((s, r) => s + r.life_percent, 0) / rows.value.length)
})
const resetCount = computed(() => rows.value.filter((r) => r.reset_mode === 'Reset').length)

async function load() {
  loading.value = true
  try {
    rows.value = await api.getSurgeSettings()
    baseline.value = editableSnapshot(rows.value)
    errors.value = {}
  } finally {
    loading.value = false
  }
}

watch(
  rows,
  () => {
    if (Object.keys(errors.value).length) errors.value = {}
  },
  { deep: true }
)

function validate() {
  const next = {}
  rows.value.forEach((r) => {
    const t = Number(r.alarm_threshold)
    if (!Number.isFinite(t) || t < 0 || t > 100) {
      next[r.module_id] = '告警阈值需为 0–100 的数字'
    } else if (!String(r.location).trim()) {
      next[r.module_id] = '安装位置不能为空'
    } else if (String(r.location).length > 128) {
      next[r.module_id] = '安装位置不能超过 128 字符'
    }
  })
  errors.value = next
  return Object.keys(next).length === 0
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
    rows.value = await api.saveSurgeSettings(rows.value)
    baseline.value = editableSnapshot(rows.value)
    confirmOpen.value = false
    toast.success('浪涌模块设置已保存')
  } catch (err) {
    toast.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function revert() {
  load()
  toast.info('已撤销未保存的修改')
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">浪涌设置</h1>
        <p class="page-sub">按防雷模块配置重置计数方式、告警日志触发阈值与安装位置</p>
      </div>
      <div class="row">
        <button class="btn" :disabled="!dirty" @click="revert">撤销修改</button>
        <button class="btn primary" :disabled="!dirty || saving" @click="askSave">
          <AppIcon name="save" :size="15" />
          保存设置
        </button>
      </div>
    </div>

    <div class="grid cols-3 summary">
      <div class="sum-card">
        <span class="sum-label">平均剩余寿命</span>
        <b>{{ avgLife }}<small>%</small></b>
        <p>4 个防雷模块的平均值</p>
      </div>
      <div class="sum-card">
        <span class="sum-label">低于告警阈值</span>
        <b class="warn">{{ belowThreshold }}<small>个</small></b>
        <p>按当前告警触发百分比统计</p>
      </div>
      <div class="sum-card">
        <span class="sum-label">归零计数模式</span>
        <b>{{ resetCount }}<small>个</small></b>
        <p>保存后该模块计数归零</p>
      </div>
    </div>

    <section class="card table-card">
      <div class="card-head">
        <div>
          <h3 class="card-title">4 个防雷模块参数</h3>
          <p class="card-sub">每个 STM32 模块管辖 4 路监测通道，寿命与浪涌计数在模块级</p>
        </div>
        <span class="dirty-flag" :class="{ on: dirty }">
          <i class="dot" :class="dirty ? 'warn' : 'ok'"></i>
          {{ dirty ? '有未保存的修改' : '设置已保存' }}
        </span>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>模块</th>
              <th>I²C 地址</th>
              <th>管辖通道</th>
              <th>状态</th>
              <th style="min-width: 150px">剩余寿命</th>
              <th class="num">浪涌计数</th>
              <th style="min-width: 160px">重置计数</th>
              <th style="min-width: 150px">告警日志触发</th>
              <th style="min-width: 190px">安装位置</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.module_id">
              <td><b class="ch">M{{ r.module_id }}</b></td>
              <td class="mono">{{ r.address }}</td>
              <td class="mono">
                CH{{ String((r.module_id - 1) * 4 + 1).padStart(2, '0') }}–CH{{
                  String(r.module_id * 4).padStart(2, '0')
                }}
              </td>
              <td><StatusBadge :tone="statusTone[r.status] || 'muted'" :label="r.status_label" /></td>
              <td><LifeBar :percent="r.life_percent" :threshold="r.alarm_threshold" /></td>
              <td class="num strong">{{ r.event_count.toLocaleString() }}</td>
              <td>
                <select v-model="r.reset_mode" class="select sm-select">
                  <option value="Accumulate">持续累积</option>
                  <option value="Reset">保存后归零</option>
                </select>
              </td>
              <td>
                <div class="pct-input">
                  <input
                    v-model.number="r.alarm_threshold"
                    class="input sm-input"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    :class="{ invalid: errors[r.module_id] }"
                  />
                  <span>%</span>
                </div>
              </td>
              <td>
                <input
                  v-model.trim="r.location"
                  class="input sm-input wide"
                  type="text"
                  maxlength="128"
                  :class="{ invalid: errors[r.module_id] }"
                />
                <p v-if="errors[r.module_id]" class="cell-error">{{ errors[r.module_id] }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot">
        <span>告警日志触发：模块剩余寿命低于设定百分比时写入告警日志，并把进度条标记为红色。</span>
      </div>
    </section>

    <section class="card explain">
      <div class="explain-item">
        <span class="ex-icon"><AppIcon name="gauge" :size="17" /></span>
        <div>
          <b>重置计数方式</b>
          <p>Reset 将模块及其管辖通道的计数器归零；Accumulate 保持当前累计值。修改后点击「保存设置」生效。</p>
        </div>
      </div>
      <div class="explain-item">
        <span class="ex-icon"><AppIcon name="alert" :size="17" /></span>
        <div>
          <b>告警日志触发</b>
          <p>取值 0–100%，模块剩余寿命低于该百分比时生成告警日志。阈值需结合保护器件试验数据确定。</p>
        </div>
      </div>
      <div class="explain-item">
        <span class="ex-icon"><AppIcon name="shield" :size="17" /></span>
        <div>
          <b>寿命口径</b>
          <p>4 个防雷模块各自独立计数与估算，依据浪涌计数与额定冲击次数得出，仅用于运维参考，不代表精确剩余寿命。</p>
        </div>
      </div>
    </section>

    <ConfirmDialog
      :open="confirmOpen"
      title="保存浪涌设置？"
      message="将把 4 个防雷模块的重置方式、告警阈值与安装位置写入设备。"
      :detail="resetCount > 0 ? `其中 ${resetCount} 个模块为 Reset 模式，保存后其浪涌计数将归零。` : ''"
      confirm-text="保存设置"
      tone="primary"
      :busy="saving"
      @confirm="doSave"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<style scoped>
.summary {
  margin-bottom: 16px;
}
.sum-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
}
.sum-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-3);
}
.sum-card b {
  display: block;
  font-size: 28px;
  font-weight: 700;
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
.sum-card b.warn {
  color: var(--warn);
}
.sum-card b small {
  font-size: 13px;
  color: var(--ink-3);
  font-weight: 600;
  margin-left: 3px;
}
.sum-card p {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 4px;
}
.table-card {
  overflow: hidden;
}
.ch {
  color: var(--ink);
  font-weight: 600;
}
.num {
  text-align: right;
}
.sm-select,
.sm-input {
  height: 32px;
  font-size: 12px;
  padding: 0 9px;
}
.sm-input.wide {
  width: 100%;
  min-width: 170px;
}
.pct-input {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pct-input .input {
  width: 74px;
}
.pct-input span {
  font-size: 12px;
  color: var(--ink-3);
}
.cell-error {
  margin-top: 4px;
  font-size: 11px;
  color: var(--danger);
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
.table-foot {
  padding: 11px 16px;
  font-size: 11.5px;
  color: var(--ink-3);
  border-top: 1px solid var(--line);
}
.explain {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  padding: 18px;
}
.explain-item {
  display: flex;
  gap: 11px;
}
.ex-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  background: var(--brand-soft);
  color: var(--brand);
  flex: none;
}
.explain-item b {
  font-size: 12.5px;
}
.explain-item p {
  margin-top: 3px;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

@media (max-width: 900px) {
  .explain {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
</style>
