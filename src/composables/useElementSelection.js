/**
 * useElementSelection.js
 *
 * Composable para manejo de selección, drag & drop, resize y rotación de elementos.
 * Centraliza toda la lógica de interacción con elementos en el canvas.
 *
 * @example
 * const {
 *   selectedElements,
 *   selectElement,
 *   clearSelection,
 *   startDrag,
 *   startResize,
 *   startRotate,
 *   getSceneCoords
 * } = useElementSelection({
 *   canvasRef,
 *   zoom,
 *   sceneWidth: computed(() => scene.width),
 *   sceneHeight: computed(() => scene.height),
 *   getElementGroup,
 *   getElementByTypeAndId
 * })
 */

import { ref, computed, onUnmounted } from 'vue'

/**
 * Creates an element selection and manipulation system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.canvasRef - Reference to the canvas DOM element
 * @param {Ref<number>} options.zoom - Current zoom level
 * @param {Ref<number>|ComputedRef<number>} options.sceneWidth - Scene width
 * @param {Ref<number>|ComputedRef<number>} options.sceneHeight - Scene height
 * @param {Function} [options.getElementGroup] - Function to get element's group
 * @param {Function} [options.getElementByTypeAndId] - Function to get element by type and ID
 * @param {number} [options.minSize] - Minimum element size for resize (default: 20)
 * @returns {Object} Selection and manipulation methods
 */
