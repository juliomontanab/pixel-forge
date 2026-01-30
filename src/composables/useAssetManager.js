/**
 * useAssetManager.js
 *
 * Composable for managing project assets (images, sprites, audio).
 * Handles S3 uploads, URL caching, folders, and asset retrieval.
 */

import { ref, computed } from 'vue'

/**
 * @param {Object} options
 * @param {Ref<Object>} options.project - Project data ref
 * @param {Function} options.uploadAssetToS3 - S3 upload function from useAssetApi
 * @param {Function} options.getAssetUrl - Get single asset URL from S3
 * @param {Function} options.getAssetUrls - Get multiple asset URLs from S3
 * @param {Function} options.deleteAssetFromS3 - Delete asset from S3
 * @param {Ref<string>} options.currentUserId - Current user ID
 * @param {Function} options.autoSaveProject - Auto-save function
 */
export function useAssetManager(options = {}) {
  const {
    project,
    uploadAssetToS3,
    getAssetUrl,
    getAssetUrls,
    deleteAssetFromS3,
    currentUserId,
    autoSaveProject
  } = options

  // ==================
  // STATE
  // ==================

  // Cache for signed S3 URLs
  const assetUrlCache = ref({}) // { s3Key: url }

  // Current selected category for uploads
  const selectedAssetCategory = ref('object')

  // Current selected folder for uploads/filtering
  const selectedAssetFolder = ref('/')

  // Include subfolders in filter
  const includeSubfolders = ref(true)

  // Modal states
  const showAssetManagerModal = ref(false)
  const showAudioManagerModal = ref(false)

  // ==================
  // COMPUTED
  // ==================

  // All assets from project
  const globalAssets = computed(() => project.value?.globalData?.assets || [])

  // All asset folders from project
  const globalAssetFolders = computed(() => project.value?.globalData?.assetFolders || [])

  // All audio assets from project
  const globalAudioAssets = computed(() => project.value?.globalData?.audioAssets || [])

  // Filtered assets by category and folder
  const filteredAssets = computed(() => {
    let assets = globalAssets.value

    // Filter by category if not 'all'
    if (selectedAssetCategory.value && selectedAssetCategory.value !== 'all') {
      assets = assets.filter(a => a.category === selectedAssetCategory.value)
    }

    // Filter by folder
    if (selectedAssetFolder.value !== '/') {
      assets = assets.filter(asset => {
        const folderPath = asset.folderPath || '/'
        if (includeSubfolders.value) {
          return folderPath === selectedAssetFolder.value ||
                 folderPath.startsWith(selectedAssetFolder.value + '/')
        }
        return folderPath === selectedAssetFolder.value
      })
    }

    return assets
  })

  // ==================
  // ASSET RETRIEVAL
  // ==================

  /**
   * Get asset by ID
   * @param {number} assetId - Asset ID
   * @returns {Object|undefined} Asset object
   */
  const getAssetById = (assetId) => {
    return globalAssets.value.find(a => a.id === assetId)
  }

  /**
   * Get display URL for an asset (from cache or base64)
   * @param {Object} asset - Asset object
   * @returns {string|null} Display URL
   */
  const getAssetDisplayUrl = (asset) => {
    if (!asset) return null

    // If has base64 data (legacy), use directly
    if (asset.data && asset.data.startsWith('data:')) {
      return asset.data
    }

    // If has s3Key, check cache
    if (asset.s3Key && assetUrlCache.value[asset.s3Key]) {
      return assetUrlCache.value[asset.s3Key]
    }

    // Placeholder while loading
    return null
  }

  /**
   * Load URLs for all S3 assets into cache
   */
  const loadAssetUrls = async () => {
    const assetsWithS3 = globalAssets.value.filter(a => a.s3Key && !assetUrlCache.value[a.s3Key])
    if (assetsWithS3.length === 0) return

    const s3Keys = assetsWithS3.map(a => a.s3Key)
    try {
      const urls = await getAssetUrls(s3Keys)
      assetUrlCache.value = { ...assetUrlCache.value, ...urls }
      console.log('[AssetManager] Asset URLs loaded:', Object.keys(urls).length)
    } catch (e) {
      console.error('[AssetManager] Error loading asset URLs:', e)
    }
  }

  // ==================
  // ASSET UPLOAD
  // ==================

  /**
   * Get image dimensions from file
   * @param {File} file - Image file
   * @returns {Promise<{width: number, height: number}>}
   */
  const getImageDimensions = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = () => resolve({ width: 0, height: 0 })
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * Upload asset file to S3 and add to project
   * @param {File} file - File to upload
   * @returns {Promise<Object>} Created asset
   */
  const handleAssetUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) return null

    try {
      const { width, height } = await getImageDimensions(file)
      const category = selectedAssetCategory.value

      // Upload to S3
      const { s3Key, url } = await uploadAssetToS3(
        file,
        currentUserId.value,
        project.value.id,
        category
      )

      // Create asset with S3 reference
      const asset = {
        id: Date.now(),
        name: file.name.replace(/\.[^.]+$/, ''),
        s3Key: s3Key,
        category: category,
        folderPath: selectedAssetFolder.value || '/',
        width: width,
        height: height,
        type: 'image',
        contentType: file.type
      }

      // Save URL in cache
      assetUrlCache.value[s3Key] = url

      // Add to project
      project.value.globalData.assets.push(asset)
      console.log('[AssetManager] Asset uploaded to S3:', s3Key, 'category:', category)

      // Auto-save project
      await autoSaveProject?.()

      return asset
    } catch (e) {
      console.error('[AssetManager] Error uploading asset:', e)
      throw e
    }
  }

  /**
   * Delete asset from project and S3
   * @param {number} assetId - Asset ID to delete
   */
  const deleteAsset = async (assetId) => {
    const asset = getAssetById(assetId)
    if (!asset) return

    // Delete from S3 if exists
    if (asset.s3Key) {
      try {
        await deleteAssetFromS3(asset.s3Key)
        delete assetUrlCache.value[asset.s3Key]
      } catch (e) {
        console.error('[AssetManager] Error deleting from S3:', e)
      }
    }

    // Remove from project
    const idx = project.value.globalData.assets.findIndex(a => a.id === assetId)
    if (idx !== -1) {
      project.value.globalData.assets.splice(idx, 1)
    }

    await autoSaveProject?.()
  }

  // ==================
  // FOLDER MANAGEMENT
  // ==================

  /**
   * Build folder tree structure for UI
   * @param {string} parentPath - Parent path to start from
   * @returns {Array} Array of folder objects with children
   */
  const buildFolderTree = (parentPath = '/') => {
    const folders = globalAssetFolders.value
    const children = folders
      .filter(f => f.parentPath === parentPath)
      .sort((a, b) => a.name.localeCompare(b.name))

    return children.map(folder => ({
      ...folder,
      children: buildFolderTree(folder.path),
      assetCount: globalAssets.value.filter(a => (a.folderPath || '/') === folder.path).length
    }))
  }

  /**
   * Get folder by path
   * @param {string} path - Folder path
   * @returns {Object|undefined}
   */
  const getFolderByPath = (path) => {
    return globalAssetFolders.value.find(f => f.path === path)
  }

  /**
   * Create a new folder
   * @param {string} parentPath - Parent folder path
   * @param {string} name - New folder name
   * @returns {Object} Created folder
   */
  const createFolder = (parentPath, name) => {
    const sanitizedName = name.trim().replace(/[/\\]/g, '-')
    if (!sanitizedName) return null

    const newPath = parentPath === '/'
      ? `/${sanitizedName}`
      : `${parentPath}/${sanitizedName}`

    // Check if folder already exists
    const existing = globalAssetFolders.value.find(f => f.path === newPath)
    if (existing) {
      console.warn('[AssetManager] Folder already exists:', newPath)
      return existing
    }

    const newFolder = {
      id: Date.now(),
      path: newPath,
      name: sanitizedName,
      parentPath: parentPath,
      icon: '📁'
    }

    if (!project.value.globalData.assetFolders) {
      project.value.globalData.assetFolders = []
    }
    project.value.globalData.assetFolders.push(newFolder)

    autoSaveProject?.()
    return newFolder
  }

  /**
   * Rename a folder
   * @param {string} folderPath - Folder path to rename
   * @param {string} newName - New name
   */
  const renameFolder = (folderPath, newName) => {
    const sanitizedName = newName.trim().replace(/[/\\]/g, '-')
    if (!sanitizedName) return

    const folder = getFolderByPath(folderPath)
    if (!folder) return

    const newPath = folder.parentPath === '/'
      ? `/${sanitizedName}`
      : `${folder.parentPath}/${sanitizedName}`

    // Update folder
    folder.name = sanitizedName
    const oldPath = folder.path
    folder.path = newPath

    // Update child folders
    globalAssetFolders.value.forEach(f => {
      if (f.parentPath === oldPath) {
        f.parentPath = newPath
        // Recursively update paths
        const oldChildPath = f.path
        f.path = f.path.replace(oldPath, newPath)
      }
    })

    // Update assets in this folder
    globalAssets.value.forEach(a => {
      if (a.folderPath === oldPath) {
        a.folderPath = newPath
      } else if (a.folderPath?.startsWith(oldPath + '/')) {
        a.folderPath = a.folderPath.replace(oldPath, newPath)
      }
    })

    autoSaveProject?.()
  }

  /**
   * Delete a folder (moves contents to parent)
   * @param {string} folderPath - Folder path to delete
   */
  const deleteFolder = (folderPath) => {
    const folder = getFolderByPath(folderPath)
    if (!folder) return

    const parentPath = folder.parentPath

    // Move assets to parent folder
    globalAssets.value.forEach(a => {
      if (a.folderPath === folderPath) {
        a.folderPath = parentPath
      }
    })

    // Move subfolders to parent
    globalAssetFolders.value.forEach(f => {
      if (f.parentPath === folderPath) {
        f.parentPath = parentPath
      }
    })

    // Remove folder
    const idx = project.value.globalData.assetFolders.findIndex(f => f.path === folderPath)
    if (idx !== -1) {
      project.value.globalData.assetFolders.splice(idx, 1)
    }

    // Update selected folder if it was deleted
    if (selectedAssetFolder.value === folderPath) {
      selectedAssetFolder.value = parentPath
    }

    autoSaveProject?.()
  }

  /**
   * Move asset to a folder
   * @param {number} assetId - Asset ID
   * @param {string} folderPath - Target folder path
   */
  const moveAssetToFolder = (assetId, folderPath) => {
    const asset = getAssetById(assetId)
    if (asset) {
      asset.folderPath = folderPath
      autoSaveProject?.()
    }
  }

  /**
   * Select a folder for filtering
   * @param {string} folderPath - Folder path to select
   */
  const selectFolder = (folderPath) => {
    selectedAssetFolder.value = folderPath
  }

  // ==================
  // MODAL HELPERS
  // ==================

  const openAssetManager = () => {
    showAssetManagerModal.value = true
  }

  const closeAssetManager = () => {
    showAssetManagerModal.value = false
  }

  const openAudioManager = () => {
    showAudioManagerModal.value = true
  }

  const closeAudioManager = () => {
    showAudioManagerModal.value = false
  }

  return {
    // State
    assetUrlCache,
    selectedAssetCategory,
    selectedAssetFolder,
    includeSubfolders,
    showAssetManagerModal,
    showAudioManagerModal,

    // Computed
    globalAssets,
    globalAssetFolders,
    globalAudioAssets,
    filteredAssets,

    // Asset retrieval
    getAssetById,
    getAssetDisplayUrl,
    loadAssetUrls,

    // Asset upload/delete
    handleAssetUpload,
    deleteAsset,
    getImageDimensions,

    // Folder management
    buildFolderTree,
    getFolderByPath,
    createFolder,
    renameFolder,
    deleteFolder,
    moveAssetToFolder,
    selectFolder,

    // Modal helpers
    openAssetManager,
    closeAssetManager,
    openAudioManager,
    closeAudioManager
  }
}
