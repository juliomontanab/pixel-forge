/**
 * useLighting.js
 *
 * Composable para el sistema de iluminación del editor.
 * Maneja tipos de luz, preview y gradientes de iluminación.
 *
 * @example
 * const {
 *   lightTypes,
 *   getLightIcon,
 *   getLightPreviewStyle,
 *   getLightingGradient
 * } = useLighting({ currentScene, zoom })
 */

/**
 * Available light types
 */
export const lightTypes = [
  { id: 'point', name: 'Point Light', icon: '💡' },
  { id: 'spot', name: 'Spot Light', icon: '🔦' },
  { id: 'directional', name: 'Directional', icon: '☀️' },
  { id: 'area', name: 'Area Light', icon: '⬜' }
]

/**
 * Creates a lighting system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.currentScene - Reactive reference to current scene
 * @param {Ref} options.zoom - Reactive reference to zoom level
 * @returns {Object} Lighting methods
 */
export function useLighting(options = {}) {
  const { currentScene, zoom } = options

  /**
   * Get light icon by type
   * @param {string} type - Light type ID
   * @returns {string} Emoji icon
   */
  const getLightIcon = (type) => {
    const found = lightTypes.find(lt => lt.id === type)
    return found ? found.icon : '💡'
  }

  /**
   * Get light preview style (glow around light icon)
   * @param {Object} light - Light configuration
   * @returns {Object} CSS style object
   */
  const getLightPreviewStyle = (light) => {
    const zoomValue = zoom?.value || 1
    const size = light.type === 'point' || light.type === 'spot' ? light.radius * 2 : 200

    return {
      width: size * zoomValue + 'px',
      height: size * zoomValue + 'px',
      background: `radial-gradient(circle, ${light.color}66 0%, transparent 70%)`,
      transform: 'translate(-50%, -50%)',
      left: '50%',
      top: '50%',
      position: 'absolute',
      pointerEvents: 'none',
      opacity: light.intensity
    }
  }

  /**
   * Get lighting gradient for the overlay
   * @returns {string} CSS gradient string
   */
  const getLightingGradient = () => {
    if (!currentScene?.value?.lighting) return 'transparent'

    const ambient = currentScene.value.lighting.ambient
    const lights = currentScene.value.lighting.lights.filter(l => l.enabled)

    if (lights.length === 0) {
      // Just ambient darkness
      return ambient.color
    }

    // Create a CSS gradient with light sources
    // Note: This is a simplified 2D representation
    const gradients = lights.map(light => {
      const x = (light.x / currentScene.value.width) * 100
      const y = (light.y / currentScene.value.height) * 100
      const radius = light.type === 'directional' ? 100 : (light.radius / Math.max(currentScene.value.width, currentScene.value.height)) * 100

      return `radial-gradient(circle at ${x}% ${y}%, transparent 0%, transparent ${radius * 0.5}%, ${ambient.color}88 ${radius}%)`
    })

    return gradients.join(', ')
  }

  /**
   * Create a new light with default values
   * @param {string} type - Light type
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Object} New light object
   */
  const createLight = (type = 'point', x = 100, y = 100) => {
    return {
      id: Date.now(),
      name: `New ${getLightIcon(type)} Light`,
      type,
      x,
      y,
      color: '#ffffff',
      intensity: 0.8,
      radius: 150,
      enabled: true
    }
  }

  /**
   * Create default lighting configuration for a scene
   * @returns {Object} Default lighting config
   */
  const createDefaultLighting = () => {
    return {
      ambient: {
        color: '#000000',
        intensity: 0.3
      },
      lights: []
    }
  }

  return {
    // Constants
    lightTypes,

    // Methods
    getLightIcon,
    getLightPreviewStyle,
    getLightingGradient,
    createLight,
    createDefaultLighting
  }
}

export default useLighting