export function useElementSelection(options = {}) {
  const {
    canvasRef,
    zoom = ref(1),
    sceneWidth = ref(1920),
    sceneHeight = ref(1200),
    getElementGroup = null,
    getElementByTypeAndId = null,
    minSize = 20
  } = options

  // =====================
  // SELECTION STATE
  // =====================

  /** @type {Ref<Array<{type: string, element: Object}>>} */
  const selectedElements = ref([])

  /**
   * Check if an element is currently selected
   * @param {string} type - Element type
   * @param {number|string} id - Element ID
   * @returns {boolean}
   */
  const isElementSelected = (type, id) => {
    return selectedElements.value.some(s => s.type === type && s.element.id === id)
  }

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    selectedElements.value = []
  }

  /**
   * Select all elements of a specific type
   * @param {string} type - Element type
   * @param {Array} elements - Array of elements
   */
  const selectAllOfType = (type, elements) => {
    // Clear other types
    selectedElements.value = selectedElements.value.filter(s => s.type !== type)
    // Add all of this type that aren't already selected
    const newSelections = elements
      .filter(el => !selectedElements.value.some(s => s.type === type && s.element.id === el.id))
      .map(el => ({ type, element: el }))
    selectedElements.value = [...selectedElements.value, ...newSelections]
  }

  /**
   * Handle element selection with multi-select support
   * @param {string} type - Element type
   * @param {Object} element - Element object
   * @param {MouseEvent} [event] - Mouse event (for multi-select detection)
   * @returns {boolean} Whether the element was already selected
   */
  const selectElement = (type, element, event = null) => {
    const isAlreadySelected = isElementSelected(type, element.id)
    const isMultiSelect = event && (event.ctrlKey || event.metaKey || event.shiftKey)

    if (isMultiSelect) {
      if (isAlreadySelected) {
        // Will be handled in drag end for canvas elements
        // For panel clicks (no event), toggle immediately
        if (!event) {
          selectedElements.value = selectedElements.value.filter(
            s => !(s.type === type && s.element.id === element.id)
          )
        }
      } else {
        // Add to selection
        selectedElements.value = [...selectedElements.value, { type, element }]
      }
    } else {
      // Single select: replace selection
      if (!isAlreadySelected) {
        selectedElements.value = [{ type, element }]
      }
    }

    return isAlreadySelected
  }

  // =====================
  // COORDINATE HELPERS
  // =====================

  /**
   * Get mouse position in scene coordinates
   * @param {MouseEvent} event
   * @returns {{x: number, y: number}}
   */
  const getSceneCoords = (event) => {
    if (!canvasRef?.value) return { x: 0, y: 0 }

    const rect = canvasRef.value.getBoundingClientRect()
    const x = (event.clientX - rect.left) / zoom.value
    const y = (event.clientY - rect.top) / zoom.value

    return { x: Math.round(x), y: Math.round(y) }
  }

  // =====================
  // DRAG & DROP SYSTEM
  // =====================

  const isDragging = ref(false)
  const didDragMove = ref(false)
  const dragState = ref({
    startX: 0,
    startY: 0,
    clickedElement: null,
    elements: []
  })

  /**
   * Start dragging selected elements
   * @param {MouseEvent} event
   * @param {string} type - Element type
   * @param {Object} element - Element being dragged
   * @param {boolean} wasAlreadySelected - If element was selected before click
   */
  const startDrag = (event, type, element, wasAlreadySelected = false) => {
    event.preventDefault()
    event.stopPropagation()

    isDragging.value = true
    didDragMove.value = false
    const coords = getSceneCoords(event)

    const isMultiSelect = event.ctrlKey || event.metaKey || event.shiftKey

    // Start with selected elements
    let elementsToDrag = [...selectedElements.value]

    // If using groups, include all group members
    if (getElementGroup && getElementByTypeAndId) {
      const processedGroups = new Set()
      selectedElements.value.forEach(sel => {
        const group = getElementGroup(sel.type, sel.element.id)
        if (group && !processedGroups.has(group.id)) {
          processedGroups.add(group.id)
          group.members.forEach(member => {
            const alreadyIncluded = elementsToDrag.some(
              e => e.type === member.type && e.element.id === member.id
            )
            if (!alreadyIncluded) {
              const memberElement = getElementByTypeAndId(member.type, member.id)
              if (memberElement) {
                elementsToDrag.push({ type: member.type, element: memberElement })
              }
            }
          })
        }
      })
    }

    // Store original positions
    const elementsData = elementsToDrag.map(({ type: t, element: el }) => {
      if (t === 'walkbox' && el.points) {
        return {
          type: t,
          element: el,
          startX: el.points[0].x,
          startY: el.points[0].y,
          originalPoints: el.points.map(p => ({ x: p.x, y: p.y }))
        }
      } else {
        return {
          type: t,
          element: el,
          startX: el.x,
          startY: el.y,
          originalPoints: null
        }
      }
    })

    dragState.value = {
      startX: coords.x,
      startY: coords.y,
      clickedElement: (wasAlreadySelected && isMultiSelect) ? { type, element } : null,
      elements: elementsData
    }

    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }

  /**
   * Handle drag movement
   * @param {MouseEvent} event
   */
  const onDragMove = (event) => {
    if (!isDragging.value || dragState.value.elements.length === 0) return

    const coords = getSceneCoords(event)
    const dx = coords.x - dragState.value.startX
    const dy = coords.y - dragState.value.startY

    // Mark movement with threshold
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      didDragMove.value = true
    }

    const width = sceneWidth.value
    const height = sceneHeight.value

    dragState.value.elements.forEach(({ type, element, startX, startY, originalPoints }) => {
      if (type === 'walkbox' && element.points && originalPoints) {
        element.points.forEach((point, i) => {
          point.x = Math.max(0, Math.min(width, originalPoints[i].x + dx))
          point.y = Math.max(0, Math.min(height, originalPoints[i].y + dy))
        })
      } else {
        element.x = Math.max(0, Math.min(width - (element.w || 0), startX + dx))
        element.y = Math.max(0, Math.min(height - (element.h || 0), startY + dy))
      }
    })
  }

  /**
   * End dragging
   */
  const onDragEnd = () => {
    // Toggle selection if just clicked without movement
    if (!didDragMove.value && dragState.value.clickedElement) {
      const { type, element } = dragState.value.clickedElement
      selectedElements.value = selectedElements.value.filter(
        s => !(s.type === type && s.element.id === element.id)
      )
    }

    isDragging.value = false
    didDragMove.value = false
    dragState.value = {
      startX: 0,
      startY: 0,
      clickedElement: null,
      elements: []
    }

    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }

  // =====================
  // RESIZE SYSTEM
  // =====================

  const isResizing = ref(false)
  const resizeState = ref({
    element: null,
    handle: null,
    startX: 0,
    startY: 0,
    originalX: 0,
    originalY: 0,
    originalW: 0,
    originalH: 0
  })

  /**
   * Start resizing an element
   * @param {MouseEvent} event
   * @param {Object} element
   * @param {string} handle - 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
   */
  const startResize = (event, element, handle) => {
    event.preventDefault()
    event.stopPropagation()

    isResizing.value = true
    const coords = getSceneCoords(event)

    resizeState.value = {
      element,
      handle,
      startX: coords.x,
      startY: coords.y,
      originalX: element.x,
      originalY: element.y,
      originalW: element.w,
      originalH: element.h
    }

    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
  }

  /**
   * Handle resize movement
   * @param {MouseEvent} event
   */
  const onResizeMove = (event) => {
    if (!isResizing.value || !resizeState.value.element) return

    const coords = getSceneCoords(event)
    const dx = coords.x - resizeState.value.startX
    const dy = coords.y - resizeState.value.startY
    const el = resizeState.value.element
    const handle = resizeState.value.handle

    let newX = resizeState.value.originalX
    let newY = resizeState.value.originalY
    let newW = resizeState.value.originalW
    let newH = resizeState.value.originalH

    // Horizontal resize
    if (handle.includes('w')) {
      newX = Math.max(0, resizeState.value.originalX + dx)
      newW = Math.max(minSize, resizeState.value.originalW - dx)
      if (newX + newW > resizeState.value.originalX + resizeState.value.originalW) {
        newX = resizeState.value.originalX + resizeState.value.originalW - minSize
        newW = minSize
      }
    } else if (handle.includes('e')) {
      newW = Math.max(minSize, Math.min(sceneWidth.value - newX, resizeState.value.originalW + dx))
    }

    // Vertical resize
    if (handle.includes('n')) {
      newY = Math.max(0, resizeState.value.originalY + dy)
      newH = Math.max(minSize, resizeState.value.originalH - dy)
      if (newY + newH > resizeState.value.originalY + resizeState.value.originalH) {
        newY = resizeState.value.originalY + resizeState.value.originalH - minSize
        newH = minSize
      }
    } else if (handle.includes('s')) {
      newH = Math.max(minSize, Math.min(sceneHeight.value - newY, resizeState.value.originalH + dy))
    }

    el.x = newX
    el.y = newY
    el.w = newW
    el.h = newH
  }

  /**
   * End resizing
   */
  const onResizeEnd = () => {
    isResizing.value = false
    resizeState.value = {
      element: null,
      handle: null,
      startX: 0,
      startY: 0,
      originalX: 0,
      originalY: 0,
      originalW: 0,
      originalH: 0
    }

    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  }

  // =====================
  // ROTATION SYSTEM
  // =====================

  const isRotating = ref(false)
  const rotateState = ref({
    element: null,
    centerX: 0,
    centerY: 0,
    startAngle: 0,
    originalRotation: 0
  })

  /**
   * Start rotating an element
   * @param {MouseEvent} event
   * @param {Object} element
   */
  const startRotate = (event, element) => {
    event.preventDefault()
    event.stopPropagation()

    isRotating.value = true
    const coords = getSceneCoords(event)

    const centerX = element.x + element.w / 2
    const centerY = element.y + element.h / 2
    const startAngle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI)

    rotateState.value = {
      element,
      centerX,
      centerY,
      startAngle,
      originalRotation: element.rotation || 0
    }

    document.addEventListener('mousemove', onRotateMove)
    document.addEventListener('mouseup', onRotateEnd)
  }

  /**
   * Start rotating a walkbox (calculates center from points)
   * @param {MouseEvent} event
   * @param {Object} walkbox
   * @param {Function} getWalkboxCenter - Function to calculate walkbox center
   */
  const startWalkboxRotate = (event, walkbox, getWalkboxCenter) => {
    event.preventDefault()
    event.stopPropagation()

    isRotating.value = true
    const coords = getSceneCoords(event)
    const center = getWalkboxCenter(walkbox)
    const startAngle = Math.atan2(coords.y - center.y, coords.x - center.x) * (180 / Math.PI)

    rotateState.value = {
      element: walkbox,
      centerX: center.x,
      centerY: center.y,
      startAngle,
      originalRotation: walkbox.rotation || 0
    }

    document.addEventListener('mousemove', onRotateMove)
    document.addEventListener('mouseup', onRotateEnd)
  }

  /**
   * Handle rotation movement
   * @param {MouseEvent} event
   */
  const onRotateMove = (event) => {
    if (!isRotating.value || !rotateState.value.element) return

    const coords = getSceneCoords(event)
    const { centerX, centerY, startAngle, originalRotation, element } = rotateState.value

    const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI)
    let deltaAngle = currentAngle - startAngle
    let newRotation = originalRotation + deltaAngle

    // Normalize to 0-360
    newRotation = ((newRotation % 360) + 360) % 360

    // Shift key for 15° snap
    if (event.shiftKey) {
      newRotation = Math.round(newRotation / 15) * 15
    }

    element.rotation = newRotation
  }

  /**
   * End rotating
   */
  const onRotateEnd = () => {
    isRotating.value = false
    rotateState.value = {
      element: null,
      centerX: 0,
      centerY: 0,
      startAngle: 0,
      originalRotation: 0
    }

    document.removeEventListener('mousemove', onRotateMove)
    document.removeEventListener('mouseup', onRotateEnd)
  }

  // =====================
  // COMPUTED HELPERS
  // =====================

  /**
   * Check if exactly one element of a specific type is selected
   * @param {string} type
   * @returns {boolean}
   */
  const hasSingleSelection = (type) => {
    return selectedElements.value.length === 1 && selectedElements.value[0].type === type
  }

  /**
   * Get the single selected element if only one is selected
   * @returns {{type: string, element: Object}|null}
   */
  const singleSelectedElement = computed(() => {
    return selectedElements.value.length === 1 ? selectedElements.value[0] : null
  })

  /**
   * Get selected elements of a specific type
   * @param {string} type
   * @returns {Array}
   */
  const getSelectedOfType = (type) => {
    return selectedElements.value.filter(s => s.type === type).map(s => s.element)
  }

  // =====================
  // CLEANUP
  // =====================

  const cleanup = () => {
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
    document.removeEventListener('mousemove', onRotateMove)
    document.removeEventListener('mouseup', onRotateEnd)
  }

  onUnmounted(cleanup)

  return {
    // Selection state
    selectedElements,
    isElementSelected,
    selectElement,
    clearSelection,
    selectAllOfType,
    hasSingleSelection,
    singleSelectedElement,
    getSelectedOfType,

    // Coordinates
    getSceneCoords,

    // Drag & Drop
    isDragging,
    didDragMove,
    dragState,
    startDrag,

    // Resize
    isResizing,
    resizeState,
    startResize,

    // Rotation
    isRotating,
    rotateState,
    startRotate,
    startWalkboxRotate,

    // Cleanup
    cleanup
  }
}

export default useElementSelection
