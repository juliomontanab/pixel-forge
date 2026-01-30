<script setup>
/**
 * LightProperties.vue
 * Property editor for scene lights (point, spot, directional, area, ambient).
 */

const props = defineProps({
  element: { type: Object, required: true },
  lightTypes: { type: Array, default: () => [] }
})

const emit = defineEmits(['delete'])

const falloffOptions = [
  { value: 'none', label: 'None' },
  { value: 'linear', label: 'Linear' },
  { value: 'smooth', label: 'Smooth' }
]
</script>

<template>
  <div class="light-properties">
    <div class="property-group">
      <label class="property-label">Name</label>
      <input v-model="element.name" type="text" class="property-input" />
    </div>
    <div class="property-group">
      <label class="property-label">Type</label>
      <select v-model="element.type" class="property-select">
        <option v-for="lt in lightTypes" :key="lt.id" :value="lt.id">
          {{ lt.icon }} {{ lt.name }}
        </option>
      </select>
    </div>
    <div class="property-group">
      <label class="property-label">Color</label>
      <input v-model="element.color" type="color" class="property-color" />
    </div>
    <div class="property-group">
      <label class="property-label">Position</label>
      <div class="property-row">
        <label class="property-sublabel">X</label>
        <input v-model.number="element.x" type="number" class="property-input-sm" />
        <label class="property-sublabel">Y</label>
        <input v-model.number="element.y" type="number" class="property-input-sm" />
      </div>
    </div>
    <div class="property-group">
      <label class="property-label">Intensity</label>
      <input
        type="range"
        min="0"
        max="2"
        step="0.1"
        v-model.number="element.intensity"
        class="property-range"
      />
      <span class="property-value">{{ element.intensity?.toFixed(1) || '1.0' }}</span>
    </div>
    <div class="property-group" v-if="element.type === 'point' || element.type === 'spot'">
      <label class="property-label">Radius</label>
      <input v-model.number="element.radius" type="number" min="10" class="property-input" />
    </div>
    <div class="property-group" v-if="element.type === 'spot'">
      <label class="property-label">Cone Angle</label>
      <input v-model.number="element.angle" type="number" min="1" max="180" class="property-input" />
    </div>
    <div class="property-group" v-if="element.type === 'spot' || element.type === 'directional'">
      <label class="property-label">Direction (deg)</label>
      <input v-model.number="element.direction" type="number" min="0" max="360" class="property-input" />
    </div>
    <div class="property-group" v-if="element.type === 'area'">
      <label class="property-label">Size</label>
      <div class="property-row">
        <label class="property-sublabel">W</label>
        <input v-model.number="element.width" type="number" min="10" class="property-input-sm" />
        <label class="property-sublabel">H</label>
        <input v-model.number="element.height" type="number" min="10" class="property-input-sm" />
      </div>
    </div>
    <div class="property-group">
      <label class="property-label">Falloff</label>
      <select v-model="element.falloff" class="property-select">
        <option v-for="opt in falloffOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>
    <div class="property-group">
      <label class="property-label">
        <input type="checkbox" v-model="element.enabled" />
        Enabled
      </label>
    </div>
    <div class="property-group">
      <label class="property-label">
        <input type="checkbox" v-model="element.castShadows" />
        Cast Shadows
      </label>
    </div>
    <button class="delete-btn" @click="emit('delete')">🗑 Delete Light</button>
  </div>
</template>

<style scoped>
.light-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-sublabel { font-size: 8px; color: var(--text-muted, #888); }
.property-input, .property-select { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-input-sm { width: 60px; padding: 4px 6px; font-size: 9px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); border-radius: 2px; text-align: center; }
.property-row { display: flex; align-items: center; gap: 6px; }
.property-color { width: 100%; height: 30px; padding: 2px; border: 1px solid var(--border-color, #333); cursor: pointer; background: var(--bg-dark, #0f0f23); }
.property-range { width: calc(100% - 40px); margin-right: 8px; }
.property-value { font-size: 9px; color: var(--accent, #00d4ff); font-family: monospace; }
.delete-btn { width: 100%; padding: 8px; margin-top: 8px; background: var(--error, #ff4757); color: white; border: none; font-size: 9px; font-family: 'Press Start 2P', monospace; cursor: pointer; border-radius: 2px; }
.delete-btn:hover { opacity: 0.9; }
</style>
