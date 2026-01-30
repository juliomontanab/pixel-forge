<script setup>
/**
 * InventorySection.vue
 * Section for managing player's inventory with remove button.
 */
import { computed } from 'vue'

const props = defineProps({
  inventory: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false },
  getItemById: { type: Function, required: true },
  itemHasAssetIcon: { type: Function, default: () => false },
  getItemIconStyle: { type: Function, default: () => ({}) }
})

const emit = defineEmits(['toggle-collapse', 'add', 'remove'])

const itemCount = computed(() => props.inventory?.length || 0)
</script>

<template>
  <div class="element-section global-section" :class="{ collapsed }">
    <div class="section-header" @click="emit('toggle-collapse')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="section-icon text-inventory">🎒</span>
      <span class="section-name">Inventory</span>
      <span class="section-count">{{ itemCount }}</span>
      <button class="add-btn" @click.stop="emit('add')" title="Add item to inventory">+</button>
    </div>
    <div class="section-list" v-show="!collapsed">
      <div v-for="itemId in inventory" :key="itemId" class="element-item inventory-item">
        <span
          v-if="itemHasAssetIcon(getItemById(itemId))"
          class="item-icon item-icon-asset"
          :style="getItemIconStyle(getItemById(itemId))"
        ></span>
        <span v-else class="item-icon text-item">{{ getItemById(itemId)?.icon || '📦' }}</span>
        <span class="item-name">{{ getItemById(itemId)?.name || 'Unknown' }}</span>
        <button class="remove-item-btn" @click.stop="emit('remove', itemId)" title="Remove from inventory">×</button>
      </div>
      <p v-if="!inventory?.length" class="empty-section">Inventory empty</p>
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
.element-item { display: flex; align-items: center; gap: 6px; padding: 4px 8px 4px 24px; border-bottom: 1px solid var(--border-color, #222); }
.item-icon { font-size: 10px; }
.item-icon-asset { width: 16px; height: 16px; background-size: contain; background-repeat: no-repeat; background-position: center; }
.item-name { flex: 1; font-size: 9px; font-family: 'Press Start 2P', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary, #fff); }
.remove-item-btn { background: var(--error, #ff4757); color: white; border: none; width: 16px; height: 16px; font-size: 12px; font-weight: bold; cursor: pointer; border-radius: 2px; display: flex; align-items: center; justify-content: center; opacity: 0.7; }
.remove-item-btn:hover { opacity: 1; }
.empty-section { padding: 8px 24px; font-size: 9px; color: var(--text-muted, #666); font-style: italic; margin: 0; }
.text-inventory { color: #fbbf24; }
.text-item { color: #34d399; }
</style>
