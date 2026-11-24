<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import BrandLogo from '../components/BrandLogo.vue'
import { useAuth } from '../stores/auth'
import { useToast } from '../stores/toast'

const router = useRouter()
const route = useRoute()
const { state, login } = useAuth()
const toast = useToast()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function onSubmit() {
  error.value = ''
  if (!username.value.trim()) {
    error.value = '请输入用户名'
    return
  }
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  submitting.value = true
  try {
    await login(username.value.trim(), password.value)
    toast.success(`欢迎回来，${username.value.trim()}`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(redirect)
  } catch (err) {
    error.value = err.message || '登录失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="visual">
      <div class="visual-brand">
        <BrandLogo dark :size="34" :word-size="24" />
        <span class="visual-brand-sub">16 通道智能防雷监测终端</span>
      </div>

      <div class="visual-body">
        <p class="eyebrow">LOCAL WEB MANAGEMENT</p>
        <h1>16 通道<br />智能防雷监测终端</h1>
        <p class="visual-desc">
          面向 PoE 交换机后端的 16 路浪涌保护通道监测。实时采集霍尔阈值事件与光敏状态，
          提供模块寿命、事件记录、统计分析与本地诊断，断网时仍可独立运行。
        </p>

        <ul class="feature">
          <li><span><AppIcon name="channels" :size="15" /></span>4 个采集模块 · 16 路独立通道</li>
          <li><span><AppIcon name="history" :size="15" /></span>事件日志、寿命计数与健康风险提示</li>
          <li><span><AppIcon name="shield" :size="15" /></span>本地 Web 服务，离线可用</li>
        </ul>
      </div>

      <div class="visual-art" aria-hidden="true">
        <i class="ring r1"></i>
        <i class="ring r2"></i>
        <i class="ring r3"></i>
        <i class="pulse p1"></i>
        <i class="pulse p2"></i>
        <span class="art-bolt"><AppIcon name="bolt" :size="26" /></span>
      </div>

      <div class="visual-foot">
        <span>Procet SD-504 / SD-524 系列 · 16 通道版本</span>
        <span class="mono">FW v1.0.0</span>
      </div>
    </section>

    <section class="panel">
      <form class="login-card" @submit.prevent="onSubmit">
        <BrandLogo class="panel-logo" :size="34" :word-size="23" />
        <h2>登录设备</h2>
        <p class="panel-sub">请输入管理员用户名与密码以访问本地 Web 管理界面</p>

        <div class="field">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            class="input"
            type="text"
            autocomplete="username"
            placeholder="请输入用户名"
            :class="{ invalid: error }"
          />
        </div>

        <div class="field">
          <label for="password">密码</label>
          <input
            id="password"
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

        <div class="demo-hint">
          <AppIcon name="info" :size="14" />
          演示环境：任意用户名与密码均可登录
        </div>

        <div class="panel-meta">
          <span>默认地址 192.168.1.1</span>
          <span>会话 300 秒无操作自动登出</span>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  background: var(--bg);
}

/* ---------- Visual ---------- */
.visual {
  position: relative;
  padding: 34px 48px 30px;
  color: #d7e4f4;
  background:
    radial-gradient(120% 90% at 0% 0%, #1c3b60 0%, #0e1e33 46%, #0a1422 100%);
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
  gap: 14px;
  position: relative;
  z-index: 2;
}
.visual-brand-sub {
  font-size: 11px;
  color: #8ba2bd;
  letter-spacing: 0.4px;
  padding-left: 14px;
  border-left: 1px solid rgba(255, 255, 255, 0.14);
}

.visual-body {
  position: relative;
  z-index: 2;
  margin: auto 0;
  max-width: 480px;
}
.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.6px;
  color: #5f86b5;
  margin-bottom: 14px;
}
.visual-body h1 {
  font-size: clamp(30px, 3.4vw, 44px);
  line-height: 1.2;
  letter-spacing: -1px;
  color: #fff;
  font-weight: 750;
}
.visual-desc {
  margin-top: 16px;
  font-size: 13.5px;
  line-height: 1.8;
  color: #9fb4cd;
  max-width: 430px;
}
.feature {
  margin-top: 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.feature li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #c0d2e6;
}
.feature span {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(60, 130, 255, 0.13);
  border: 1px solid rgba(96, 155, 245, 0.2);
  color: #7fb0ff;
  flex: none;
}

.visual-art {
  position: absolute;
  right: -110px;
  bottom: 40px;
  width: 380px;
  height: 380px;
  z-index: 1;
  opacity: 0.75;
}
.ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(88, 148, 235, 0.18);
  inset: 0;
}
.r1 {
  inset: 28%;
}
.r2 {
  inset: 12%;
  border-style: dashed;
}
.r3 {
  inset: 0;
}
.pulse {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4d8dff;
  box-shadow: 0 0 16px 4px rgba(77, 141, 255, 0.5);
}
.p1 {
  top: 18%;
  left: 30%;
}
.p2 {
  bottom: 24%;
  right: 22%;
  width: 7px;
  height: 7px;
  opacity: 0.7;
}
.art-bolt {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 74px;
  height: 74px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  color: #9cc4ff;
  background: rgba(28, 70, 130, 0.55);
  border: 1px solid rgba(96, 155, 245, 0.25);
  backdrop-filter: blur(6px);
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

/* ---------- Panel ---------- */
.panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 28px;
}
.login-card {
  width: 100%;
  max-width: 376px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.panel-logo {
  margin-bottom: 6px;
}
.login-card h2 {
  font-size: 24px;
  font-weight: 750;
  letter-spacing: -0.5px;
  margin-top: 2px;
}
.panel-sub {
  font-size: 13px;
  color: var(--ink-3);
  line-height: 1.65;
  margin-top: -7px;
  margin-bottom: 4px;
}
.login-btn {
  height: 42px;
  margin-top: 4px;
  font-size: 14px;
  letter-spacing: 2px;
}
.demo-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--brand);
  background: var(--brand-soft);
  border: 1px solid var(--brand-line);
  border-radius: 9px;
  padding: 9px 11px;
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
    background:
      radial-gradient(120% 60% at 50% 0%, #e6eefb 0%, var(--bg) 60%);
  }
}
</style>
