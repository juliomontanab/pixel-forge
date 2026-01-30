<script setup>
/**
 * CanvasElements.vue
 * Renders all canvas elements (exits, actors, hotspots, images, z-planes, particles, lights).
 */

import { computed } from 'vue'

const props = defineProps({
  scene: { type: Object, required: true },
  zoom: { type: Number, default: 1 },
  playMode: { type: Boolean, default: false },
  visibleTypes: { type: Object, required: true },
  selectedElements: { type: Array, default: () => [] },
  isDragging: { type: Boolean, default: false },
  dragState: { type: Object, default: () => ({}) },
  activeParticles: { type: Object, default: () => ({}) },
  // Functions passed from parent
  getAssetById: { type: Function, required: true },
  getAssetDisplayUrl: { type: Function, required: true },
  getGlobalActorById: { type: Function, required: true },
  getActorPlacementAnimation: { type: Function, required: true },
  getActorPlacementAnimationStyle: { type: Function, required: true },
  getParallaxImageStyle: { type: Function, required: true },
  isElementInGroup: { type: Function, required: true },
  getElementGroup: { type: Function, required: true },
  getParticleIcon: { type: Function, required: true },
  getParticleStyle: { type: Function, required: true },
  getLightIcon: { type: Function, required: true },
  getLightPreviewStyle: { type: Function, required: true }
})

const emit = defineEmits([
  'select-element',
  'context-menu',
  'start-resize',
  'start-rotate',
  'start-resize-particle'
])

// Check if element is selected
const isSelected = (type, element) => {
  return props.selectedElements.some(s => s.type === type && s.element.id === element.id)
}

// Handle element selection
const handleSelectElement = (type, element, event) => {
  emit('select-element', { type, element, event })
}

// Handle context menu
const showElementContextMenu = (event, type, element) => {
  event.preventDefault()
  emit('context-menu', { event, type, element })
}

// Handle resize start
const startResize = (event, element, handle) => {
  emit('start-resize', { event, element, handle })
}

// Handle rotate start
const startRotate = (event, element) => {
  emit('start-rotate', { event, element })
}

// Handle particle resize
const startResizeParticle = (event, emitter, handle) => {
  emit('start-resize-particle', { event, emitter, handle })
}
</script>

