# AETEK SD-504 · 后端接口规范

本文档汇总 **AETEK 演示界面**所需的后端接口，对应原厂 SD504_524 用户手册的 7 页结构（System ×5 + IP PoE Surge ×2）。用于替换 `src/mock/aetekApi.js`。

- 基础地址：`/api/v1/aetek`
- 认证方式：除 `POST /session` 外均需 `Authorization: Bearer <token>`
- 数据格式：JSON，字段 `snake_case`，与前端一致，替换 mock 后无需转换
- 会话存储：前端独立于 Procet，令牌存于 `localStorage` 的 `aetek.session`

> **与 Procet 的关键差异：显式保存模型**
>
> AETEK 是全局唯一保存动作。前端在所有编辑页只修改本地 `draft`，顶栏「保存配置」才把 `draft` 一次性提交到设备；未保存修改跨页累积。
>
> 因此：
>
> - 后端 `PUT /config` 接收的是**整份 draft**（system / time / ip / account / surge），不是单页增量
> - 保存前前端会用 `validateDraft` 做统一校验，校验不通过不提交
> - 实时指标（模块寿命、雷击计数、系统日志）**不在 draft 内**，单独通过 `GET /modules` 与 `GET /syslog` 读取
>
> 前端通过比较 `config` 与 `draft` 的 JSON 串判断 `isDirty`，后端返回值需保证可 JSON 序列化且字段稳定。

---

## 1. 会话与认证

### `POST /session`

登录获取令牌。AETEK 首次登录即建账号，用户名/密码均 ≤31 字符、仅 ASCII 32–126。

**请求**

```json
{ "username": "admin", "password": "••••••" }
```

**响应**

