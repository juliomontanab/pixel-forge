import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { useParallax } from '../useParallax'

describe('useParallax', () => {
  let options
  let composable

  beforeEach(() => {
    options = {
      currentScene: computed(() => ({
        width: 1920,
        height: 1200,
        images: [
          {
            id: 1,
            name: 'Background',
            x: 0,
            y: 0,
            w: 1920,
            h: 1200,
            rotation: 0,
            parallax: {
              enabled: true,
              depth: 0.5,
              repeatX: false,
              repeatY: false,
              autoScrollX: 0,
              autoScrollY: 0
            }
          },
          {
            id: 2,
            name: 'Foreground',
            x: 100,
            y: 100,
            w: 500,
            h: 300,
            rotation: 0,
            parallax: {
              enabled: true,
              depth: 1.5,
              repeatX: true,
              repeatY: false,
              autoScrollX: 10,
              autoScrollY: 0
            }
          },
          {
            id: 3,
            name: 'Static',
            x: 200,
            y: 200,
            w: 100,
            h: 100,
            rotation: 0,
            parallax: {
              enabled: false,
              depth: 1.0
            }
          }
        ]
      })),
      playMode: ref(false),
      playModeState: ref({
        playerActorId: null,
        playerPosition: { x: 960, y: 600 }
      }),
      zoom: ref(1.0),
      getAssetById: vi.fn(() => ({ id: 1, s3Key: 'test.png' })),
      getAssetDisplayUrl: vi.fn(() => 'https://example.com/test.png')
    }

    composable = useParallax(options)
  })

  describe('ensureParallaxDefaults', () => {
    it('should add default parallax object if not present', () => {
      const image = { id: 1, name: 'Test' }

      composable.ensureParallaxDefaults(image)

      expect(image.parallax).toBeDefined()
      expect(image.parallax.enabled).toBe(false)
      expect(image.parallax.depth).toBe(1.0)
      expect(image.parallax.repeatX).toBe(false)
      expect(image.parallax.repeatY).toBe(false)
      expect(image.parallax.autoScrollX).toBe(0)
      expect(image.parallax.autoScrollY).toBe(0)
    })

    it('should not overwrite existing parallax settings', () => {
      const image = {
        id: 1,
        parallax: {
          enabled: true,
          depth: 0.5,
          repeatX: true,
          repeatY: true,
          autoScrollX: 5,
          autoScrollY: 10
        }
      }

      composable.ensureParallaxDefaults(image)

      expect(image.parallax.enabled).toBe(true)
      expect(image.parallax.depth).toBe(0.5)
    })
  })

  describe('getParallaxOffset', () => {
    it('should return zero offset for disabled parallax', () => {
      const image = { id: 3, parallax: { enabled: false } }

      const offset = composable.getParallaxOffset(image)

      expect(offset).toEqual({ x: 0, y: 0 })
    })

    it('should return zero offset when camera at origin', () => {
      composable.cameraPosition.value = { x: 0, y: 0 }
      const image = { id: 1, parallax: { enabled: true, depth: 0.5 } }

      const offset = composable.getParallaxOffset(image)

      expect(offset).toEqual({ x: 0, y: 0 })
    })

    it('should calculate offset for background layer (depth < 1)', () => {
      composable.cameraPosition.value = { x: 100, y: 50 }
      const image = { id: 1, parallax: { enabled: true, depth: 0.5 } }

      const offset = composable.getParallaxOffset(image)

      // depth 0.5 means parallax factor is (1 - 0.5) = 0.5
      // So offset should be camera * 0.5
      expect(offset.x).toBe(50) // 100 * 0.5
      expect(offset.y).toBe(25) // 50 * 0.5
    })

    it('should calculate offset for foreground layer (depth > 1)', () => {
      composable.cameraPosition.value = { x: 100, y: 50 }
      const image = { id: 2, parallax: { enabled: true, depth: 1.5 } }

      const offset = composable.getParallaxOffset(image)

      // depth 1.5 means parallax factor is (1 - 1.5) = -0.5
      // So offset should be camera * -0.5
      expect(offset.x).toBe(-50) // 100 * -0.5
      expect(offset.y).toBe(-25) // 50 * -0.5
    })

    it('should include auto-scroll offset', () => {
      composable.cameraPosition.value = { x: 0, y: 0 }
      composable.parallaxScrollOffsets.value = { 1: { x: 20, y: 10 } }
      const image = { id: 1, parallax: { enabled: true, depth: 1.0 } }

      const offset = composable.getParallaxOffset(image)

      expect(offset.x).toBe(20)
      expect(offset.y).toBe(10)
    })
  })

  describe('getParallaxImageStyle', () => {
    it('should return correct position style', () => {
      composable.cameraPosition.value = { x: 0, y: 0 }
      const image = {
        id: 1,
        x: 100,
        y: 200,
        w: 300,
        h: 400,
        rotation: 0,
        assetId: 1,
        parallax: { enabled: false }
      }

      const style = composable.getParallaxImageStyle(image)

      expect(style.left).toBe('100px')
      expect(style.top).toBe('200px')
      expect(style.width).toBe('300px')
      expect(style.height).toBe('400px')
    })

    it('should apply zoom to position and size', () => {
      options.zoom.value = 0.5
      composable.cameraPosition.value = { x: 0, y: 0 }
      const image = {
        id: 1,
        x: 100,
        y: 200,
        w: 300,
        h: 400,
        rotation: 0,
        assetId: 1,
        parallax: { enabled: false }
      }

      const style = composable.getParallaxImageStyle(image)

      expect(style.left).toBe('50px') // 100 * 0.5
      expect(style.top).toBe('100px') // 200 * 0.5
      expect(style.width).toBe('150px') // 300 * 0.5
      expect(style.height).toBe('200px') // 400 * 0.5
    })

    it('should apply parallax offset to position', () => {
      composable.cameraPosition.value = { x: 100, y: 50 }
      const image = {
        id: 1,
        x: 100,
        y: 200,
        w: 300,
        h: 400,
        rotation: 0,
        assetId: 1,
        parallax: { enabled: true, depth: 0.5 }
      }

      const style = composable.getParallaxImageStyle(image)

      // Offset is (100*0.5, 50*0.5) = (50, 25)
      expect(style.left).toBe('150px') // (100 + 50) * 1
      expect(style.top).toBe('225px') // (200 + 25) * 1
    })

    it('should include rotation transform', () => {
      const image = {
        id: 1,
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        rotation: 45,
        parallax: { enabled: false }
      }

      const style = composable.getParallaxImageStyle(image)

      expect(style.transform).toBe('rotate(45deg)')
    })

    it('should set background image from asset', () => {
      const image = {
        id: 1,
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        rotation: 0,
        assetId: 1,
        parallax: { enabled: false }
      }

      const style = composable.getParallaxImageStyle(image)

      expect(options.getAssetById).toHaveBeenCalledWith(1)
      expect(style.backgroundImage).toBe('url(https://example.com/test.png)')
    })

    it('should set repeat-x for horizontal tiling', () => {
      const image = {
        id: 1,
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        rotation: 0,
        assetId: 1,
        parallax: { enabled: true, repeatX: true, repeatY: false }
      }

      const style = composable.getParallaxImageStyle(image)

      expect(style.backgroundRepeat).toBe('repeat-x')
    })

    it('should set repeat for both axis tiling', () => {
      const image = {
        id: 1,
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        rotation: 0,
        assetId: 1,
        parallax: { enabled: true, repeatX: true, repeatY: true }
      }

      const style = composable.getParallaxImageStyle(image)

      expect(style.backgroundRepeat).toBe('repeat')
    })
  })

  describe('updateParallaxAutoScroll', () => {
    it('should not update disabled parallax images', () => {
      composable.updateParallaxAutoScroll(1.0)

      expect(composable.parallaxScrollOffsets.value[3]).toBeUndefined()
    })

    it('should update auto-scroll offset based on deltaTime', () => {
      // Image 2 has autoScrollX: 10
      composable.updateParallaxAutoScroll(0.5) // 0.5 seconds

      expect(composable.parallaxScrollOffsets.value[2]).toBeDefined()
      expect(composable.parallaxScrollOffsets.value[2].x).toBe(5) // 10 * 0.5
    })

    it('should wrap around for repeating images', () => {
      // Set up initial offset larger than image width
      composable.parallaxScrollOffsets.value[2] = { x: 600, y: 0 }
      // Image 2 width is 500, repeatX is true

      composable.updateParallaxAutoScroll(0)

      // Should wrap: 600 % 500 = 100
      expect(composable.parallaxScrollOffsets.value[2].x).toBe(100)
    })
  })

  describe('updateCameraForPlayer', () => {
    it('should not update camera when not in play mode', () => {
      options.playMode.value = false
      composable.cameraPosition.value = { x: 0, y: 0 }

      composable.updateCameraForPlayer()

      expect(composable.cameraPosition.value).toEqual({ x: 0, y: 0 })
    })

    it('should not update camera when no player actor', () => {
      options.playMode.value = true
      options.playModeState.value.playerActorId = null
      composable.cameraPosition.value = { x: 0, y: 0 }

      composable.updateCameraForPlayer()

      expect(composable.cameraPosition.value).toEqual({ x: 0, y: 0 })
    })

    it('should smoothly follow player position', () => {
      options.playMode.value = true
      options.playModeState.value.playerActorId = 1
      options.playModeState.value.playerPosition = { x: 960, y: 600 }
      composable.cameraPosition.value = { x: 0, y: 0 }

      // Target would be (960 - 1920/2, 600 - 1200/2) = (0, 0)
      // With smooth follow, camera moves 10% towards target
      composable.updateCameraForPlayer()

      // Camera should move slightly towards target
      expect(composable.cameraPosition.value.x).toBe(0)
      expect(composable.cameraPosition.value.y).toBe(0)
    })

    it('should move camera towards off-center player', () => {
      options.playMode.value = true
      options.playModeState.value.playerActorId = 1
      options.playModeState.value.playerPosition = { x: 1500, y: 900 }
      composable.cameraPosition.value = { x: 0, y: 0 }

      // Target would be (1500 - 960, 900 - 600) = (540, 300)
      composable.updateCameraForPlayer()

      // Camera should move 10% towards target
      expect(composable.cameraPosition.value.x).toBeCloseTo(54, 1) // 540 * 0.1
      expect(composable.cameraPosition.value.y).toBeCloseTo(30, 1) // 300 * 0.1
    })
  })

  describe('resetParallax', () => {
    it('should reset camera position to origin', () => {
      composable.cameraPosition.value = { x: 100, y: 200 }

      composable.resetParallax()

      expect(composable.cameraPosition.value).toEqual({ x: 0, y: 0 })
    })

    it('should clear all scroll offsets', () => {
      composable.parallaxScrollOffsets.value = {
        1: { x: 10, y: 20 },
        2: { x: 30, y: 40 }
      }

      composable.resetParallax()

      expect(composable.parallaxScrollOffsets.value).toEqual({})
    })
  })

  describe('updateParallaxInLoop', () => {
    it('should update auto-scroll with delta time', () => {
      const time1 = 1000
      const time2 = 1500 // 500ms later

      composable.updateParallaxInLoop(time1)
      composable.updateParallaxInLoop(time2)

      // Image 2 has autoScrollX: 10 px/sec
      // After 0.5 seconds, offset should be 5
      expect(composable.parallaxScrollOffsets.value[2].x).toBeCloseTo(5, 1)
    })

    it('should update camera when in play mode', () => {
      options.playMode.value = true
      options.playModeState.value.playerActorId = 1
      options.playModeState.value.playerPosition = { x: 1500, y: 900 }

      composable.updateParallaxInLoop(1000)
      composable.updateParallaxInLoop(1016) // ~16ms later (60fps)

      // Camera should have moved slightly
      expect(composable.cameraPosition.value.x).not.toBe(0)
    })
  })
})
