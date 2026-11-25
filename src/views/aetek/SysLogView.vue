<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import aetekApi from '../../mock/aetekApi'
import { useToast } from '../../stores/toast'

const toast = useToast()

const logs = ref([])
const loading = ref(false)
const clearing = ref(false)
const confirmClear = ref(false)
const level = ref('ALL')

const levels = [
  { key: 'ALL', label: '全部级别' },
  { key: 'INFO', label: 'INFO' },
  { key: 'WARN', label: 'WARN' },
  { key: 'ERROR', label: 'ERROR' }
]

const filtered = computed(() =>
  level.value === 'ALL' ? logs.value : logs.value.filter((log) => log.level === level.value)
)

const tone = { INFO: 'info', WARN: 'warn', ERROR: 'danger' }

async function load(silent = false) {
  loading.value = true
  try {
    logs.value = await aetekApi.getSyslog()
    if (!silent) toast.success('日志已刷新')
  } catch (err) {
    toast.error(err.message || '读取日志失败')
  } finally {
    loading.value = false
  }
}

async function doClear() {
  clearing.value = true
  try {
    const res = await aetekApi.clearSyslog()
    confirmClear.value = false
    await load(true)
    toast.success(`已清除 ${res.cleared} 条日志`)
  } catch (err) {
    toast.error(err.message || '清除失败')
  } finally {
    clearing.value = false
  }
}

onMounted(() => load(true))
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">系统日志</h1>
        <p class="page-sub">系统日志查看 · 系统 › 系统日志 › 查看日志（SysLog / View Log，手册 2-5.3）</p>
      </div>
      <div class="row">
        <button class="btn" :disabled="loading" @click="load()">
          <AppIcon name="refresh" :size="15" :class="{ spin: loading }" />刷新
        </button>
        <button class="btn danger" :disabled="!logs.length || clearing" @click="confirmClear = true">
          <AppIcon name="close" :size="15" />清除
        </button>
      </div>
    </div>

    <section class="card">
      <div class="card-head">
        <div>
          <h3 class="card-title">日志记录</h3>
          <p class="card-sub">共 {{ logs.length }} 条 · 告警阈值触发的记录会写入这里</p>
        </div>
        <div class="chip-set">
          <button
            v-for="item in levels"
            :key="item.key"
            class="chip"
            :class="{ active: level === item.key }"
            @click="level = item.key"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="card-body flush">
        <div v-if="!filtered.length" class="empty">
          {{ logs.length ? '当前级别没有日志' : '暂无日志记录' }}
        </div>
        <div v-else class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th style="width: 190px">时间</th>
                <th style="width: 90px">级别</th>
                <th>内容</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in filtered" :key="log.id">
                <td class="mono">{{ log.time_text }}</td>
                <td>
                  <span class="badge" :class="tone[log.level]" style="height: 22px">{{ log.level }}</span>
                </td>
                <td>{{ log.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <ConfirmDialog
      :open="confirmClear"
      title="清除全部日志？"
      message="所有系统日志条目将被删除，且无法恢复。"
      detail="日志用于追溯阈值告警与配置变更，清除后不再保留。"
      confirm-text="清除日志"
      tone="danger"
      :busy="clearing"
      @confirm="doClear"
      @cancel="confirmClear = false"
    />
  </div>
</template>

<style scoped>
.spin {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
