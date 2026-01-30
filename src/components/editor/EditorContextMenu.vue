<script setup>
/**
 * EditorContextMenu.vue
 * Context menu for canvas elements with grouping and common actions.
 */

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  selectedCount: { type: Number, default: 0 },
  canGroup: { type: Boolean, default: false },
  selectionInGroup: { type: Boolean, default: false },
  hasGroups: { type: Boolean, default: false },
  selectedGroup: { type: Object, default: null }
})

const emit = defineEmits([
  'create-group',
  'select-group',
  'ungroup',
  'clear-all-groups',
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
      <div class="context-menu-header" v-if="selectedCount > 0">
        {{ selectedCount }} element{{ selectedCount > 1 ? 's' : '' }} selected
      </div>

      <!-- Group options -->
      <button
        v-if="canGroup && !selectionInGroup"
        class="context-menu-item"
        @click="emit('create-group')"
      >
        <span class="menu-icon">🔗</span>
        Group Elements
      </button>

      <button
        v-if="selectionInGroup"
        class="context-menu-item"
        @click="emit('select-group')"
      >
        <span class="menu-icon">⬚</span>
        Select Entire Group
      </button>

      <button
        v-if="selectionInGroup"
        class="context-menu-item"
        @click="emit('ungroup')"
      >
        <span class="menu-icon">🔓</span>
        Ungroup
      </button>

      <button
        v-if="hasGroups"
        class="context-menu-item danger"
        @click="emit('clear-all-groups')"
      >
        <span class="menu-icon">🗑️</span>
        Clear All Groups
      </button>

      <div v-if="selectedCount > 0 && (canGroup || selectionInGroup)" class="context-menu-divider"></div>

      <!-- Common actions -->
      <button
        v-if="selectedCount > 0"
        class="context-menu-item"
        @click="emit('duplicate')"
      >
        <span class="menu-icon">📋</span>
        Duplicate
      </button>

      <button
        v-if="selectedCount > 0"
        class="context-menu-item context-menu-item-danger"
        @click="emit('delete')"
      >
        <span class="menu-icon">🗑</span>
        Delete
      </button>

      <!-- Group info -->
      <div v-if="selectedGroup" class="context-menu-divider"></div>
      <div v-if="selectedGroup" class="context-menu-info">
        <span class="menu-icon">📁</span>
        Group: {{ selectedGroup.name }}
      </div>

      <!-- No selection -->
      <div v-if="selectedCount === 0" class="context-menu-info">
        No elements selected
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu { position: fixed; background: var(--bg-card, #1e1e3f); border: 2px solid var(--primary, #c9a227); border-radius: 4px; padding: 4px 0; min-width: 180px; z-index: 2000; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); }
.context-menu-header { padding: 8px 12px; font-size: 9px; color: var(--text-muted, #888); border-bottom: 1px solid var(--border-color, #333); font-family: 'Press Start 2P', monospace; }
.context-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: none; border: none; color: var(--text-primary, #fff); font-size: 10px; text-align: left; cursor: pointer; transition: background 0.2s; }
.context-menu-item:hover { background: var(--bg-medium, #1a1a2e); }
.context-menu-item.danger:hover { background: var(--error, #ff4757)20; }
.context-menu-item-danger { color: var(--error, #ff4757); }
.context-menu-divider { height: 1px; background: var(--border-color, #333); margin: 4px 0; }
.context-menu-info { padding: 8px 12px; font-size: 9px; color: var(--text-muted, #888); display: flex; align-items: center; gap: 8px; }
.menu-icon { font-size: 12px; width: 18px; text-align: center; }
.pixel-border { image-rendering: pixelated; }
</style>
