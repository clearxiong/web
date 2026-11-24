<script setup>
defineProps({
  dark: { type: Boolean, default: false },
  size: { type: Number, default: 32 },
  wordSize: { type: Number, default: 21 }
})
</script>

<template>
  <span class="brand" :class="{ dark }">
    <span
      class="brand-mark"
      :style="{ width: size + 'px', height: size + 'px', borderRadius: Math.round(size * 0.28) + 'px' }"
    >
      <svg viewBox="0 0 24 24" :width="size * 0.62" :height="size * 0.62" aria-hidden="true">
        <path d="M13.2 2.4 5.1 13.3h5.6l-1 8.3 8.2-11.1h-5.7l1-8.1z" fill="currentColor" />
      </svg>
    </span>
    <span class="brand-word" :style="{ fontSize: wordSize + 'px' }">Procet</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  line-height: 1;
  user-select: none;
}
.brand-mark {
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #39b95f 0%, #17883c 100%);
  box-shadow: 0 3px 8px rgba(24, 136, 60, 0.28);
  flex: none;
}
.brand-word {
  font-weight: 800;
  letter-spacing: -0.6px;
  color: #14202d;
}
.brand.dark .brand-word {
  color: #fff;
}
</style>
