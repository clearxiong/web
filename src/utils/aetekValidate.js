// AETEK 配置校验：与设备端保存前的检查保持一致

export function isIpv4(value) {
  const text = String(value || '').trim()
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text)
  if (!match) return false
  return match.slice(1).every((part) => {
    const n = Number(part)
    return n >= 0 && n <= 255 && String(n) === String(Number(part))
  })
}

export function isAsciiPrintable(value) {
  const text = String(value || '')
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code < 32 || code > 126) return false
  }
  return true
}

// 返回第一条错误信息；通过则返回空字符串
export function validateDraft(draft) {
  if (!draft) return '没有可保存的配置'

  const system = draft.system || {}
  if (!String(system.name || '').trim()) return '设备名称不能为空'
  if (String(system.name).length > 32) return '设备名称不能超过 32 字符'
  if (String(system.location || '').length > 64) return '安装位置不能超过 64 字符'
  if (String(system.contact || '').length > 64) return '联系人不能超过 64 字符'

  const time = draft.time || {}
  if (time.ntp && !String(time.ntp_server || '').trim()) return '启用 NTP 校时时必须填写 NTP 服务器地址'
  if (time.manual && Number.isNaN(new Date(time.manual).getTime())) return '手动时间格式不正确'

  const ip = draft.ip || {}
  if (!ip.dhcp) {
    if (!isIpv4(ip.address)) return 'IP 地址格式不正确'
    if (!isIpv4(ip.mask)) return '子网掩码格式不正确'
    if (!isIpv4(ip.gateway)) return '默认网关格式不正确'
    if (ip.dns && !isIpv4(ip.dns)) return 'DNS 地址格式不正确'
  }
  if (!String(ip.hostname || '').trim()) return 'DHCP 主机名不能为空'
  if (String(ip.hostname).length > 63) return 'DHCP 主机名不能超过 63 字符'
  if (!isAsciiPrintable(ip.hostname)) return 'DHCP 主机名只支持 ASCII 字符'

  const autoLogout = Number(draft.account?.auto_logout)
  if (!Number.isInteger(autoLogout) || autoLogout < 0 || autoLogout > 9999) {
    return '自动登出时间必须是 0–9999 的整数（0 表示不超时）'
  }

  const userName = String(draft.account?.username || '').trim()
  if (!userName) return '用户名不能为空'
  if (userName.length > 31) return '用户名不能超过 31 个字符'
  if (!isAsciiPrintable(userName)) return '用户名只支持 ASCII 32–126 字符'

  for (const row of draft.surge || []) {
    const trigger = Number(row.alarm_trigger)
    if (!Number.isInteger(trigger) || trigger < 0 || trigger > 100) {
      return `${row.label || `CH${row.module_id}`} 的告警阈值必须是 0–100 的整数`
    }
    if (String(row.location || '').length > 64) {
      return `${row.label || `CH${row.module_id}`} 的安装位置不能超过 64 字符`
    }
  }

  return ''
}
