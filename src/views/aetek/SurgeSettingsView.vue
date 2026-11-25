<script setup>
import { computed } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { useAetek } from '../../stores/aetek'

const { state, isDirty } = useAetek()

const rows = computed(() => state.draft?.surge || [])

function usedOf(moduleId) {
  const module = state.modules.find((m) => m.module_id === moduleId)
  return module ? module.life_used : null
}

function triggerInvalid(row) {
  const value = Number(row.alarm_trigger)
  return !Number.isInteger(value) || value < 0 || value > 100
}

const resetCount = computed(() => rows.value.filter((row) => row.reset_counter).length)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">浪涌设置</h1>
        <p class="page-sub">计数与告警设置 · 防雷监测 › 浪涌设置（Surge Settings，手册 3-1）</p>
      </div>
      <span v-if="isDirty" class="edit-hint">
        <AppIcon name="info" :size="14" />修改需点击右上角「保存配置」才会写入设备
      </span>
    </div>

    <div v-if="!rows.length" class="card">
      <div class="empty">正在读取通道设置…</div>
    </div>

    <template v-else>
      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">每通道设置</h3>
            <p class="card-sub">安装位置 · 重置计数 · 告警阈值</p>
          </div>
          <AppIcon name="settings" :size="18" class="head-icon" />
        </div>

        <div class="card-body flush">
          <div class="table-wrap">
            <table class="data settings">
              <thead>
                <tr>
                  <th style="width: 90px">模块</th>
                  <th>安装位置</th>
                  <th style="width: 130px">当前寿命已用</th>
                  <th style="width: 190px">告警阈值（%）</th>
                  <th style="width: 150px">重置计数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in rows" :key="row.module_id">
                  <td class="strong mono">{{ row.label }}</td>
                  <td>
                    <input v-model="row.location" class="input sm-input" maxlength="64" />
                  </td>
                  <td>
                    <div class="used-cell">
                      <span class="mono">{{ usedOf(row.module_id) ?? '—' }}%</span>
                      <div class="progress" :class="Number(usedOf(row.module_id)) >= Number(row.alarm_trigger) ? 'danger' : 'ok'">
                        <span :style="{ width: Math.min(100, Number(usedOf(row.module_id)) || 0) + '%' }"></span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <input
                      v-model.number="row.alarm_trigger"
                      class="input sm-input mono"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      :class="{ invalid: triggerInvalid(row) }"
                    />
                    <span v-if="triggerInvalid(row)" class="error-text">必须为 0–100 的整数</span>
                  </td>
                  <td>
                    <label class="check">
                      <input v-model="row.reset_counter" type="checkbox" />
                      <span>保存后归零</span>
                    </label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="notes">
        <p class="note">
          <AppIcon name="info" :size="15" />
          <span>
            <b>告警阈值</b>（Alarm Log Trigger）是「寿命已用百分比」阈值：当前已用比例 ≥ 该值即判定为
            ALARM，模块状态页对应进度条变红，并写入一条系统日志。
          </span>
        </p>
        <p class="note">
          <AppIcon name="info" :size="15" />
          <span>
            勾选<b>重置计数</b>（Reset Counter）后，点击右上角「保存配置」会把该模块的雷击计数归零，
            用于更换防雷模块后重新开始计数。本次已勾选
            <b>{{ resetCount }}</b> 个模块。
          </span>
        </p>
      </section>
    </template>
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
.sm-input {
  height: 32px;
  font-size: 12.5px;
}
.used-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 96px;
}
.used-cell > span {
  font-size: 12px;
  font-weight: 600;
}
.used-cell .progress {
  height: 5px;
}
.check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--ink-2);
  cursor: pointer;
}
.check input {
  width: 15px;
  height: 15px;
  accent-color: var(--brand);
}
.notes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}
.note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--r-lg);
  background: var(--brand-soft);
  border: 1px solid var(--brand-line);
  color: #2a4f8f;
  font-size: 12.5px;
  line-height: 1.7;
}
.note svg {
  flex: none;
  margin-top: 2px;
}
</style>
