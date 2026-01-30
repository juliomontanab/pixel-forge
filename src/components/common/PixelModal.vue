<script setup>
/**
 * PixelModal.vue
 *
 * Reusable modal component with pixel art styling.
 * Provides a standard modal structure with header, body, and footer slots.
 */

import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  // Modal visibility
  show: {
    type: Boolean,
    default: false
  },
  // Modal title
  title: {
    type: String,
    default: ''
  },
  // Size variant
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['small', 'default', 'large', 'full'].includes(v)
  },
  // Close on overlay click
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  // Close on Escape key
  closeOnEscape: {
    type: Boolean,
    default: true
  },
  // Show close button in header
  showCloseButton: {
    type: Boolean,
    default: true
  },
  // Additional class for the modal content
  contentClass: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'update:show'])

// Handle close
const handleClose = () => {
  emit('close')
  emit('update:show', false)
}

// Handle overlay click
const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose()
  }
}

// Handle keyboard events
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && props.closeOnEscape && props.show) {
    handleClose()
  }
}

// Setup keyboard listener
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// Size classes
const sizeClass = {
  small: 'small-modal',
  default: '',
  large: 'large-modal',
  full: 'full-modal'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="modal-overlay"
        @click.self="handleOverlayClick"
      >
        <div
          class="modal-content"
          :class="[sizeClass[size], contentClass]"
        >
          <!-- Header -->
          <header v-if="title || $slots.header || showCloseButton" class="modal-header">
            <slot name="header">
              <h3 v-if="title">{{ title }}</h3>
            </slot>
            <button
              v-if="showCloseButton"
              class="modal-close-btn"
              @click="handleClose"
              title="Close"
            >✕</button>
          </header>

          <!-- Body -->
          <div class="modal-body">
            <slot />
          </div>

          <!-- Footer -->
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card, #1e1e3f);
  border: 4px solid var(--primary, #c9a227);
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 0 20px rgba(201, 162, 39, 0.3),
    inset 0 0 40px rgba(0, 0, 0, 0.3);
}

/* Size variants */
.small-modal {
  max-width: 350px;
}

.large-modal {
  max-width: 800px;
}

.full-modal {
  max-width: 95vw;
  max-height: 90vh;
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 2px solid var(--bg-dark, #0f0f23);
}

.modal-header h3 {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--primary, #c9a227);
  margin: 0;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #666);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.15s ease;
}

.modal-close-btn:hover {
  color: var(--error, #ff4757);
}

/* Body */
.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

/* Footer */
.modal-footer {
  padding: 12px 16px;
  border-top: 2px solid var(--bg-dark, #0f0f23);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(-10px);
}
</style>
