<script setup>
/**
 * AiAssistantModal.vue
 * AI-powered script generator modal for creating game content from markdown scripts.
 */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  claudeIsConnected: { type: Boolean, default: false },
  aiStatus: { type: String, default: 'idle' }, // idle, connecting, generating, complete, error
  aiStatusMessage: { type: String, default: '' },
  aiScript: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'update:aiScript', 'generate', 'load-sample'])

const close = () => {
  emit('update:modelValue', false)
}

const updateScript = (event) => {
  emit('update:aiScript', event.target.value)
}

const handleGenerate = () => {
  emit('generate')
}

const loadSample = () => {
  emit('load-sample')
}

const isGenerating = computed(() => props.aiStatus === 'generating' || props.aiStatus === 'connecting')
const canGenerate = computed(() => !isGenerating.value && props.aiScript.trim().length > 0)

import { computed } from 'vue'
</script>

<template>
  <div v-if="modelValue" class="modal-overlay ai-panel-overlay" @click.self="close">
    <div class="modal-content ai-panel-modal">
      <header class="modal-header ai-header">
        <div class="ai-header-left">
          <span class="ai-icon">🤖</span>
          <h3>AI Assistant</h3>
        </div>
        <div class="ai-header-status">
          <span class="ai-connection-status" :class="{ connected: claudeIsConnected }">
            {{ claudeIsConnected ? '● Connected' : '○ Disconnected' }}
          </span>
        </div>
        <button class="modal-close-btn" @click="close">✕</button>
      </header>

      <div class="modal-body ai-body">
        <!-- Status Bar -->
        <div class="ai-status-bar" :class="aiStatus">
          <span class="ai-status-icon">
            <template v-if="aiStatus === 'idle'">💡</template>
            <template v-else-if="aiStatus === 'connecting'">🔄</template>
            <template v-else-if="aiStatus === 'generating'">⚙️</template>
            <template v-else-if="aiStatus === 'complete'">✅</template>
            <template v-else-if="aiStatus === 'error'">❌</template>
          </span>
          <span class="ai-status-message">{{ aiStatusMessage || 'Escribe un script y presiona Generar' }}</span>
        </div>

        <!-- Script Editor -->
        <div class="ai-script-section">
          <div class="ai-script-header">
            <label class="ai-label">Script del Juego (Markdown)</label>
            <button class="ai-sample-btn" @click="loadSample" title="Load sample script">
              📝 Cargar Ejemplo
            </button>
          </div>
          <textarea
            :value="aiScript"
            @input="updateScript"
            class="ai-script-textarea"
            placeholder="# MI JUEGO

## PERSONAJES
### PROTAGONISTA
- Rol: Protagonista
- Descripción: ...

## ESCENAS
### Escena Inicial
Descripción: ...
Elementos:
- Puerta (exit) → Siguiente escena

