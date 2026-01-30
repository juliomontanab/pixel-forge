<script setup>
/**
 * CanvasGrid.vue
 *
 * Grid overlay component for the canvas.
 * Shows a grid pattern with center lines.
 */

import { computed } from 'vue'

const props = defineProps({
  // Canvas dimensions
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  // Zoom level
  zoom: {
    type: Number,
    default: 1
  },
  // Grid cell size (in canvas pixels)
  gridSize: {
    type: Number,
    default: 32
  },
  // Grid color
  color: {
    type: String,
    default: 'rgba(255, 215, 0, 0.1)'
  },
  // Center line color
  centerColor: {
    type: String,
    default: 'rgba(255, 215, 0, 0.4)'
  }
})

// Computed: scaled grid size
const scaledGridSize = computed(() => props.gridSize * props.zoom + 'px')

// Computed: center positions
const centerX = computed(() => (props.width / 2) * props.zoom + 'px')
const centerY = computed(() => (props.height / 2) * props.zoom + 'px')

// Computed: CSS custom properties
const cssVars = computed(() => ({
  '--grid-size': scaledGridSize.value,
  '--center-x': centerX.value,
  '--center-y': centerY.value,
  '--grid-color': props.color,
  '--center-color': props.centerColor
}))
</script>

<template>
  <div class="canvas-grid" :style="cssVars">
    <div class="grid-center-h"></div>
    <div class="grid-center-v"></div>
  </div>
</template>

<style scoped>
.canvas-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
}

.grid-center-h {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--center-y);
  height: 2px;
  background: var(--center-color);
  box-shadow: 0 0 4px var(--center-color);
}

.grid-center-v {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--center-x);
  width: 2px;
  background: var(--center-color);
  box-shadow: 0 0 4px var(--center-color);
}
</style>
