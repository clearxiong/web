<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'
import { useAetek } from '../../stores/aetek'
import { useToast } from '../../stores/toast'

const route = useRoute()
const router = useRouter()
const { login, state } = useAetek()
const toast = useToast()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function onSubmit() {
  error.value = ''
  submitting.value = true
  try {
    await login(username.value, password.value)
    toast.success(`欢迎，${username.value.trim()}`)
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/aetek/')
        ? route.query.redirect
        : '/aetek/surge/module-status'
    router.replace(redirect)
  } catch (err) {
    error.value = err.message || '登录失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="visual">
      <div class="visual-brand">
        <span class="brand-mark">AE</span>
        <div class="brand-text">
          <b>AETEK</b>
          <em>SD-504 · 防雷器</em>
        </div>
      </div>

      <div class="visual-body">
        <p class="eyebrow">本地 WEB 管理 · 演示版</p>
        <h1>SD-504<br />防雷器管理界面</h1>
        <p class="visual-desc">
          按 AETEK 官方用户手册复刻的 7 页管理界面：系统 与 防雷监测 两组菜单，
          主页面是一张「每模块一行」的寿命与雷击计数表。
        </p>

        <div class="menu-map">
          <div>
            <span class="map-title">系统</span>
            <p>设备信息 · 系统时间 · IP 地址 · 账户 · 系统日志</p>
          </div>
          <div>
            <span class="map-title">防雷监测</span>
            <p>浪涌设置 · 模块状态</p>
          </div>
        </div>

        <p class="visual-note">
          <AppIcon name="info" :size="14" />
          演示环境：任意用户名与密码均可登录，数据均为 mock。
        </p>
      </div>

      <div class="visual-foot">
        <span>4 通道 · 4 个防雷模块</span>
        <span class="mono">FW v1.0.4</span>
      </div>
    </section>

    <section class="panel">
      <form class="login-card" @submit.prevent="onSubmit">
        <span class="panel-mark">AE</span>
        <h2>登录设备</h2>
        <p class="panel-sub">首次登录请设置管理员用户名与密码（≤31 字符，ASCII 32–126）</p>

        <div class="field">
          <label for="ae-username">用户名</label>
          <input
            id="ae-username"
            v-model="username"
            class="input"
            type="text"
            autocomplete="username"
            placeholder="请输入用户名"
            :class="{ invalid: error }"
          />
        </div>

        <div class="field">
          <label for="ae-password">密码</label>
          <input
            id="ae-password"
            v-model="password"
            class="input"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
            :class="{ invalid: error }"
          />
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <button class="btn primary login-btn" type="submit" :disabled="submitting">
          {{ submitting ? '正在登录…' : '登 录' }}
        </button>

        <div class="panel-meta">
          <span>默认地址 192.168.1.1</span>
          <span>自动登出 {{ state.user?.auto_logout ?? 300 }} 秒</span>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  background: var(--bg);
}

.visual {
  position: relative;
  padding: 34px 48px 30px;
  color: #d7e4f4;
  background: radial-gradient(120% 90% at 0% 0%, #1c3b60 0%, #0e1e33 46%, #0a1422 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.visual::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(80% 70% at 50% 40%, #000 20%, transparent 80%);
  pointer-events: none;
}
.visual-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 2;
}
.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.brand-text b {
  font-size: 15px;
  letter-spacing: 0.6px;
  color: #fff;
}
.brand-text em {
  font-style: normal;
  font-size: 10.5px;
  color: #8ba2bd;
  letter-spacing: 0.6px;
}

.visual-body {
  position: relative;
  z-index: 2;
  margin: auto 0;
  max-width: 460px;
}
.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.4px;
  color: #5f86b5;
  margin-bottom: 14px;
}
.visual-body h1 {
  font-size: clamp(28px, 3.2vw, 40px);
  line-height: 1.22;
  letter-spacing: -0.8px;
  color: #fff;
  font-weight: 750;
}
.visual-desc {
  margin-top: 16px;
  font-size: 13.5px;
  line-height: 1.8;
  color: #9fb4cd;
  max-width: 420px;
}
.menu-map {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.map-title {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #7fb0ff;
  text-transform: uppercase;
}
.menu-map p {
  margin-top: 4px;
  font-size: 12.5px;
  color: #c0d2e6;
  line-height: 1.6;
}
.visual-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 20px;
  font-size: 12px;
  color: #8ba2bd;
}

.visual-foot {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: #647e9e;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding-top: 16px;
}

.panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 28px;
}
.login-card {
  width: 100%;
  max-width: 372px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.panel-mark {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: var(--sidebar);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.login-card h2 {
  font-size: 24px;
  font-weight: 750;
  letter-spacing: -0.5px;
  margin-top: 2px;
}
.panel-sub {
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.65;
  margin-top: -8px;
  margin-bottom: 4px;
}
.login-btn {
  height: 42px;
  margin-top: 4px;
  font-size: 14px;
  letter-spacing: 1px;
}
.panel-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 11px;
  color: var(--ink-3);
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }
  .visual {
    display: none;
  }
  .panel {
    min-height: 100vh;
    background: radial-gradient(120% 60% at 50% 0%, #e6eefb 0%, var(--bg) 60%);
  }
}
</style>
