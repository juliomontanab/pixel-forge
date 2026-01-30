<script setup>
/**
 * PixelButton.vue
 *
 * Styled button component with pixel art aesthetic.
 * Supports multiple variants, sizes, and states.
 */

defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'danger', 'success', 'ghost'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: null
  },
  iconOnly: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  emit('click', event)
}
</script>

<template>
  <button
    class="pixel-btn"
    :class="[
      `pixel-btn--${variant}`,
      `pixel-btn--${size}`,
      { 'pixel-btn--icon-only': iconOnly },
      { 'pixel-btn--loading': loading },
      { 'pixel-btn--disabled': disabled }
    ]"
    :disabled="disabled || loading"
    :title="title"
    @click="handleClick"
  >
    <span v-if="loading" class="pixel-btn__loader">...</span>
    <span v-else-if="icon" class="pixel-btn__icon">{{ icon }}</span>
    <span v-if="!iconOnly && $slots.default" class="pixel-btn__text">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.pixel-btn {
  font-family: 'Press Start 2P', monospace;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.1s ease;
  text-transform: uppercase;
  white-space: nowrap;

  /* Pixel border effect */
  box-shadow:
    inset -2px -2px 0 rgba(0, 0, 0, 0.3),
    inset 2px 2px 0 rgba(255, 255, 255, 0.1);
}

.pixel-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.pixel-btn:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow:
    inset 2px 2px 0 rgba(0, 0, 0, 0.3),
    inset -2px -2px 0 rgba(255, 255, 255, 0.1);
}

/* Variants */
.pixel-btn--default {
  background: var(--bg-card, #1e1e3f);
  color: var(--text-primary, #e0e0e0);
  border: 2px solid var(--border-color, #333355);
}

.pixel-btn--primary {
  background: var(--primary, #c9a227);
  color: var(--bg-dark, #0f0f23);
  border: 2px solid var(--primary, #c9a227);
}

.pixel-btn--danger {
  background: var(--error, #ff4757);
  color: white;
  border: 2px solid var(--error, #ff4757);
}

.pixel-btn--success {
  background: var(--success, #00ff88);
  color: var(--bg-dark, #0f0f23);
  border: 2px solid var(--success, #00ff88);
}

.pixel-btn--ghost {
  background: transparent;
  color: var(--text-primary, #e0e0e0);
  border: 2px solid transparent;
  box-shadow: none;
}

.pixel-btn--ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--border-color, #333355);
}

/* Sizes */
.pixel-btn--sm {
  font-size: 8px;
  padding: 4px 8px;
  min-height: 24px;
}

.pixel-btn--md {
  font-size: 10px;
  padding: 6px 12px;
  min-height: 32px;
}

.pixel-btn--lg {
  font-size: 12px;
  padding: 10px 20px;
  min-height: 44px;
}

/* Icon only */
.pixel-btn--icon-only {
  padding: 6px;
  aspect-ratio: 1;
}

.pixel-btn--icon-only.pixel-btn--sm {
  padding: 4px;
  min-width: 24px;
}

.pixel-btn--icon-only.pixel-btn--md {
  padding: 6px;
  min-width: 32px;
}

.pixel-btn--icon-only.pixel-btn--lg {
  padding: 10px;
  min-width: 44px;
}

/* States */
.pixel-btn--disabled,
.pixel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.3);
}

.pixel-btn--loading {
  cursor: wait;
}

.pixel-btn__loader {
  animation: blink 0.5s infinite;
}

.pixel-btn__icon {
  font-style: normal;
  line-height: 1;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
