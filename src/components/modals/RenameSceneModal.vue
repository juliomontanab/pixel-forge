<script setup>
/**
 * RenameSceneModal.vue
 * Simple modal for renaming a scene.
 */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sceneName: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const localName = ref(props.sceneName)

watch(() => props.sceneName, (newVal) => {
  localName.value = newVal
})

watch(() => props.modelValue, (visible) => {
  if (visible) {
    localName.value = props.sceneName
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const confirm = () => {
  emit('confirm', localName.value)
  close()
}

import { ref, watch } from 'vue'
</script>

<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="close">
    <div class="modal-content small-modal">
      <header class="modal-header">
        <h3>Rename Scene</h3>
        <button class="modal-close-btn" @click="close">✕</button>
      </header>
      <div class="modal-body">
        <input
          v-model="localName"
          type="text"
          class="property-input"
          placeholder="Scene name"
          @keyup.enter="confirm"
          autofocus
        />
      </div>
      <footer class="modal-footer">
        <button class="modal-btn secondary" @click="close">Cancel</button>
        <button class="modal-btn" @click="confirm">Rename</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--bg-card, #1e1e3f); border: 2px solid var(--primary, #c9a227); border-radius: 8px; }
.small-modal { width: 320px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-color, #333); }
.modal-header h3 { margin: 0; font-size: 12px; font-family: 'Press Start 2P', monospace; color: var(--text-primary, #fff); }
.modal-close-btn { background: none; border: none; color: var(--text-muted, #888); font-size: 18px; cursor: pointer; padding: 4px; }
.modal-close-btn:hover { color: var(--text-primary, #fff); }
.modal-body { padding: 16px; }
.property-input { width: 100%; padding: 8px 12px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 12px; border-radius: 4px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border-color, #333); }
.modal-btn { padding: 8px 16px; font-size: 10px; font-family: 'Press Start 2P', monospace; border: none; border-radius: 4px; cursor: pointer; background: var(--primary, #c9a227); color: var(--bg-dark, #0f0f23); }
.modal-btn.secondary { background: var(--bg-dark, #0f0f23); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #333); }
.modal-btn:hover { opacity: 0.9; }
</style>
