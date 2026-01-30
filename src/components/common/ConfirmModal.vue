<script setup>
/**
 * ConfirmModal.vue
 *
 * Confirmation dialog modal for destructive actions.
 */

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
    default: 'Confirm Action'
  },
  // Dialog message
  message: {
    type: String,
    default: 'Are you sure you want to proceed?'
  },
  // Confirm button text
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  // Cancel button text
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  // Confirm button variant
  confirmVariant: {
    type: String,
    default: 'danger'
  },
  // Is the action processing
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:show'])

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  emit('update:show', false)
}

const handleClose = () => {
  emit('cancel')
  emit('update:show', false)
}
</script>

<template>
  <PixelModal
    :show="show"
    :title="title"
    size="small"
    @close="handleClose"
  >
    <p class="confirm-message">{{ message }}</p>

    <template #footer>
      <PixelButton
        variant="ghost"
        size="sm"
        @click="handleCancel"
        :disabled="loading"
      >
        {{ cancelText }}
      </PixelButton>
      <PixelButton
        :variant="confirmVariant"
        size="sm"
        @click="handleConfirm"
        :disabled="loading"
      >
        {{ loading ? '...' : confirmText }}
      </PixelButton>
    </template>
  </PixelModal>
</template>

<style scoped>
.confirm-message {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-primary, #e0e0e0);
  line-height: 1.6;
  margin: 0;
  text-align: center;
}
</style>
