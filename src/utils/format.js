const pad = (n) => String(n).padStart(2, '0')

export function formatDateTime(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`
}

export function formatDate(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatClock(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function timeAgo(value) {
  if (!value) return '—'
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (Number.isNaN(ms)) return '—'
  const diff = Math.max(0, Date.now() - ms)
  if (diff < 60 * 1000) return `${Math.max(1, Math.floor(diff / 1000))} 秒前`
  if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}

export function formatNumber(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '—'
  return num.toLocaleString('zh-CN')
}

export function formatTemp(celsius, unit = 'C') {
  const c = Number(celsius)
  if (!Number.isFinite(c)) return '—'
  if (unit === 'F') return `${(c * 1.8 + 32).toFixed(1)} °F`
  return `${c.toFixed(1)} °C`
}

export function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob(['﻿' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function toCsv(rows, columns) {
  const escape = (val) => {
    const text = val == null ? '' : String(val)
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
    return text
  }
  const header = columns.map((c) => escape(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(',')).join('\n')
  return `${header}\n${body}`
}

export function clampPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}
