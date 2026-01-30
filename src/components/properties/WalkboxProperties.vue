<script setup>
/**
 * WalkboxProperties.vue
 * Property editor for walkbox rotation and vertex points.
 */

const props = defineProps({
  element: { type: Object, required: true }
})
</script>

<template>
  <div class="walkbox-properties">
    <!-- Rotation -->
    <div class="property-group" v-if="element.rotation !== undefined">
      <label class="property-label">Rotation</label>
      <div class="property-row">
        <input
          v-model.number="element.rotation"
          type="number"
          class="property-input"
          placeholder="0"
          min="0"
          max="360"
        />
        <span class="property-unit">deg</span>
      </div>
    </div>

    <!-- Points -->
    <div class="property-group" v-if="element.points">
      <label class="property-label">Points ({{ element.points.length }})</label>
      <div class="walkbox-points">
        <div v-for="(point, idx) in element.points" :key="idx" class="point-row">
          <span class="point-label">P{{ idx + 1 }}:</span>
          <input v-model.number="point.x" type="number" class="property-input tiny" />
          <input v-model.number="point.y" type="number" class="property-input tiny" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.walkbox-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-input.tiny { width: 60px; }
.property-row { display: flex; align-items: center; gap: 8px; }
.property-unit { font-size: 10px; color: var(--text-muted, #888); }
.walkbox-points { display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow-y: auto; }
.point-row { display: flex; align-items: center; gap: 4px; }
.point-label { font-size: 9px; color: var(--text-muted, #888); min-width: 30px; }
</style>
