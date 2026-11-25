<script setup>
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import { timeAgo } from '../utils/format'

const props = defineProps({
  channel: { type: Object, required: true }
})
defineEmits(['select'])

const toneMap = {
  NORMAL: 'ok',
  ALARM: 'warn',
  FAIL: 'danger',
  OFFLINE: 'muted',
  UNKNOWN: 'info'
}

const tone = computed(() => toneMap[props.channel.status] || 'muted')
const moduleLabel = computed(() => `M${props.channel.module_id}`)
const recentText = computed(() =>
  props.channel.last_event_time ? timeAgo(props.channel.last_event_time) : '暂无事件'
)
</script>

<template>
  <button class="ch-card" :class="[tone, { alarm: channel.status === 'ALARM' }]" @click="$emit('select', channel)">
    <div class="ch-head">
      <div class="ch-id">
        <span>{{ channel.name }}</span>
        <em>{{ moduleLabel }}</em>
      </div>
      <StatusBadge :tone="tone" :label="channel.state_label" :live="channel.status === 'ALARM'" />
    </div>

    <p class="ch-kind">{{ channel.kind_name }}</p>

    <div class="ch-metrics">
      <div>
        <b>{{ channel.event_count.toLocaleString() }}</b>
        <span>事件次数</span>
      </div>
      <div>
        <b class="recent">{{ recentText }}</b>
        <span>最近事件</span>
      </div>
    </div>

    <div class="ch-module">
      <span>所属模块</span>
      <b>{{ moduleLabel }}</b>
      <em>剩余寿命 {{ Math.round(channel.module_life_percent) }}%</em>
    </div>
  </button>
</template>

<style scoped>
.ch-card {
  position: relative;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 14px 15px 12px;
  cursor: pointer;
  transition: border-color 0.16s, box-shadow 0.16s;
  font: inherit;
  color: inherit;
  overflow: hidden;
}
.ch-card:hover {
  border-color: #c6e2ff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.ch-card.alarm {
  border-color: var(--warn-line);
  box-shadow: 0 0 0 3px var(--warn-soft);
}
.ch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ch-id {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 18px;
  font-weight: 700;
}
.ch-id em {
  font-style: normal;
  font-size: 10px;
  font-weight: 700;
  color: var(--ink-3);
  background: var(--surface-3);
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0.4px;
}
.ch-kind {
  margin-top: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-2);
}
.ch-module {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 9px;
  font-size: 10.5px;
  color: var(--ink-3);
}
.ch-module b {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ink-2);
  background: var(--surface-3);
  border-radius: 4px;
  padding: 1px 5px;
}
.ch-module em {
  font-style: normal;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.ch-metrics {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin-top: 11px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.ch-metrics div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ch-metrics b {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ch-metrics b.recent {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-2);
  line-height: 1.5;
}
.ch-metrics span {
  font-size: 10px;
  color: var(--ink-3);
}
.ch-foot {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 9px;
}
.sig {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--ink-3);
}
</style>
