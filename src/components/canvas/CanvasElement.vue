<script setup>
/**
 * CanvasElement.vue
 *
 * Generic canvas element component for rectangular elements.
 * Handles selection, resize handles, and rotate handles.
 *
 * Supported types: exit, actor, hotspot, image, zplane, light, particle
 */

import { computed } from 'vue'

const props = defineProps({
  // Element type
  type: {
    type: String,
    required: true,
    validator: (v) => ['exit', 'actor', 'hotspot', 'image', 'zplane', 'light', 'particle'].includes(v)
  },
  // Element data (must have x, y, w, h, and optionally rotation)
  element: {
    type: Object,
    required: true
  },
  // Zoom level
  zoom: {
    type: Number,
    default: 1
  },
  // Selection state
  selected: {
    type: Boolean,
    default: false
  },
  // Dragging state
  dragging: {
    type: Boolean,
    default: false
  },
  // Disabled state (for lights/particles)
  disabled: {
    type: Boolean,
    default: false
  },
  // Has asset image
  hasAsset: {
    type: Boolean,
    default: false
  },
  // Has parallax enabled
  hasParallax: {
    type: Boolean,
    default: false
  },
  // Is part of a group
  inGroup: {
    type: Boolean,
    default: false
  },
  // Show resize handles when selected
  showResize: {
    type: Boolean,
    default: true
  },
  // Show rotate handle when selected
  showRotate: {
    type: Boolean,
    default: true
  },
  // Custom additional styles
  customStyle: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'select',
  'context-menu',
  'start-resize',
  'start-rotate'
])

// Computed: element class based on type
const elementClass = computed(() => {
  const classes = [
    'element-rect',
    `${props.type}-element`
  ]

  if (props.selected) classes.push('selected')
  if (props.dragging) classes.push('dragging')
  if (props.disabled) classes.push('disabled')
  if (props.hasAsset) classes.push('has-asset')
  if (props.hasParallax) classes.push('has-parallax')
  if (props.inGroup) classes.push('in-group')

  return classes
})

// Computed: element positioning style
const elementStyle = computed(() => {
  const style = {
    left: props.element.x * props.zoom + 'px',
    top: props.element.y * props.zoom + 'px',
    width: props.element.w * props.zoom + 'px',
    height: props.element.h * props.zoom + 'px',
    transform: `rotate(${props.element.rotation || 0}deg)`,
    ...props.customStyle
  }

  return style
})

// Handle selection
const handleMouseDown = (event) => {
  emit('select', event)
}

// Handle context menu
const handleContextMenu = (event) => {
  event.preventDefault()
  emit('context-menu', event)
}

// Handle resize start
const handleResizeStart = (event, handle) => {
  event.stopPropagation()
  emit('start-resize', { ...event, handle })
}

// Handle rotate start
const handleRotateStart = (event) => {
  event.stopPropagation()
  emit('start-rotate', event)
}

// Resize handles configuration
const resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
</script>

<template>
  <div
    :class="elementClass"
    :style="elementStyle"
    @mousedown="handleMouseDown"
    @contextmenu="handleContextMenu"
    @click.stop
  >
    <!-- Element content slot -->
    <slot />

    <!-- Resize & Rotate handles (only when selected) -->
    <template v-if="selected">
      <!-- Rotate handle -->
      <template v-if="showRotate">
        <div class="rotate-line"></div>
        <div class="rotate-handle" @mousedown.stop="handleRotateStart"></div>
      </template>

      <!-- Resize handles -->
      <template v-if="showResize">
        <div
          v-for="handle in resizeHandles"
          :key="handle"
          :class="['resize-handle', handle]"
          @mousedown.stop="handleResizeStart($event, handle)"
        ></div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.element-rect {
  position: absolute;
  border: 2px solid;
  pointer-events: all;
  cursor: grab;
  display: flex;
  transform-origin: center center;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.15s ease, filter 0.15s ease;
}

.element-rect:hover {
  filter: brightness(1.2);
}

.element-rect.dragging {
  cursor: grabbing;
}

.element-rect.disabled {
  opacity: 0.4;
}

/* Exit element */
.exit-element {
  border-color: var(--color-exit, #ff6b6b);
  background: rgba(255, 107, 107, 0.2);
}

.exit-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px var(--color-exit, #ff6b6b);
}

/* Actor element */
.actor-element {
  border-color: var(--color-actor, #a855f7);
  background: rgba(168, 85, 247, 0.2);
}

.actor-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px var(--color-actor, #a855f7);
}

/* Hotspot element */
.hotspot-element {
  border-color: var(--color-hotspot, #00d4ff);
  background: rgba(0, 212, 255, 0.15);
  border-style: dotted;
}

.hotspot-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px var(--color-hotspot, #00d4ff);
}

/* Image element */
.image-element {
  border-color: var(--color-image, #f472b6);
  background: rgba(244, 114, 182, 0.2);
}

.image-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px var(--color-image, #f472b6);
}

.image-element.has-parallax {
  border-style: dashed;
  border-color: #88ff88;
}

.image-element.has-parallax.selected {
  box-shadow: 0 0 10px #88ff88;
}

.image-element.has-asset {
  background: transparent;
}

/* Z-plane element */
.zplane-element {
  border-color: var(--color-zplane, #64748b);
  background: rgba(100, 116, 139, 0.2);
  border-style: double;
  border-width: 4px;
}

.zplane-element.selected {
  box-shadow: 0 0 10px var(--color-zplane, #64748b);
}

/* Light element */
.light-element {
  border-color: #ffcc00;
  background: rgba(255, 204, 0, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.light-element.selected {
  border-width: 3px;
  box-shadow: 0 0 15px #ffcc00;
}

/* Particle element */
.particle-element {
  border-color: #ff88ff;
  background: rgba(255, 136, 255, 0.15);
  border-style: dashed;
  display: flex;
  align-items: center;
  justify-content: center;
}

.particle-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px #ff88ff;
}

/* Resize handles */
.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--primary, #c9a227);
  border: 2px solid var(--bg-dark, #0f0f23);
  pointer-events: all;
  z-index: 10;
}

.resize-handle.nw { top: -5px; left: -5px; cursor: nwse-resize; }
.resize-handle.n { top: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.resize-handle.ne { top: -5px; right: -5px; cursor: nesw-resize; }
.resize-handle.e { top: 50%; right: -5px; transform: translateY(-50%); cursor: ew-resize; }
.resize-handle.se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.resize-handle.s { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.resize-handle.sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
.resize-handle.w { top: 50%; left: -5px; transform: translateY(-50%); cursor: ew-resize; }

.resize-handle:hover {
  background: var(--accent, #00d4ff);
  transform: scale(1.2);
}

.resize-handle.n:hover,
.resize-handle.s:hover {
  transform: translateX(-50%) scale(1.2);
}

.resize-handle.e:hover,
.resize-handle.w:hover {
  transform: translateY(-50%) scale(1.2);
}

/* Rotate handle */
.rotate-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--accent, #00d4ff);
  border: 2px solid var(--bg-dark, #0f0f23);
  border-radius: 50%;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  cursor: grab;
  pointer-events: all;
  z-index: 11;
}

.rotate-handle:hover {
  background: var(--primary, #c9a227);
  transform: translateX(-50%) scale(1.2);
}

.rotate-handle:active {
  cursor: grabbing;
}

.rotate-line {
  position: absolute;
  width: 2px;
  height: 25px;
  background: var(--accent, #00d4ff);
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 10;
}
</style>
