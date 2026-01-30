<script setup>
/**
 * SceneSettingsPanel.vue
 * Property panel for scene settings (shown when no elements are selected).
 */

const props = defineProps({
  scene: { type: Object, required: true },
  assets: { type: Array, default: () => [] },
  backgroundAsset: { type: Object, default: null },
  backgroundNeedsScaling: { type: Boolean, default: false },
  getAssetById: { type: Function, default: () => null },
  getAssetDisplayUrl: { type: Function, default: () => null }
})

const emit = defineEmits(['auto-save', 'show-scale-modal'])
</script>

<template>
  <div class="scene-settings">
    <div class="property-header">
      <span class="property-type">SCENE</span>
    </div>

    <div class="property-group">
      <label class="property-label">Name</label>
      <input
        v-model="scene.name"
        type="text"
        class="property-input"
      />
    </div>

    <div class="property-group">
      <label class="property-label">Size</label>
      <div class="property-row">
        <input
          v-model.number="scene.width"
          type="number"
          class="property-input small"
          placeholder="Width"
        />
        <span class="property-unit">x</span>
        <input
          v-model.number="scene.height"
          type="number"
          class="property-input small"
          placeholder="Height"
        />
      </div>
    </div>

    <div class="property-group">
      <label class="property-label">Background</label>
      <div class="asset-selector">
        <select
          v-model="scene.background"
          class="property-select"
          @change="emit('auto-save')"
        >
          <option :value="null">-- No background --</option>
          <option
            v-for="asset in assets"
            :key="asset.id"
            :value="asset.id"
          >
            {{ asset.name }} ({{ asset.width }}x{{ asset.height }})
          </option>
        </select>
        <div
          v-if="scene.background && getAssetById(scene.background)"
          class="asset-preview-small"
          :style="{ backgroundImage: getAssetDisplayUrl(getAssetById(scene.background)) ? `url(${getAssetDisplayUrl(getAssetById(scene.background))})` : 'none' }"
        ></div>
      </div>

      <!-- Scale to canvas button -->
      <div v-if="backgroundNeedsScaling" class="background-scale-hint">
        <span class="size-mismatch-text">
          {{ backgroundAsset?.width }}x{{ backgroundAsset?.height }} != {{ scene.width }}x{{ scene.height }}
        </span>
        <button
          class="scale-background-btn"
          @click="emit('show-scale-modal')"
          title="Ajustar imagen al tamano del canvas"
        >
          Ajustar al Canvas
        </button>
      </div>
    </div>

    <p class="pixel-font-sm text-muted hint-text">Select an element to edit its properties</p>
  </div>
</template>

<style scoped>
.scene-settings { padding: 8px 0; }
.property-header { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color, #333); }
.property-type { font-size: 10px; font-family: 'Press Start 2P', monospace; color: var(--primary, #c9a227); }
.property-group { margin-bottom: 12px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-input.small { width: 80px; }
.property-row { display: flex; align-items: center; gap: 8px; }
.property-unit { font-size: 10px; color: var(--text-muted, #888); }
.property-select { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.asset-selector { display: flex; gap: 8px; align-items: center; }
.asset-selector .property-select { flex: 1; }
.asset-preview-small { width: 32px; height: 32px; background-size: contain; background-repeat: no-repeat; background-position: center; border: 1px solid var(--border-color, #333); border-radius: 2px; flex-shrink: 0; }
.background-scale-hint { margin-top: 8px; padding: 8px; background: var(--warning, #ffaa00)20; border: 1px solid var(--warning, #ffaa00); border-radius: 4px; }
.size-mismatch-text { display: block; font-size: 8px; color: var(--warning, #ffaa00); margin-bottom: 6px; }
.scale-background-btn { width: 100%; padding: 6px 8px; background: var(--warning, #ffaa00); color: var(--bg-dark, #0f0f23); border: none; font-size: 9px; font-family: 'Press Start 2P', monospace; cursor: pointer; border-radius: 2px; }
.scale-background-btn:hover { opacity: 0.9; }
.hint-text { font-size: 8px; color: var(--text-muted, #666); margin-top: 16px; }
.pixel-font-sm { font-family: 'Press Start 2P', monospace; }
.text-muted { color: var(--text-muted, #888); }
</style>
