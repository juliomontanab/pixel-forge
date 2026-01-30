<script setup>
/**
 * BackgroundScaleModal.vue
 *
 * Modal for scaling/fitting background image to canvas.
 * Offers cover, contain, and stretch options.
 */

import { ref } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  imageWidth: {
    type: Number,
    default: 0
  },
  imageHeight: {
    type: Number,
    default: 0
  },
  canvasWidth: {
    type: Number,
    default: 1920
  },
  canvasHeight: {
    type: Number,
    default: 1080
  },
  isProcessing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'confirm', 'update:show'])

const scaleMode = ref('cover')

const handleConfirm = () => {
  emit('confirm', scaleMode.value)
}

const handleClose = () => {
  emit('close')
  emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="handleClose">
      <div class="background-scale-modal">
        <h3 class="modal-title">Ajustar Background al Canvas</h3>

        <div class="scale-info">
          <div class="scale-info-row">
            <span class="info-label">Imagen actual:</span>
            <span class="info-value">{{ imageWidth }}x{{ imageHeight }}px</span>
          </div>
          <div class="scale-info-row">
            <span class="info-label">Canvas:</span>
            <span class="info-value">{{ canvasWidth }}x{{ canvasHeight }}px</span>
          </div>
        </div>

        <div class="scale-options">
          <label class="scale-option" :class="{ active: scaleMode === 'cover' }">
            <input type="radio" v-model="scaleMode" value="cover" />
            <div class="option-content">
              <span class="option-icon">&#128444;</span>
              <span class="option-name">Cubrir (Cover)</span>
              <span class="option-desc">Llena todo el canvas, puede recortar bordes</span>
            </div>
          </label>

          <label class="scale-option" :class="{ active: scaleMode === 'contain' }">
            <input type="radio" v-model="scaleMode" value="contain" />
            <div class="option-content">
              <span class="option-icon">&#128230;</span>
              <span class="option-name">Contener (Contain)</span>
              <span class="option-desc">Muestra toda la imagen, puede tener barras negras</span>
            </div>
          </label>

          <label class="scale-option" :class="{ active: scaleMode === 'stretch' }">
            <input type="radio" v-model="scaleMode" value="stretch" />
            <div class="option-content">
              <span class="option-icon">&#8596;</span>
              <span class="option-name">Estirar (Stretch)</span>
              <span class="option-desc">Estira para llenar, puede distorsionar</span>
            </div>
          </label>
        </div>

        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" @click="handleClose">
            Cancelar
          </button>
          <button
            class="modal-btn modal-btn-confirm"
            @click="handleConfirm"
            :disabled="isProcessing"
          >
            {{ isProcessing ? 'Procesando...' : 'Crear imagen ajustada' }}
          </button>
        </div>

        <p class="scale-note">
          Se creara un nuevo asset con las dimensiones del canvas.
          El original no se modificara.
        </p>
      </div>
    </div>
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

.background-scale-modal {
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  padding: 24px;
  width: 400px;
  max-width: 90vw;
}

.modal-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--text-primary, #e0e0e0);
  margin: 0 0 20px 0;
  text-align: center;
}

.scale-info {
  background: var(--bg-dark, #0f0f23);
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.scale-info-row {
  display: flex;
  justify-content: space-between;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  margin: 4px 0;
}

.info-label {
  color: var(--text-muted, #888);
}

.info-value {
  color: var(--text-primary, #e0e0e0);
}

.scale-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.scale-option {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--bg-dark, #0f0f23);
  border: 2px solid var(--border-color, #333355);
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 4px;
}

.scale-option:hover {
  border-color: var(--accent, #00d4ff);
}

.scale-option.active {
  border-color: var(--accent, #00d4ff);
  background: var(--bg-medium, #1a1a2e);
}

.scale-option input[type="radio"] {
  display: none;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-icon {
  font-size: 16px;
}

.option-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--text-primary, #e0e0e0);
}

.option-desc {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #888);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  padding: 10px 16px;
  border: 2px solid var(--border-color, #333355);
  cursor: pointer;
  transition: all 0.15s;
}

.modal-btn-cancel {
  background: transparent;
  color: var(--text-primary, #e0e0e0);
}

.modal-btn-cancel:hover {
  background: var(--bg-medium, #1a1a2e);
}

.modal-btn-confirm {
  background: var(--success, #00ff88);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--success, #00ff88);
}

.modal-btn-confirm:hover:not(:disabled) {
  background: var(--accent, #00d4ff);
  border-color: var(--accent, #00d4ff);
}

.modal-btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scale-note {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #666);
  text-align: center;
  margin-top: 16px;
}
</style>
