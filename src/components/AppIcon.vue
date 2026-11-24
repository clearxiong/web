<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  stroke: { type: [Number, String], default: 1.8 }
})

const icons = {
  dashboard:
    '<rect x="3" y="3" width="7.5" height="9" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="11.5" width="7" height="9.5" rx="1.6"/><rect x="3" y="15.5" width="7.5" height="5.5" rx="1.6"/>',
  channels:
    '<rect x="3" y="4" width="8" height="7" rx="1.6"/><rect x="13" y="4" width="8" height="7" rx="1.6"/><rect x="3" y="13" width="8" height="7" rx="1.6"/><rect x="13" y="13" width="8" height="7" rx="1.6"/>',
  events:
    '<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none"/>',
  stats:
    '<line x1="3.5" y1="20" x2="20.5" y2="20"/><rect x="5" y="11" width="3.4" height="6" rx="1"/><rect x="10.3" y="6.5" width="3.4" height="10.5" rx="1"/><rect x="15.6" y="13" width="3.4" height="4" rx="1"/>',
  settings:
    '<line x1="3.5" y1="6" x2="20.5" y2="6"/><line x1="3.5" y1="12" x2="20.5" y2="12"/><line x1="3.5" y1="18" x2="20.5" y2="18"/><circle cx="8.5" cy="6" r="2.4" fill="#fff"/><circle cx="15.5" cy="12" r="2.4" fill="#fff"/><circle cx="10" cy="18" r="2.4" fill="#fff"/>',
  system:
    '<rect x="3" y="4.5" width="18" height="11.5" rx="2"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/>',
  diagnostics: '<polyline points="3 12.5 7 12.5 9.8 5.5 13.6 19 16.4 12.5 21 12.5"/>',
  maintenance:
    '<path d="M14.7 6.3a4.2 4.2 0 0 1 5-5l-2.6 2.6 2 2 2.6-2.6a4.2 4.2 0 0 1-5 5L9.4 15.9a2.3 2.3 0 1 1-3.3-3.3l7.6-7.6z" transform="translate(0 1)"/>',
  logout:
    '<path d="M9 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3H9"/><polyline points="15.5 16.5 20 12 15.5 7.5"/><line x1="20" y1="12" x2="9.5" y2="12"/>',
  menu: '<line x1="4" y1="6.5" x2="20" y2="6.5"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17.5" x2="20" y2="17.5"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  bolt: '<path d="M13 2.5 4.8 13.4h6.1l-1 8.1 8.3-11h-6.2l1-8z"/>',
  clock:
    '<circle cx="12" cy="12" r="8.5"/><polyline points="12 7.5 12 12 15 14"/>',
  refresh:
    '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><polyline points="20 3.5 20 9 14.5 9"/>',
  save: '<path d="M6 3.5h9.5L20 8v12.5H4V3.5h2z"/><rect x="8" y="3.5" width="7" height="5" rx="0.6"/><rect x="7.5" y="13" width="9" height="7.5" rx="0.8"/>',
  download:
    '<path d="M12 3v11.5"/><polyline points="7.5 10.5 12 15 16.5 10.5"/><path d="M4 17v2.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  upload:
    '<path d="M12 15V3.5"/><polyline points="7.5 8 12 3.5 16.5 8"/><path d="M4 17v2.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="20.5" y2="20.5"/>',
  check: '<polyline points="4.5 12.5 9.5 17.5 19.5 6.5"/>',
  alert:
    '<path d="M12 3.5 2.8 20h18.4L12 3.5z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
  info: '<circle cx="12" cy="12" r="8.8"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.7" r="1" fill="currentColor" stroke="none"/>',
  temperature:
    '<path d="M14 14.3V5.2a2 2 0 1 0-4 0v9.1a4.2 4.2 0 1 0 4 0z"/><line x1="12" y1="8.5" x2="12" y2="14"/>',
  wifi: '<path d="M3.5 9.2a13 13 0 0 1 17 0"/><path d="M6.5 12.5a8.5 8.5 0 0 1 11 0"/><path d="M9.4 15.8a4.2 4.2 0 0 1 5.2 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/>',
  database:
    '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6.2c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V5.5"/><path d="M4.5 11.7v6.2c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6.2"/>',
  shield: '<path d="M12 3 5 5.8v6.1c0 4.3 2.9 7.4 7 9.1 4.1-1.7 7-4.8 7-9.1V5.8L12 3z"/><polyline points="9 11.8 11.2 14 15.2 9.6"/>',
  gauge:
    '<path d="M4 18a9 9 0 1 1 16 0"/><line x1="12" y1="17" x2="16.2" y2="10.2"/><circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none"/>',
  history: '<path d="M3.8 12a8.2 8.2 0 1 0 2.5-5.9"/><polyline points="3.5 3.5 3.5 8.5 8.5 8.5"/><polyline points="12 8 12 12.2 15 14"/>',
  chevron: '<polyline points="9 5.5 15.5 12 9 18.5"/>',
  filter: '<path d="M3.5 5h17l-6.6 7.6V20l-3.8-2v-5.4L3.5 5z"/>',
  power: '<path d="M12 3v8.5"/><path d="M7 6.2a7.5 7.5 0 1 0 10 0"/>',
  factory: '<path d="M4 20V9l5 3V9l5 3V5h6v15H4z"/><line x1="4" y1="20" x2="20" y2="20"/>',
  file: '<path d="M6 3.5h8l4 4v13H6V3.5z"/><polyline points="14 3.5 14 7.5 18 7.5"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/>'
}

const body = computed(() => icons[props.name] || '')
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="body"
  />
</template>
