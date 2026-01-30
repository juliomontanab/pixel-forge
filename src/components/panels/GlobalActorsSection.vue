<script setup>
/**
 * GlobalActorsSection.vue
 * Section for managing global actors/characters with place-in-scene button.
 */
import { computed } from 'vue'

const props = defineProps({
  actors: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false },
  selectedElements: { type: Array, default: () => [] },
  actorPlacements: { type: Array, default: () => [] }
})

const emit = defineEmits(['toggle-collapse', 'add', 'select', 'place'])

const itemCount = computed(() => props.actors?.length || 0)
const isSelected = (actor) => props.selectedElements.some(s => s.type === 'globalActor' && s.element.id === actor.id)
const isPlaced = (actor) => props.actorPlacements.some(p => p.actorId === actor.id)
</script>

<template>
  <div class="element-section global-section" :class="{ collapsed }">
    <div class="section-header" @click="emit('toggle-collapse')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="section-icon text-actor">👥</span>
      <span class="section-name">Characters</span>
      <span class="section-count">{{ itemCount }}</span>
      <button class="add-btn" @click.stop="emit('add')" title="Add new character">+</button>
    </div>
    <div class="section-list" v-show="!collapsed">
      <div
        v-for="actor in actors"
        :key="actor.id"
        class="element-item"
        :class="{ selected: isSelected(actor) }"
        @click="emit('select', 'globalActor', actor)"
      >
        <span class="item-icon text-actor">👤</span>
        <span class="item-name">{{ actor.name }}</span>
        <button
          class="place-actor-btn"
          @click.stop="emit('place', actor.id)"
          title="Place in current scene"
          :disabled="isPlaced(actor)"
        >📍</button>
      </div>
      <p v-if="!actors?.length" class="empty-section">No characters</p>
    </div>
  </div>
</template>

<style scoped>
.element-section { margin-bottom: 2px; }
.global-section .section-header { background: var(--bg-card, #1e1e3f); }
.section-header { display: flex; align-items: center; gap: 4px; padding: 6px 8px; cursor: pointer; user-select: none; border-bottom: 1px solid var(--border-color, #333); }
.section-header:hover { background: var(--bg-light, #16213e); }
.collapse-icon { font-size: 8px; width: 12px; color: var(--text-muted, #888); }
.section-icon { font-size: 12px; }
.section-name { flex: 1; font-size: 10px; font-family: 'Press Start 2P', monospace; color: var(--text-primary, #fff); }
.section-count { font-size: 9px; color: var(--text-muted, #888); background: var(--bg-dark, #0f0f23); padding: 2px 6px; border-radius: 4px; }
.add-btn { background: var(--primary, #c9a227); color: var(--bg-dark, #0f0f23); border: none; width: 18px; height: 18px; font-size: 14px; font-weight: bold; cursor: pointer; border-radius: 2px; display: flex; align-items: center; justify-content: center; }
.section-list { background: var(--bg-dark, #0f0f23); }
.element-item { display: flex; align-items: center; gap: 6px; padding: 4px 8px 4px 24px; cursor: pointer; border-bottom: 1px solid var(--border-color, #222); }
.element-item:hover { background: var(--bg-medium, #1a1a2e); }
.element-item.selected { background: var(--primary, #c9a227); color: var(--bg-dark, #0f0f23); }
.item-icon { font-size: 10px; }
.item-name { flex: 1; font-size: 9px; font-family: 'Press Start 2P', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.place-actor-btn { background: var(--success, #00ff88); color: var(--bg-dark, #0f0f23); border: none; width: 20px; height: 20px; font-size: 10px; cursor: pointer; border-radius: 2px; }
.place-actor-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.empty-section { padding: 8px 24px; font-size: 9px; color: var(--text-muted, #666); font-style: italic; margin: 0; }
.text-actor { color: #a855f7; }
</style>
