<script setup>
/**
 * ElementSection.vue
 *
 * Componente genérico para secciones de elementos en el panel izquierdo.
 * Reemplaza el patrón repetitivo de 15+ secciones.
 */

import { computed } from 'vue'

const props = defineProps({
  // Element type identifiers
  type: { type: String, required: true }, // 'image', 'walkbox', etc.
  typePlural: { type: String, required: true }, // 'images', 'walkboxes', etc.

  // Display
  icon: { type: String, default: '📦' },
  label: { type: String, required: true },

  // Data
  items: { type: Array, default: () => [] },

  // State
  collapsed: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  selectedElements: { type: Array, default: () => [] },

  // Options
  showVisibility: { type: Boolean, default: true },
  showAdd: { type: Boolean, default: true },
  showSelectAll: { type: Boolean, default: true },

  // Custom display
  getItemName: { type: Function, default: null },
  getItemIcon: { type: Function, default: null },
  colorClass: { type: String, default: '' }
})

const emit = defineEmits([
  'toggle-collapse',
  'toggle-visibility',
  'add',
  'select',
  'select-all'
])

// Computed
const itemCount = computed(() => props.items?.length || 0)

const isAllSelected = computed(() => {
  if (!props.items?.length) return false
  return props.items.every(item =>
    props.selectedElements.some(s => s.type === props.type && s.element.id === item.id)
  )
})

const isSomeSelected = computed(() => {
  if (!props.items?.length) return false
  const selectedCount = props.items.filter(item =>
    props.selectedElements.some(s => s.type === props.type && s.element.id === item.id)
  ).length
  return selectedCount > 0 && selectedCount < props.items.length
})

const isItemSelected = (item) => {
  return props.selectedElements.some(s => s.type === props.type && s.element.id === item.id)
}

const getDisplayName = (item) => {
  if (props.getItemName) return props.getItemName(item)
  return item.name || `${props.label} ${item.id}`
}

const getDisplayIcon = (item) => {
  if (props.getItemIcon) return props.getItemIcon(item)
  return props.icon
}
</script>

<template>
  <div class="element-section" :class="{ collapsed }">
    <!-- Section Header -->
    <div class="section-header" @click="emit('toggle-collapse')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>

      <!-- Select All Checkbox -->
      <input
        v-if="showSelectAll"
        type="checkbox"
        class="select-all-checkbox"
        :checked="isAllSelected"
        :indeterminate="isSomeSelected"
        @click.stop="emit('select-all', type, typePlural)"
        title="Select all"
      />

      <!-- Icon & Label -->
      <span class="section-icon" :class="colorClass">{{ icon }}</span>
      <span class="section-name">{{ label }}</span>
      <span class="section-count">{{ itemCount }}</span>

      <!-- Visibility Toggle -->
      <button
        v-if="showVisibility"
        class="visibility-btn"
        :class="{ hidden: !visible }"
        @click.stop="emit('toggle-visibility', typePlural)"
        title="Toggle visibility"
      >
        {{ visible ? '👁' : '👁' }}
      </button>

      <!-- Add Button -->
      <button
        v-if="showAdd"
        class="add-btn"
        @click.stop="emit('add', type)"
      >+</button>
    </div>

    <!-- Section List -->
    <div class="section-list" v-show="!collapsed">
      <div
        v-for="item in items"
        :key="item.id"
        class="element-item"
        :class="{ selected: isItemSelected(item) }"
        @click="emit('select', type, item)"
      >
        <span class="item-icon" :class="colorClass">{{ getDisplayIcon(item) }}</span>
        <span class="item-id">#{{ item.id }}</span>
        <span class="item-name">{{ getDisplayName(item) }}</span>

        <!-- Slot for custom badges -->
        <slot name="item-badges" :item="item"></slot>
      </div>

      <!-- Empty state -->
      <div v-if="!items?.length" class="empty-section">
        No {{ label.toLowerCase() }}
      </div>
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

.select-all-checkbox {
  width: 12px;
  height: 12px;
  cursor: pointer;
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

.element-item.selected .item-id,
.element-item.selected .item-icon {
  color: var(--bg-dark, #0f0f23);
}

.item-icon {
  font-size: 10px;
}

.item-id {
  font-size: 8px;
  color: var(--text-muted, #888);
  font-family: monospace;
}

.item-name {
  flex: 1;
  font-size: 9px;
  font-family: 'Press Start 2P', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-section {
  padding: 8px 24px;
  font-size: 9px;
  color: var(--text-muted, #666);
  font-style: italic;
}

/* Color classes for different element types */
.text-image { color: #f472b6; }
.text-walkbox { color: #00ff88; }
.text-exit { color: #ff6b6b; }
.text-actor { color: #a855f7; }
.text-hotspot { color: #00d4ff; }
.text-zplane { color: #64748b; }
.text-dialog { color: #fbbf24; }
.text-puzzle { color: #34d399; }
.text-sfx { color: #f97316; }
.text-music { color: #ec4899; }
.text-cutscene { color: #06b6d4; }
.text-animation { color: #8b5cf6; }
.text-light { color: #fef08a; }
.text-particle { color: #fb923c; }
</style>
