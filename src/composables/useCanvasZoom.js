/**
 * useCanvasZoom.js
 *
 * Composable para manejo del zoom del canvas del editor.
 * Controla nivel de zoom, límites, y funciones de zoom in/out/reset.
 *
 * @example
 * const {
 *   zoom,
 *   zoomIn,
 *   zoomOut,
 *   setZoom,
 *   resetZoom,
 *   zoomPercent
 * } = useCanvasZoom({ defaultZoom: 1.0, minZoom: 0.1, maxZoom: 3.0 })
 */

import { ref, computed } from 'vue'

/**
 * Creates a canvas zoom system
 *
 * @param {Object} options - Configuration options
 * @param {number} [options.defaultZoom] - Initial zoom level (default: 1.0)
 * @param {number} [options.minZoom] - Minimum zoom level (default: 0.1)
 * @param {number} [options.maxZoom] - Maximum zoom level (default: 3.0)
 * @param {number} [options.zoomStep] - Zoom increment per step (default: 0.1)
 * @returns {Object} Zoom control methods and state
 */
export function useCanvasZoom(options = {}) {
  const {
    defaultZoom = 1.0,
    minZoom = 0.1,
    maxZoom = 3.0,
    zoomStep = 0.1
  } = options

  // Zoom state
  const zoom = ref(defaultZoom)

  /**
   * Set zoom to a specific value
   * @param {number} value - New zoom level
   */
  const setZoom = (value) => {
    zoom.value = Math.max(minZoom, Math.min(maxZoom, value))
  }

  /**
   * Zoom in by step amount
   */
  const zoomIn = () => {
    setZoom(zoom.value + zoomStep)
  }

  /**
   * Zoom out by step amount
   */
  const zoomOut = () => {
    setZoom(zoom.value - zoomStep)
  }

  /**
   * Reset zoom to default
   */
  const resetZoom = () => {
    zoom.value = defaultZoom
  }

  /**
   * Fit canvas to container
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   * @param {number} containerWidth - Container width
   * @param {number} containerHeight - Container height
   * @param {number} [padding] - Padding around canvas (default: 40)
   */
  const fitToContainer = (canvasWidth, canvasHeight, containerWidth, containerHeight, padding = 40) => {
    const availableWidth = containerWidth - padding * 2
    const availableHeight = containerHeight - padding * 2

    const scaleX = availableWidth / canvasWidth
    const scaleY = availableHeight / canvasHeight

    setZoom(Math.min(scaleX, scaleY))
  }

  /**
   * Handle mouse wheel zoom
   * @param {WheelEvent} event
   * @param {Object} [options]
   * @param {boolean} [options.requireCtrl] - Require Ctrl key (default: true)
   */
  const handleWheelZoom = (event, { requireCtrl = true } = {}) => {
    if (requireCtrl && !event.ctrlKey && !event.metaKey) {
      return false
    }

    event.preventDefault()

    if (event.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }

    return true
  }

  // Computed: zoom as percentage
  const zoomPercent = computed(() => Math.round(zoom.value * 100))

  // Computed: can zoom in more
  const canZoomIn = computed(() => zoom.value < maxZoom)

  // Computed: can zoom out more
  const canZoomOut = computed(() => zoom.value > minZoom)

  // Computed: zoom level label
  const zoomLabel = computed(() => `${zoomPercent.value}%`)

  return {
    // State
    zoom,
    zoomPercent,
    zoomLabel,
    canZoomIn,
    canZoomOut,

    // Methods
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToContainer,
    handleWheelZoom,

    // Constants (for UI)
    minZoom,
    maxZoom,
    zoomStep
  }
}

export default useCanvasZoom
