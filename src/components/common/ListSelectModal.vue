<script setup>
/**
 * ListSelectModal.vue
 *
 * Modal for selecting items from a list.
 * Supports single and multi-select modes with checkmarks.
 */

import PixelModal from './PixelModal.vue'
import PixelButton from './PixelButton.vue'

const props = defineProps({
  // Modal visibility
  show: {
    type: Boolean,
    default: false
  },
  // Dialog title
  title: {
    type: String,
    default: 'Select Item'
  },
  // Items to display
  items: {
    type: Array,
    default: () => []
  },
  // Selected item IDs (for showing checkmarks)
  selectedIds: {
    type: Array,
    default: () => []
  },
  // Empty state message
  emptyMessage: {
    type: String,
    default: 'No items available'
  },
  // Done button text
  doneText: {
    type: String,
    default: 'Done'
  },
  // Key to use for item ID
  itemKey: {
    type: String,
    default: 'id'
  },
  // Key to use for item name
  nameKey: {
    type: String,
    default: 'name'
  },
  // Key to use for item icon (optional)
  iconKey: {
    type: String,
    default: 'icon'
  },
  // Default icon if item has no icon
  defaultIcon: {
    type: String,
    default: '📦'
  },
  // Close on item select (single-select mode)
  closeOnSelect: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'close', 'update:show'])

// Check if item is selected
const isSelected = (item) => {
  return props.selectedIds.includes(item[props.itemKey])
}

// Get item icon
const getIcon = (item) => {
  return item[props.iconKey] || props.defaultIcon
}

// Handle item click
const handleItemClick = (item) => {
  emit('select', item)

  if (props.closeOnSelect) {
    emit('close')
    emit('update:show', false)
  }
}

// Handle done click
const handleDone = () => {
  emit('close')
  emit('update:show', false)
}
</script>

<template>
  <PixelModal
    :show="show"
    :title="title"
    size="small"
    @close="handleDone"
  >
    <div v-if="items.length === 0" class="empty-state">
      {{ emptyMessage }}
    </div>

    <div v-else class="item-list">
      <div
        v-for="item in items"
        :key="item[itemKey]"
        class="item-row"
        :class="{ selected: isSelected(item) }"
        @click="handleItemClick(item)"
      >
        <span class="item-icon">{{ getIcon(item) }}</span>
        <span class="item-name">{{ item[nameKey] }}</span>
        <span v-if="isSelected(item)" class="item-check">✓</span>
      </div>
    </div>

    <template #footer>
      <PixelButton
        variant="primary"
        size="sm"
        @click="handleDone"
      >
        {{ doneText }}
      </PixelButton>
    </template>
  </PixelModal>
</template>

<style scoped>
.empty-state {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #666);
  text-align: center;
  padding: 24px 16px;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-medium, #1a1a2e);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.item-row:hover {
  background: var(--bg-light, #16213e);
}

.item-row.selected {
  background: var(--bg-light, #16213e);
  border: 1px solid var(--success, #00ff88);
}

.item-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
}

.item-name {
  flex: 1;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-primary, #e0e0e0);
}

.item-check {
  color: var(--success, #00ff88);
  font-size: 14px;
  font-weight: bold;
}
</style>
