<script setup>
/**
 * SceneActionsBar.vue
 *
 * Bar showing current scene name and quick actions.
 */

const props = defineProps({
  sceneName: {
    type: String,
    default: 'Scene'
  },
  canDelete: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['rename', 'duplicate', 'delete'])
</script>

<template>
  <div class="scene-actions-bar">
    <span class="scene-name-label">Scene: <strong>{{ sceneName }}</strong></span>
    <div class="scene-actions">
      <button class="scene-action-btn" @click="$emit('rename')" title="Rename Scene">&#9998;</button>
      <button class="scene-action-btn" @click="$emit('duplicate')" title="Duplicate Scene">&#128203;</button>
      <button
        class="scene-action-btn danger"
        @click="$emit('delete')"
        :disabled="!canDelete"
        title="Delete Scene"
      >&#128465;</button>
    </div>
  </div>
</template>

<style scoped>
.scene-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: var(--bg-medium, #1a1a2e);
  border-bottom: 2px solid var(--border-color, #333355);
}

.scene-name-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #888);
}

.scene-name-label strong {
  color: var(--primary, #c9a227);
}

.scene-actions {
  display: flex;
  gap: 4px;
}

.scene-action-btn {
  font-size: 14px;
  background: transparent;
  color: var(--text-muted, #888);
  border: 2px solid transparent;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.scene-action-btn:hover:not(:disabled) {
  background: var(--bg-card, #1e1e3f);
  border-color: var(--border-color, #333355);
  color: var(--text-primary, #e0e0e0);
}

.scene-action-btn.danger:hover:not(:disabled) {
  background: var(--error, #ff4757);
  border-color: var(--error, #ff4757);
  color: white;
}

.scene-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
