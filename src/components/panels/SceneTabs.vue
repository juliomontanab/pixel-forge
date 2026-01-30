<script setup>
/**
 * SceneTabs.vue
 *
 * Scene navigation tabs with:
 * - Scene list with active indicator
 * - Add new scene button
 * - Scene actions (rename, duplicate, delete)
 */

const props = defineProps({
  scenes: {
    type: Array,
    default: () => []
  },
  currentSceneId: {
    type: [String, Number],
    default: null
  },
  canDelete: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'switch',
  'new',
  'rename',
  'duplicate',
  'delete'
])
</script>

<template>
  <div class="scene-tabs-container">
    <!-- Scene Tabs -->
    <div class="scene-tabs">
      <button
        v-for="scene in scenes"
        :key="scene.id"
        class="scene-tab"
        :class="{ active: scene.id === currentSceneId }"
        @click="$emit('switch', scene.id)"
        @dblclick="$emit('rename', scene.id)"
        :title="`${scene.name} (double-click to rename)`"
      >
        <span class="tab-name">{{ scene.name }}</span>
      </button>

      <!-- Add Scene Button -->
      <button
        class="scene-tab add-tab"
        @click="$emit('new')"
        title="New Scene"
      >
        <span class="add-icon">+</span>
      </button>
    </div>

    <!-- Scene Actions (shown when scene is selected) -->
    <div v-if="currentSceneId" class="scene-actions">
      <button
        class="action-btn"
        @click="$emit('rename', currentSceneId)"
        title="Rename Scene"
      >
        &#9998;
      </button>
      <button
        class="action-btn"
        @click="$emit('duplicate', currentSceneId)"
        title="Duplicate Scene"
      >
        &#128203;
      </button>
      <button
        class="action-btn danger"
        @click="$emit('delete', currentSceneId)"
        :disabled="!canDelete"
        title="Delete Scene"
      >
        &#128465;
      </button>
    </div>
  </div>
</template>

<style scoped>
.scene-tabs-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: var(--bg-medium, #1a1a2e);
  border-bottom: 2px solid var(--border-color, #333355);
}

.scene-tabs {
  display: flex;
  gap: 2px;
  background: var(--bg-dark, #0f0f23);
  padding: 4px;
  border-radius: 4px;
  overflow-x: auto;
  flex: 1;
}

.scene-tabs::-webkit-scrollbar {
  height: 4px;
}

.scene-tabs::-webkit-scrollbar-thumb {
  background: var(--border-color, #333355);
  border-radius: 2px;
}

.scene-tab {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: transparent;
  color: var(--text-muted, #888);
  border: none;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  border-radius: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.scene-tab:hover {
  background: var(--bg-card, #1e1e3f);
  color: var(--text-primary, #e0e0e0);
}

.scene-tab.active {
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
}

.tab-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Add Scene Tab */
.add-tab {
  font-size: 14px;
  padding: 4px 10px;
  color: var(--success, #00ff88);
}

.add-tab:hover {
  background: var(--success, #00ff88);
  color: var(--bg-dark, #0f0f23);
}

/* Scene Actions */
.scene-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  font-size: 12px;
  background: transparent;
  color: var(--text-muted, #888);
  border: 2px solid transparent;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.action-btn:hover:not(:disabled) {
  background: var(--bg-card, #1e1e3f);
  border-color: var(--border-color, #333355);
  color: var(--text-primary, #e0e0e0);
}

.action-btn.danger:hover:not(:disabled) {
  background: var(--error, #ff4757);
  border-color: var(--error, #ff4757);
  color: white;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
