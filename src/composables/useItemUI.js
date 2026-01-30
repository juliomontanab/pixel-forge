/**
 * useItemUI.js
 *
 * Composable para helpers de UI de items e inventario.
 * Maneja iconos de items, inventario y helpers de visualización.
 *
 * @example
 * const {
 *   getItemById,
 *   getItemIconStyle,
 *   addToInventory,
 *   removeFromInventory,
 *   toggleInventoryItem
 * } = useItemUI({ project, getAssetById, getAssetDisplayUrl })
 */

import { ref } from 'vue'

/**
 * Creates item UI management utilities
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.project - Reactive reference to project data
 * @param {Function} options.getAssetById - Function to get asset by ID
 * @param {Function} options.getAssetDisplayUrl - Function to get asset display URL
 * @returns {Object} Item UI methods and state
 */
export function useItemUI(options = {}) {
  const { project, getAssetById, getAssetDisplayUrl } = options

  // Modal states
  const showAddToInventoryModal = ref(false)

  // =====================
  // ITEM GETTERS
  // =====================

  /**
   * Get item by ID (from global items)
   * @param {number} itemId - Item ID
   * @returns {Object|null} Item object or null
   */
  const getItemById = (itemId) => {
    return project.value.globalData?.items?.find(i => i.id === itemId) || null
  }

  /**
   * Get all global items
   * @returns {Array} Array of items
   */
  const getAllItems = () => {
    return project.value.globalData?.items || []
  }

  // =====================
  // ITEM ICON HELPERS
  // =====================

  /**
   * Get item icon style (returns background style if asset, null if emoji)
   * @param {Object} item - Item object
   * @returns {Object|null} Style object or null
   */
  const getItemIconStyle = (item) => {
    if (!item) return null
    if (!item.iconAssetId) return null

    const asset = getAssetById?.(item.iconAssetId)
    if (!asset) return null

    const url = getAssetDisplayUrl?.(asset)
    if (!url) return null

    return {
      backgroundImage: `url(${url})`,
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
  }

  /**
   * Check if item has asset icon
   * @param {Object} item - Item object
   * @returns {boolean}
   */
  const itemHasAssetIcon = (item) => {
    if (!item) return false
    if (!item.iconAssetId) return false
    return !!getAssetById?.(item.iconAssetId)
  }

  /**
   * Get item display icon (asset URL or emoji)
   * @param {Object} item - Item object
   * @returns {Object} { type: 'asset'|'emoji', value: string }
   */
  const getItemDisplayIcon = (item) => {
    if (!item) return { type: 'emoji', value: '📦' }

    if (item.iconAssetId) {
      const asset = getAssetById?.(item.iconAssetId)
      if (asset) {
        const url = getAssetDisplayUrl?.(asset)
        if (url) {
          return { type: 'asset', value: url }
        }
      }
    }

    return { type: 'emoji', value: item.icon || '📦' }
  }

  // =====================
  // INVENTORY MANAGEMENT (EDITOR)
  // =====================

  /**
   * Add item to inventory (global - editor mode)
   * @param {number} itemId - Item ID to add
   */
  const addToInventory = (itemId) => {
    if (!project.value.globalData.inventory) {
      project.value.globalData.inventory = []
    }

    if (!project.value.globalData.inventory.includes(itemId)) {
      project.value.globalData.inventory.push(itemId)
    }
  }

  /**
   * Remove item from inventory (global - editor mode)
   * @param {number} itemId - Item ID to remove
   */
  const removeFromInventory = (itemId) => {
    const inventory = project.value.globalData?.inventory
    if (!inventory) return

    const index = inventory.indexOf(itemId)
    if (index > -1) {
      inventory.splice(index, 1)
    }
  }

  /**
   * Toggle item in inventory (for modal)
   * @param {number} itemId - Item ID to toggle
   */
  const toggleInventoryItem = (itemId) => {
    const inventory = project.value.globalData?.inventory || []

    if (inventory.includes(itemId)) {
      removeFromInventory(itemId)
    } else {
      addToInventory(itemId)
    }
  }

  /**
   * Check if item is in inventory
   * @param {number} itemId - Item ID to check
   * @returns {boolean}
   */
  const isInInventory = (itemId) => {
    return project.value.globalData?.inventory?.includes(itemId) || false
  }

  /**
   * Get all items in inventory
   * @returns {Array} Array of item objects
   */
  const getInventoryItems = () => {
    const inventory = project.value.globalData?.inventory || []
    const items = project.value.globalData?.items || []

    return inventory
      .map(id => items.find(i => i.id === id))
      .filter(Boolean)
  }

  /**
   * Clear inventory
   */
  const clearInventory = () => {
    if (project.value.globalData) {
      project.value.globalData.inventory = []
    }
  }

  // =====================
  // MODAL HELPERS
  // =====================

  /**
   * Open add to inventory modal
   */
  const openAddToInventoryModal = () => {
    showAddToInventoryModal.value = true
  }

  /**
   * Close add to inventory modal
   */
  const closeAddToInventoryModal = () => {
    showAddToInventoryModal.value = false
  }

  return {
    // State
    showAddToInventoryModal,

    // Item getters
    getItemById,
    getAllItems,

    // Icon helpers
    getItemIconStyle,
    itemHasAssetIcon,
    getItemDisplayIcon,

    // Inventory management
    addToInventory,
    removeFromInventory,
    toggleInventoryItem,
    isInInventory,
    getInventoryItems,
    clearInventory,

    // Modal helpers
    openAddToInventoryModal,
    closeAddToInventoryModal
  }
}

export default useItemUI
