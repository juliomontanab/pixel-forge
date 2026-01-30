<script setup>
/**
 * ImageProperties.vue
 * Property editor for image elements with behavior flags, asset selection, and parallax settings.
 */

const props = defineProps({
  element: { type: Object, required: true },
  assets: { type: Array, default: () => [] },
  getAssetById: { type: Function, default: () => null },
  getAssetDisplayUrl: { type: Function, default: () => null }
})

const emit = defineEmits(['ensure-parallax-defaults'])

const ensureParallaxDefaults = () => {
  emit('ensure-parallax-defaults', props.element)
}
</script>

<template>
  <div class="image-properties">
    <!-- Behavior -->
    <div class="property-group">
      <label class="property-label">Behavior</label>
      <div class="property-checkboxes">
        <label class="checkbox-label">
          <input type="checkbox" v-model="element.interactive" />
          <span>Interactive</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="element.pickable" />
          <span>Pickable</span>
        </label>
      </div>
    </div>

    <!-- Z-Order -->
    <div class="property-group">
      <label class="property-label">Z-Order</label>
      <input
        v-model.number="element.zOrder"
        type="number"
        class="property-input"
        placeholder="0"
      />
    </div>

    <!-- Image Asset -->
    <div class="property-group">
      <label class="property-label">Image Asset</label>
      <div class="asset-selector">
        <select v-model="element.assetId" class="property-select">
          <option :value="null">-- No image --</option>
          <option
            v-for="asset in assets"
            :key="asset.id"
            :value="asset.id"
          >
            {{ asset.name }} ({{ asset.width }}×{{ asset.height }})
          </option>
        </select>
        <div
          v-if="element.assetId && getAssetById(element.assetId)"
          class="asset-preview-small"
          :style="{ backgroundImage: getAssetDisplayUrl(getAssetById(element.assetId)) ? `url(${getAssetDisplayUrl(getAssetById(element.assetId))})` : 'none' }"
        ></div>
      </div>
    </div>

    <!-- Parallax Enable -->
    <div class="property-group">
      <label class="property-label">
        <input
          type="checkbox"
          v-model="element.parallax.enabled"
          @change="ensureParallaxDefaults"
        />
        Parallax Effect
      </label>
    </div>

    <!-- Parallax Settings -->
    <template v-if="element.parallax?.enabled">
      <div class="property-group">
        <label class="property-label">Depth Layer</label>
        <div class="parallax-depth-control">
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            v-model.number="element.parallax.depth"
            class="property-range"
          />
          <span class="property-value">{{ element.parallax.depth?.toFixed(1) || '1.0' }}</span>
        </div>
        <div class="depth-hints">
          <span class="hint-item" :class="{ active: element.parallax.depth < 0.5 }">Far BG</span>
          <span class="hint-item" :class="{ active: element.parallax.depth >= 0.5 && element.parallax.depth < 1 }">Mid BG</span>
          <span class="hint-item" :class="{ active: element.parallax.depth >= 1 && element.parallax.depth <= 1.1 }">Normal</span>
          <span class="hint-item" :class="{ active: element.parallax.depth > 1.1 }">Foreground</span>
        </div>
      </div>

      <div class="property-group">
        <label class="property-label">Tiling</label>
        <div class="property-checkboxes">
          <label class="checkbox-label">
            <input type="checkbox" v-model="element.parallax.repeatX" />
            <span>Repeat X</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="element.parallax.repeatY" />
            <span>Repeat Y</span>
          </label>
        </div>
      </div>

      <div class="property-group">
        <label class="property-label">Auto-Scroll (px/sec)</label>
        <div class="property-row">
          <label class="property-sublabel">X</label>
          <input
            type="number"
            v-model.number="element.parallax.autoScrollX"
            class="property-input-sm"
            placeholder="0"
          />
          <label class="property-sublabel">Y</label>
          <input
            type="number"
            v-model.number="element.parallax.autoScrollY"
            class="property-input-sm"
            placeholder="0"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.image-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input, .property-select { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-input-sm { width: 60px; padding: 4px 6px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-checkboxes { display: flex; flex-wrap: wrap; gap: 12px; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--text-primary, #fff); cursor: pointer; }
.asset-selector { display: flex; gap: 8px; align-items: center; }
.asset-selector .property-select { flex: 1; }
.asset-preview-small { width: 32px; height: 32px; background-size: contain; background-repeat: no-repeat; background-position: center; border: 1px solid var(--border-color, #333); border-radius: 2px; flex-shrink: 0; }
.parallax-depth-control { display: flex; align-items: center; gap: 8px; }
.property-range { flex: 1; height: 6px; -webkit-appearance: none; background: var(--bg-dark, #0f0f23); border-radius: 3px; }
.property-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: var(--primary, #c9a227); border-radius: 50%; cursor: pointer; }
.property-value { font-size: 10px; color: var(--accent, #00d4ff); min-width: 30px; text-align: right; }
.depth-hints { display: flex; justify-content: space-between; margin-top: 4px; }
.hint-item { font-size: 7px; color: var(--text-muted, #666); padding: 2px 4px; border-radius: 2px; }
.hint-item.active { background: var(--primary, #c9a227); color: var(--bg-dark, #0f0f23); }
.property-row { display: flex; align-items: center; gap: 8px; }
.property-sublabel { font-size: 9px; color: var(--text-muted, #888); }
</style>
