/**
 * useAssetUI.js
 *
 * Composable para helpers de UI del Asset Manager.
 * Maneja estados de UI, drag/drop de archivos, y helpers de visualización.
 *
 * @example
 * const {
 *   assetUploadDragging,
 *   assetFilterCategory,
 *   assetSearchQuery,
 *   categoryLabels,
 *   onAssetFileChange,
 *   onAssetDragOver,
 *   onAssetDrop
 * } = useAssetUI({ globalAssets, globalAssetFolders, handleAssetUpload, moveAssetToFolder })
 */

import { ref, computed } from 'vue'

/**
 * Category labels for display
 */
export const CATEGORY_LABELS = {
  image: {
    background: 'Background',
    object: 'Object',
    sprite: 'Sprite',
    ui: 'UI Element',
    other: 'Other'
  },
  audio: {
    music: 'Music',
    sfx: 'Sound Effect',
    ambient: 'Ambient',
    voice: 'Voice',
    other: 'Other'
  }
}

/**
 * Creates asset UI management utilities
 *
 * @param {Object} options - Configuration options
 * @param {Ref|ComputedRef} options.globalAssets - Global assets array
 * @param {Ref|ComputedRef} options.globalAssetFolders - Global asset folders array
 * @param {Function} options.handleAssetUpload - Function to handle file upload
 * @param {Function} options.moveAssetToFolder - Function to move asset to folder
 * @returns {Object} Asset UI methods and state
 */
export function useAssetUI(options = {}) {
  const {
    globalAssets,
    globalAssetFolders,
    handleAssetUpload,
    moveAssetToFolder
  } = options

  // =====================
  // UI STATE
  // =====================
  const assetUploadDragging = ref(false)
  const assetFilterCategory = ref('all') // Display filter
  const assetSearchQuery = ref('') // Search by name
  const showNewFolderInput = ref(false) // Show new folder input
  const newFolderName = ref('') // New folder name
  const renamingFolderId = ref(null) // Folder being renamed
  const renamingFolderValue = ref('') // New name during rename

  // =====================
  // COMPUTED
  // =====================

  /**
   * Count of assets by category
   */
  const assetCountByCategory = computed(() => {
    const counts = { all: 0, background: 0, object: 0, sprite: 0, ui: 0, other: 0 }
    const assets = globalAssets?.value || []

    assets.forEach(a => {
      counts.all++
      const cat = a.category || 'other'
      if (counts[cat] !== undefined) {
        counts[cat]++
      } else {
        counts.other++
      }
    })

    return counts
  })

  // =====================
  // FOLDER HELPERS
  // =====================

  /**
   * Get subfolders of a parent folder
   * @param {string} parentPath - Parent folder path
   * @returns {Array} Array of subfolders
   */
  const getSubfolders = (parentPath) => {
    const folders = globalAssetFolders?.value || []
    return folders.filter(f => f.parentPath === parentPath)
  }

  /**
   * Get items count in a folder
   * @param {string} folderPath - Folder path
   * @param {boolean} [recursive=true] - Include subfolders
   * @returns {number} Asset count
   */
  const getFolderAssetCount = (folderPath, recursive = true) => {
    const assets = globalAssets?.value || []

    if (recursive) {
      return assets.filter(a =>
        (a.folderPath || '/') === folderPath ||
        (a.folderPath || '/').startsWith(folderPath + '/')
      ).length
    }

    return assets.filter(a => (a.folderPath || '/') === folderPath).length
  }

  /**
   * Start renaming a folder
   * @param {Object} folder - Folder to rename
   */
  const startRenamingFolder = (folder) => {
    renamingFolderId.value = folder.id
    renamingFolderValue.value = folder.name
  }

  /**
   * Cancel folder renaming
   */
  const cancelRenamingFolder = () => {
    renamingFolderId.value = null
    renamingFolderValue.value = ''
  }

  /**
   * Show new folder input
   */
  const showNewFolder = () => {
    showNewFolderInput.value = true
    newFolderName.value = ''
  }

  /**
   * Cancel new folder creation
   */
  const cancelNewFolder = () => {
    showNewFolderInput.value = false
    newFolderName.value = ''
  }

  // =====================
  // FILE HANDLING
  // =====================

  /**
   * Handle file input change
   * @param {Event} event - Input change event
   */
  const onAssetFileChange = (event) => {
    const files = event.target.files
    if (files && handleAssetUpload) {
      Array.from(files).forEach(handleAssetUpload)
    }
    event.target.value = ''
  }

  /**
   * Handle drag over
   * @param {DragEvent} event - Drag event
   */
  const onAssetDragOver = (event) => {
    event.preventDefault()
    assetUploadDragging.value = true
  }

  /**
   * Handle drag leave
   */
  const onAssetDragLeave = () => {
    assetUploadDragging.value = false
  }

  /**
   * Handle file drop
   * @param {DragEvent} event - Drop event
   */
  const onAssetDrop = (event) => {
    event.preventDefault()
    assetUploadDragging.value = false

    const files = event.dataTransfer.files
    if (files && handleAssetUpload) {
      Array.from(files).forEach(handleAssetUpload)
    }
  }

  /**
   * Handle multiple files upload
   * @param {FileList|Array} files - Files to upload
   */
  const handleAssetUploadFiles = (files) => {
    if (handleAssetUpload) {
      Array.from(files).forEach(handleAssetUpload)
    }
  }

  // =====================
  // ASSET DRAG/DROP (between folders)
  // =====================

  /**
   * Handle asset drag start (for moving between folders)
   * @param {DragEvent} event - Drag event
   * @param {Object} asset - Asset being dragged
   */
  const handleAssetDragStart = (event, asset) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'asset',
      assetId: asset.id,
      sourcePath: asset.folderPath || '/'
    }))
    event.dataTransfer.effectAllowed = 'move'
  }

  /**
   * Handle folder drop (receiving dragged asset)
   * @param {DragEvent} event - Drop event
   * @param {string} targetFolderPath - Target folder path
   */
  const handleFolderDrop = (event, targetFolderPath) => {
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'))
      if (data.type === 'asset' && moveAssetToFolder) {
        moveAssetToFolder(data.assetId, targetFolderPath)
      }
    } catch (e) {
      // Not a valid asset drag
    }
  }

  // =====================
  // SEARCH & FILTER
  // =====================

  /**
   * Set category filter
   * @param {string} category - Category to filter by
   */
  const setFilterCategory = (category) => {
    assetFilterCategory.value = category
  }

  /**
   * Set search query
   * @param {string} query - Search query
   */
  const setSearchQuery = (query) => {
    assetSearchQuery.value = query
  }

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    assetFilterCategory.value = 'all'
    assetSearchQuery.value = ''
  }

  return {
    // UI State
    assetUploadDragging,
    assetFilterCategory,
    assetSearchQuery,
    showNewFolderInput,
    newFolderName,
    renamingFolderId,
    renamingFolderValue,

    // Computed
    assetCountByCategory,

    // Folder helpers
    getSubfolders,
    getFolderAssetCount,
    startRenamingFolder,
    cancelRenamingFolder,
    showNewFolder,
    cancelNewFolder,

    // File handling
    onAssetFileChange,
    onAssetDragOver,
    onAssetDragLeave,
    onAssetDrop,
    handleAssetUploadFiles,

    // Asset drag/drop
    handleAssetDragStart,
    handleFolderDrop,

    // Search & filter
    setFilterCategory,
    setSearchQuery,
    clearFilters,

    // Constants
    categoryLabels: CATEGORY_LABELS
  }
}

export default useAssetUI
