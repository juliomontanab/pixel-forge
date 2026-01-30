<script setup>
/**
 * PlayModeOverlay.vue
 *
 * Overlay UI for play mode with:
 * - Exit button
 * - Cutscene controls
 * - Dialog box
 * - Verb bar
 * - Inventory bar
 */

import { computed } from 'vue'

const props = defineProps({
  playModeState: {
    type: Object,
    required: true
  },
  verbs: {
    type: Array,
    default: () => []
  },
  inventoryItems: {
    type: Array,
    default: () => []
  },
  currentMusicName: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'exit',
  'skip-cutscene',
  'advance-dialog',
  'select-verb',
  'select-item',
  'cancel-item'
])

// Get current dialog line
const currentDialogLine = computed(() => {
  if (!props.playModeState.currentDialog) return null
  const lines = props.playModeState.currentDialog.lines || []
  return lines[props.playModeState.dialogLineIndex] || null
})
</script>

<template>
  <div class="play-mode-overlay">
    <!-- Fade Overlay for Transitions -->
    <div
      v-if="playModeState.fadeOverlay > 0"
      class="fade-overlay"
      :style="{ opacity: playModeState.fadeOverlay }"
    ></div>

    <!-- Exit Play Mode Button -->
    <button class="exit-play-btn" @click="$emit('exit')">✕ EXIT PLAY MODE</button>

    <!-- Cutscene Skip Button -->
    <button
      v-if="playModeState.isCutscenePlaying && playModeState.currentCutscene?.skippable"
      class="skip-cutscene-btn"
      @click="$emit('skip-cutscene')"
    >
      SKIP ▶▶
    </button>

    <!-- Cutscene Indicator -->
    <div v-if="playModeState.isCutscenePlaying" class="cutscene-indicator">
      🎬 CUTSCENE
    </div>

    <!-- Dialog Box -->
    <div
      v-if="playModeState.currentDialog && currentDialogLine"
      class="dialog-box"
      @click="$emit('advance-dialog')"
    >
      <div class="dialog-speaker">{{ currentDialogLine.speaker || 'Unknown' }}</div>
      <div class="dialog-text">{{ currentDialogLine.text }}</div>
      <div class="dialog-hint">Click to continue...</div>
    </div>

    <!-- Selected Item Indicator -->
    <div v-if="playModeState.selectedItem" class="selected-item-indicator">
      Using: {{ inventoryItems.find(i => i.id === playModeState.selectedItem)?.name }}
      <button class="cancel-item-btn" @click="$emit('cancel-item')">✕</button>
    </div>

    <!-- Verb Bar -->
    <div class="verb-bar" v-if="!playModeState.isCutscenePlaying">
      <button
        v-for="verb in verbs"
        :key="verb.id"
        class="verb-btn"
        :class="{ active: playModeState.selectedVerb === verb.id }"
        @click="$emit('select-verb', verb.id)"
      >
        {{ verb.icon || '' }} {{ verb.name }}
      </button>
    </div>

    <!-- Inventory Bar -->
    <div class="inventory-bar" v-if="!playModeState.isCutscenePlaying">
      <div class="inventory-label">INVENTORY</div>
      <div class="inventory-slots" v-if="inventoryItems.length > 0">
        <div
          v-for="item in inventoryItems"
          :key="item.id"
          class="inventory-slot"
          :class="{ selected: playModeState.selectedItem === item.id }"
          :title="item.name"
          @click="$emit('select-item', item.id)"
        >
          <div
            v-if="item.iconUrl"
            class="item-icon"
            :style="{ backgroundImage: `url(${item.iconUrl})` }"
          ></div>
          <span v-else class="item-name">{{ item.name.substring(0, 3) }}</span>
        </div>
      </div>
      <div v-else class="inventory-empty">Empty</div>
    </div>

    <!-- Hovered Object Name -->
    <div v-if="playModeState.hoveredObject && !playModeState.isCutscenePlaying" class="hovered-object-name">
      {{ playModeState.selectedItem ? 'Use with: ' : '' }}{{ playModeState.hoveredObject.name }}
    </div>

    <!-- Current Music Indicator -->
    <div v-if="currentMusicName" class="music-indicator">
      🎵 {{ currentMusicName }}
    </div>
  </div>
</template>

<style scoped>
.play-mode-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.play-mode-overlay > * {
  pointer-events: auto;
}

.fade-overlay {
  position: absolute;
  inset: 0;
  background: black;
  pointer-events: none;
  z-index: 200;
}

.exit-play-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  background: var(--error, #ff4757);
  color: white;
  border: 2px solid white;
  padding: 8px 12px;
  cursor: pointer;
  z-index: 150;
  transition: all 0.15s;
}

.exit-play-btn:hover {
  background: white;
  color: var(--error, #ff4757);
}

.skip-cutscene-btn {
  position: absolute;
  bottom: 160px;
  right: 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  background: var(--warning, #ffaa00);
  color: var(--bg-dark, #0f0f23);
  border: 2px solid var(--bg-dark, #0f0f23);
  padding: 8px 12px;
  cursor: pointer;
  z-index: 150;
}

.cutscene-indicator {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--warning, #ffaa00);
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 16px;
  border-radius: 4px;
  z-index: 150;
}

.dialog-box {
  position: absolute;
  bottom: 150px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 600px;
  background: rgba(0, 0, 0, 0.9);
  border: 3px solid var(--primary, #c9a227);
  padding: 16px 20px;
  cursor: pointer;
  z-index: 150;
}

.dialog-speaker {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--primary, #c9a227);
  margin-bottom: 8px;
}

.dialog-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: white;
  line-height: 1.8;
}

.dialog-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  margin-top: 12px;
  text-align: right;
}

.selected-item-indicator {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--success, #00ff88);
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 150;
}

.cancel-item-btn {
  background: transparent;
  color: var(--error, #ff4757);
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
}

.verb-bar {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  max-width: 80%;
  z-index: 150;
}

.verb-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  background: rgba(0, 0, 0, 0.8);
  color: var(--text-primary, #e0e0e0);
  border: 2px solid var(--border-color, #333355);
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.verb-btn:hover {
  background: var(--bg-medium, #1a1a2e);
  border-color: var(--accent, #00d4ff);
}

.verb-btn.active {
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--accent, #00d4ff);
}

.inventory-bar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid var(--border-color, #333355);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 150;
}

.inventory-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
}

.inventory-slots {
  display: flex;
  gap: 4px;
}

.inventory-slot {
  width: 40px;
  height: 40px;
  background: var(--bg-dark, #0f0f23);
  border: 2px solid var(--border-color, #333355);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.inventory-slot:hover {
  border-color: var(--accent, #00d4ff);
}

.inventory-slot.selected {
  border-color: var(--success, #00ff88);
  box-shadow: 0 0 8px var(--success, #00ff88);
}

.inventory-slot .item-icon {
  width: 100%;
  height: 100%;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.inventory-slot .item-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-primary, #e0e0e0);
  text-transform: uppercase;
}

.inventory-empty {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #666);
  font-style: italic;
}

.hovered-object-name {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--primary, #c9a227);
  background: rgba(0, 0, 0, 0.8);
  padding: 6px 12px;
  z-index: 150;
}

.music-indicator {
  position: absolute;
  top: 16px;
  left: 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--success, #00ff88);
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 150;
}
</style>