```json
{
  "username": "admin",
  "role": "管理员",
  "auto_logout": 300,
  "login_at": "2026-11-25T10:30:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `username` | string | 登录用户名 |
| `role` | string | 角色展示文案 |
| `auto_logout` | int | 自动登出秒数，驱动顶栏倒计时（0 表示不超时） |
| `login_at` | string | ISO 时间 |

> `token` 由前端自行附加（`aetek-<时间戳>`）。若接真实固件需要真令牌，可在此响应中返回 `token` 字段。

**错误**：用户名/密码为空、超过 31 字符、含非 ASCII 32–126 字符 → `400`。登录成功应写一条系统日志（`管理员 xxx 从 192.168.1.100 登录`）。

---

## 2. 配置快照

### `GET /config`

一次性返回全部页面所需的配置与实时数据。前端登录后调用一次 `load()`，用于填充 7 个页面。

**响应**

```json
{
  "system": {
    "model_name": "SD-504",
    "description": "Modular Surge Protector 4 Channel",
    "firmware": "v1.0.4",
    "firmware_build": "2025-12-18",
    "mac": "00:1A:2B:3C:4D:5E",
    "name": "SD-504-SITE-A",
    "location": "Building A · IDF-2",
    "contact": "ops@example.com"
  },
  "time": {
    "manual": "2026-11-25T10:30:00",
    "ntp": false,
    "ntp_server": "pool.ntp.org",
    "timezone": "UTC+08:00",
    "dst": false
  },
  "ip": {
    "dhcp": true,
    "address": "192.168.1.1",
    "mask": "255.255.255.0",
    "gateway": "192.168.1.254",
    "dns": "8.8.8.8",
    "hostname": "sd-504-01"
  },
  "account": {
    "users": [
      { "username": "admin", "role": "管理员", "last_login": "2026-11-25T10:30:00.000Z", "last_login_text": "2026-11-25 10:30:00" }
    ],
    "auto_logout": 300
  },
  "surge": [
    {
      "module_id": 1,
      "label": "CH1",
      "location": "Camera-01",
      "alarm_trigger": 80,
      "reset_counter": false
    }
  ],
  "modules": [ /* 见 GET /modules */ ],
  "syslog_total": 6
}
```

**字段分组说明**

| 分组 | 对应页面 | 可编辑 |
|---|---|---|
| `system` | System Information | `name` / `location` / `contact` 可编辑；`model_name` / `description` / `firmware` / `firmware_build` / `mac` 只读 |
| `time` | System Time | 全部可编辑；`ntp=true` 时手动时间失效 |
| `ip` | IP Address | `dhcp` 为 `true` 时地址/掩码/网关/DNS 只展示 |
| `account` | Account | `username` / `auto_logout` 可编辑；`users` 列表只读 |
| `surge` | Surge Settings | `location` / `alarm_trigger` / `reset_counter` 可编辑 |
| `modules` | Module Status | 只读实时指标 |

**`system` 约束**：`name` 必填 ≤32 字符；`location` ≤64 字符；`contact` ≤64 字符。

**`time` 约束**：`ntp` 为布尔；启用时 `ntp_server` 必填。`manual` 为 ISO 本地时间 `YYYY-MM-DDTHH:mm:ss`。`timezone` 形如 `UTC+08:00`。`dst` 布尔。

**`ip` 约束**：`dhcp` 布尔；为 `false` 时 `address` / `mask` / `gateway` / `dns`（可选）必须是合法 IPv4。`hostname` 必填 ≤63 字符、仅 ASCII 32–126。

**`account` 约束**：`auto_logout` 为 0–9999 整数（0 = 不超时）。`username` 必填 ≤31 字符、仅 ASCII 32–126。注意 `account` 在 draft 中只含 `username` 与 `auto_logout` 两项。

**`surge[].alarm_trigger` 约束**：0–100 整数，语义为「寿命已用百分比」阈值。`location` ≤64 字符。`reset_counter` 布尔，仅作为「本次保存时是否归零计数」的请求标记，不持久化（设备端应始终返回 `false`）。

---

## 3. 模块实时指标

### `GET /modules`

返回 4 个防雷模块的实时状态。模拟雷击后前端会重新拉取。

**响应**

```json
[
  {
    "module_id": 1,
    "label": "CH1",
    "location": "Camera-01",
    "life_used": 18,
    "life_remaining": 82,
    "surge_count": 12,
    "alarm_trigger": 80,
    "hardware": "NORMAL",
    "status": "NORMAL",
    "status_label": "正常",
    "status_code": "NORMAL",
    "status_tone": "ok",
    "status_desc": "模块工作正常，寿命余量充足",
    "last_surge_time": "2026-11-20T10:30:00.000Z"
  }
]
```

| 字段 | 说明 |
|---|---|
| `label` | 界面显示名，`CH<module_id>` |
| `life_used` | 寿命已用百分比 0–100 |
| `life_remaining` | 剩余寿命 = `100 - life_used` |
| `surge_count` | 雷击计数 |
| `alarm_trigger` | 告警阈值（寿命已用百分比） |
| `hardware` | 硬件健康：`NORMAL` / `FAIL` / `OFFLINE`，**优先于寿命判定** |
| `last_surge_time` | 最近雷击 ISO 时间，无则 `null` |

**`status` 判定（7 种取值）**：先看 `hardware`，非 `NORMAL` 则直接取硬件态；否则 `life_used >= alarm_trigger → ALARM`，否则 `NORMAL`。

| status | status_label | status_tone | 含义 |
|---|---|---|---|
| `NORMAL` | 正常 | ok | 工作正常，寿命余量充足 |
| `ONLINE` | 在线 | ok | 在线且未达阈值 |
| `ALARM` | 告警 | warn | 寿命已用达到 Alarm Log Trigger 阈值 |
| `FAIL` | 失效 | danger | 模块失效，需更换 |
| `OFFLINE` | 离线 | muted | 无响应：未安装或通信中断 |
| `UNKNOWN` | 未知 | info | 尚未取得有效状态 |
| `?` | 未定义 | muted | 手册保留取值，语义未说明 |

> 注意口径：`life_remaining`（剩余）用于进度条展示，`alarm_trigger` 比较的是 `life_used`（已用）。阈值默认 80。

---

## 4. 保存配置（全局唯一写入口）

### `PUT /config`

把整份 draft 提交到设备。前端在「保存配置」按钮触发，且保存前已通过 `validateDraft` 校验。

**请求**：结构同 `GET /config` 中可编辑部分，含 `system` / `time` / `ip` / `account` / `surge`。示例：

```json
{
  "system": { "name": "SD-504-SITE-A", "location": "Building A · IDF-2", "contact": "ops@example.com" },
  "time": { "manual": "2026-11-25T10:30:00", "ntp": false, "ntp_server": "pool.ntp.org", "timezone": "UTC+08:00", "dst": false },
  "ip": { "dhcp": false, "address": "192.168.1.1", "mask": "255.255.255.0", "gateway": "192.168.1.254", "dns": "8.8.8.8", "hostname": "sd-504-01" },
  "account": { "username": "admin", "auto_logout": 90 },
  "surge": [
    { "module_id": 2, "label": "CH2", "location": "Camera-02", "alarm_trigger": 30, "reset_counter": true }
  ]
}
```

**后端行为**

1. 合并各节到设备状态（`system` / `time` / `ip` 整体覆盖；`account.auto_logout` 与 `account.users[0].username` 更新）。
2. 遍历 `surge`：更新 `location`（≤64 字符截断）、`alarm_trigger`（钳位 0–100）；若 `reset_counter === true`，将该模块 `surge_count` 归零并记一条 `WARN` 日志（`重置雷击计数：CH2`）。
3. 追加一条 `INFO` 日志（`管理员保存了配置`）。

**响应**

```json
{
  "config": { /* 保存后的完整快照，结构同 GET /config */ },
  "reset_modules": ["CH2"]
}
```

| 字段 | 说明 |
|---|---|
| `config` | 保存后的最新快照，前端用它重置 `config` 与 `draft` |
| `reset_modules` | 本次因 `reset_counter` 被归零的模块标签数组，用于 toast 提示 |

> 多管理员共管，最后保存者生效（手册约定）。后端无需做冲突检测。

---

## 5. 系统日志

### `GET /syslog`

返回全部系统日志（不分页，最多 200 条，新在前）。告警阈值触发、雷击、重置计数、配置保存、登录等均写入。

**响应**

```json
[
  {
    "id": 7,
    "level": "WARN",
    "time": "2026-11-25T10:31:00.000Z",
    "time_text": "2026-11-25 10:31:00",
    "message": "CH3 检测到雷击，雷击计数 32，寿命已用 93%"
  }
]
```

| 字段 | 说明 |
|---|---|
| `level` | `INFO` / `WARN` / `ERROR` |
| `time` | ISO 时间 |
| `time_text` | `YYYY-MM-DD HH:mm:ss`，用于表格展示 |
| `message` | 中文日志内容 |

前端按 `level` 过滤（全部/INFO/WARN/ERROR）。

### `DELETE /syslog`

清除全部系统日志。**破坏性操作，前端已二次确认。** 清除后应写一条 `INFO` 日志（`已清除系统日志，共 N 条`）。

**响应**

```json
{ "cleared": 7 }
```

---

## 6. 模拟雷击（仅 mock）

### `POST /modules/:id/surge`

向指定模块注入一次雷击，用于演示寿命/计数/日志联动。真实设备**不提供**此接口，接入时应移除界面上的「模拟雷击」按钮。

`:id` 为 `module_id`。省略 body 时随机选一个非离线模块。

**响应**：更新后的该模块对象，结构同 `GET /modules` 的元素。

**后端行为**

1. 目标必须存在且 `hardware !== 'OFFLINE'`，否则报错（`CH{id} 当前离线，无法模拟雷击`）。
2. `surge_count += 1`；`life_used += 1 或 2`（上限 100）；更新 `last_surge`。
3. 写 `WARN` 日志（雷击）。
4. 若跨越阈值（之前非 `ALARM`、之后 `ALARM`），再写一条 `ERROR` 日志（寿命已用达到告警阈值）。

---

## 枚举汇总

**模块状态 `status`（7 种）**：`NORMAL` / `ONLINE` / `ALARM` / `FAIL` / `OFFLINE` / `UNKNOWN` / `?`

**日志级别 `level`**：`INFO` / `WARN` / `ERROR`

**模块硬件态 `hardware`**：`NORMAL` / `FAIL` / `OFFLINE`（判定状态时优先于寿命阈值）

---

## 接口清单速查

| 方法 | 路径 | 页面 | 说明 |
|---|---|---|---|
| POST | `/session` | 登录 | 登录，返回用户名/角色/自动登出秒数 |
| GET | `/config` | 全部 7 页 | 一次性快照：配置 + 模块 + 用户 + 日志总数 |
| GET | `/modules` | Module Status | 4 个模块实时指标 |
| GET | `/syslog` | SysLog | 系统日志（≤200 条） |
| PUT | `/config` | 顶栏「保存配置」 | 全局唯一写入口，提交整份 draft |
| DELETE | `/syslog` | SysLog | 清空日志（破坏性） |
| POST | `/modules/:id/surge` | Module Status（mock） | 模拟雷击，真实设备不提供 |

---

## 页面 ↔ 接口对应

| 页面 | 读取 | 写入 |
|---|---|---|
| 登录 | — | `POST /session` |
| System Information | `GET /config`（system） | 经 `PUT /config` |
| System Time | `GET /config`（time） | 经 `PUT /config` |
| IP Address | `GET /config`（ip） | 经 `PUT /config` |
| Account | `GET /config`（account） | 经 `PUT /config` |
| SysLog | `GET /config` + `GET /syslog` | `DELETE /syslog` |
| Surge Settings | `GET /config`（surge） | 经 `PUT /config` |
| Module Status | `GET /config`（modules）+ `GET /modules` | `POST /modules/:id/surge`（mock） |

## 替换 mock 的方式

AETEK 全部页面只经 `src/mock/aetekApi.js` 取数与写入。接入真实固件时把该文件中各方法替换为 `fetch('/api/v1/aetek/...')` 即可；`src/mock/aetek.js` 的 `meta`（`AETEK_STATUS` / `statusOf`）可改为从接口获取或保留为前端常量。前端 store `src/stores/aetek.js` 的 `load` / `save` / `discard` 流程无需改动。