## PUZZLES
..."
            :disabled="isGenerating"
          ></textarea>
        </div>

        <!-- Script Tips -->
        <div class="ai-tips">
          <details>
            <summary>📖 Guía de formato del script</summary>
            <div class="ai-tips-content">
              <p><strong># TÍTULO</strong> - Nombre del juego</p>
              <p><strong>## PERSONAJES</strong> - Define actores con rol, descripción y ubicación</p>
              <p><strong>## ITEMS</strong> - Objetos recogibles con icono y descripción</p>
              <p><strong>## ESCENAS</strong> - Lugares con elementos, hotspots y exits</p>
              <p><strong>## DIÁLOGOS</strong> - Conversaciones con opciones</p>
              <p><strong>## PUZZLES</strong> - Acertijos con condiciones y resultados</p>
            </div>
          </details>
        </div>
      </div>

      <footer class="modal-footer ai-footer">
        <div class="ai-footer-left">
          <span class="ai-char-count">{{ aiScript.length }} caracteres</span>
        </div>
        <div class="ai-footer-right">
          <button class="modal-btn secondary" @click="close">Cancelar</button>
          <button
            class="modal-btn ai-generate-btn"
            @click="handleGenerate"
            :disabled="!canGenerate"
          >
            <template v-if="isGenerating">
              <span class="generating-spinner">⚙️</span> Generando...
            </template>
            <template v-else>
              🚀 Generar Proyecto
            </template>
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.ai-panel-overlay { backdrop-filter: blur(4px); }
.modal-content { background: var(--bg-card, #1e1e3f); border: 2px solid var(--primary, #c9a227); border-radius: 8px; max-width: 800px; width: 90%; max-height: 90vh; display: flex; flex-direction: column; }
.ai-panel-modal { min-height: 600px; }
.modal-header { display: flex; align-items: center; padding: 16px; border-bottom: 1px solid var(--border-color, #333); }
.ai-header { gap: 12px; }
.ai-header-left { display: flex; align-items: center; gap: 8px; flex: 1; }
.ai-icon { font-size: 24px; }
.ai-header-left h3 { margin: 0; font-size: 14px; font-family: 'Press Start 2P', monospace; color: var(--text-primary, #fff); }
.ai-header-status { margin-right: 16px; }
.ai-connection-status { font-size: 10px; color: var(--error, #ff4757); }
.ai-connection-status.connected { color: var(--success, #00ff88); }
.modal-close-btn { background: none; border: none; color: var(--text-muted, #888); font-size: 20px; cursor: pointer; padding: 4px 8px; }
.modal-close-btn:hover { color: var(--text-primary, #fff); }
.modal-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.ai-body { background: var(--bg-medium, #1a1a2e); }
.ai-status-bar { display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--bg-dark, #0f0f23); border-radius: 4px; }
.ai-status-bar.generating { background: var(--primary, #c9a227); color: var(--bg-dark, #0f0f23); }
.ai-status-bar.complete { background: var(--success, #00ff88); color: var(--bg-dark, #0f0f23); }
.ai-status-bar.error { background: var(--error, #ff4757); color: white; }
.ai-status-icon { font-size: 18px; }
.ai-status-message { font-size: 11px; font-family: 'Press Start 2P', monospace; }
.ai-script-section { flex: 1; display: flex; flex-direction: column; }
.ai-script-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ai-label { font-size: 10px; color: var(--text-muted, #888); font-family: 'Press Start 2P', monospace; }
.ai-sample-btn { background: var(--bg-card, #1e1e3f); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); padding: 6px 12px; font-size: 10px; cursor: pointer; border-radius: 4px; }
.ai-sample-btn:hover { border-color: var(--primary, #c9a227); }
.ai-script-textarea { flex: 1; min-height: 300px; padding: 12px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 12px; font-family: monospace; border-radius: 4px; resize: none; }
.ai-script-textarea:disabled { opacity: 0.6; }
.ai-tips { background: var(--bg-dark, #0f0f23); border-radius: 4px; }
.ai-tips summary { padding: 8px 12px; cursor: pointer; font-size: 10px; color: var(--text-muted, #888); }
.ai-tips-content { padding: 12px; font-size: 10px; color: var(--text-primary, #fff); line-height: 1.8; }
.ai-tips-content p { margin: 4px 0; }
.modal-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid var(--border-color, #333); }
.ai-footer-left { font-size: 10px; color: var(--text-muted, #888); }
.ai-char-count { font-family: monospace; }
.ai-footer-right { display: flex; gap: 12px; }
.modal-btn { padding: 10px 20px; font-size: 10px; font-family: 'Press Start 2P', monospace; border: none; border-radius: 4px; cursor: pointer; }
.modal-btn.secondary { background: var(--bg-dark, #0f0f23); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #333); }
.modal-btn.secondary:hover { border-color: var(--text-muted, #888); }
.ai-generate-btn { background: var(--accent, #00d4ff); color: var(--bg-dark, #0f0f23); }
.ai-generate-btn:hover:not(:disabled) { opacity: 0.9; }
.ai-generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.generating-spinner { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
