# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

纯前端 Mock 演示，无后端、无测试、无 Lint。一个 Vite + Vue 3 应用里并排放着**两套产品界面**：

1. **Procet 16 通道智能防雷监测终端**（`/`，自研产品形态，8 个页面）
2. **AETEK SD-504 原厂界面复刻**（`/aetek`，按官方手册的 7 页结构，用于对照）

两套界面共用设计 token 与基础组件，但布局、菜单、登录态、数据完全隔离。

## 常用命令

```bash
npm install
npm run dev      # Vite dev server，默认 5173，端口占用时自动 +1
npm run build    # 产物在 dist/，静态托管即可（路由为 hash 模式，无需 rewrite）
npm run preview
```

没有单元测试与 Lint 脚本，验证方式只有两条：`npm run build` 通过 + 在浏览器里实际点一遍（含 375px 窄屏）。

### 部署

- 内网 Gitea：`origin` → `http://192.168.2.66:30000/xiongyaowu/web.git`
- GitHub：`github` → `https://github.com/clearxiong/web.git`，`.github/workflows/deploy.yml` 在 push 到 main 时自动构建并发布 GitHub Pages；CI 会传 `--base=/<repo>/`，本地构建默认 `base=/`
- 推送到 `github` 会触发一次真实部署，未经明确要求不要推

## 领域模型（最容易搞错的地方）

「16 通道」**不是 16 个防雷模块**。硬件是 4 个 STM32 采集模块，每个模块提供 4 个接口通道：

| 通道序号 | 接口 | 说明 |
|---|---|---|
| CH(n-1)*4+1 | 霍尔比较器 GPIO | 外部中断捕获浪涌阈值触发 |
| CH(n-1)*4+2 | 光敏状态采集 | 周期读取光敏检测状态 |
| CH(n-1)*4+3 | 事件捕获与锁存 | STM32 锁存事件，等待 ESP32 读取 |
| CH(n-1)*4+4 | I2C 从机通信 | 与 ESP32 主机的 I2C 通道 |

因此：

- **寿命、浪涌计数、告警阈值、安装位置只属于模块**（4 条寿命），不属于通道
- 16 路通道只有接口状态、事件次数、最近事件
- 事件按类型落到对应接口：`HALL_TRIGGER→slot1`、`OPTICAL_CHANGE→slot2`、`QUEUE_OVERFLOW→slot3`、`COMM_ERROR/MODULE_OFFLINE→slot4`
- 「模拟事件」只会落在霍尔通道上

改数据模型时先看 `src/mock/db.js` 里的 `INTERFACE_SLOTS`、`MODULE_BASE`、`SLOT_OF_TYPE`，再动视图。

## 架构

### 数据层：mock 是唯一数据源

- `src/mock/db.js`：Procet 的内存「设备」。固定种子的 PRNG 生成近 30 天 306 条事件，派生统计、诊断、配置。所有状态是**模块级单例**——整页刷新即重置
- `src/mock/api.js`：包一层 150–380ms 延迟，方法名对齐 `/api/v1/*`；接真实固件时只替换这一层，视图与 store 不动
- `src/mock/aetek.js` + `aetekApi.js`：AETEK 的独立数据集，同样只经 api 层访问
- `src/stores/`：手写响应式单例（无 Pinia）。`device.js` 每 1.5s 轮询 `api.getDevice()`；`auth.js` 用 localStorage `spd.session`，`aetek.js` 用 `aetek.session`

### 两种保存模型（不要混用）

- **Procet**：各页自己 `api.saveXxx()` 立即生效
- **AETEK**：全局显式保存——页面只改 `state.draft`，顶栏 `保存配置` 才提交；未保存修改跨页累积，`isDirty` 用 JSON 比较 config/draft，保存前 `validateDraft` 统一校验。新增 AETEK 页面时必须改 draft，不要直接调 api 写设备

### 路由与布局

- `src/router/index.js`：hash 模式；`/aetek/*` 分支带 `meta.product='aetek'`，守卫按产品分别校验登录态；`afterEach` 按产品切换 `document.title`
- `src/layouts/AppShell.vue`（Procet：白色顶栏 + 深色两级菜单侧栏 + 300s 自动登出）与 `AetekShell.vue`（AETEK：左菜单两组 + 全局保存/自动登出）互不复用，各自维护移动端抽屉
- Procet 导航为「一级分组 → 二级页面」：一级菜单在 `AppShell.vue` 的 `navGroups` 中声明，新增页面时同时补 `meta.title` 与 `navGroups` 条目

### 样式与组件

- `src/assets/styles/tokens.css` 定义全部颜色/圆角/间距变量，`base.css` 提供 `.page .card .btn .badge .table.data .progress .field` 等通用类；新页面优先复用这些类，不要自带一套
- `src/assets/styles/procet-theme.css` 是 Procet 专属的 Element 风格皮肤（#409eff 主色、白顶栏、#304156 两级菜单、el-card 外观），只在 `.procet` / `.procet-login` / `.procet-body` 作用域内生效；AETEK 不受影响。调整 Procet 视觉优先改这个文件，不要动 `tokens.css` 的全局值
- 图表是手写 SVG（`components/charts/`），不引第三方库，保证离线与包体
- 组件 props 约定：`StatusBadge` 取 `tone` + `label`，`LifeBar` 取 `percent` + `threshold`（剩余寿命口径，低于阈值变红）

## 文案与数据约定

- 界面、日志、校验提示一律中文；只保留设备状态码（NORMAL/ALARM/FAIL/OFFLINE/UNKNOWN）与手册页名的英文对照
- 寿命是「剩余寿命 %」，告警阈值也按剩余寿命判定（`life_percent < alarm_threshold` 即 ALARM）；对外文案不得宣称精确剩余寿命，只能表述为风险提示
- 计数可重置：模块 `reset_mode = 'Reset'` 保存时会把该模块霍尔通道（即浪涌计数）及其余通道事件数归零
