<script setup>
/**
 * AnimationsSection.vue
 *
 * Section for managing global animations.
 * Shows animations with frame count and usage info (which actors use them).
 */

import { computed } from 'vue'

const props = defineProps({
  // Data
  animations: { type: Array, default: () => [] },

  // State
  collapsed: { type: Boolean, default: false },
  selectedElements: { type: Array, default: () => [] },

  // Functions
  getAnimationUsage: { type: Function, required: true }
})

const emit = defineEmits([
  'toggle-collapse',
  'add',
  'select'
])

// Computed
const itemCount = computed(() => props.animations?.length || 0)

const isItemSelected = (item) => {
  return props.selectedElements.some(s => s.type === 'animation' && s.element.id === item.id)
}
</script>

<template>
  <div class="element-section" :class="{ collapsed }">
    <!-- Section Header -->
    <div class="section-header" @click="emit('toggle-collapse')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="section-icon text-animation">🎞</span>
      <span class="section-name">Animations</span>
      <span class="section-count">{{ itemCount }}</span>

      <!-- Add Button -->
      <button
        class="add-btn"
        @click.stop="emit('add')"
        title="Open Spritesheet Editor"
      >+</button>
    </div>

    <!-- Section List -->
    <div class="section-list" v-show="!collapsed">
      <div
        v-for="anim in animations"
        :key="anim.id"
        class="element-item animation-item-extended"
        :class="{ selected: isItemSelected(anim) }"
        @click="emit('select', 'animation', anim)"
      >
        <div class="animation-item-main">
          <span class="item-icon text-animation">🎞</span>
          <span class="item-name">{{ anim.name }}</span>
          <span class="item-badge">{{ anim.frames?.length || 0 }}f</span>
        </div>
        <div class="animation-item-usage" v-if="getAnimationUsage(anim.id).length > 0">
          <span
            v-for="usage in getAnimationUsage(anim.id)"
            :key="`${usage.actorId}-${usage.state}`"
            class="usage-tag"
            :title="`${usage.actorName} - ${usage.stateLabel}`"
          >
            {{ usage.stateIcon }} {{ usage.actorName }}
          </span>
        </div>
        <div class="animation-item-usage unassigned" v-else>
          <span class="usage-tag unused">Sin asignar</span>
        </div>
      </div>

      <!-- Empty state -->
      <p v-if="!animations?.length" class="empty-section">No animations</p>
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

.element-item.selected .item-icon,
.element-item.selected .item-badge {
  color: var(--bg-dark, #0f0f23);
}

.animation-item-extended {
  display: flex;
  flex-direction: column;
  padding: 6px 8px 6px 24px;
  gap: 4px;
}

.animation-item-main {
  display: flex;
  align-items: center;
  gap: 6px;
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

.item-badge {
  font-size: 8px;
  color: var(--text-muted, #888);
  background: var(--bg-medium, #1a1a2e);
  padding: 1px 4px;
  border-radius: 2px;
}

.animation-item-usage {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-left: 16px;
}

.animation-item-usage.unassigned {
  opacity: 0.6;
}

.usage-tag {
  font-size: 7px;
  font-family: 'Press Start 2P', monospace;
  background: var(--bg-medium, #1a1a2e);
  padding: 2px 4px;
  border-radius: 2px;
  color: var(--accent, #00d4ff);
}

.usage-tag.unused {
  color: var(--text-muted, #888);
  font-style: italic;
}

.element-item.selected .usage-tag {
  background: rgba(0, 0, 0, 0.2);
  color: var(--bg-dark, #0f0f23);
}

.empty-section {
  padding: 8px 24px;
  font-size: 9px;
  color: var(--text-muted, #666);
  font-style: italic;
  margin: 0;
}

/* Color class */
.text-animation { color: #8b5cf6; }
</style>
