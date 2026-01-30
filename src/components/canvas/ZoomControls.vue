<script setup>
/**
 * ZoomControls.vue
 *
 * Zoom control buttons for the canvas editor.
 * Includes zoom in/out, fit, and grid toggle.
 */

const props = defineProps({
  zoom: {
    type: Number,
    default: 1
  },
  showGrid: {
    type: Boolean,
    default: true
  },
  minZoom: {
    type: Number,
    default: 0.1
  },
  maxZoom: {
    type: Number,
    default: 2
  },
  zoomStep: {
    type: Number,
    default: 0.1
  },
  fitZoom: {
    type: Number,
    default: 0.5
  }
})

const emit = defineEmits(['update:zoom', 'update:showGrid'])

// Zoom in
const zoomIn = () => {
  const newZoom = Math.min(props.maxZoom, props.zoom + props.zoomStep)
  emit('update:zoom', newZoom)
}

// Zoom out
const zoomOut = () => {
  const newZoom = Math.max(props.minZoom, props.zoom - props.zoomStep)
  emit('update:zoom', newZoom)
}

// Fit to screen
const fitToScreen = () => {
  emit('update:zoom', props.fitZoom)
}

// Toggle grid
const toggleGrid = () => {
  emit('update:showGrid', !props.showGrid)
}

// Zoom percentage display
const zoomPercent = Math.round(props.zoom * 100)
</script>

<template>
  <div class="zoom-controls">
    <button class="zoom-btn" @click="zoomOut" title="Zoom out">-</button>
    <span class="zoom-level pixel-font-sm">{{ Math.round(zoom * 100) }}%</span>
    <button class="zoom-btn" @click="zoomIn" title="Zoom in">+</button>
    <button class="zoom-btn fit-btn" @click="fitToScreen" title="Fit to screen">FIT</button>
    <button
      class="zoom-btn grid-btn"
      :class="{ active: showGrid }"
      @click="toggleGrid"
      title="Toggle grid"
    >▦</button>
  </div>
</template>

<style scoped>
.zoom-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-card, #1e1e3f);
  padding: 8px;
  border-radius: 4px;
  border: 2px solid var(--border-color, #333355);
  z-index: 50;
}

.zoom-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  background: var(--bg-dark, #0f0f23);
  color: var(--text-primary, #e0e0e0);
  border: 2px solid var(--border-color, #333355);
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 2px;
}

.zoom-btn:hover {
  background: var(--bg-medium, #1a1a2e);
  border-color: var(--accent, #00d4ff);
  color: var(--accent, #00d4ff);
}

.zoom-btn:active {
  transform: scale(0.95);
}

.zoom-level {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  min-width: 50px;
  text-align: center;
}

.fit-btn {
  font-size: 8px;
  padding: 6px 8px;
}

.grid-btn {
  font-size: 12px;
  padding: 4px 8px;
}

.grid-btn.active {
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--accent, #00d4ff);
}
</style>
