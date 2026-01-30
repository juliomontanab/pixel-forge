<script setup>
/**
 * EditorStatusBar.vue
 *
 * Bottom status bar showing:
 * - Current scene info
 * - Selected element info
 * - Position coordinates
 * - Dragging indicator
 * - History status
 * - Zoom level
 */

import { computed } from 'vue'

const props = defineProps({
  sceneName: {
    type: String,
    default: 'Scene'
  },
  sceneWidth: {
    type: Number,
    default: 1920
  },
  sceneHeight: {
    type: Number,
    default: 1200
  },
  selectedElement: {
    type: Object,
    default: null
  },
  selectedType: {
    type: String,
    default: null
  },
  selectedCount: {
    type: Number,
    default: 0
  },
  isDragging: {
    type: Boolean,
    default: false
  },
  isResizing: {
    type: Boolean,
    default: false
  },
  isRotating: {
    type: Boolean,
    default: false
  },
  historyIndex: {
    type: Number,
    default: 0
  },
  historyLength: {
    type: Number,
    default: 0
  },
  zoom: {
    type: Number,
    default: 1
  }
})

// Selected element display name
const selectedName = computed(() => {
  if (!props.selectedElement) return ''
  return props.selectedElement.name || `${props.selectedType} #${props.selectedElement.id}`
})

// Position display for selected element
const positionDisplay = computed(() => {
  if (!props.selectedElement) return null

  // Handle walkbox (has points array)
  if (props.selectedElement.points && props.selectedElement.points.length > 0) {
    const p = props.selectedElement.points[0]
    return `${Math.round(p.x)}, ${Math.round(p.y)}`
  }

  // Handle regular elements with x, y
  if (props.selectedElement.x !== undefined && props.selectedElement.y !== undefined) {
    return `${Math.round(props.selectedElement.x)}, ${Math.round(props.selectedElement.y)}`
  }

  return null
})

// Size display for selected element
const sizeDisplay = computed(() => {
  if (!props.selectedElement) return null

  if (props.selectedElement.w !== undefined && props.selectedElement.h !== undefined) {
    return `${Math.round(props.selectedElement.w)} x ${Math.round(props.selectedElement.h)}`
  }

  return null
})

// Zoom percentage
const zoomPercent = computed(() => Math.round(props.zoom * 100))

// Activity indicator
const activityIndicator = computed(() => {
  if (props.isDragging) return { icon: '&#128260;', text: 'Dragging...' }
  if (props.isResizing) return { icon: '&#8596;', text: 'Resizing...' }
  if (props.isRotating) return { icon: '&#8635;', text: 'Rotating...' }
  return null
})
</script>

<template>
  <footer class="editor-status-bar">
    <!-- Scene Info -->
    <span class="status-item scene-info">
      <span class="status-label">Scene:</span>
      <span class="status-value">{{ sceneName }}</span>
      <span class="status-dim">({{ sceneWidth }}x{{ sceneHeight }})</span>
    </span>

    <!-- Separator -->
    <span class="status-separator">|</span>

    <!-- Selected Element Info -->
    <template v-if="selectedCount > 0">
      <span class="status-item selected-info">
        <span class="status-label">Selected:</span>
        <span class="status-value">{{ selectedName }}</span>
        <span v-if="selectedCount > 1" class="status-badge">+{{ selectedCount - 1 }}</span>
      </span>

      <!-- Position -->
      <span v-if="positionDisplay" class="status-item position-info">
        <span class="status-label">Pos:</span>
        <span class="status-value">{{ positionDisplay }}</span>
      </span>

      <!-- Size -->
      <span v-if="sizeDisplay" class="status-item size-info">
        <span class="status-label">Size:</span>
        <span class="status-value">{{ sizeDisplay }}</span>
      </span>
    </template>

    <!-- No selection hint -->
    <span v-else class="status-item hint">
      Click an element to select &bull; Drag to move
    </span>

    <!-- Activity Indicator -->
    <span v-if="activityIndicator" class="status-item activity-indicator">
      <span class="activity-icon" v-html="activityIndicator.icon"></span>
      <span class="activity-text">{{ activityIndicator.text }}</span>
    </span>

    <!-- Spacer -->
    <span class="status-spacer"></span>

    <!-- History -->
    <span class="status-item history-info">
      <span class="status-label">History:</span>
      <span class="status-value">{{ historyIndex + 1 }}/{{ historyLength }}</span>
    </span>

    <!-- Separator -->
    <span class="status-separator">|</span>

    <!-- Zoom -->
    <span class="status-item zoom-info">
      <span class="status-label">Zoom:</span>
      <span class="status-value">{{ zoomPercent }}%</span>
    </span>
  </footer>
</template>

<style scoped>
.editor-status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 16px;
  background: var(--bg-card, #1e1e3f);
  border-top: 2px solid var(--border-color, #333355);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  min-height: 28px;
  overflow-x: auto;
}

.editor-status-bar::-webkit-scrollbar {
  height: 4px;
}

.editor-status-bar::-webkit-scrollbar-thumb {
  background: var(--border-color, #333355);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.status-label {
  color: var(--text-muted, #666);
}

.status-value {
  color: var(--text-primary, #e0e0e0);
}

.status-dim {
  color: var(--text-muted, #555);
  font-size: 7px;
}

.status-badge {
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 7px;
}

.status-separator {
  color: var(--border-color, #333355);
}

.status-spacer {
  flex: 1;
}

.hint {
  color: var(--text-muted, #666);
  font-style: italic;
}

/* Activity indicator */
.activity-indicator {
  color: var(--warning, #ffaa00);
  animation: pulse 0.5s infinite;
}

.activity-icon {
  font-size: 10px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Scene info */
.scene-info .status-value {
  color: var(--primary, #c9a227);
}

/* Position info */
.position-info .status-value {
  color: var(--accent, #00d4ff);
  font-family: monospace;
}

/* Size info */
.size-info .status-value {
  color: var(--success, #00ff88);
  font-family: monospace;
}

/* Zoom info */
.zoom-info .status-value {
  color: var(--primary, #c9a227);
}

/* History low indicator */
.history-info .status-value {
  color: var(--text-primary, #e0e0e0);
}
</style>
