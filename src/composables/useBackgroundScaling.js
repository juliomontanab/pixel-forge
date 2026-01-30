/**
 * useBackgroundScaling
 *
 * Manages background image scaling to match canvas dimensions.
 */

import { ref, computed } from 'vue'

/**
 * @param {Object} options
 * @param {import('vue').Ref} options.project - The project ref
 * @param {import('vue').Ref} options.currentScene - Current scene computed
 * @param {import('vue').ComputedRef} options.projectId - Project ID computed
 * @param {import('vue').Ref} options.currentUserId - Current user ID ref
 * @param {import('vue').Ref} options.assetUrlCache - Asset URL cache ref
 * @param {Function} options.getAssetById - Function to get asset by ID
 * @param {Function} options.getAssetDisplayUrl - Function to get asset display URL
 * @param {Function} options.getAssetUrl - Function to get fresh asset URL from S3
 * @param {Function} options.uploadAssetToS3 - Function to upload asset to S3
 * @param {Function} options.autoSaveProject - Function to auto-save project
 */
export function useBackgroundScaling(options) {
  const {
    project,
    currentScene,
    projectId,
    currentUserId,
    assetUrlCache,
    getAssetById,
    getAssetDisplayUrl,
    getAssetUrl,
    uploadAssetToS3,
    autoSaveProject
  } = options

  // State
  const showBackgroundScaleModal = ref(false)
  const backgroundScaleMode = ref('cover') // 'cover' | 'contain' | 'stretch'
  const isScalingBackground = ref(false)

  /**
   * Check if current background needs scaling (dimensions don't match canvas)
   */
  const backgroundNeedsScaling = computed(() => {
    if (!currentScene.value?.background) return false
    const asset = getAssetById(currentScene.value.background)
    if (!asset) return false
    return asset.width !== currentScene.value.width || asset.height !== currentScene.value.height
  })

  /**
   * Get current background asset info
   */
  const currentBackgroundAsset = computed(() => {
    if (!currentScene.value?.background) return null
    return getAssetById(currentScene.value.background)
  })

  /**
   * Scale background image to fit canvas
   */
  const scaleBackgroundToCanvas = async () => {
    const asset = currentBackgroundAsset.value
    if (!asset) return

    isScalingBackground.value = true

    try {
      // Get a fresh URL from S3 (not cached) to ensure CORS works
      let url = null
      if (asset.s3Key) {
        console.log('[Editor] Getting fresh URL for:', asset.s3Key)
        url = await getAssetUrl(asset.s3Key)
      }
      if (!url) {
        url = getAssetDisplayUrl(asset)
      }
      if (!url) {
        throw new Error('No se pudo obtener la URL del asset')
      }

      console.log('[Editor] Fetching image from:', url.substring(0, 100) + '...')

      // Fetch image as blob with explicit CORS mode
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      console.log('[Editor] Image fetched, blob size:', blob.size)
      const blobUrl = URL.createObjectURL(blob)

      // Load the image from blob URL (no CORS issues)
      const img = await new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => {
          URL.revokeObjectURL(blobUrl) // Clean up
          resolve(image)
        }
        image.onerror = (e) => {
          URL.revokeObjectURL(blobUrl)
          reject(e)
        }
        image.src = blobUrl
      })

      const canvasW = currentScene.value.width
      const canvasH = currentScene.value.height
      const imgW = img.width
      const imgH = img.height

      // Create canvas for scaling
      const canvas = document.createElement('canvas')
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')

      // Calculate scaling based on mode
      let sx = 0, sy = 0, sw = imgW, sh = imgH
      let dx = 0, dy = 0, dw = canvasW, dh = canvasH

      if (backgroundScaleMode.value === 'cover') {
        // Cover: fill entire canvas, may crop
        const scale = Math.max(canvasW / imgW, canvasH / imgH)
        const scaledW = imgW * scale
        const scaledH = imgH * scale
        dx = (canvasW - scaledW) / 2
        dy = (canvasH - scaledH) / 2
        dw = scaledW
        dh = scaledH
      } else if (backgroundScaleMode.value === 'contain') {
        // Contain: fit entire image, may have empty space (black bars)
        const scale = Math.min(canvasW / imgW, canvasH / imgH)
        const scaledW = imgW * scale
        const scaledH = imgH * scale
        dx = (canvasW - scaledW) / 2
        dy = (canvasH - scaledH) / 2
        dw = scaledW
        dh = scaledH
        // Fill background with dark color first
        ctx.fillStyle = '#0f0f23'
        ctx.fillRect(0, 0, canvasW, canvasH)
      }
      // 'stretch' uses default values (full image to full canvas)

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)

      // Convert canvas to blob for upload
      const outputBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0))
      const file = new File([outputBlob], `${asset.name}_scaled_${canvasW}x${canvasH}.png`, { type: 'image/png' })

      // Upload as new asset
      const result = await uploadAssetToS3(file, currentUserId.value, projectId.value, asset.category || 'background')

      // Add new asset to project
      const newAsset = {
        id: Date.now(),
        name: `${asset.name} (${canvasW}×${canvasH})`,
        s3Key: result.s3Key,
        category: asset.category || 'background',
        folderPath: asset.folderPath || '/',
        width: canvasW,
        height: canvasH,
        type: 'image',
        contentType: 'image/png'
      }

      project.value.globalData.assets.push(newAsset)

      // Cache the URL
      assetUrlCache.value[result.s3Key] = result.url

      // Set as current background
      currentScene.value.background = newAsset.id

      showBackgroundScaleModal.value = false
      autoSaveProject()

      console.log('[Editor] Background scaled and saved:', newAsset.name)
    } catch (e) {
      console.error('[Editor] Error scaling background:', e)
      alert('Error al escalar la imagen: ' + e.message)
    } finally {
      isScalingBackground.value = false
    }
  }

  /**
   * Open background scale modal
   */
  const openBackgroundScaleModal = () => {
    showBackgroundScaleModal.value = true
  }

  /**
   * Close background scale modal
   */
  const closeBackgroundScaleModal = () => {
    showBackgroundScaleModal.value = false
  }

  return {
    // State
    showBackgroundScaleModal,
    backgroundScaleMode,
    isScalingBackground,

    // Computed
    backgroundNeedsScaling,
    currentBackgroundAsset,

    // Functions
    scaleBackgroundToCanvas,
    openBackgroundScaleModal,
    closeBackgroundScaleModal
  }
}
