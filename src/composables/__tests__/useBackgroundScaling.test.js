import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { useBackgroundScaling } from '../useBackgroundScaling'

// Mock global alert
global.alert = vi.fn()

describe('useBackgroundScaling', () => {
  let options
  let composable

  beforeEach(() => {
    vi.clearAllMocks()
    options = {
      project: ref({
        globalData: {
          assets: [
            { id: 1, name: 'Background', s3Key: 'bg.png', width: 800, height: 600 },
            { id: 2, name: 'FullSize', s3Key: 'full.png', width: 1920, height: 1200 }
          ]
        }
      }),
      currentScene: computed(() => ({
        width: 1920,
        height: 1200,
        background: 1 // References asset with mismatched dimensions
      })),
      projectId: computed(() => 'test-project'),
      currentUserId: ref('test-user'),
      assetUrlCache: ref({}),
      getAssetById: vi.fn((id) => {
        return options.project.value.globalData.assets.find(a => a.id === id)
      }),
      getAssetDisplayUrl: vi.fn(() => 'https://example.com/image.png'),
      getAssetUrl: vi.fn(() => Promise.resolve('https://example.com/fresh-image.png')),
      uploadAssetToS3: vi.fn(() => Promise.resolve({
        s3Key: 'scaled.png',
        url: 'https://example.com/scaled.png'
      })),
      autoSaveProject: vi.fn()
    }

    composable = useBackgroundScaling(options)
  })

  describe('initial state', () => {
    it('should have modal closed by default', () => {
      expect(composable.showBackgroundScaleModal.value).toBe(false)
    })

    it('should have cover mode by default', () => {
      expect(composable.backgroundScaleMode.value).toBe('cover')
    })

    it('should not be scaling by default', () => {
      expect(composable.isScalingBackground.value).toBe(false)
    })
  })

  describe('backgroundNeedsScaling', () => {
    it('should return true when background dimensions differ from canvas', () => {
      // Asset 1 is 800x600, canvas is 1920x1200
      expect(composable.backgroundNeedsScaling.value).toBe(true)
    })

    it('should return false when no background is set', () => {
      options.currentScene = computed(() => ({
        width: 1920,
        height: 1200,
        background: null
      }))
      composable = useBackgroundScaling(options)

      expect(composable.backgroundNeedsScaling.value).toBe(false)
    })

    it('should return false when background matches canvas size', () => {
      options.currentScene = computed(() => ({
        width: 1920,
        height: 1200,
        background: 2 // Asset 2 is 1920x1200
      }))
      composable = useBackgroundScaling(options)

      expect(composable.backgroundNeedsScaling.value).toBe(false)
    })

    it('should return false when asset not found', () => {
      options.currentScene = computed(() => ({
        width: 1920,
        height: 1200,
        background: 999 // Non-existent asset
      }))
      composable = useBackgroundScaling(options)

      expect(composable.backgroundNeedsScaling.value).toBe(false)
    })
  })

  describe('currentBackgroundAsset', () => {
    it('should return the current background asset', () => {
      expect(composable.currentBackgroundAsset.value).toEqual({
        id: 1,
        name: 'Background',
        s3Key: 'bg.png',
        width: 800,
        height: 600
      })
    })

    it('should return null when no background is set', () => {
      options.currentScene = computed(() => ({
        width: 1920,
        height: 1200,
        background: null
      }))
      composable = useBackgroundScaling(options)

      expect(composable.currentBackgroundAsset.value).toBeNull()
    })
  })

  describe('openBackgroundScaleModal / closeBackgroundScaleModal', () => {
    it('should open the modal', () => {
      composable.openBackgroundScaleModal()

      expect(composable.showBackgroundScaleModal.value).toBe(true)
    })

    it('should close the modal', () => {
      composable.showBackgroundScaleModal.value = true

      composable.closeBackgroundScaleModal()

      expect(composable.showBackgroundScaleModal.value).toBe(false)
    })
  })

  describe('scaleBackgroundToCanvas', () => {
    // Note: Full testing of this function requires mocking Image, Canvas, fetch
    // which is complex. We test the basic flow and error handling.

    it('should do nothing if no background asset', async () => {
      options.currentScene = computed(() => ({
        width: 1920,
        height: 1200,
        background: null
      }))
      composable = useBackgroundScaling(options)

      await composable.scaleBackgroundToCanvas()

      expect(options.uploadAssetToS3).not.toHaveBeenCalled()
    })

    it('should set isScalingBackground during scaling', async () => {
      // Mock fetch to throw to exit early
      global.fetch = vi.fn(() => Promise.reject(new Error('Test abort')))

      expect(composable.isScalingBackground.value).toBe(false)

      const promise = composable.scaleBackgroundToCanvas()

      // Should be true during scaling
      expect(composable.isScalingBackground.value).toBe(true)

      await promise

      // Should be false after completion (even with error)
      expect(composable.isScalingBackground.value).toBe(false)
    })

    it('should get fresh URL from S3 for assets with s3Key', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Test abort')))

      await composable.scaleBackgroundToCanvas()

      expect(options.getAssetUrl).toHaveBeenCalledWith('bg.png')
    })

    it('should fall back to display URL if fresh URL fails', async () => {
      // Need to create a new composable with the failing getAssetUrl
      const fallbackOptions = {
        ...options,
        getAssetUrl: vi.fn(() => Promise.resolve(null)),
        getAssetDisplayUrl: vi.fn(() => 'https://example.com/fallback.png')
      }
      const fallbackComposable = useBackgroundScaling(fallbackOptions)
      global.fetch = vi.fn(() => Promise.reject(new Error('Test abort')))

      await fallbackComposable.scaleBackgroundToCanvas()

      expect(fallbackOptions.getAssetDisplayUrl).toHaveBeenCalled()
    })

    it('should handle fetch errors gracefully', async () => {
      const alertMock = vi.fn()
      global.alert = alertMock
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      await composable.scaleBackgroundToCanvas()

      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Network error'))
      expect(composable.isScalingBackground.value).toBe(false)
    })
  })

  describe('backgroundScaleMode', () => {
    it('should allow setting to cover', () => {
      composable.backgroundScaleMode.value = 'cover'
      expect(composable.backgroundScaleMode.value).toBe('cover')
    })

    it('should allow setting to contain', () => {
      composable.backgroundScaleMode.value = 'contain'
      expect(composable.backgroundScaleMode.value).toBe('contain')
    })

    it('should allow setting to stretch', () => {
      composable.backgroundScaleMode.value = 'stretch'
      expect(composable.backgroundScaleMode.value).toBe('stretch')
    })
  })
})
