<script setup>
/**
 * AddToInventoryModal.vue
 * Modal for adding/removing items from the player's inventory.
 */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  inventory: { type: Array, default: () => [] },
  getItemIconStyle: { type: Function, default: () => ({}) },
  itemHasAssetIcon: { type: Function, default: () => false }
})

const emit = defineEmits(['update:modelValue', 'toggle-item'])

const close = () => {
  emit('update:modelValue', false)
}

const toggleItem = (itemId) => {
  emit('toggle-item', itemId)
}

const isInInventory = (itemId) => {
  return props.inventory.includes(itemId)
}
</script>

<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="close">
    <div class="modal-content small-modal">
      <header class="modal-header">
        <h3>Add Item to Inventory</h3>
        <button class="modal-close-btn" @click="close">✕</button>
      </header>
      <div class="modal-body">
        <p v-if="items.length === 0" class="empty-section">No items defined. Create items first.</p>
        <div v-else class="item-list">
          <div
            v-for="item in items"
            :key="item.id"
            class="item-row"
            :class="{ 'in-inventory': isInInventory(item.id) }"
            @click="toggleItem(item.id)"
          >
            <span
              v-if="itemHasAssetIcon(item)"
              class="item-icon item-icon-asset"
              :style="getItemIconStyle(item)"
            ></span>
            <span v-else class="item-icon">{{ item.icon || '📦' }}</span>
            <span class="item-name">{{ item.name }}</span>
            <span v-if="isInInventory(item.id)" class="item-check">✓</span>
          </div>
        </div>
      </div>
      <footer class="modal-footer">
        <button class="modal-btn" @click="close">Done</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--bg-card, #1e1e3f); border: 2px solid var(--primary, #c9a227); border-radius: 8px; }
.small-modal { width: 320px; max-height: 80vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-color, #333); }
.modal-header h3 { margin: 0; font-size: 12px; font-family: 'Press Start 2P', monospace; color: var(--text-primary, #fff); }
.modal-close-btn { background: none; border: none; color: var(--text-muted, #888); font-size: 18px; cursor: pointer; padding: 4px; }
.modal-close-btn:hover { color: var(--text-primary, #fff); }
.modal-body { padding: 16px; overflow-y: auto; flex: 1; }
.empty-section { font-size: 10px; color: var(--text-muted, #888); text-align: center; padding: 16px; }
.item-list { display: flex; flex-direction: column; gap: 4px; }
.item-row { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); border-radius: 4px; cursor: pointer; transition: border-color 0.2s; }
.item-row:hover { border-color: var(--primary, #c9a227); }
.item-row.in-inventory { border-color: var(--success, #00ff88); background: var(--success, #00ff88)10; }
.item-icon { font-size: 16px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
.item-icon-asset { background-size: contain; background-repeat: no-repeat; background-position: center; }
.item-name { flex: 1; font-size: 10px; color: var(--text-primary, #fff); }
.item-check { color: var(--success, #00ff88); font-size: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border-color, #333); }
.modal-btn { padding: 8px 16px; font-size: 10px; font-family: 'Press Start 2P', monospace; border: none; border-radius: 4px; cursor: pointer; background: var(--primary, #c9a227); color: var(--bg-dark, #0f0f23); }
.modal-btn:hover { opacity: 0.9; }
</style>
