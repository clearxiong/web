<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageCount: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 20 },
  unit: { type: String, default: '条' }
})
const emit = defineEmits(['update:page'])

const pages = computed(() => {
  const count = props.pageCount
  const cur = props.page
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const set = new Set([1, count, cur - 1, cur, cur + 1])
  const list = [...set].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)
  const out = []
  list.forEach((p, i) => {
    if (i > 0 && p - list[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
})

const start = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const end = computed(() => Math.min(props.total, props.page * props.pageSize))

function go(p) {
  if (p < 1 || p > props.pageCount || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <div class="pager">
    <span class="pager-info">
      共 <b>{{ total }}</b> {{ unit }} · 当前 {{ start }}–{{ end }}
    </span>
    <div class="pager-btns">
      <button class="pg" :disabled="page <= 1" @click="go(page - 1)" aria-label="上一页">
        <AppIcon name="chevron" :size="14" style="transform: rotate(180deg)" />
      </button>
      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === '…'" class="pg-gap">…</span>
        <button v-else class="pg" :class="{ active: p === page }" @click="go(p)">{{ p }}</button>
      </template>
      <button class="pg" :disabled="page >= pageCount" @click="go(page + 1)" aria-label="下一页">
        <AppIcon name="chevron" :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
}
.pager-info {
  font-size: 12px;
  color: var(--ink-3);
}
.pager-info b {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.pager-btns {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.pg {
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border-radius: 4px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.14s;
}
.pg:hover:not(:disabled) {
  border-color: var(--brand-line);
  color: var(--brand);
}
.pg.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.pg:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pg-gap {
  color: var(--ink-3);
  padding: 0 3px;
  font-size: 12px;
}
</style>
