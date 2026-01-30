/**
 * useParallax
 *
 * Manages parallax scrolling system for layered backgrounds.
 */

import { ref } from 'vue'

/**
 * @param {Object} options
 * @param {import('vue').Ref} options.currentScene - Current scene computed
 * @param {import('vue').Ref} options.playMode - Play mode state ref
 * @param {import('vue').Ref} options.playModeState - Play mode state object ref
 * @param {import('vue').Ref} options.zoom - Zoom level ref
 * @param {Function} options.getAssetById - Function to get asset by ID
 * @param {Function} options.getAssetDisplayUrl - Function to get asset display URL
 */
export function useParallax(options) {
  const {
    currentScene,
    playMode,
    playModeState,
    zoom,
    getAssetById,
    getAssetDisplayUrl
  } = options

  // Camera state for parallax effect
  const cameraPosition = ref({ x: 0, y: 0 })
  const parallaxScrollOffsets = ref({}) // { imageId: { x, y } } for auto-scroll

  /**
   * Ensure parallax defaults exist on an image
   */
  const ensureParallaxDefaults = (image) => {
    if (!image.parallax) {
      image.parallax = {
        enabled: false,
        depth: 1.0,
        repeatX: false,
        repeatY: false,
        autoScrollX: 0,
        autoScrollY: 0
      }
    }
  }

  /**
   * Calculate parallax offset for an image
   */
  const getParallaxOffset = (image) => {
    if (!image.parallax?.enabled) return { x: 0, y: 0 }

    const depth = image.parallax.depth
    const autoOffset = parallaxScrollOffsets.value[image.id] || { x: 0, y: 0 }

    // Parallax offset based on camera position and depth
    // depth < 1: moves slower than camera (far background)
    // depth = 1: moves with camera (normal)
    // depth > 1: moves faster than camera (foreground)
    const parallaxX = cameraPosition.value.x * (1 - depth)
    const parallaxY = cameraPosition.value.y * (1 - depth)

    return {
      x: parallaxX + autoOffset.x,
      y: parallaxY + autoOffset.y
    }
  }

  /**
   * Get style for parallax image rendering
   */
  const getParallaxImageStyle = (image) => {
    const offset = getParallaxOffset(image)
    const asset = image.assetId ? getAssetById(image.assetId) : null

    let style = {
      left: (image.x + offset.x) * zoom.value + 'px',
      top: (image.y + offset.y) * zoom.value + 'px',
      width: image.w * zoom.value + 'px',
      height: image.h * zoom.value + 'px',
      transform: `rotate(${image.rotation || 0}deg)`
    }

    if (asset) {
      const assetUrl = getAssetDisplayUrl(asset)
      if (assetUrl) {
        style.backgroundImage = `url(${assetUrl})`
      }
      style.backgroundSize = image.parallax?.repeatX || image.parallax?.repeatY ? `${image.w * zoom.value}px ${image.h * zoom.value}px` : 'contain'
      style.backgroundPosition = 'center'
      style.backgroundRepeat = image.parallax?.repeatX && image.parallax?.repeatY ? 'repeat'
        : image.parallax?.repeatX ? 'repeat-x'
        : image.parallax?.repeatY ? 'repeat-y'
        : 'no-repeat'
    }

    return style
  }

  /**
   * Update parallax auto-scroll offsets
   */
  const updateParallaxAutoScroll = (deltaTime) => {
    if (!currentScene.value?.images) return

    currentScene.value.images.forEach(image => {
      if (image.parallax?.enabled && (image.parallax.autoScrollX || image.parallax.autoScrollY)) {
        if (!parallaxScrollOffsets.value[image.id]) {
          parallaxScrollOffsets.value[image.id] = { x: 0, y: 0 }
        }

        const offset = parallaxScrollOffsets.value[image.id]
        offset.x += image.parallax.autoScrollX * deltaTime
        offset.y += image.parallax.autoScrollY * deltaTime

        // Wrap around for tiling images
        if (image.parallax.repeatX && Math.abs(offset.x) > image.w) {
          offset.x = offset.x % image.w
        }
        if (image.parallax.repeatY && Math.abs(offset.y) > image.h) {
          offset.y = offset.y % image.h
        }
      }
    })
  }

  /**
   * Update camera position (for Play Mode - follows player)
   */
  const updateCameraForPlayer = () => {
    if (!playMode.value || !playModeState.value.playerActorId) return

    const playerX = playModeState.value.playerPosition.x
    const playerY = playModeState.value.playerPosition.y

    // Center camera on player with some deadzone
    const targetX = playerX - currentScene.value.width / 2
    const targetY = playerY - currentScene.value.height / 2

    // Smooth camera follow
    cameraPosition.value.x += (targetX - cameraPosition.value.x) * 0.1
    cameraPosition.value.y += (targetY - cameraPosition.value.y) * 0.1

    // Clamp camera to scene bounds (optional - for larger scenes)
    // cameraPosition.value.x = Math.max(0, Math.min(cameraPosition.value.x, currentScene.value.width - 1280))
    // cameraPosition.value.y = Math.max(0, Math.min(cameraPosition.value.y, currentScene.value.height - 720))
  }

  // Track last parallax time for delta calculation
  let lastParallaxTime = 0

  /**
   * Update parallax in animation loop
   */
  const updateParallaxInLoop = (currentTime) => {
    if (lastParallaxTime === 0) lastParallaxTime = currentTime
    const deltaTime = (currentTime - lastParallaxTime) / 1000
    lastParallaxTime = currentTime

    updateParallaxAutoScroll(deltaTime)
    if (playMode.value) {
      updateCameraForPlayer()
    }
  }

  /**
   * Reset parallax state
   */
  const resetParallax = () => {
    cameraPosition.value = { x: 0, y: 0 }
    parallaxScrollOffsets.value = {}
    lastParallaxTime = 0
  }

  return {
    // State
    cameraPosition,
    parallaxScrollOffsets,

    // Functions
    ensureParallaxDefaults,
    getParallaxOffset,
    getParallaxImageStyle,
    updateParallaxAutoScroll,
    updateCameraForPlayer,
    updateParallaxInLoop,
    resetParallax
  }
}
