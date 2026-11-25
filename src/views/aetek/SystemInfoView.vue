<script setup>
import { computed } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { useAetek } from '../../stores/aetek'

const { state, isDirty } = useAetek()

const system = computed(() => state.draft?.system || null)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">设备信息</h1>
        <p class="page-sub">设备身份信息 · 系统 › 设备信息（System Information，手册 2-1）</p>
      </div>
      <span v-if="isDirty" class="edit-hint">
        <AppIcon name="info" :size="14" />修改需点击右上角「保存配置」才会写入设备
      </span>
    </div>

    <div v-if="!system" class="card">
      <div class="empty">正在读取设备信息…</div>
    </div>

    <div v-else class="grid cols-2">
      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">设备信息（只读）</h3>
            <p class="card-sub">由固件上报，不可修改</p>
          </div>
          <AppIcon name="info" :size="18" class="head-icon" />
        </div>
        <div class="card-body">
          <dl class="info-list">
            <div><dt>型号名称</dt><dd>{{ system.model_name }}</dd></div>
            <div><dt>系统描述</dt><dd>{{ system.description }}</dd></div>
            <div><dt>固件版本</dt><dd class="mono">{{ system.firmware }}</dd></div>
            <div><dt>固件日期</dt><dd class="mono">{{ system.firmware_build }}</dd></div>
            <div><dt>MAC 地址</dt><dd class="mono">{{ system.mac }}</dd></div>
          </dl>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">可编辑信息</h3>
            <p class="card-sub">设备名称 / 安装位置 / 联系人</p>
          </div>
          <AppIcon name="settings" :size="18" class="head-icon" />
        </div>
        <div class="card-body">
          <div class="form-grid one">
            <div class="field">
              <label for="sys-name">设备名称</label>
              <input id="sys-name" v-model="system.name" class="input" maxlength="32" />
              <span class="hint">用于登录后顶栏显示，最多 32 字符</span>
            </div>
            <div class="field">
              <label for="sys-location">安装位置</label>
              <input id="sys-location" v-model="system.location" class="input" maxlength="64" />
              <span class="hint">设备安装位置，仅作标识，不参与逻辑</span>
            </div>
            <div class="field">
              <label for="sys-contact">联系人</label>
              <input id="sys-contact" v-model="system.contact" class="input" maxlength="64" />
              <span class="hint">维护人邮箱或电话</span>
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

.info-list {
  margin: 0;
}
.info-list > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 14px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line);
}
.info-list > div:last-child {
  border-bottom: none;
}
.info-list dt {
  font-size: 12px;
  color: var(--ink-3);
  flex: none;
}
.info-list dd {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
  text-align: right;
  word-break: break-word;
}

.form-grid.one {
  grid-template-columns: 1fr;
}
</style>
