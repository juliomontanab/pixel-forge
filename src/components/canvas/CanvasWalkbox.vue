<script setup>
/**
 * CanvasWalkbox.vue
 *
 * SVG-based walkbox editor component.
 * Allows polygon editing with vertex manipulation.
 */

import { computed } from 'vue'

const props = defineProps({
  // Walkbox data array
  walkboxes: {
    type: Array,
    default: () => []
  },
  // Zoom level
  zoom: {
    type: Number,
    default: 1
  },
  // Selected elements for highlighting
  selectedElements: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'select',
  'add-vertex',
  'start-vertex-drag',
  'remove-vertex',
  'start-rotate'
])

// Check if walkbox is selected
const isWalkboxSelected = (wbId) => {
  return props.selectedElements.some(s => s.type === 'walkbox' && s.element.id === wbId)
}

// Get walkbox center point
const getWalkboxCenter = (wb) => {
  if (!wb.points || wb.points.length === 0) return { x: 0, y: 0 }
  const sumX = wb.points.reduce((acc, p) => acc + p.x, 0)
  const sumY = wb.points.reduce((acc, p) => acc + p.y, 0)
  return {
    x: sumX / wb.points.length,
    y: sumY / wb.points.length
  }
}

// Get polygon points string
const getPolygonPoints = (wb) => {
  return wb.points.map(p => `${p.x * props.zoom},${p.y * props.zoom}`).join(' ')
}

// Get transform for rotation
const getTransform = (wb) => {
  const center = getWalkboxCenter(wb)
  return `rotate(${wb.rotation || 0}, ${center.x * props.zoom}, ${center.y * props.zoom})`
}

// Get edge midpoint
const getEdgeMidpoint = (wb, idx) => {
  const p1 = wb.points[idx]
  const p2 = wb.points[(idx + 1) % wb.points.length]
  return {
    x: ((p1.x + p2.x) / 2) * props.zoom,
    y: ((p1.y + p2.y) / 2) * props.zoom
  }
}

// Handle polygon selection
const handlePolygonClick = (wb, event) => {
  emit('select', wb, event)
}

// Handle adding vertex on edge
const handleAddVertex = (wb, idx, event) => {
  event.stopPropagation()
  emit('add-vertex', wb, idx, event)
}

// Handle vertex drag start
const handleVertexMouseDown = (event, wb, idx) => {
  event.stopPropagation()
  emit('start-vertex-drag', event, wb, idx)
}

// Handle vertex removal (double-click)
const handleVertexDoubleClick = (wb, idx) => {
  emit('remove-vertex', wb, idx)
}

// Handle rotate start
const handleRotateStart = (event, wb) => {
  event.stopPropagation()
  emit('start-rotate', event, wb)
}

// Computed: SVG dimensions
const svgWidth = computed(() => {
  // Find max x from all walkboxes
  let maxX = 0
  props.walkboxes.forEach(wb => {
    wb.points?.forEach(p => {
      if (p.x > maxX) maxX = p.x
    })
  })
  return (maxX + 100) * props.zoom
})

const svgHeight = computed(() => {
  // Find max y from all walkboxes
  let maxY = 0
  props.walkboxes.forEach(wb => {
    wb.points?.forEach(p => {
      if (p.y > maxY) maxY = p.y
    })
  })
  return (maxY + 100) * props.zoom
})
</script>

