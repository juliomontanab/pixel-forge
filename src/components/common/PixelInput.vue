<script setup>
/**
 * PixelInput.vue
 *
 * Styled input component with pixel art aesthetic.
 * Supports text, number, and password types.
 */

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'number', 'password', 'email', 'search'].includes(v)
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  label: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  min: {
    type: Number,
    default: undefined
  },
  max: {
    type: Number,
    default: undefined
  },
  step: {
    type: Number,
    default: undefined
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus', 'enter'])

const handleInput = (event) => {
  const value = props.type === 'number'
    ? (event.target.value === '' ? '' : Number(event.target.value))
    : event.target.value
  emit('update:modelValue', value)
}

const handleBlur = (event) => {
  emit('blur', event)
}

const handleFocus = (event) => {
  emit('focus', event)
}

const handleKeydown = (event) => {
  if (event.key === 'Enter') {
    emit('enter', event)
  }
}
</script>

<template>
  <div
    class="pixel-input-wrapper"
    :class="[
      `pixel-input-wrapper--${size}`,
      { 'pixel-input-wrapper--error': error },
      { 'pixel-input-wrapper--disabled': disabled }
    ]"
  >
    <label v-if="label" class="pixel-input-label">{{ label }}</label>
    <input
      class="pixel-input"
      :class="[`pixel-input--${size}`]"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :min="min"
      :max="max"
      :step="step"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
      @keydown="handleKeydown"
    />
    <span v-if="error" class="pixel-input-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.pixel-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pixel-input-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  text-transform: uppercase;
}

.pixel-input {
  font-family: 'Press Start 2P', monospace;
  background: var(--bg-dark, #0f0f23);
  color: var(--text-primary, #e0e0e0);
  border: 2px solid var(--border-color, #333355);
  outline: none;
  transition: all 0.15s ease;

  /* Pixel inset effect */
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.3);
}

.pixel-input:focus {
  border-color: var(--accent, #00d4ff);
  box-shadow:
    inset 2px 2px 0 rgba(0, 0, 0, 0.3),
    0 0 8px rgba(0, 212, 255, 0.3);
}

.pixel-input::placeholder {
  color: var(--text-muted, #666);
  opacity: 0.7;
}

.pixel-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-medium, #1a1a2e);
}

/* Sizes */
.pixel-input--sm {
  font-size: 8px;
  padding: 4px 8px;
  min-height: 24px;
}

.pixel-input--md {
  font-size: 10px;
  padding: 6px 10px;
  min-height: 32px;
}

.pixel-input--lg {
  font-size: 12px;
  padding: 10px 14px;
  min-height: 44px;
}

/* Error state */
.pixel-input-wrapper--error .pixel-input {
  border-color: var(--error, #ff4757);
}

.pixel-input-wrapper--error .pixel-input:focus {
  box-shadow:
    inset 2px 2px 0 rgba(0, 0, 0, 0.3),
    0 0 8px rgba(255, 71, 87, 0.3);
}

.pixel-input-error {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--error, #ff4757);
}

/* Remove spinner from number inputs */
.pixel-input[type="number"]::-webkit-inner-spin-button,
.pixel-input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.pixel-input[type="number"] {
  -moz-appearance: textfield;
}
</style>
