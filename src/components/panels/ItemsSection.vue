<script setup>
/**
 * ItemsSection.vue
 * Section for managing global items with custom icons.
 */
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false },
  selectedElements: { type: Array, default: () => [] },
  itemHasAssetIcon: { type: Function, default: () => false },
  getItemIconStyle: { type: Function, default: () => ({}) }
})

const emit = defineEmits(['toggle-collapse', 'add', 'select'])

const itemCount = computed(() => props.items?.length || 0)
const isSelected = (item) => props.selectedElements.some(s => s.type === 'item' && s.element.id === item.id)
</script>

<template>
  <div class="element-section global-section" :class="{ collapsed }">
    <div class="section-header" @click="emit('toggle-collapse')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="section-icon text-item">📦</span>
      <span class="section-name">Items</span>
      <span class="section-count">{{ itemCount }}</span>
      <button class="add-btn" @click.stop="emit('add', 'item')">+</button>
    </div>
    <div class="section-list" v-show="!collapsed">
      <div
        v-for="item in items"
        :key="item.id"
        class="element-item"
        :class="{ selected: isSelected(item) }"
        @click="emit('select', 'item', item)"
      >
        <span v-if="itemHasAssetIcon(item)" class="item-icon item-icon-asset" :style="getItemIconStyle(item)"></span>
        <span v-else class="item-icon text-item">{{ item.icon || '📦' }}</span>
        <span class="item-id">#{{ item.id }}</span>
        <span class="item-name">{{ item.name }}</span>
      </div>
      <p v-if="!items?.length" class="empty-section">No items defined</p>
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
.item-icon-asset { width: 16px; height: 16px; background-size: contain; background-repeat: no-repeat; background-position: center; }
.item-id { font-size: 8px; color: var(--text-muted, #888); font-family: monospace; }
.item-name { flex: 1; font-size: 9px; font-family: 'Press Start 2P', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty-section { padding: 8px 24px; font-size: 9px; color: var(--text-muted, #666); font-style: italic; margin: 0; }
.text-item { color: #34d399; }
</style>