<template>
  <svg
    class="walkbox-svg-layer"
    :width="svgWidth"
    :height="svgHeight"
  >
    <g
      v-for="wb in walkboxes"
      :key="'wb-' + wb.id"
      :transform="getTransform(wb)"
    >
      <!-- Polygon fill -->
      <polygon
        :points="getPolygonPoints(wb)"
        class="walkbox-polygon"
        :class="{ selected: isWalkboxSelected(wb.id) }"
        @mousedown="handlePolygonClick(wb, $event)"
        @click.stop
      />

      <!-- Edges (clickable to add vertices) - only when selected -->
      <template v-if="isWalkboxSelected(wb.id)">
        <!-- Invisible thick line for easier clicking -->
        <line
          v-for="(point, idx) in wb.points"
          :key="'edge-' + idx"
          :x1="point.x * zoom"
          :y1="point.y * zoom"
          :x2="wb.points[(idx + 1) % wb.points.length].x * zoom"
          :y2="wb.points[(idx + 1) % wb.points.length].y * zoom"
          class="walkbox-edge"
          @click.stop="handleAddVertex(wb, idx, $event)"
        />

        <!-- "+" indicator at edge midpoint -->
        <g
          v-for="(point, idx) in wb.points"
          :key="'edge-add-' + idx"
          class="walkbox-edge-add"
          @click.stop="handleAddVertex(wb, idx, $event)"
        >
          <circle
            :cx="getEdgeMidpoint(wb, idx).x"
            :cy="getEdgeMidpoint(wb, idx).y"
            r="10"
            class="walkbox-edge-add-bg"
          />
          <text
            :x="getEdgeMidpoint(wb, idx).x"
            :y="getEdgeMidpoint(wb, idx).y"
            class="walkbox-edge-add-icon"
          >+</text>
        </g>
      </template>

      <!-- Vertex handles - only when selected -->
      <template v-if="isWalkboxSelected(wb.id)">
        <circle
          v-for="(point, idx) in wb.points"
          :key="'vertex-' + idx"
          :cx="point.x * zoom"
          :cy="point.y * zoom"
          r="6"
          class="walkbox-vertex"
          :class="{ 'can-delete': wb.points.length > 3 }"
          @mousedown.stop="handleVertexMouseDown($event, wb, idx)"
          @dblclick.stop="handleVertexDoubleClick(wb, idx)"
        />
      </template>

      <!-- Rotate handle - only when selected -->
      <template v-if="isWalkboxSelected(wb.id)">
        <line
          :x1="getWalkboxCenter(wb).x * zoom"
          :y1="getWalkboxCenter(wb).y * zoom - 30"
          :x2="getWalkboxCenter(wb).x * zoom"
          :y2="getWalkboxCenter(wb).y * zoom - 55"
          class="walkbox-rotate-line"
        />
        <circle
          :cx="getWalkboxCenter(wb).x * zoom"
          :cy="getWalkboxCenter(wb).y * zoom - 60"
          r="8"
          class="walkbox-rotate-handle"
          @mousedown.stop="handleRotateStart($event, wb)"
        />
      </template>

      <!-- Label -->
      <text
        :x="getWalkboxCenter(wb).x * zoom"
        :y="getWalkboxCenter(wb).y * zoom"
        class="walkbox-label"
      >
        Walkbox #{{ wb.id }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.walkbox-svg-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 5;
  overflow: visible;
}

.walkbox-polygon {
  fill: rgba(0, 255, 136, 0.15);
  stroke: var(--color-walkbox, #00ff88);
  stroke-width: 2;
  stroke-dasharray: 8 4;
  cursor: move;
  pointer-events: all;
  transition: fill 0.15s ease;
}

.walkbox-polygon:hover {
  fill: rgba(0, 255, 136, 0.25);
}

.walkbox-polygon.selected {
  fill: rgba(0, 255, 136, 0.3);
  stroke-width: 3;
  filter: drop-shadow(0 0 6px var(--color-walkbox, #00ff88));
}

.walkbox-edge {
  stroke: transparent;
  stroke-width: 16;
  cursor: crosshair;
  pointer-events: all;
}

.walkbox-edge:hover {
  stroke: rgba(0, 255, 136, 0.4);
}

/* "+" button to add vertices on edges */
.walkbox-edge-add {
  cursor: pointer;
  pointer-events: all;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.walkbox-edge-add:hover {
  opacity: 1;
}

.walkbox-edge-add-bg {
  fill: rgba(0, 0, 0, 0.7);
  stroke: var(--color-walkbox, #00ff88);
  stroke-width: 2;
}

.walkbox-edge-add:hover .walkbox-edge-add-bg {
  fill: var(--color-walkbox, #00ff88);
}

.walkbox-edge-add-icon {
  fill: var(--color-walkbox, #00ff88);
  font-size: 14px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  font-family: Arial, sans-serif;
}

.walkbox-edge-add:hover .walkbox-edge-add-icon {
  fill: #000;
}

.walkbox-vertex {
  fill: var(--color-walkbox, #00ff88);
  stroke: #fff;
  stroke-width: 2;
  cursor: grab;
  pointer-events: all;
  transition: r 0.15s ease, fill 0.15s ease;
}

.walkbox-vertex:hover {
  r: 8;
  fill: #fff;
  stroke: var(--color-walkbox, #00ff88);
}

.walkbox-vertex.can-delete:hover {
  fill: var(--error, #ff4757);
  stroke: #fff;
}

.walkbox-vertex:active {
  cursor: grabbing;
}

.walkbox-label {
  fill: var(--color-walkbox, #00ff88);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.8);
}

.walkbox-rotate-handle {
  fill: var(--accent, #00d4ff);
  stroke: var(--bg-dark, #0f0f23);
  stroke-width: 2;
  cursor: grab;
  pointer-events: all;
  transition: r 0.15s ease, fill 0.15s ease;
}

.walkbox-rotate-handle:hover {
  fill: var(--primary, #c9a227);
  r: 10;
}

.walkbox-rotate-handle:active {
  cursor: grabbing;
}

.walkbox-rotate-line {
  stroke: var(--accent, #00d4ff);
  stroke-width: 2;
  pointer-events: none;
}
</style>
