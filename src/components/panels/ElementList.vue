<script setup>
/**
 * ElementList.vue
 *
 * Collapsible list of elements by type with:
 * - Section header with collapse toggle
 * - Select all checkbox
 * - Visibility toggle
 * - Add button
 * - Element items with selection state
 */

import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  iconClass: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    required: true
  },
  elements: {
    type: Array,
    default: () => []
  },
  selectedIds: {
    type: Array,
    default: () => []
  },
  collapsed: {
    type: Boolean,
    default: true
  },
  visible: {
    type: Boolean,
    default: true
  },
  showVisibility: {
    type: Boolean,
    default: false
  },
  showSelectAll: {
    type: Boolean,
    default: true
  },
  emptyText: {
    type: String,
    default: 'No elements'
  },
  // For displaying badges on items
  badgeKey: {
    type: String,
    default: null
  },
  badgeIcon: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'toggle-collapse',
  'toggle-visibility',
  'select-all',
  'add',
  'select'
])

// Computed: all elements selected
const allSelected = computed(() => {
  if (props.elements.length === 0) return false
  return props.elements.every(el => props.selectedIds.includes(el.id))
})

// Computed: some elements selected
const someSelected = computed(() => {
  if (props.elements.length === 0) return false
  const selectedCount = props.elements.filter(el => props.selectedIds.includes(el.id)).length
  return selectedCount > 0 && selectedCount < props.elements.length
})

// Check if element is selected
const isSelected = (elementId) => {
  return props.selectedIds.includes(elementId)
}

// Get element display name
const getElementName = (element) => {
  return element.name || `${props.type} #${element.id}`
}

// Get badge value
const getBadge = (element) => {
  if (!props.badgeKey) return null
  const value = element[props.badgeKey]
  if (Array.isArray(value)) return value.length
  return value
}
</script>

<template>
  <div class="element-section" :class="{ collapsed }">
    <!-- Section Header -->
    <div class="section-header" @click="$emit('toggle-collapse')">
      <!-- Collapse Arrow -->
      <span class="collapse-icon">{{ collapsed ? '&#9654;' : '&#9660;' }}</span>

      <!-- Select All Checkbox -->
      <input
        v-if="showSelectAll && elements.length > 0"
        type="checkbox"
        class="select-all-checkbox"
        :checked="allSelected"
        :indeterminate="someSelected"
        @click.stop="$emit('select-all')"
        title="Select all"
      />

      <!-- Visibility Toggle -->
      <button
        v-if="showVisibility"
        class="visibility-btn"
        :class="{ hidden: !visible }"
        @click.stop="$emit('toggle-visibility')"
        title="Toggle visibility"
      >
        &#128065;
      </button>

      <!-- Icon -->
      <span class="section-icon" :class="iconClass">{{ icon }}</span>

      <!-- Title -->
      <span class="section-name">{{ title }}</span>

      <!-- Count -->
      <span class="section-count">{{ elements.length }}</span>

      <!-- Add Button -->
      <button class="add-btn" @click.stop="$emit('add')" title="Add new">+</button>
    </div>

    <!-- Element List -->
    <div class="section-list" v-show="!collapsed">
      <div
        v-for="element in elements"
        :key="element.id"
        class="element-item"
        :class="{ selected: isSelected(element.id) }"
        @click="$emit('select', element, $event)"
      >
        <!-- Icon -->
        <span class="item-icon" :class="iconClass">{{ icon }}</span>

        <!-- ID -->
        <span class="item-id">#{{ element.id }}</span>

        <!-- Name -->
        <span class="item-name">{{ getElementName(element) }}</span>

        <!-- Badge -->
        <span v-if="getBadge(element)" class="item-badge">
          <span v-if="badgeIcon">{{ badgeIcon }}</span>
          {{ getBadge(element) }}
        </span>

        <!-- Interactive indicator -->
        <span v-if="element.interactive" class="item-badge interactive" title="Interactive">
          &#9889;
        </span>
      </div>

      <!-- Empty State -->
      <p v-if="elements.length === 0" class="empty-section">{{ emptyText }}</p>
    </div>
  </div>
</template>

<style scoped>
.element-section {
  border-bottom: 1px solid var(--border-color, #333355);
}

.element-section.collapsed {
  border-bottom-color: transparent;
}

/* Section Header */
.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: var(--bg-medium, #1a1a2e);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.section-header:hover {
  background: var(--bg-card, #1e1e3f);
}

.collapse-icon {
  font-size: 8px;
  color: var(--text-muted, #888);
  width: 12px;
  text-align: center;
}

.select-all-checkbox {
  width: 12px;
  height: 12px;
  cursor: pointer;
  accent-color: var(--accent, #00d4ff);
}

.visibility-btn {
  font-size: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  opacity: 1;
  transition: opacity 0.15s;
}

.visibility-btn.hidden {
  opacity: 0.3;
}

.section-icon {
  font-size: 12px;
}

.section-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-primary, #e0e0e0);
  flex: 1;
}

.section-count {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #666);
  background: var(--bg-dark, #0f0f23);
  padding: 2px 6px;
  border-radius: 10px;
}

.add-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  background: none;
  border: none;
  color: var(--success, #00ff88);
  cursor: pointer;
  padding: 2px 6px;
  transition: all 0.15s;
  border-radius: 4px;
}

.add-btn:hover {
  background: var(--success, #00ff88);
  color: var(--bg-dark, #0f0f23);
}

/* Section List */
.section-list {
  background: var(--bg-dark, #0f0f23);
}

/* Element Item */
.element-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 6px 24px;
  cursor: pointer;
  transition: background 0.1s;
  border-left: 3px solid transparent;
}

.element-item:hover {
  background: var(--bg-medium, #1a1a2e);
}

.element-item.selected {
  background: var(--bg-card, #1e1e3f);
  border-left-color: var(--accent, #00d4ff);
}

.item-icon {
  font-size: 10px;
  opacity: 0.7;
}

.item-id {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #666);
  min-width: 40px;
}

.item-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-primary, #e0e0e0);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-badge {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
  padding: 1px 4px;
  border-radius: 2px;
}

.item-badge.interactive {
  background: var(--warning, #ffaa00);
}

/* Empty State */
.empty-section {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #666);
  text-align: center;
  padding: 12px;
  margin: 0;
  font-style: italic;
}

/* Element type colors */
.text-image { color: #f472b6; }
.text-walkbox { color: #00ff88; }
.text-exit { color: #ff6b6b; }
.text-actor { color: #a855f7; }
.text-hotspot { color: #00d4ff; }
.text-zplane { color: #64748b; }
.text-dialog { color: #fbbf24; }
.text-puzzle { color: #34d399; }
.text-sfx { color: #60a5fa; }
.text-music { color: #c084fc; }
.text-cutscene { color: #06b6d4; }
.text-animation { color: #fb923c; }
.text-light { color: #fde047; }
.text-particle { color: #f87171; }
</style>
