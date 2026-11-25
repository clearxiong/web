# Procet 16 通道智能防雷监测终端 · 后端接口规范

本文档汇总 **Procet 页面**所需的后端接口，按「页面 → 接口 → 字段」组织，用于替换 `src/mock/api.js`。

- 基础地址：`/api/v1`
- 认证方式：除 `POST /session` 外均需 `Authorization: Bearer <token>`
- 数据格式：请求/响应均为 JSON（`config-export` 除外）
- 字段命名：`snake_case`，与前端一致，替换 mock 后无需转换
- 路由模式：前端使用 hash 路由（`/`），后端只需提供 JSON 接口

> **领域模型约定**（影响多个接口，务必先读）
>
> 硬件为 4 个 STM32 采集模块，每模块提供 4 个接口通道，共 16 路。
>
> - 通道 `CH(模块-1)*4 + 接口序号`，接口序号 1–4 依次为：霍尔比较器 GPIO、光敏状态采集、事件捕获与锁存、I2C 从机通信。
> - **寿命、浪涌计数、告警阈值、安装位置、重置方式属于模块级**（共 4 条寿命），不属于通道。
> - 事件按类型归属到对应接口：`HALL_TRIGGER`→接口1、`OPTICAL_CHANGE`→接口2、`QUEUE_OVERFLOW`→接口3、`COMM_ERROR`/`MODULE_OFFLINE`→接口4。
> - 浪涌事件的「累计浪涌事件总数」只统计各模块的霍尔通道（接口1）。

---

## 1. 会话与认证

### `POST /session`

登录获取令牌。任意用户名密码在 mock 下均可登录。

**请求**

```json
{ "username": "admin", "password": "••••••" }
```

**响应**

