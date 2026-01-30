<script setup>
/**
 * VerbProperties.vue
 * Property editor for verb icon and hotkey.
 */

const props = defineProps({
  element: { type: Object, required: true }
})
</script>

<template>
  <div class="verb-properties">
    <div class="property-group">
      <label class="property-label">Icon</label>
      <input
        v-model="element.icon"
        type="text"
        class="property-input"
        placeholder="Emoji icon"
      />
    </div>
    <div class="property-group">
      <label class="property-label">Hotkey</label>
      <input
        v-model="element.key"
        type="text"
        class="property-input"
        placeholder="Key (e.g., 'l')"
        maxlength="1"
      />
    </div>
  </div>
</template>

<style scoped>
.verb-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
</style>
