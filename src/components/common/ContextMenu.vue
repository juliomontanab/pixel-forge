<script setup>
/**
 * ContextMenu.vue
 *
 * Right-click context menu for canvas elements.
 * Shows actions based on selection state.
 */

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  selectedCount: {
    type: Number,
    default: 0
  },
  canGroup: {
    type: Boolean,
    default: false
  },
  selectionInGroup: {
    type: Boolean,
    default: false
  },
  hasGroups: {
    type: Boolean,
    default: false
  },
  selectedGroupName: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'close',
  'group',
  'select-group',
  'ungroup',
  'clear-groups',
  'duplicate',
  'delete'
])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu pixel-border"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <!-- Selection header -->
      <div v-if="selectedCount > 0" class="context-menu-header">
        {{ selectedCount }} element{{ selectedCount > 1 ? 's' : '' }} selected
      </div>

      <!-- Group options -->
      <button
        v-if="canGroup && !selectionInGroup"
        class="context-menu-item"
        @click="$emit('group'); $emit('close')"
      >
        <span class="menu-icon">🔗</span>
        Group Elements
      </button>

      <button
        v-if="selectionInGroup"
        class="context-menu-item"
        @click="$emit('select-group'); $emit('close')"
      >
        <span class="menu-icon">⬚</span>
        Select Entire Group
      </button>

      <button
        v-if="selectionInGroup"
        class="context-menu-item"
        @click="$emit('ungroup'); $emit('close')"
      >
        <span class="menu-icon">🔓</span>
        Ungroup
      </button>

      <button
        v-if="hasGroups"
        class="context-menu-item danger"
        @click="$emit('clear-groups'); $emit('close')"
      >
        <span class="menu-icon">🗑️</span>
        Clear All Groups
      </button>

      <div v-if="selectedCount > 0 && (canGroup || selectionInGroup)" class="context-menu-divider"></div>

      <!-- Common actions -->
      <button
        v-if="selectedCount > 0"
        class="context-menu-item"
        @click="$emit('duplicate'); $emit('close')"
      >
        <span class="menu-icon">📋</span>
        Duplicate
      </button>

      <button
        v-if="selectedCount > 0"
        class="context-menu-item context-menu-item-danger"
        @click="$emit('delete'); $emit('close')"
      >
        <span class="menu-icon">🗑</span>
        Delete
      </button>

      <!-- Group info -->
      <div v-if="selectedGroupName" class="context-menu-divider"></div>
      <div v-if="selectedGroupName" class="context-menu-info">
        <span class="menu-icon">📁</span>
        Group: {{ selectedGroupName }}
      </div>

      <!-- No selection -->
      <div v-if="selectedCount === 0" class="context-menu-info">
        No elements selected
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--bg-card, #1e1e3f);
  min-width: 180px;
  padding: 4px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
}

.context-menu-header {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #333355);
  margin-bottom: 4px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  background: transparent;
  color: var(--text-primary, #e0e0e0);
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.context-menu-item:hover {
  background: var(--bg-medium, #1a1a2e);
  color: var(--accent, #00d4ff);
}

.context-menu-item.danger:hover,
.context-menu-item-danger:hover {
  background: var(--error, #ff4757);
  color: white;
}

.menu-icon {
  font-size: 12px;
  width: 20px;
  text-align: center;
}

.context-menu-divider {
  height: 1px;
  background: var(--border-color, #333355);
  margin: 4px 8px;
}

.context-menu-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  padding: 8px 12px;
}

/* Pixel border effect */
.pixel-border {
  border: 2px solid var(--border-color, #333355);
}
</style>
