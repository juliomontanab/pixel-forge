<script setup>
/**
 * ZPlaneProperties.vue
 * Property editor for Z-Plane z-index.
 */

const props = defineProps({
  element: { type: Object, required: true }
})
</script>

<template>
  <div class="zplane-properties">
    <div class="property-group">
      <label class="property-label">Z-Index</label>
      <input
        v-model.number="element.zIndex"
        type="number"
        class="property-input"
      />
    </div>
  </div>
</template>

<style scoped>
.zplane-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
</style>