```json
{
  "token": "eyJhbGciOi...",
  "username": "admin",
  "role": "admin",
  "auto_logout": 300,
  "login_at": "2026-11-25T14:00:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `token` | string | 后续请求放入 `Authorization: Bearer <token>` |
| `username` | string | 登录用户名 |
| `role` | string | 角色，前端仅用于展示 |
| `auto_logout` | int | 自动登出秒数，驱动顶栏倒计时 |
| `login_at` | string | ISO 时间 |

错误：用户名或密码为空返回 `400`。

---

## 2. 设备与通道

### `GET /device`

设备总览快照，1.5s 轮询一次。一次返回设备信息、模块列表、16 路通道列表。

**响应**

```json
{
  "device": {
    "name": "16CH-SPD-001",
    "model": "Procet SD-504/524 系列 · 16 通道版本",
    "description": "16 Channel IP PoE Surge Protector",
    "serial": "PROCET-SD16-2026-0001",
    "mac": "A4:CF:12:8D:6E:20",
    "firmware": "v1.0.0",
    "firmware_build": "2026-11-12",
    "boot_id": 47,
    "uptime_seconds": 540230,
    "uptime_text": "6 天 4 小时 23 分",
    "system_time": "2026-11-25 14:00:00",
    "temperature_c": 38.4,
    "temp_unit": "C",
    "online_modules": 4,
    "total_modules": 4,
    "channel_count": 16,
    "total_event_count": 4510,
    "fault_count": 2,
    "last_event_time": "2026-11-25 14:24:53",
    "last_event_ago": "8 分钟前",
    "upload_state": "connected",
    "upload_protocol": "HTTP",
    "network_state": "connected",
    "storage_state": "normal"
  },
  "modules": [
    {
      "module_id": 1,
      "address": "0x20",
      "firmware": "1.4.2",
      "online": true,
      "life_percent": 86,
      "alarm_threshold": 80,
      "location": "A 区弱电井 · 1F",
      "reset_mode": "Accumulate",
      "event_count": 1281,
      "status": "NORMAL",
      "status_label": "正常",
      "heartbeat_counter": 224137,
      "pending_event_count": 0,
      "queue_capacity": 64,
      "queue_used": 0,
      "queue_free": 64,
      "last_communication_time": "2026-11-25T13:59:59.000Z",
      "last_comm_ago": 2
    }
  ],
  "channels": [
    {
      "channel_id": 1,
      "name": "CH01",
      "module_id": 1,
      "module_address": "0x20",
      "kind": "HALL",
      "kind_name": "霍尔比较器",
      "kind_desc": "霍尔比较器 GPIO，外部中断捕获浪涌阈值触发",
      "hall_state": 0,
      "optical_state": "NORMAL",
      "communication_state": "ONLINE",
      "event_count": 1281,
      "last_event_time": "2026-11-25 14:24:53",
      "last_event_at": 1732826693000,
      "module_life_percent": 86,
      "location": "A 区弱电井 · 1F",
      "status": "NORMAL",
      "status_label": "正常",
      "state_label": "未触发",
      "hall_label": "未触发",
      "optical_label": "正常",
      "optical_tone": "ok",
      "health": "good",
      "health_text": "霍尔比较器输入正常，可捕获阈值触发"
    }
  ]
}
```

**`modules[].status` 取值**：`NORMAL`（正常）/ `ALARM`（寿命告警）/ `OFFLINE`（离线）。判定：`!online → OFFLINE`；`life_percent < alarm_threshold → ALARM`；否则 `NORMAL`。

**`channels[].kind` 取值**（按接口序号固定）：

| 序号 | kind | kind_name | 状态语义（`state_label`） |
|---|---|---|---|
| 1 | `HALL` | 霍尔比较器 | `NORMAL` 未触发 / `ALARM` 已触发（4s 窗口内） |
| 2 | `OPTICAL` | 光敏采集 | `NORMAL` 正常 / `FAIL` 异常 / `UNKNOWN` 未知 |
| 3 | `LATCH` | 事件锁存 | `NORMAL` 空闲 / `ALARM` 锁存 N 条 |
| 4 | `I2C` | I2C 从机 | `NORMAL` 在线 / `OFFLINE` 通信异常 |

**`channels[].status` 取值**：`NORMAL` / `ALARM` / `FAIL` / `OFFLINE` / `UNKNOWN`，`status_label` 为对应中文（正常/事件触发/状态异常/监测失效/未知）。

**`channels[].health` 取值**：`good` / `attention` / `fault` / `unknown`，驱动卡片左侧色条。

### `GET /channels`

仅返回 `GET /device` 中的 `channels` 数组（16 项）。

### `GET /channels/:id`

通道详情，用于详情抽屉。`:id` 为 `channel_id`（1–16）。

**响应**

```json
{
  "channel": { "channel_id": 1, "name": "CH01", "kind": "HALL", "kind_name": "霍尔比较器", "state_label": "未触发", "event_count": 1281, "...": "同 /device 的 channels 元素" },
  "module": { "module_id": 1, "life_percent": 86, "alarm_threshold": 80, "location": "A 区弱电井 · 1F", "...": "同 modules 元素" },
  "events": [
    {
      "event_id": 306,
      "event_id_text": "000306",
      "event_type": "HALL_TRIGGER",
      "type_label": "阈值触发事件",
      "event_level": 2,
      "level_label": "重要",
      "device_timestamp": "2026-11-25 14:24:53",
      "time_text": "2026-11-25 14:24:53"
    }
  ],
  "daily": [
    { "date": "2026-11-12", "label": "11-12", "count": 0 }
  ]
}
```

`events`：该通道最近 8 条事件。`daily`：近 14 天每日该通道事件数（`date`/`label`=`MM-DD`/`count`）。

---

## 3. 事件历史

### `GET /events`

分页事件列表，支持多条件筛选。

**查询参数**

| 参数 | 类型 | 说明 |
|---|---|---|
| `page` | int | 页码，从 1 开始，默认 1 |
| `page_size` | int | 每页条数，默认 20 |
| `channel_id` | int | 通道 ID（1–16），可选 |
| `module_id` | int | 模块 ID（1–4），可选 |
| `event_type` | string | 事件类型，可选 |
| `event_level` | int | 事件等级 1/2/3，可选 |
| `start` | date | 开始日期 `YYYY-MM-DD`（含当日 00:00:00），可选 |
| `end` | date | 结束日期 `YYYY-MM-DD`（含当日 23:59:59），可选 |

**响应**

```json
{
  "items": [
    {
      "event_id": 306,
      "event_id_text": "000306",
      "boot_id": 47,
      "event_counter": 1281,
      "module_id": 1,
      "channel_id": 1,
      "channel_name": "CH01",
      "event_type": "HALL_TRIGGER",
      "event_level": 2,
      "device_timestamp": "2026-11-25 14:24:53",
      "timestamp_ms": 1732826693000,
      "time_quality": "TIME_VALID",
      "module_tick": 990214,
      "hall_state": 1,
      "optical_state": "NORMAL",
      "event_flags": "0x0001",
      "acknowledged": true,
      "uploaded": false,
      "type_label": "阈值触发事件",
      "level_label": "重要",
      "time_text": "2026-11-25 14:24:53"
    }
  ],
  "total": 306,
  "page": 1,
  "page_size": 20,
  "page_count": 16
}
```

**`event_type` 取值**（`event_type_label` 对应中文）：`HALL_TRIGGER` 阈值触发事件 / `OPTICAL_CHANGE` 光敏状态变化 / `COMM_ERROR` 通信异常 / `MODULE_OFFLINE` 模块离线 / `QUEUE_OVERFLOW` 队列溢出。

**`event_level`**：`1` 一般 / `2` 重要 / `3` 严重。

**`event_flags`**：`0x0001` 普通 / `0x0040` 通信 / `0x0081` 队列。

结果按 `timestamp_ms` 倒序。前端在此响应基础上做 CSV 导出。

---

## 4. 统计分析

### `GET /statistics`

一次返回统计分析页全部图表数据。

**响应要点**

```json
{
  "total_event_count": 4510,
  "channel_event_count": [ { "channel_id": 1, "label": "CH01 霍尔比较器", "count": 1281 } ],
  "module_event_count": [ { "module_id": 1, "label": "模块 1", "count": 1361 } ],
  "daily_event_count": 4,
  "monthly_event_count": 251,
  "high_level_count": 138,
  "optical_fault_count": 1,
  "module_offline_count": 2,
  "event_overflow_count": 1,
  "daily": [ { "date": "2026-10-27", "label": "10-27", "count": 3 } ],
  "monthly": [ { "month": "2025-12", "label": "12月", "count": 92 } ],
  "type_distribution": [ { "key": "HALL_TRIGGER", "label": "阈值触发", "count": 229 } ],
  "health_summary": { "good": 2, "attention": 1, "warning": 1 }
}
```

| 字段 | 说明 |
|---|---|
| `total_event_count` | 累计浪涌事件总数，**仅统计各模块霍尔通道（接口1）事件** |
| `daily_event_count` | 今日事件数 |
| `monthly_event_count` | 本月事件数 |
| `high_level_count` | 近 30 天等级 ≥2 的事件数 |
| `daily` | 近 30 天每日事件（倒序时间，末项为今日） |
| `monthly` | 近 12 个月事件 |
| `type_distribution` | 事件类型分布，`label` 为短标签 |
| `health_summary` | 按 **模块** 寿命分层，`good`≥90% / `attention` 80–90% / `warning`<80%，三者之和为 4 |

`channel_event_count` 覆盖 16 个接口通道；`module_event_count` 为 4 个模块的合计事件数。

---

## 5. 配置

### `GET /config`

读取当前配置。返回结构见下方 `PUT /config` 请求体，字段含义一致。

### `PUT /config`

保存配置。请求体与 `GET /config` 响应体结构相同，整体提交。

**请求体结构**

```json
{
  "system": {
    "name": "16CH-SPD-001",
    "description": "16 Channel IP PoE Surge Protector",
    "model": "Procet SD-504/524 系列 · 16 通道版本",
    "serial": "PROCET-SD16-2026-0001",
    "mac": "A4:CF:12:8D:6E:20",
    "location": "A 区弱电井 · 1F",
    "contact": "运维一组 · 王工"
  },
  "time": {
    "mode": "NTP",
    "ntp_server": "ntp.aliyun.com",
    "timezone": "UTC+08:00 中国标准时间",
    "manual_time": "2026-11-25 14:00:00",
    "quality": "TIME_VALID",
    "last_sync": "2026-11-25 13:34:00"
  },
  "network": {
    "dhcp": true,
    "ip": "192.168.1.1",
    "mask": "255.255.255.0",
    "gateway": "192.168.1.254",
    "dns": "223.5.5.5"
  },
  "account": {
    "username": "admin",
    "auto_logout": 300,
    "last_login": "2026-11-25 13:48:00"
  },
  "environment": { "temp_unit": "C" },
  "upload": {
    "protocol": "HTTP",
    "host": "10.20.0.15",
    "port": 8080,
    "interval_seconds": 30,
    "enabled": true,
    "secret": "••••••••",
    "state": "connected",
    "last_success": "2026-11-25 13:42:00"
  }
}
```

**各节约束**（前端已做校验，后端建议同样校验）

- `system.name` 必填；`system` 各文本字段最长 128 字符
- `time.mode`：`NTP` 或 `Manual`
- `time.quality`：`TIME_VALID` / `TIME_UNCERTAIN` / `TIME_INVALID`
- `network.dhcp` 为 `false` 时 `ip`/`mask`/`gateway`/`dns` 必须是合法 IPv4
- `account.auto_logout`：0–9999 秒，0 表示不超时
- `environment.temp_unit`：`C` 或 `F`
- `upload.protocol`：`HTTP` / `TCP` / `MQTT` / `None`
- `upload.port`：1–65535；`interval_seconds`：5–3600

**响应**：更新后的完整配置（同请求体结构）。

---

## 6. 浪涌设置（模块级）

### `GET /surge-settings`

返回 4 个防雷模块的设置项。

**响应**

```json
[
  {
    "module_id": 1,
    "module_name": "模块 1",
    "address": "0x20",
    "reset_mode": "Accumulate",
    "alarm_threshold": 80,
    "location": "A 区弱电井 · 1F",
    "life_percent": 86,
    "event_count": 1281,
    "online": true,
    "status": "NORMAL",
    "status_label": "正常"
  }
]
```

| 字段 | 说明 |
|---|---|
| `reset_mode` | `Accumulate` 累积 / `Reset` 保存后归零 |
| `alarm_threshold` | 告警阈值百分比 0–100（寿命低于该值时告警） |
| `life_percent` | 模块剩余寿命 % |
| `event_count` | 模块霍尔通道浪涌计数合计 |
| `status_label` | 正常 / 寿命告警 / 离线 |

### `PUT /surge-settings`

保存模块设置。请求体为对象数组，整表提交。

**请求**

```json
[
  {
    "module_id": 1,
    "reset_mode": "Accumulate",
    "alarm_threshold": 80,
    "location": "A 区弱电井 · 1F"
  }
]
```

**约束**：`alarm_threshold` 为 0–100 整数；`location` 必填，最长 128 字符。

**行为**：`reset_mode = "Reset"` 时，后端应将该模块 4 个接口通道的事件计数全部归零。

**响应**：更新后的 `GET /surge-settings` 结果。

---

## 7. 通信诊断

### `GET /diagnostics`

通信诊断页数据，页面内 5s 自动刷新。

**响应要点**

```json
{
  "modules": [
    {
      "module_id": 1,
      "address": "0x20",
      "online": true,
      "life_percent": 86,
      "alarm_threshold": 80,
      "firmware": "1.4.2",
      "heartbeat_counter": 224138,
      "communication_error_count": 9,
      "crc_error_count": 2,
      "restart_count": 1,
      "pending_event_count": 0,
      "queue_capacity": 64,
      "queue_used": 0,
      "event_overflow_count": 0,
      "last_communication_time": "2026-11-25T13:59:59.000Z"
    }
  ],
  "storage": [
    { "name": "事件日志", "used": 1568, "total": 4096, "unit": "KB", "percent": 38 }
  ],
  "network": {
    "state": "connected",
    "link": "1 Gbps 全双工",
    "ip": "192.168.1.1",
    "mac": "A4:CF:12:8D:6E:20",
    "dhcp": true,
    "upload": { "protocol": "HTTP", "host": "10.20.0.15", "port": 8080, "interval_seconds": 30, "enabled": true, "state": "connected", "last_success": "..." }
  },
  "device": { "firmware": "v1.0.0", "uptime_text": "6 天 4 小时 23 分", "boot_id": 47, "temperature_c": 38.4, "i2c_rate": "100 kHz", "event_count": 306 },
  "syslog_total": 96
}
```

- `modules`：含 `life_percent` / `alarm_threshold` 用于新增的「剩余寿命」列
- `storage`：4 个分区（事件日志 / 统计文件 / 设备配置 / 系统日志），`percent` 由前端计算也可后端给
- `network.upload`：上报状态；`secret` 字段在诊断中不返回

---

## 8. 系统日志

### `GET /syslog`

分页系统日志。

**查询参数**：`page`（默认 1）、`page_size`（默认 12）、`level`（`INFO` / `WARN` / `ERROR`，可选）。

**响应**

```json
{
  "items": [
    { "log_id": 96, "level": "INFO", "source": "system", "source_label": "系统", "message": "系统启动完成，进入正常监测状态", "timestamp_ms": 1732826924000, "time": "2026-11-25 14:00:00" }
  ],
  "total": 96,
  "page": 1,
  "page_size": 12
}
```

按 `timestamp_ms` 倒序。

### `DELETE /syslog`

清除全部系统日志。**注意：会删除用户日志数据，前端已二次确认。** 响应：`{ "cleared": <被清除条数> }`。

---

## 9. 维护操作

### `POST /maintenance/reboot`

重启设备。响应：`{ "boot_id": 48 }`。重启后 `boot_id` 自增，Web 服务短暂中断约 30s。

### `POST /maintenance/factory-reset`

恢复出厂默认。**破坏性操作，前端已二次确认。** 响应：`{ "ok": true }`。事件日志与统计保留，自定义配置清除。

### `GET /maintenance/config-export`

导出当前配置为 JSON 文本（前端下载为 `.json` 文件）。响应为 `text/plain` / `application/json`，非包装 JSON。内容包含 `exported_at`、`device`、`network`、`time`、`environment`、`upload`（`secret` 应剔除）、`surge_settings`。

> 配套的配置导入目前仅在前端 mock（写日志 + 假延迟）。若要接真实导入，建议增加 `POST /maintenance/config-import`，接收上述导出结构，并做版本/完整性校验。

### `POST /maintenance/upgrade`

ESP32 主控固件升级。请求：`{ "version": "v1.1.0" }`（实际固件镜像通过单独的文件上传接口传输，待定）。响应：`{ "version": "v1.1.0" }`。升级过程请勿断电，失败应自动回滚。

### `POST /maintenance/stm32-upgrade`

STM32 采集模块固件升级。请求：

```json
{ "module_ids": [1, 2, 3, 4], "version": "1.5.0" }
```

- `module_ids`：待升级模块 ID 数组，至少一个
- 离线模块返回错误，不应升级
- 每个 STM32 固件镜像 ≤ 1MB（`.bin` / `.hex`）

**行为**：逐模块烧写；期间对应模块 4 路接口通道暂停采集，状态短暂为「未知」。升级失败的模块会停留在 Bootloader 等待新固件，需重新发起写入（不会自动回滚）。

**响应**

```json
{ "version": "1.5.0", "modules": [ { "module_id": 1, "firmware": "1.5.0" } ] }
```

成功后应写一条 `module` 来源的系统日志。

---

## 10. 其他

### `POST /system/log`

写一条系统日志（前端部分维护操作会调用）。

**请求**

```json
{ "level": "WARN", "source": "system", "message": "管理员导出了设备配置" }
```

`level`：`INFO` / `WARN` / `ERROR`。`source`：`system` / `i2c` / `event` / `optical` / `storage` / `upload` / `network` / `diagnostics` / `module`。

### `POST /debug/inject-event`（仅 mock）

向指定通道注入一条阈值触发事件，用于演示联动。真实设备**不提供**此接口，接入时应从前端移除「模拟事件」按钮。

---

## 枚举汇总

**事件类型 `event_type`**

| key | label | 短标签 | 默认等级 |
|---|---|---|---|
| `HALL_TRIGGER` | 阈值触发事件 | 阈值触发 | 1 或 2 |
| `OPTICAL_CHANGE` | 光敏状态变化 | 光敏变化 | 2 |
| `COMM_ERROR` | 通信异常 | 通信异常 | 2 |
| `MODULE_OFFLINE` | 模块离线 | 模块离线 | 3 |
| `QUEUE_OVERFLOW` | 队列溢出 | 队列溢出 | 3 |

**事件等级 `event_level`**：`1` 一般 / `2` 重要 / `3` 严重

**通道状态 `status`**：`NORMAL` 正常 / `ALARM` 事件触发 / `FAIL` 状态异常 / `OFFLINE` 监测失效 / `UNKNOWN` 未知

**光敏状态 `optical_state`**：`NORMAL` 正常 / `ABNORMAL` 异常 / `UNKNOWN` 未知

**日志级别 `level`**：`INFO` / `WARN` / `ERROR`

---

## 接口清单速查

| 方法 | 路径 | 页面 | 说明 |
|---|---|---|---|
| POST | `/session` | 登录 | 获取令牌 |
| GET | `/device` | 总览 | 设备+模块+通道快照，1.5s 轮询 |
| GET | `/channels` | — | 16 路通道列表 |
| GET | `/channels/:id` | 通道详情抽屉 | 通道+模块+最近事件+14 天趋势 |
| GET | `/events` | 事件历史 | 分页+多条件筛选 |
| GET | `/statistics` | 统计分析 | 全部图表数据 |
| GET / PUT | `/config` | 系统设置 | 整体读取/保存 |
| GET / PUT | `/surge-settings` | 浪涌设置 | 4 个模块的设置 |
| GET | `/diagnostics` | 通信诊断 | 模块/存储/网络，5s 刷新 |
| GET | `/syslog` | 通信诊断 | 分页系统日志 |
| DELETE | `/syslog` | 通信诊断 | 清空日志（破坏性） |
| POST | `/maintenance/reboot` | 维护 | 重启 |
| POST | `/maintenance/factory-reset` | 维护 | 恢复出厂（破坏性） |
| GET | `/maintenance/config-export` | 维护 | 导出配置 JSON |
| POST | `/maintenance/upgrade` | 维护 | ESP32 固件升级 |
| POST | `/maintenance/stm32-upgrade` | 维护 | STM32 模块固件升级 |
| POST | `/system/log` | 多处 | 写系统日志 |
| POST | `/debug/inject-event` | 顶栏（mock） | 注入事件，真实设备不提供 |

## 替换 mock 的方式

前端所有 Procet 页面只通过 `src/mock/api.js` 取数。接入真实后端时，把该文件中各方法体替换为 `fetch('/api/v1/...')` 即可，视图与 store 无需改动；`meta` 中的枚举可改为从 `/config` 或专门的元数据接口获取。
