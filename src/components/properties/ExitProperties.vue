<script setup>
/**
 * ExitProperties.vue
 * Property editor for scene exits with target scene selection.
 */

const props = defineProps({
  element: { type: Object, required: true },
  scenes: { type: Array, default: () => [] },
  currentSceneId: { type: [Number, String], default: null }
})

const availableScenes = computed(() => {
  return props.scenes.filter(s => s.id !== props.currentSceneId)
})

import { computed } from 'vue'
</script>

<template>
  <div class="exit-properties">
    <div class="property-group">
      <label class="property-label">Target Scene</label>
      <select v-model="element.targetScene" class="property-select">
        <option value="">-- Select scene --</option>
        <option
          v-for="scene in availableScenes"
          :key="scene.id"
          :value="scene.id"
        >
          {{ scene.name }} ({{ scene.id }})
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.exit-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-select { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
</style>
