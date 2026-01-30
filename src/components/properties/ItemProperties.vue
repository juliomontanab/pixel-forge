<script setup>
/**
 * ItemProperties.vue
 * Property editor for inventory items with icons, usage flags, and dialogs.
 */

const props = defineProps({
  element: { type: Object, required: true },
  assets: { type: Array, default: () => [] },
  dialogs: { type: Array, default: () => [] },
  getAssetById: { type: Function, default: () => null },
  getAssetDisplayUrl: { type: Function, default: () => null }
})

const emit = defineEmits(['add-to-inventory'])

const useWithOptions = ['hotspot', 'actor', 'exit', 'image']

const toggleUseWith = (target) => {
  if (!props.element.useWith) props.element.useWith = []
  const idx = props.element.useWith.indexOf(target)
  if (idx === -1) {
    props.element.useWith.push(target)
  } else {
    props.element.useWith.splice(idx, 1)
  }
}

const isUseWithChecked = (target) => {
  return (props.element.useWith || []).includes(target)
}
</script>

<template>
  <div class="item-properties">
    <div class="property-group">
      <label class="property-label">Description</label>
      <textarea
        v-model="element.description"
        class="property-input property-textarea"
        placeholder="Item description..."
      ></textarea>
    </div>
    <div class="property-group">
      <label class="property-label">Icon (Emoji)</label>
      <input
        v-model="element.icon"
        type="text"
        class="property-input"
        placeholder="Emoji (e.g., 🔑)"
      />
    </div>
    <div class="property-group">
      <label class="property-label">Icon (Image Asset)</label>
      <div class="asset-selector">
        <select v-model="element.iconAssetId" class="property-select">
          <option :value="null">-- Use emoji --</option>
          <option v-for="asset in assets" :key="asset.id" :value="asset.id">
            {{ asset.name }}
          </option>
        </select>
        <div
          v-if="element.iconAssetId && getAssetById(element.iconAssetId)"
          class="asset-preview-small"
          :style="{ backgroundImage: getAssetDisplayUrl(getAssetById(element.iconAssetId)) ? `url(${getAssetDisplayUrl(getAssetById(element.iconAssetId))})` : 'none' }"
        ></div>
      </div>
    </div>
    <div class="property-group">
      <label class="property-label">
        <input type="checkbox" v-model="element.combinable" />
        Can be combined with other items
      </label>
    </div>
    <div class="property-group">
      <label class="property-label">Can be used on</label>
      <div class="use-with-checkboxes">
        <label v-for="opt in useWithOptions" :key="opt">
          <input type="checkbox" :checked="isUseWithChecked(opt)" @change="toggleUseWith(opt)" />
          {{ opt.charAt(0).toUpperCase() + opt.slice(1) }}s
        </label>
      </div>
    </div>
    <div class="property-group">
      <label class="property-label">Pickup Dialog</label>
      <select v-model="element.pickupDialog" class="property-input">
        <option :value="null">-- None --</option>
        <option v-for="dialog in dialogs" :key="dialog.id" :value="dialog.id">
          {{ dialog.name }}
        </option>
      </select>
    </div>
    <div class="property-group">
      <label class="property-label">Examine Dialog</label>
      <select v-model="element.examineDialog" class="property-input">
        <option :value="null">-- None --</option>
        <option v-for="dialog in dialogs" :key="dialog.id" :value="dialog.id">
          {{ dialog.name }}
        </option>
      </select>
    </div>
    <div class="property-group">
      <button class="action-btn" @click="emit('add-to-inventory', element.id)">
        Add to Inventory
      </button>
    </div>
  </div>
</template>

<style scoped>
.item-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input, .property-select { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-textarea { min-height: 60px; resize: vertical; font-family: inherit; }
.asset-selector { display: flex; gap: 8px; align-items: center; }
.asset-selector .property-select { flex: 1; }
.asset-preview-small { width: 32px; height: 32px; background-size: contain; background-repeat: no-repeat; background-position: center; border: 1px solid var(--border-color, #333); border-radius: 2px; }
.use-with-checkboxes { display: flex; flex-wrap: wrap; gap: 8px; }
.use-with-checkboxes label { display: flex; align-items: center; gap: 4px; font-size: 9px; color: var(--text-primary, #fff); cursor: pointer; }
.action-btn { width: 100%; padding: 8px; background: var(--primary, #c9a227); color: var(--bg-dark, #0f0f23); border: none; font-size: 9px; font-family: 'Press Start 2P', monospace; cursor: pointer; border-radius: 2px; }
.action-btn:hover { opacity: 0.9; }
</style>
