<script setup>
/**
 * ParticleProperties.vue
 * Property editor for particle emitters with presets and detailed controls.
 */

const props = defineProps({
  element: { type: Object, required: true },
  particlePresets: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['delete', 'apply-preset'])

const shapeOptions = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'star', label: 'Star' },
  { value: 'line', label: 'Line' }
]

const blendModeOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'screen', label: 'Screen (Additive)' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'overlay', label: 'Overlay' }
]

const handlePresetChange = (event) => {
  emit('apply-preset', event.target.value)
}
</script>

<template>
  <div class="particle-properties">
    <div class="property-group">
      <label class="property-label">Name</label>
      <input v-model="element.name" type="text" class="property-input" />
    </div>
    <div class="property-group">
      <label class="property-label">Preset</label>
      <select
        :value="element.preset"
        @change="handlePresetChange"
        class="property-select"
      >
        <option v-for="(preset, key) in particlePresets" :key="key" :value="key">
          {{ preset.icon }} {{ preset.name }}
        </option>
      </select>
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
      <label class="property-label">Emission Area</label>
      <div class="property-row">
        <label class="property-sublabel">W</label>
        <input v-model.number="element.width" type="number" min="1" class="property-input-sm" />
        <label class="property-sublabel">H</label>
        <input v-model.number="element.height" type="number" min="1" class="property-input-sm" />
      </div>
    </div>

    <div class="property-divider">
      <span>EMISSION</span>
    </div>
    <div class="property-group">
      <label class="property-label">Emit Rate (per sec)</label>
      <input v-model.number="element.emitRate" type="number" min="1" class="property-input" />
    </div>
    <div class="property-group">
      <label class="property-label">Lifetime (sec)</label>
      <div class="property-row">
        <label class="property-sublabel">Min</label>
        <input v-model.number="element.lifetime.min" type="number" step="0.1" min="0.1" class="property-input-sm" />
        <label class="property-sublabel">Max</label>
        <input v-model.number="element.lifetime.max" type="number" step="0.1" min="0.1" class="property-input-sm" />
      </div>
    </div>

    <div class="property-divider">
      <span>MOVEMENT</span>
    </div>
    <div class="property-group">
      <label class="property-label">Speed</label>
      <div class="property-row">
        <label class="property-sublabel">Min</label>
        <input v-model.number="element.speed.min" type="number" min="0" class="property-input-sm" />
        <label class="property-sublabel">Max</label>
        <input v-model.number="element.speed.max" type="number" min="0" class="property-input-sm" />
      </div>
    </div>
    <div class="property-group">
      <label class="property-label">Direction (deg)</label>
      <div class="property-row">
        <label class="property-sublabel">Min</label>
        <input v-model.number="element.direction.min" type="number" class="property-input-sm" />
        <label class="property-sublabel">Max</label>
        <input v-model.number="element.direction.max" type="number" class="property-input-sm" />
      </div>
    </div>
    <div class="property-group">
      <label class="property-label">Gravity</label>
      <input v-model.number="element.gravity" type="number" class="property-input" />
    </div>

    <div class="property-divider">
      <span>APPEARANCE</span>
    </div>
    <div class="property-group">
      <label class="property-label">Size</label>
      <div class="property-row">
        <label class="property-sublabel">Start</label>
        <input v-model.number="element.size.start" type="number" min="1" class="property-input-sm" />
        <label class="property-sublabel">End</label>
        <input v-model.number="element.size.end" type="number" min="1" class="property-input-sm" />
      </div>
    </div>
    <div class="property-group">
      <label class="property-label">Color Start</label>
      <input v-model="element.color.start" type="text" class="property-input" placeholder="#rrggbbaa" />
    </div>
    <div class="property-group">
      <label class="property-label">Color End</label>
      <input v-model="element.color.end" type="text" class="property-input" placeholder="#rrggbbaa" />
    </div>
    <div class="property-group">
      <label class="property-label">Shape</label>
      <select v-model="element.shape" class="property-select">
        <option v-for="opt in shapeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>
    <div class="property-group">
      <label class="property-label">Blend Mode</label>
      <select v-model="element.blendMode" class="property-select">
        <option v-for="opt in blendModeOptions" :key="opt.value" :value="opt.value">
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
    <button class="delete-btn" @click="emit('delete')">🗑 Delete Emitter</button>
  </div>
</template>

<style scoped>
.particle-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-sublabel { font-size: 8px; color: var(--text-muted, #888); }
.property-input, .property-select { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-input-sm { width: 60px; padding: 4px 6px; font-size: 9px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); border-radius: 2px; text-align: center; }
.property-row { display: flex; align-items: center; gap: 6px; }
.property-divider { margin: 12px 0 8px; padding: 4px 0; border-bottom: 1px solid var(--border-color, #333); }
.property-divider span { font-size: 9px; font-family: 'Press Start 2P', monospace; color: var(--accent, #00d4ff); }
.delete-btn { width: 100%; padding: 8px; margin-top: 8px; background: var(--error, #ff4757); color: white; border: none; font-size: 9px; font-family: 'Press Start 2P', monospace; cursor: pointer; border-radius: 2px; }
.delete-btn:hover { opacity: 0.9; }
</style>