<template>
  <!-- Exits -->
  <template v-if="visibleTypes.exits && !playMode">
    <div
      v-for="exit in scene.exits"
      :key="'exit-' + exit.id"
      class="element-rect exit-element"
      :class="{ selected: isSelected('exit', exit) }"
      :style="{
        left: exit.x * zoom + 'px',
        top: exit.y * zoom + 'px',
        width: exit.w * zoom + 'px',
        height: exit.h * zoom + 'px',
        transform: `rotate(${exit.rotation || 0}deg)`
      }"
      @mousedown="handleSelectElement('exit', exit, $event)"
      @contextmenu="showElementContextMenu($event, 'exit', exit)"
      @click.stop
    >
      <span class="element-label">{{ exit.name }}</span>
      <!-- Resize & Rotate handles -->
      <template v-if="isSelected('exit', exit)">
        <div class="rotate-line"></div>
        <div class="rotate-handle" @mousedown.stop="startRotate($event, exit)"></div>
        <div class="resize-handle nw" @mousedown.stop="startResize($event, exit, 'nw')"></div>
        <div class="resize-handle n" @mousedown.stop="startResize($event, exit, 'n')"></div>
        <div class="resize-handle ne" @mousedown.stop="startResize($event, exit, 'ne')"></div>
        <div class="resize-handle e" @mousedown.stop="startResize($event, exit, 'e')"></div>
        <div class="resize-handle se" @mousedown.stop="startResize($event, exit, 'se')"></div>
        <div class="resize-handle s" @mousedown.stop="startResize($event, exit, 's')"></div>
        <div class="resize-handle sw" @mousedown.stop="startResize($event, exit, 'sw')"></div>
        <div class="resize-handle w" @mousedown.stop="startResize($event, exit, 'w')"></div>
      </template>
    </div>
  </template>

  <!-- Actors -->
  <template v-if="visibleTypes.actors">
    <div
      v-for="placement in scene.actorPlacements"
      v-show="!playMode || placement.id !== (dragState.playerPlacementId || 0)"
      :key="'actor-' + placement.id"
      class="element-rect actor-element"
      :class="{
        selected: isSelected('actorPlacement', placement),
        dragging: isDragging && dragState.element?.id === placement.id
      }"
      :style="{
        left: placement.x * zoom + 'px',
        top: placement.y * zoom + 'px',
        width: placement.w * zoom + 'px',
        height: placement.h * zoom + 'px',
        transform: `rotate(${placement.rotation || 0}deg)`
      }"
      @mousedown="handleSelectElement('actorPlacement', placement, $event)"
      @contextmenu="showElementContextMenu($event, 'actorPlacement', placement)"
      @click.stop
    >
      <!-- Actor animation preview -->
      <div
        v-if="getActorPlacementAnimation(placement)"
        class="actor-animation-preview"
        :style="getActorPlacementAnimationStyle(placement)"
      ></div>
      <span v-else class="element-label">{{ getGlobalActorById(placement.actorId)?.name || 'Unknown' }}</span>
      <!-- Actor name overlay when has animation -->
      <span v-if="getActorPlacementAnimation(placement)" class="actor-name-overlay">{{ getGlobalActorById(placement.actorId)?.name }}</span>
      <!-- Resize & Rotate handles -->
      <template v-if="isSelected('actorPlacement', placement)">
        <div class="rotate-line"></div>
        <div class="rotate-handle" @mousedown.stop="startRotate($event, placement)"></div>
        <div class="resize-handle nw" @mousedown.stop="startResize($event, placement, 'nw')"></div>
        <div class="resize-handle n" @mousedown.stop="startResize($event, placement, 'n')"></div>
        <div class="resize-handle ne" @mousedown.stop="startResize($event, placement, 'ne')"></div>
        <div class="resize-handle e" @mousedown.stop="startResize($event, placement, 'e')"></div>
        <div class="resize-handle se" @mousedown.stop="startResize($event, placement, 'se')"></div>
        <div class="resize-handle s" @mousedown.stop="startResize($event, placement, 's')"></div>
        <div class="resize-handle sw" @mousedown.stop="startResize($event, placement, 'sw')"></div>
        <div class="resize-handle w" @mousedown.stop="startResize($event, placement, 'w')"></div>
      </template>
    </div>
  </template>

  <!-- Hotspots -->
  <template v-if="visibleTypes.hotspots && !playMode">
    <div
      v-for="hotspot in scene.hotspots"
      :key="'hotspot-' + hotspot.id"
      class="element-rect hotspot-element"
      :class="{
        selected: isSelected('hotspot', hotspot),
        dragging: isDragging && dragState.element?.id === hotspot.id
      }"
      :style="{
        left: hotspot.x * zoom + 'px',
        top: hotspot.y * zoom + 'px',
        width: hotspot.w * zoom + 'px',
        height: hotspot.h * zoom + 'px',
        transform: `rotate(${hotspot.rotation || 0}deg)`
      }"
      @mousedown="handleSelectElement('hotspot', hotspot, $event)"
      @contextmenu="showElementContextMenu($event, 'hotspot', hotspot)"
      @click.stop
    >
      <span class="element-label">{{ hotspot.name }}</span>
      <!-- Resize & Rotate handles -->
      <template v-if="isSelected('hotspot', hotspot)">
        <div class="rotate-line"></div>
        <div class="rotate-handle" @mousedown.stop="startRotate($event, hotspot)"></div>
        <div class="resize-handle nw" @mousedown.stop="startResize($event, hotspot, 'nw')"></div>
        <div class="resize-handle n" @mousedown.stop="startResize($event, hotspot, 'n')"></div>
        <div class="resize-handle ne" @mousedown.stop="startResize($event, hotspot, 'ne')"></div>
        <div class="resize-handle e" @mousedown.stop="startResize($event, hotspot, 'e')"></div>
        <div class="resize-handle se" @mousedown.stop="startResize($event, hotspot, 'se')"></div>
        <div class="resize-handle s" @mousedown.stop="startResize($event, hotspot, 's')"></div>
        <div class="resize-handle sw" @mousedown.stop="startResize($event, hotspot, 'sw')"></div>
        <div class="resize-handle w" @mousedown.stop="startResize($event, hotspot, 'w')"></div>
      </template>
    </div>
  </template>

  <!-- Images -->
  <template v-if="visibleTypes.images">
    <div
      v-for="img in scene.images"
      :key="'img-' + img.id"
      class="element-rect image-element"
      :class="{
        selected: isSelected('image', img),
        dragging: isDragging && dragState.element?.id === img.id,
        'has-asset': img.assetId && getAssetById(img.assetId),
        'has-parallax': img.parallax?.enabled,
        'in-group': isElementInGroup('image', img.id)
      }"
      :style="img.parallax?.enabled ? getParallaxImageStyle(img) : {
        left: img.x * zoom + 'px',
        top: img.y * zoom + 'px',
        width: img.w * zoom + 'px',
        height: img.h * zoom + 'px',
        transform: `rotate(${img.rotation || 0}deg)`,
        ...(img.assetId && getAssetById(img.assetId) && getAssetDisplayUrl(getAssetById(img.assetId)) ? {
          backgroundImage: `url(${getAssetDisplayUrl(getAssetById(img.assetId))})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {})
      }"
      @mousedown="handleSelectElement('image', img, $event)"
      @contextmenu="showElementContextMenu($event, 'image', img)"
      @click.stop
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
      <!-- Resize & Rotate handles -->
      <template v-if="isSelected('image', img)">
        <div class="rotate-line"></div>
        <div class="rotate-handle" @mousedown.stop="startRotate($event, img)"></div>
        <div class="resize-handle nw" @mousedown.stop="startResize($event, img, 'nw')"></div>
        <div class="resize-handle n" @mousedown.stop="startResize($event, img, 'n')"></div>
        <div class="resize-handle ne" @mousedown.stop="startResize($event, img, 'ne')"></div>
        <div class="resize-handle e" @mousedown.stop="startResize($event, img, 'e')"></div>
        <div class="resize-handle se" @mousedown.stop="startResize($event, img, 'se')"></div>
        <div class="resize-handle s" @mousedown.stop="startResize($event, img, 's')"></div>
        <div class="resize-handle sw" @mousedown.stop="startResize($event, img, 'sw')"></div>
        <div class="resize-handle w" @mousedown.stop="startResize($event, img, 'w')"></div>
      </template>
    </div>
  </template>

  <!-- Z-Planes -->
  <template v-if="visibleTypes.zplanes && !playMode">
    <div
      v-for="zp in scene.zplanes"
      :key="'zp-' + zp.id"
      class="element-rect zplane-element"
      :class="{
        selected: isSelected('zplane', zp),
        dragging: isDragging && dragState.element?.id === zp.id
      }"
      :style="{
        left: zp.x * zoom + 'px',
        top: zp.y * zoom + 'px',
        width: zp.w * zoom + 'px',
        height: zp.h * zoom + 'px',
        transform: `rotate(${zp.rotation || 0}deg)`
      }"
      @mousedown="handleSelectElement('zplane', zp, $event)"
      @contextmenu="showElementContextMenu($event, 'zplane', zp)"
      @click.stop
    >
      <span class="element-label">{{ zp.name }}</span>
      <!-- Resize & Rotate handles -->
      <template v-if="isSelected('zplane', zp)">
        <div class="rotate-line"></div>
        <div class="rotate-handle" @mousedown.stop="startRotate($event, zp)"></div>
        <div class="resize-handle nw" @mousedown.stop="startResize($event, zp, 'nw')"></div>
        <div class="resize-handle n" @mousedown.stop="startResize($event, zp, 'n')"></div>
        <div class="resize-handle ne" @mousedown.stop="startResize($event, zp, 'ne')"></div>
        <div class="resize-handle e" @mousedown.stop="startResize($event, zp, 'e')"></div>
        <div class="resize-handle se" @mousedown.stop="startResize($event, zp, 'se')"></div>
        <div class="resize-handle s" @mousedown.stop="startResize($event, zp, 's')"></div>
        <div class="resize-handle sw" @mousedown.stop="startResize($event, zp, 'sw')"></div>
        <div class="resize-handle w" @mousedown.stop="startResize($event, zp, 'w')"></div>
      </template>
    </div>
  </template>

  <!-- Particle Emitters (visible as draggable boxes in editor) -->
  <template v-if="visibleTypes.particles">
    <div
      v-for="emitter in scene.particles"
      :key="'particle-' + emitter.id"
      class="element-rect particle-element"
      :class="{
        selected: isSelected('particle', emitter),
        dragging: isDragging && dragState.element?.id === emitter.id,
        disabled: !emitter.enabled
      }"
      :style="{
        left: (emitter.x - emitter.width / 2) * zoom + 'px',
        top: (emitter.y - emitter.height / 2) * zoom + 'px',
        width: emitter.width * zoom + 'px',
        height: emitter.height * zoom + 'px'
      }"
      @mousedown="handleSelectElement('particle', emitter, $event)"
      @contextmenu="showElementContextMenu($event, 'particle', emitter)"
      @click.stop
    >
      <span class="element-label">{{ getParticleIcon(emitter.preset) }} {{ emitter.name }}</span>
      <!-- Resize handles -->
      <template v-if="isSelected('particle', emitter)">
        <div class="resize-handle nw" @mousedown.stop="startResizeParticle($event, emitter, 'nw')"></div>
        <div class="resize-handle ne" @mousedown.stop="startResizeParticle($event, emitter, 'ne')"></div>
        <div class="resize-handle se" @mousedown.stop="startResizeParticle($event, emitter, 'se')"></div>
        <div class="resize-handle sw" @mousedown.stop="startResizeParticle($event, emitter, 'sw')"></div>
      </template>
    </div>
    <!-- Render active particles -->
    <div
      v-for="emitter in scene.particles.filter(e => e.enabled)"
      :key="'particles-render-' + emitter.id"
      class="particles-container"
      :style="{
        left: 0,
        top: 0,
        width: scene.width * zoom + 'px',
        height: scene.height * zoom + 'px',
        mixBlendMode: emitter.blendMode || 'screen'
      }"
    >
      <div
        v-for="(particle, idx) in (activeParticles[emitter.id] || [])"
        :key="idx"
        class="particle"
        :style="getParticleStyle(particle, emitter)"
      ></div>
    </div>
  </template>

  <!-- Lights (visible as draggable icons in editor) -->
  <template v-if="visibleTypes.lights">
    <div
      v-for="light in scene.lighting.lights"
      :key="'light-' + light.id"
      class="element-rect light-element"
      :class="{
        selected: isSelected('light', light),
        dragging: isDragging && dragState.element?.id === light.id,
        disabled: !light.enabled,
        'in-group': isElementInGroup('light', light.id)
      }"
      :style="{
        left: (light.x - 20) * zoom + 'px',
        top: (light.y - 20) * zoom + 'px',
        width: 40 * zoom + 'px',
        height: 40 * zoom + 'px'
      }"
      @mousedown="handleSelectElement('light', light, $event)"
      @contextmenu="showElementContextMenu($event, 'light', light)"
      @click.stop
    >
      <span class="light-icon">{{ getLightIcon(light.type) }}</span>
      <!-- Light preview glow -->
      <div
        v-if="light.enabled"
        class="light-preview-glow"
        :style="getLightPreviewStyle(light)"
      ></div>
    </div>
  </template>
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

.element-rect.selected {
  cursor: grab;
}

.element-label {
  font-size: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 4px;
  white-space: nowrap;
  pointer-events: none;
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
  font-size: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 1px 3px;
  pointer-events: none;
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

.image-element.has-asset {
  background-color: transparent;
  border-style: solid;
}

.image-element.has-parallax {
  border-style: dashed;
  border-color: #88ff88;
}

.image-element.has-parallax.selected {
  box-shadow: 0 0 10px #88ff88;
}

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
.element-rect.in-group {
  outline: 2px dashed #00d4ff;
  outline-offset: 2px;
}

.group-indicator {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  background: #00d4ff;
  color: var(--bg-dark, #0f0f23);
  font-size: 8px;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
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

/* Particle element */
.particle-element {
  border-color: #ff88ff;
  background: rgba(255, 136, 255, 0.15);
  border-style: dashed;
}

.particle-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px #ff88ff;
}

.particle-element.disabled {
  opacity: 0.4;
}

.particles-container {
  position: absolute;
  pointer-events: none;
  z-index: 45;
}

.particle {
  position: absolute;
  pointer-events: none;
}

/* Light element */
.light-element {
  border-color: #ffcc00;
  background: rgba(255, 204, 0, 0.1);
  border-radius: 50%;
  overflow: visible;
}

.light-element.selected {
  border-width: 3px;
  box-shadow: 0 0 15px #ffcc00;
}

.light-element.disabled {
  opacity: 0.4;
}

.light-icon {
  font-size: 20px;
  pointer-events: none;
  z-index: 2;
}

.light-preview-glow {
  position: absolute;
  border-radius: 50%;
  z-index: 1;
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
