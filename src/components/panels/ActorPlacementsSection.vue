<script setup>
/**
 * ActorPlacementsSection.vue
 *
 * Section for managing actor placements in the current scene.
 * Shows actors placed in the scene with remove button for each.
 */

import { computed } from 'vue'

const props = defineProps({
  // Data
  placements: { type: Array, default: () => [] },

  // State
  collapsed: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  selectedElements: { type: Array, default: () => [] },

  // Functions
  getActorName: { type: Function, required: true }
})

const emit = defineEmits([
  'toggle-collapse',
  'toggle-visibility',
  'add',
  'select',
  'remove'
])

// Computed
const itemCount = computed(() => props.placements?.length || 0)

const isItemSelected = (item) => {
  return props.selectedElements.some(s => s.type === 'actorPlacement' && s.element.id === item.id)
}
</script>

<template>
  <div class="element-section" :class="{ collapsed }">
    <!-- Section Header -->
    <div class="section-header" @click="emit('toggle-collapse')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="section-icon text-actor">👤</span>
      <span class="section-name">Actors in Scene</span>
      <span class="section-count">{{ itemCount }}</span>

      <!-- Visibility Toggle -->
      <button
        class="visibility-btn"
        :class="{ hidden: !visible }"
        @click.stop="emit('toggle-visibility', 'actors')"
        title="Toggle visibility"
      >{{ visible ? '👁' : '👁' }}</button>

      <!-- Add Button -->
      <button
        class="add-btn"
        @click.stop="emit('add')"
        title="Place actor in scene"
      >+</button>
    </div>

    <!-- Section List -->
    <div class="section-list" v-show="!collapsed">
      <div
        v-for="placement in placements"
        :key="placement.id"
        class="element-item"
        :class="{ selected: isItemSelected(placement) }"
        @click="emit('select', 'actorPlacement', placement)"
      >
        <span class="item-icon text-actor">👤</span>
        <span class="item-name">{{ getActorName(placement.actorId) }}</span>
        <button
          class="remove-item-btn"
          @click.stop="emit('remove', placement.id)"
          title="Remove from scene"
        >×</button>
      </div>

      <!-- Empty state -->
      <p v-if="!placements?.length" class="empty-section">No actors placed</p>
    </div>
  </div>
</template>

<style scoped>
.element-section {
  margin-bottom: 2px;
}

.element-section.collapsed .section-list {
  display: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg-medium, #1a1a2e);
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--border-color, #333);
}

.section-header:hover {
  background: var(--bg-light, #16213e);
}

.collapse-icon {
  font-size: 8px;
  width: 12px;
  color: var(--text-muted, #888);
}

.section-icon {
  font-size: 12px;
}

.section-name {
  flex: 1;
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
  color: var(--text-primary, #fff);
}

.section-count {
  font-size: 9px;
  color: var(--text-muted, #888);
  background: var(--bg-dark, #0f0f23);
  padding: 2px 6px;
  border-radius: 4px;
}

.visibility-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
  opacity: 0.7;
}

.visibility-btn:hover {
  opacity: 1;
}

.visibility-btn.hidden {
  opacity: 0.3;
}

.add-btn {
  background: var(--primary, #c9a227);
  color: var(--bg-dark, #0f0f23);
  border: none;
  width: 18px;
  height: 18px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn:hover {
  background: var(--primary-light, #d4b43a);
}

.section-list {
  background: var(--bg-dark, #0f0f23);
}

.element-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 24px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color, #222);
}

.element-item:hover {
  background: var(--bg-medium, #1a1a2e);
}

.element-item.selected {
  background: var(--primary, #c9a227);
  color: var(--bg-dark, #0f0f23);
}

.element-item.selected .item-icon {
  color: var(--bg-dark, #0f0f23);
}

.item-icon {
  font-size: 10px;
}

.item-name {
  flex: 1;
  font-size: 9px;
  font-family: 'Press Start 2P', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-item-btn {
  background: var(--error, #ff4757);
  color: white;
  border: none;
  width: 16px;
  height: 16px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.remove-item-btn:hover {
  opacity: 1;
}

.empty-section {
  padding: 8px 24px;
  font-size: 9px;
  color: var(--text-muted, #666);
  font-style: italic;
  margin: 0;
}

/* Color class */
.text-actor { color: #a855f7; }
</style>
