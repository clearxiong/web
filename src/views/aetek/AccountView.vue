<script setup>
import { computed, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { useAetek } from '../../stores/aetek'
import { isAsciiPrintable } from '../../utils/aetekValidate'

const { state, isDirty } = useAetek()

const account = computed(() => state.draft?.account || null)
const password = ref('')
const confirm = ref('')

const passwordError = computed(() => {
  if (!password.value) return ''
  if (password.value.length > 31) return '密码不能超过 31 个字符'
  if (!isAsciiPrintable(password.value)) return '密码只支持 ASCII 32–126 字符'
  if (confirm.value && confirm.value !== password.value) return '两次输入的密码不一致'
  return ''
})

const logoutError = computed(() => {
  if (!account.value) return ''
  const value = Number(account.value.auto_logout)
  if (!Number.isInteger(value) || value < 0 || value > 9999) return '自动登出时间必须是 0–9999 的整数'
  return ''
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">账户</h1>
        <p class="page-sub">访问控制 · 系统 › 账户（Account，手册 2-4）</p>
      </div>
      <span v-if="isDirty" class="edit-hint">
        <AppIcon name="info" :size="14" />修改需点击右上角「保存配置」才会写入设备
      </span>
    </div>

    <div v-if="!account" class="card">
      <div class="empty">正在读取账户信息…</div>
    </div>

    <div v-else class="grid cols-2">
      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">用户列表</h3>
            <p class="card-sub">允许多个管理员同时管理，最后保存者生效</p>
          </div>
          <AppIcon name="user" :size="18" class="head-icon" />
        </div>
        <div class="card-body flush">
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>角色</th>
                  <th>最近登录</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in state.users" :key="user.username">
                  <td class="strong">{{ user.username }}</td>
                  <td>{{ user.role }}</td>
                  <td class="mono">{{ user.last_login_text }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-body note-body">
          <p class="note">
            <AppIcon name="info" :size="15" />
            手册明确说明：多个管理员可同时登录，配置以最后一次「保存配置」为准，没有只读账号概念。
          </p>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">账户设置</h3>
            <p class="card-sub">用户名与自动登出时间</p>
          </div>
          <AppIcon name="lock" :size="18" class="head-icon" />
        </div>
        <div class="card-body">
          <div class="form-grid one">
            <div class="field">
              <label for="acc-username">用户名</label>
              <input id="acc-username" v-model="account.username" class="input" maxlength="31" />
              <span class="hint">最多 31 字符，仅 ASCII 32–126</span>
            </div>

            <div class="field">
              <label for="acc-password">新密码</label>
              <input
                id="acc-password"
                v-model="password"
                class="input"
                type="password"
                placeholder="留空表示不修改"
                autocomplete="new-password"
                :class="{ invalid: passwordError }"
              />
            </div>

            <div class="field">
              <label for="acc-confirm">确认密码</label>
              <input
                id="acc-confirm"
                v-model="confirm"
                class="input"
                type="password"
                placeholder="再次输入新密码"
                autocomplete="new-password"
                :class="{ invalid: passwordError }"
              />
              <span v-if="passwordError" class="error-text">{{ passwordError }}</span>
              <span v-else class="hint">演示环境不校验也不保存密码</span>
            </div>

            <div class="field">
              <label for="acc-logout">自动登出（秒）</label>
              <input
                id="acc-logout"
                v-model.number="account.auto_logout"
                class="input mono"
                type="number"
                min="0"
                max="9999"
                step="30"
                :class="{ invalid: logoutError }"
              />
              <span v-if="logoutError" class="error-text">{{ logoutError }}</span>
              <span v-else class="hint">0–9999 秒，0 表示永不超时；默认 300 秒</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.head-icon {
  color: var(--ink-3);
}
.edit-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--warn);
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  border-radius: var(--r-pill);
  padding: 5px 12px;
}
.form-grid.one {
  grid-template-columns: 1fr;
}
.note-body {
  padding-top: 0;
}
.note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 11px 13px;
  border-radius: 9px;
  background: var(--brand-soft);
  border: 1px solid var(--brand-line);
  color: #2a4f8f;
  font-size: 12px;
  line-height: 1.65;
}
.note svg {
  flex: none;
  margin-top: 1px;
}
</style>
