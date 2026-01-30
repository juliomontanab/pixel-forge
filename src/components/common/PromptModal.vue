<script setup>
/**
 * PromptModal.vue
 *
 * Simple input prompt modal for getting text input from user.
 */

import { ref, watch, nextTick } from 'vue'
import PixelModal from './PixelModal.vue'
import PixelButton from './PixelButton.vue'

const props = defineProps({
  // Modal visibility
  show: {
    type: Boolean,
    default: false
  },
  // Dialog title
  title: {
    type: String,
    default: 'Enter Value'
  },
  // Input label
  label: {
    type: String,
    default: ''
  },
  // Input placeholder
  placeholder: {
    type: String,
    default: ''
  },
  // Initial value
  initialValue: {
    type: String,
    default: ''
  },
  // Submit button text
  submitText: {
    type: String,
    default: 'OK'
  },
  // Cancel button text
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  // Input type
  inputType: {
    type: String,
    default: 'text'
  },
  // Validation function (returns error message or empty string)
  validate: {
    type: Function,
    default: () => ''
  }
})

const emit = defineEmits(['submit', 'cancel', 'update:show'])

// Input value
const inputValue = ref(props.initialValue)
const inputRef = ref(null)
const errorMessage = ref('')

// Reset value when modal opens
watch(() => props.show, (newShow) => {
  if (newShow) {
    inputValue.value = props.initialValue
    errorMessage.value = ''
    // Focus input on next tick
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  }
})

// Handle submit
const handleSubmit = () => {
  const error = props.validate(inputValue.value)
  if (error) {
    errorMessage.value = error
    return
  }

  emit('submit', inputValue.value)
  emit('update:show', false)
}

// Handle cancel
const handleCancel = () => {
  emit('cancel')
  emit('update:show', false)
}

// Handle input keydown
const handleKeyDown = (event) => {
  if (event.key === 'Enter') {
    handleSubmit()
  }
}
</script>

<template>
  <PixelModal
    :show="show"
    :title="title"
    size="small"
    @close="handleCancel"
  >
    <div class="prompt-content">
      <label v-if="label" class="prompt-label">{{ label }}</label>
      <input
        ref="inputRef"
        v-model="inputValue"
        :type="inputType"
        class="prompt-input"
        :placeholder="placeholder"
        @keydown="handleKeyDown"
      />
      <span v-if="errorMessage" class="prompt-error">{{ errorMessage }}</span>
    </div>

    <template #footer>
      <PixelButton
        variant="ghost"
        size="sm"
        @click="handleCancel"
      >
        {{ cancelText }}
      </PixelButton>
      <PixelButton
        variant="primary"
        size="sm"
        @click="handleSubmit"
      >
        {{ submitText }}
      </PixelButton>
    </template>
  </PixelModal>
</template>

<style scoped>
.prompt-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-secondary, #888);
}

.prompt-input {
  width: 100%;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  background: var(--bg-dark, #0f0f23);
  border: 2px solid var(--border-color, #333355);
  color: var(--text-primary, #e0e0e0);
  padding: 10px 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.prompt-input:focus {
  border-color: var(--accent, #00d4ff);
}

.prompt-input::placeholder {
  color: var(--text-muted, #666);
}

.prompt-error {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--error, #ff4757);
}
</style>
