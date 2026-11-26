<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import BrandLogo from '../components/BrandLogo.vue'
import { useAuth } from '../stores/auth'
import { useToast } from '../stores/toast'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()
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
  <div class="login-page procet-login">
    <div class="login-container">
      <div class="title-box">
        <BrandLogo class="login-brand" dark :size="34" :word-size="24" />
        <p class="login-title">16 通道智能防雷监测终端</p>
        <p class="login-sub">本地 Web 管理</p>
      </div>

      <form class="login-form" @submit.prevent="onSubmit">
        <div class="form-item">
          <label for="username">用户名</label>
          <div class="input-wrap">
            <AppIcon name="user" :size="16" class="input-icon" />
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
        </div>

        <div class="form-item">
          <label for="password">密码</label>
          <div class="input-wrap">
            <AppIcon name="lock" :size="16" class="input-icon" />
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
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <button class="btn primary login-btn" type="submit" :disabled="submitting">
          {{ submitting ? '正在登录…' : '登 录' }}
        </button>
      </form>

      <div class="demo-hint">
        <AppIcon name="info" :size="14" />
        <span>演示环境：任意用户名与密码均可登录</span>
      </div>

      <div class="login-foot">
        <span>默认地址 192.168.1.1</span>
        <span>会话 300 秒无操作自动登出</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  background: #2d3a4b;
  background-image: radial-gradient(80% 60% at 50% 0%, #384a5f 0%, #2d3a4b 60%);
  padding: 12vh 20px 40px;
}

.login-container {
  width: 100%;
  max-width: 460px;
  color: #fff;
}

.title-box {
  text-align: center;
  margin-bottom: 32px;
}

.login-brand {
  margin-bottom: 20px;
}

.login-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
}

.login-sub {
  margin-top: 10px;
  font-size: 13px;
  color: #bfcbd9;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-size: 13px;
  font-weight: 500;
  color: #dfe6ee;
}

.input-wrap {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #c0c4cc;
  pointer-events: none;
}

.input-wrap .input {
  height: 42px;
  padding-left: 40px;
  border-color: transparent;
  background: #fff;
  font-size: 14px;
}

.input-wrap .input:hover {
  border-color: transparent;
}

.input-wrap .input:focus {
  border-color: #409eff;
}

.login-btn {
  height: 42px;
  margin-top: 4px;
  font-size: 15px;
  letter-spacing: 2px;
}

.error-text {
  margin: -8px 0 0;
}

.demo-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 20px;
  font-size: 12px;
  color: #a3b4c8;
}

.demo-hint :deep(svg) {
  flex: none;
}

.login-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: #8494a7;
}

@media (max-width: 480px) {
  .login-page {
    padding-top: 9vh;
  }
  .login-title {
    font-size: 22px;
  }
  .login-foot {
    flex-direction: column;
    gap: 6px;
    align-items: center;
  }
}
</style>
