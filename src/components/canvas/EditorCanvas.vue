<script setup>
/**
 * EditorCanvas.vue
 *
 * Main canvas component for the scene editor.
 * Contains all visual layers: background, grid, elements, and overlays.
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import CanvasGrid from './CanvasGrid.vue'
import CanvasWalkbox from './CanvasWalkbox.vue'
import CanvasElement from './CanvasElement.vue'
import CanvasParticles from './CanvasParticles.vue'
import CanvasLighting from './CanvasLighting.vue'

const props = defineProps({
  // Scene data
  scene: {
    type: Object,
    required: true
  },
  // Zoom level (0.1 - 2)
  zoom: {
    type: Number,
    default: 0.5
  },
  // Show grid overlay
  showGrid: {
    type: Boolean,
    default: true
  },
  // Play mode active
  playMode: {
    type: Boolean,
    default: false
  },
  // Selected elements: [{ type, element }]
  selectedElements: {
    type: Array,
    default: () => []
  },
  // Element type visibility
  visibleTypes: {
    type: Object,
    default: () => ({
      images: true,
      walkboxes: true,
      exits: true,
      actors: true,
      hotspots: true,
      zplanes: true,
      lights: true,
      particles: true
    })
  },
  // Drag state
  isDragging: {
    type: Boolean,
    default: false
  },
  dragElement: {
    type: Object,
    default: null
  },
  // Asset helpers
  getAssetById: {
    type: Function,
    default: () => null
  },
  getAssetDisplayUrl: {
    type: Function,
    default: () => null
  },
  // Global actors for lookups
  globalActors: {
    type: Array,
    default: () => []
  },
  // Global animations
  globalAnimations: {
    type: Array,
    default: () => []
  },
  // Active particles for rendering
  activeParticles: {
    type: Object,
    default: () => ({})
  },
  // Groups for element grouping
  groups: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'canvas-click',
  'context-menu',
  'select-element',
  'start-drag',
  'start-resize',
  'start-rotate',
  'element-context-menu',
  // Walkbox specific
  'add-walkbox-vertex',
  'start-vertex-drag',
  'remove-walkbox-vertex',
  'start-walkbox-rotate'
])

// Canvas ref for measuring
const canvasRef = ref(null)

// Computed: canvas dimensions
const canvasWidth = computed(() => props.scene.width * props.zoom)
const canvasHeight = computed(() => props.scene.height * props.zoom)

// Check if element is selected
const isSelected = (type, elementId) => {
  return props.selectedElements.some(s => s.type === type && s.element.id === elementId)
}

// Get global actor by ID
const getGlobalActorById = (actorId) => {
  return props.globalActors.find(a => a.id === actorId)
}

// Get animation by ID
const getAnimationById = (animId) => {
  return props.globalAnimations.find(a => a.id === animId)
}

// Get actor placement animation
const getActorPlacementAnimation = (placement) => {
  const actor = getGlobalActorById(placement.actorId)
  if (!actor?.animations) return null

  const state = placement.currentState || 'idle'
  const animId = actor.animations[state]
  return animId ? getAnimationById(animId) : null
}

// Get actor placement animation style
const getActorPlacementAnimationStyle = (placement) => {
  const animation = getActorPlacementAnimation(placement)
  if (!animation) return {}

  const asset = props.getAssetById(animation.spritesheetAssetId)
  if (!asset) return {}

  const url = props.getAssetDisplayUrl(asset)
  if (!url) return {}

  const frame = animation.frames[0] || { x: 0, y: 0, w: 32, h: 32 }

  return {
    backgroundImage: `url(${url})`,
    backgroundPosition: `-${frame.x}px -${frame.y}px`,
    backgroundSize: `auto`,
    width: '100%',
    height: '100%'
  }
}

// Check if element is in a group
const isElementInGroup = (type, elementId) => {
  return props.groups.some(g =>
    g.elements.some(e => e.type === type && e.id === elementId)
  )
}

// Get element group
const getElementGroup = (type, elementId) => {
  return props.groups.find(g =>
    g.elements.some(e => e.type === type && e.id === elementId)
  )
}

// Get background style
const backgroundStyle = computed(() => {
  if (!props.scene.background) return {}

  const asset = props.getAssetById(props.scene.background)
  if (!asset) return {}

  const url = props.getAssetDisplayUrl(asset)
  if (!url) return {}

  return {
    backgroundImage: `url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }
})

// Walkbox helper: get center point
const getWalkboxCenter = (wb) => {
  if (!wb.points || wb.points.length === 0) return { x: 0, y: 0 }
  const sumX = wb.points.reduce((acc, p) => acc + p.x, 0)
  const sumY = wb.points.reduce((acc, p) => acc + p.y, 0)
  return {
    x: sumX / wb.points.length,
    y: sumY / wb.points.length
  }
}

// Handle canvas click
const onCanvasClick = (event) => {
  emit('canvas-click', event)
}

// Handle context menu
const onContextMenu = (event) => {
  emit('context-menu', event)
}

// Handle element selection
const handleSelectElement = (type, element, event) => {
  emit('select-element', type, element, event)
}

// Handle element context menu
const handleElementContextMenu = (event, type, element) => {
  event.preventDefault()
  emit('element-context-menu', event, type, element)
}

// Handle resize start
const handleStartResize = (event, element, handle) => {
  emit('start-resize', event, element, handle)
}

// Handle rotate start
const handleStartRotate = (event, element) => {
  emit('start-rotate', event, element)
}

// Parallax image style (for images with parallax enabled)
const getParallaxImageStyle = (img) => {
  const baseStyle = {
    left: img.x * props.zoom + 'px',
    top: img.y * props.zoom + 'px',
    width: img.w * props.zoom + 'px',
    height: img.h * props.zoom + 'px',
    transform: `rotate(${img.rotation || 0}deg)`
  }

  if (img.assetId) {
    const asset = props.getAssetById(img.assetId)
    if (asset) {
      const url = props.getAssetDisplayUrl(asset)
      if (url) {
        baseStyle.backgroundImage = `url(${url})`
        baseStyle.backgroundSize = 'contain'
        baseStyle.backgroundPosition = 'center'
        baseStyle.backgroundRepeat = 'no-repeat'
      }
    }
  }

  return baseStyle
}

// Get light icon based on type
const getLightIcon = (type) => {
  const icons = {
    point: '💡',
    spot: '🔦',
    ambient: '☀️',
    directional: '➡️'
  }
  return icons[type] || '💡'
}

// Get particle preset icon
const getParticleIcon = (preset) => {
  const icons = {
    rain: '🌧️',
    snow: '❄️',
    fire: '🔥',
    smoke: '💨',
    sparkles: '✨',
    dust: '🌫️',
    leaves: '🍂',
    bubbles: '🫧'
  }
  return icons[preset] || '✨'
}

// Expose canvas ref for parent component
defineExpose({
  canvasRef
})
</script>

<template>
  <div
    ref="canvasRef"
    class="canvas-wrapper"
    :class="{ dragging: isDragging, 'play-mode': playMode }"
    :style="{
      width: canvasWidth + 'px',
      height: canvasHeight + 'px'
    }"
    @click="onCanvasClick"
    @contextmenu="onContextMenu"
  >
    <!-- Background Layer -->
    <div
      class="canvas-background"
      :class="{ 'has-image': scene.background && getAssetById(scene.background) }"
      :style="backgroundStyle"
    >
      <span v-if="!scene.background" class="background-placeholder">
        🎨<br>
        <span class="pixel-font-sm">Select background in Scene properties</span>
      </span>
      <span v-else-if="!getAssetDisplayUrl(getAssetById(scene.background))" class="background-loading">
        ⏳ Loading...
      </span>
    </div>

    <!-- Grid Overlay -->
    <CanvasGrid
      v-if="showGrid"
      :width="scene.width"
      :height="scene.height"
      :zoom="zoom"
      :grid-size="32"
    />

    <!-- Elements Overlay -->
    <div class="elements-overlay">
      <!-- Walkboxes (SVG) -->
      <CanvasWalkbox
        v-if="visibleTypes.walkboxes && !playMode"
        :walkboxes="scene.walkboxes"
        :zoom="zoom"
        :selected-elements="selectedElements"
        @select="(wb, event) => handleSelectElement('walkbox', wb, event)"
        @add-vertex="(wb, idx, event) => $emit('add-walkbox-vertex', wb, idx, event)"
        @start-vertex-drag="(event, wb, idx) => $emit('start-vertex-drag', event, wb, idx)"
        @remove-vertex="(wb, idx) => $emit('remove-walkbox-vertex', wb, idx)"
        @start-rotate="(event, wb) => $emit('start-walkbox-rotate', event, wb)"
      />

      <!-- Exits -->
      <template v-if="visibleTypes.exits && !playMode">
        <CanvasElement
          v-for="exit in scene.exits"
          :key="'exit-' + exit.id"
          type="exit"
          :element="exit"
          :zoom="zoom"
          :selected="isSelected('exit', exit.id)"
          :dragging="isDragging && dragElement?.id === exit.id"
          @select="handleSelectElement('exit', exit, $event)"
          @context-menu="handleElementContextMenu($event, 'exit', exit)"
          @start-resize="handleStartResize($event, exit, $event.handle)"
          @start-rotate="handleStartRotate($event, exit)"
        >
          <span class="element-label">{{ exit.name }}</span>
        </CanvasElement>
      </template>

      <!-- Actors -->
      <template v-if="visibleTypes.actors">
        <CanvasElement
          v-for="placement in scene.actorPlacements"
          v-show="!playMode || placement.id !== $parent?.playModeState?.playerPlacementId"
          :key="'actor-' + placement.id"
          type="actor"
          :element="placement"
          :zoom="zoom"
          :selected="isSelected('actorPlacement', placement.id)"
          :dragging="isDragging && dragElement?.id === placement.id"
          @select="handleSelectElement('actorPlacement', placement, $event)"
          @context-menu="handleElementContextMenu($event, 'actorPlacement', placement)"
          @start-resize="handleStartResize($event, placement, $event.handle)"
          @start-rotate="handleStartRotate($event, placement)"
        >
          <!-- Actor animation preview -->
          <div
            v-if="getActorPlacementAnimation(placement)"
            class="actor-animation-preview"
            :style="getActorPlacementAnimationStyle(placement)"
          ></div>
          <span v-else class="element-label">{{ getGlobalActorById(placement.actorId)?.name || 'Unknown' }}</span>
          <!-- Actor name overlay when has animation -->
          <span v-if="getActorPlacementAnimation(placement)" class="actor-name-overlay">
            {{ getGlobalActorById(placement.actorId)?.name }}
          </span>
        </CanvasElement>
      </template>

      <!-- Hotspots -->
      <template v-if="visibleTypes.hotspots && !playMode">
        <CanvasElement
          v-for="hotspot in scene.hotspots"
          :key="'hotspot-' + hotspot.id"
          type="hotspot"
          :element="hotspot"
          :zoom="zoom"
          :selected="isSelected('hotspot', hotspot.id)"
          :dragging="isDragging && dragElement?.id === hotspot.id"
          @select="handleSelectElement('hotspot', hotspot, $event)"
          @context-menu="handleElementContextMenu($event, 'hotspot', hotspot)"
          @start-resize="handleStartResize($event, hotspot, $event.handle)"
          @start-rotate="handleStartRotate($event, hotspot)"
        >
          <span class="element-label">{{ hotspot.name }}</span>
        </CanvasElement>
      </template>

      <!-- Images -->
      <template v-if="visibleTypes.images">
        <CanvasElement
          v-for="img in scene.images"
          :key="'img-' + img.id"
          type="image"
          :element="img"
          :zoom="zoom"
          :selected="isSelected('image', img.id)"
          :dragging="isDragging && dragElement?.id === img.id"
          :has-asset="!!(img.assetId && getAssetById(img.assetId))"
          :has-parallax="img.parallax?.enabled"
          :in-group="isElementInGroup('image', img.id)"
          :custom-style="img.parallax?.enabled ? getParallaxImageStyle(img) : (
            img.assetId && getAssetById(img.assetId) && getAssetDisplayUrl(getAssetById(img.assetId)) ? {
              backgroundImage: `url(${getAssetDisplayUrl(getAssetById(img.assetId))})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            } : {}
          )"
          @select="handleSelectElement('image', img, $event)"
          @context-menu="handleElementContextMenu($event, 'image', img)"
          @start-resize="handleStartResize($event, img, $event.handle)"
          @start-rotate="handleStartRotate($event, img)"
        >
          <span v-if="!img.assetId || !getAssetById(img.assetId)" class="element-label">{{ img.name }}</span>
          <!-- Parallax indicator -->
          <span v-if="img.parallax?.enabled" class="parallax-indicator" :title="'Depth: ' + img.parallax.depth">
            ↕ {{ img.parallax.depth.toFixed(1) }}
          </span>
          <!-- Group indicator -->
          <span v-if="isElementInGroup('image', img.id)" class="group-indicator">
            🔗 {{ getElementGroup('image', img.id)?.name }}
          </span>
        </CanvasElement>
      </template>

      <!-- Z-Planes -->
      <template v-if="visibleTypes.zplanes && !playMode">
        <CanvasElement
          v-for="zp in scene.zplanes"
          :key="'zp-' + zp.id"
          type="zplane"
          :element="zp"
          :zoom="zoom"
          :selected="isSelected('zplane', zp.id)"
          :dragging="isDragging && dragElement?.id === zp.id"
          @select="handleSelectElement('zplane', zp, $event)"
          @context-menu="handleElementContextMenu($event, 'zplane', zp)"
          @start-resize="handleStartResize($event, zp, $event.handle)"
          @start-rotate="handleStartRotate($event, zp)"
        >
          <span class="element-label">{{ zp.name }}</span>
        </CanvasElement>
      </template>

      <!-- Particle Emitters -->
      <template v-if="visibleTypes.particles">
        <CanvasElement
          v-for="emitter in scene.particles"
          :key="'particle-' + emitter.id"
          type="particle"
          :element="{
            ...emitter,
            x: emitter.x - emitter.width / 2,
            y: emitter.y - emitter.height / 2,
            w: emitter.width,
            h: emitter.height
          }"
          :zoom="zoom"
          :selected="isSelected('particle', emitter.id)"
          :dragging="isDragging && dragElement?.id === emitter.id"
          :disabled="!emitter.enabled"
          :show-rotate="false"
          @select="handleSelectElement('particle', emitter, $event)"
          @context-menu="handleElementContextMenu($event, 'particle', emitter)"
          @start-resize="handleStartResize($event, emitter, $event.handle)"
        >
          <span class="element-label">{{ getParticleIcon(emitter.preset) }} {{ emitter.name }}</span>
        </CanvasElement>

        <!-- Render active particles -->
        <CanvasParticles
          v-for="emitter in scene.particles.filter(e => e.enabled)"
          :key="'particles-render-' + emitter.id"
          :emitter="emitter"
          :particles="activeParticles[emitter.id] || []"
          :scene-width="scene.width"
          :scene-height="scene.height"
          :zoom="zoom"
        />
      </template>

      <!-- Lights -->
      <template v-if="visibleTypes.lights">
        <CanvasElement
          v-for="light in scene.lighting?.lights || []"
          :key="'light-' + light.id"
          type="light"
          :element="{
            ...light,
            x: light.x - 20,
            y: light.y - 20,
            w: 40,
            h: 40
          }"
          :zoom="zoom"
          :selected="isSelected('light', light.id)"
          :dragging="isDragging && dragElement?.id === light.id"
          :disabled="!light.enabled"
          :in-group="isElementInGroup('light', light.id)"
          :show-resize="false"
          :show-rotate="false"
          @select="handleSelectElement('light', light, $event)"
          @context-menu="handleElementContextMenu($event, 'light', light)"
        >
          <span class="light-icon">{{ getLightIcon(light.type) }}</span>
          <!-- Light preview glow -->
          <div
            v-if="light.enabled"
            class="light-preview-glow"
            :style="{
              width: (light.radius || 100) * 2 * zoom + 'px',
              height: (light.radius || 100) * 2 * zoom + 'px',
              background: `radial-gradient(circle, ${light.color || '#ffcc00'}40 0%, transparent 70%)`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }"
          ></div>
        </CanvasElement>
      </template>

      <!-- Lighting Overlay -->
      <CanvasLighting
        v-if="visibleTypes.lights && scene.lighting"
        :lighting="scene.lighting"
        :scene-width="scene.width"
        :scene-height="scene.height"
        :zoom="zoom"
      />
    </div>

    <!-- Play Mode Elements Slot -->
    <slot name="play-mode" />
  </div>
</template>

<style scoped>
.canvas-wrapper {
  position: relative;
  background: var(--bg-card);
  box-shadow: var(--shadow-pixel);
}

.canvas-background {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(
    45deg,
    var(--bg-dark) 0px,
    var(--bg-dark) 10px,
    var(--bg-medium) 10px,
    var(--bg-medium) 20px
  );
}

.canvas-background.has-image {
  background: none;
}

.background-placeholder {
  text-align: center;
  color: var(--text-muted);
  font-size: 32px;
}

.background-loading {
  font-size: 16px;
  color: var(--text-muted);
}

.pixel-font-sm {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.elements-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Dragging state */
.canvas-wrapper.dragging {
  cursor: grabbing;
}

/* Play mode state */
.canvas-wrapper.play-mode {
  cursor: crosshair;
}

/* Element label common */
.element-label {
  font-size: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 4px;
  white-space: nowrap;
  pointer-events: none;
}

/* Actor animation preview */
.actor-animation-preview {
  position: absolute;
  inset: 0;
  image-rendering: pixelated;
  background-repeat: no-repeat;
  pointer-events: none;
}

.actor-name-overlay {
  position: absolute;
  bottom: 2px;
  left: 2px;
  font-size: 7px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 1px 3px;
  pointer-events: none;
}

/* Parallax indicator */
.parallax-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 200, 0, 0.8);
  color: white;
  font-size: 8px;
  padding: 2px 4px;
  border-radius: 3px;
  pointer-events: none;
  font-family: monospace;
}

/* Group indicator */
.group-indicator {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: var(--accent);
  font-size: 7px;
  padding: 2px 4px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
}

/* Light icon */
.light-icon {
  font-size: 20px;
  pointer-events: none;
  z-index: 2;
}

/* Light preview glow */
.light-preview-glow {
  position: absolute;
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
}
</style>
