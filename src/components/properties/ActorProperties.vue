<script setup>
/**
 * ActorProperties.vue
 * Property editor for actor placements with direction and animation state assignments.
 */

const props = defineProps({
  element: { type: Object, required: true },
  actorAnimationStates: { type: Array, default: () => [] },
  globalAnimations: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="actor-properties">
    <!-- Direction -->
    <div class="property-group">
      <label class="property-label">Direction</label>
      <select v-model="element.direction" class="property-input">
        <option value="north">North</option>
        <option value="south">South</option>
        <option value="east">East</option>
        <option value="west">West</option>
      </select>
    </div>

    <!-- Animations -->
    <div class="property-group" v-if="element.animations">
      <label class="property-label">Animations</label>
      <div class="actor-animations-config">
        <div class="animation-preview-state">
          <span class="animation-label">Preview State:</span>
          <select v-model="element.currentState" class="property-select-sm">
            <option v-for="state in actorAnimationStates" :key="state.key" :value="state.key">
              {{ state.icon }} {{ state.label }}
            </option>
          </select>
        </div>
        <div class="animation-assignments">
          <div
            v-for="state in actorAnimationStates"
            :key="state.key"
            class="animation-assignment-row"
          >
            <span class="animation-state-name">{{ state.icon }} {{ state.label }}:</span>
            <select
              v-model="element.animations[state.key]"
              class="property-select-sm"
            >
              <option :value="null">-- Ninguna --</option>
              <option
                v-for="anim in globalAnimations"
                :key="anim.id"
                :value="anim.id"
              >
                {{ anim.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.actor-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.actor-animations-config { background: var(--bg-medium, #1a1a2e); padding: 8px; border-radius: 4px; }
.animation-preview-state { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-color, #333); }
.animation-label { font-size: 9px; color: var(--text-muted, #888); }
.property-select-sm { padding: 4px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 9px; border-radius: 2px; flex: 1; }
.animation-assignments { display: flex; flex-direction: column; gap: 6px; }
.animation-assignment-row { display: flex; align-items: center; gap: 8px; }
.animation-state-name { font-size: 8px; color: var(--text-muted, #888); min-width: 80px; }
</style>
