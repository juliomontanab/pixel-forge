<script setup>
/**
 * EditorHeader.vue
 *
 * Top header of the scene editor with:
 * - Back button and project name
 * - Scene tabs
 * - Undo/Redo buttons
 * - Save status
 * - Action buttons (Save, Export, Import, AI, Map, Play)
 */

import { computed } from 'vue'

const props = defineProps({
  projectName: {
    type: String,
    default: 'Untitled Project'
  },
  scenes: {
    type: Array,
    default: () => []
  },
  currentSceneId: {
    type: [String, Number],
    default: null
  },
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  },
  saveStatus: {
    type: String,
    default: 'saved',
    validator: (v) => ['saved', 'saving', 'unsaved'].includes(v)
  },
  lastSaved: {
    type: String,
    default: 'Never'
  }
})

const emit = defineEmits([
  'update:projectName',
  'back',
  'switchScene',
  'newScene',
  'renameScene',
  'undo',
  'redo',
  'save',
  'export',
  'import',
  'openAi',
  'openMap',
  'play'
])

// Two-way binding for project name
const localProjectName = computed({
  get: () => props.projectName,
  set: (val) => emit('update:projectName', val)
})

// Save status display
const saveStatusText = computed(() => {
  switch (props.saveStatus) {
    case 'saving': return 'Saving...'
    case 'unsaved': return 'Unsaved'
    default: return props.lastSaved
  }
})
</script>

<template>
  <header class="editor-header">
    <!-- Left: Back + Project Name -->
    <div class="header-left">
      <button class="back-btn" @click="$emit('back')">
        <span class="back-icon">&larr;</span>
        <span class="back-text">BACK</span>
      </button>
      <div class="project-info">
        <input
          v-model="localProjectName"
          class="project-name-input"
          type="text"
          placeholder="Project Name"
        />
      </div>
    </div>

    <!-- Center: Scene Tabs -->
    <div class="header-center">
      <div class="scene-tabs">
        <button
          v-for="scene in scenes"
          :key="scene.id"
          class="scene-tab"
          :class="{ active: scene.id === currentSceneId }"
          @click="$emit('switchScene', scene.id)"
          @dblclick="$emit('renameScene', scene.id)"
          :title="scene.name"
        >
          {{ scene.name }}
        </button>
        <button
          class="scene-tab add-scene-tab"
          @click="$emit('newScene')"
          title="New Scene"
        >
          +
        </button>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="header-right">
      <!-- Undo/Redo -->
      <button
        class="header-btn undo-btn"
        @click="$emit('undo')"
        :disabled="!canUndo"
        title="Undo (Ctrl+Z)"
      >
        &larrhk;
      </button>
      <button
        class="header-btn redo-btn"
        @click="$emit('redo')"
        :disabled="!canRedo"
        title="Redo (Ctrl+Shift+Z)"
      >
        &rarrhk;
      </button>

      <span class="header-separator">|</span>

      <!-- Save Status -->
      <div class="save-status" :class="saveStatus" :title="'Last saved: ' + lastSaved">
        <span class="save-indicator"></span>
        <span class="save-text">{{ saveStatusText }}</span>
      </div>

      <!-- Action Buttons -->
      <button class="header-btn" @click="$emit('save')" title="Save">
        <span class="btn-icon">&#128190;</span>
      </button>
      <button class="header-btn" @click="$emit('export')" title="Export Project">
        <span class="btn-icon">&#128230;</span>
      </button>
      <button class="header-btn" @click="$emit('import')" title="Import Project">
        <span class="btn-icon">&#128194;</span>
      </button>

      <span class="header-separator">|</span>

      <!-- Special Actions -->
      <button class="header-btn ai-btn" @click="$emit('openAi')" title="AI Assistant">
        <span class="btn-icon">&#129302;</span>
        <span class="btn-label">AI</span>
      </button>
      <button class="header-btn map-btn" @click="$emit('openMap')" title="Scene Map">
        <span class="btn-icon">&#128506;</span>
        <span class="btn-label">MAP</span>
      </button>
      <button class="header-btn play-btn" @click="$emit('play')" title="Play Mode">
        <span class="btn-icon">&#9654;&#65039;</span>
        <span class="btn-label">PLAY</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-card, #1e1e3f);
  border-bottom: 2px solid var(--border-color, #333355);
  min-height: 50px;
  gap: 16px;
}

/* Left Section */
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.back-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  background: transparent;
  color: var(--text-muted, #888);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  transition: color 0.15s;
}

.back-btn:hover {
  color: var(--accent, #00d4ff);
}

.project-name-input {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  background: transparent;
  color: var(--primary, #c9a227);
  border: none;
  border-bottom: 2px solid transparent;
  outline: none;
  padding: 4px 8px;
  min-width: 150px;
  max-width: 250px;
  transition: border-color 0.15s;
}

.project-name-input:hover,
.project-name-input:focus {
  border-bottom-color: var(--primary, #c9a227);
}

/* Center Section - Scene Tabs */
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
}

.scene-tabs {
  display: flex;
  gap: 2px;
  background: var(--bg-dark, #0f0f23);
  padding: 4px;
  border-radius: 4px;
  max-width: 100%;
  overflow-x: auto;
}

.scene-tabs::-webkit-scrollbar {
  height: 4px;
}

.scene-tabs::-webkit-scrollbar-thumb {
  background: var(--border-color, #333355);
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
}

.scene-tab:hover {
  background: var(--bg-medium, #1a1a2e);
  color: var(--text-primary, #e0e0e0);
}

.scene-tab.active {
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
}

.add-scene-tab {
  font-size: 12px;
  padding: 4px 10px;
  color: var(--success, #00ff88);
}

.add-scene-tab:hover {
  background: var(--success, #00ff88);
  color: var(--bg-dark, #0f0f23);
}

/* Right Section */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.header-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  background: transparent;
  color: var(--text-primary, #e0e0e0);
  border: 2px solid transparent;
  padding: 6px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
  border-radius: 4px;
}

.header-btn:hover:not(:disabled) {
  background: var(--bg-medium, #1a1a2e);
  border-color: var(--border-color, #333355);
}

.header-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.header-btn .btn-icon {
  font-size: 14px;
  line-height: 1;
}

.header-btn .btn-label {
  font-size: 8px;
}

/* Special button styles */
.play-btn:hover {
  background: var(--success, #00ff88);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--success, #00ff88);
}

.ai-btn:hover {
  background: var(--primary, #c9a227);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--primary, #c9a227);
}

.map-btn:hover {
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--accent, #00d4ff);
}

.header-separator {
  color: var(--border-color, #333355);
  user-select: none;
}

/* Save Status */
.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #888);
  padding: 4px 8px;
  background: var(--bg-dark, #0f0f23);
  border-radius: 4px;
}

.save-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success, #00ff88);
}

.save-status.saving .save-indicator {
  background: var(--warning, #ffaa00);
  animation: pulse 0.5s infinite;
}

.save-status.unsaved .save-indicator {
  background: var(--error, #ff4757);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Responsive */
@media (max-width: 1200px) {
  .header-btn .btn-label {
    display: none;
  }

  .project-name-input {
    max-width: 150px;
  }
}

@media (max-width: 900px) {
  .back-text {
    display: none;
  }

  .save-text {
    display: none;
  }
}
</style>
