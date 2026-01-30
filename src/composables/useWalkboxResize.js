/**
 * useWalkboxResize.js
 *
 * Composable para el sistema de edición de vértices de walkboxes.
 * Permite arrastrar vértices, añadir nuevos y eliminar existentes.
 *
 * @example
 * const {
 *   isDraggingVertex,
 *   vertexDragState,
 *   getWalkboxCenter,
 *   startVertexDrag,
 *   addWalkboxVertex,
 *   removeWalkboxVertex
 * } = useWalkboxResize({
 *   currentScene,
 *   getSceneCoords
 * })
 */

import { ref } from 'vue'

/**
 * Creates a walkbox vertex editing system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.currentScene - Reactive reference to current scene
 * @param {Function} options.getSceneCoords - Function to convert mouse event to scene coordinates
 * @returns {Object} Walkbox resize methods and state
 */
export function useWalkboxResize(options = {}) {
  const {
    currentScene,
    getSceneCoords
  } = options

  // =====================
  // STATE
  // =====================

  const isDraggingVertex = ref(false)
  const vertexDragState = ref({
    walkbox: null,
    vertexIndex: null,
    startX: 0,
    startY: 0,
    originalX: 0,
    originalY: 0
  })

  // =====================
  // HELPER FUNCTIONS
  // =====================

  /**
   * Get center point of walkbox for label positioning
   * @param {Object} wb - Walkbox object with points array
   * @returns {Object} Center coordinates { x, y }
   */
  const getWalkboxCenter = (wb) => {
    if (!wb?.points?.length) return { x: 0, y: 0 }
    const sumX = wb.points.reduce((sum, p) => sum + p.x, 0)
    const sumY = wb.points.reduce((sum, p) => sum + p.y, 0)
    return {
      x: sumX / wb.points.length,
      y: sumY / wb.points.length
    }
  }

  // =====================
  // VERTEX DRAG OPERATIONS
  // =====================

  /**
   * Handle vertex drag movement
   * @param {MouseEvent} event
   */
  const onVertexDragMove = (event) => {
    if (!isDraggingVertex.value || !vertexDragState.value.walkbox) return

    const coords = getSceneCoords?.(event)
    if (!coords) return

    const dx = coords.x - vertexDragState.value.startX
    const dy = coords.y - vertexDragState.value.startY

    const sceneWidth = currentScene?.value?.width || 1920
    const sceneHeight = currentScene?.value?.height || 1200

    const newX = Math.max(0, Math.min(sceneWidth, vertexDragState.value.originalX + dx))
    const newY = Math.max(0, Math.min(sceneHeight, vertexDragState.value.originalY + dy))

    vertexDragState.value.walkbox.points[vertexDragState.value.vertexIndex].x = newX
    vertexDragState.value.walkbox.points[vertexDragState.value.vertexIndex].y = newY
  }

  /**
   * End vertex dragging
   */
  const onVertexDragEnd = () => {
    isDraggingVertex.value = false
    vertexDragState.value = {
      walkbox: null,
      vertexIndex: null,
      startX: 0,
      startY: 0,
      originalX: 0,
      originalY: 0
    }

    document.removeEventListener('mousemove', onVertexDragMove)
    document.removeEventListener('mouseup', onVertexDragEnd)
  }

  /**
   * Start dragging a vertex
   * @param {MouseEvent} event
   * @param {Object} walkbox - Walkbox being edited
   * @param {number} vertexIndex - Index of vertex being dragged
   */
  const startVertexDrag = (event, walkbox, vertexIndex) => {
    event.preventDefault()
    event.stopPropagation()

    isDraggingVertex.value = true
    const coords = getSceneCoords?.(event)
    if (!coords) return

    const point = walkbox.points[vertexIndex]

    vertexDragState.value = {
      walkbox,
      vertexIndex,
      startX: coords.x,
      startY: coords.y,
      originalX: point.x,
      originalY: point.y
    }

    document.addEventListener('mousemove', onVertexDragMove)
    document.addEventListener('mouseup', onVertexDragEnd)
  }

  // =====================
  // VERTEX ADD/REMOVE
  // =====================

  /**
   * Add a new vertex on an edge (at the midpoint)
   * @param {Object} walkbox - Walkbox being edited
   * @param {number} edgeIndex - Index of edge to split
   * @param {MouseEvent} event
   */
  const addWalkboxVertex = (walkbox, edgeIndex, event) => {
    event.preventDefault()
    event.stopPropagation()

    // Get the two points of this edge
    const p1 = walkbox.points[edgeIndex]
    const p2 = walkbox.points[(edgeIndex + 1) % walkbox.points.length]

    // Calculate midpoint of the edge (more reliable than mouse position)
    const midX = Math.round((p1.x + p2.x) / 2)
    const midY = Math.round((p1.y + p2.y) / 2)

    // Insert new point after edgeIndex
    walkbox.points.splice(edgeIndex + 1, 0, {
      x: midX,
      y: midY
    })

    console.log(`[Walkbox] Added vertex at (${midX}, ${midY}) on edge ${edgeIndex}`)
  }

  /**
   * Remove a vertex (minimum 3 vertices required)
   * @param {Object} walkbox - Walkbox being edited
   * @param {number} vertexIndex - Index of vertex to remove
   * @returns {boolean} Whether the vertex was removed
   */
  const removeWalkboxVertex = (walkbox, vertexIndex) => {
    if (walkbox.points.length <= 3) {
      console.log('[Walkbox] Cannot remove vertex: minimum 3 required')
      return false
    }

    walkbox.points.splice(vertexIndex, 1)
    return true
  }

  /**
   * Get walkbox path for SVG polygon
   * @param {Object} wb - Walkbox object
   * @param {number} zoom - Current zoom level
   * @returns {string} SVG path string
   */
  const getWalkboxPath = (wb, zoom = 1) => {
    if (!wb?.points?.length) return ''
    return wb.points.map(p => `${p.x * zoom},${p.y * zoom}`).join(' ')
  }

  /**
   * Cleanup event listeners
   */
  const cleanup = () => {
    document.removeEventListener('mousemove', onVertexDragMove)
    document.removeEventListener('mouseup', onVertexDragEnd)
  }

  return {
    // State
    isDraggingVertex,
    vertexDragState,

    // Helper functions
    getWalkboxCenter,
    getWalkboxPath,

    // Vertex operations
    startVertexDrag,
    addWalkboxVertex,
    removeWalkboxVertex,

    // Cleanup
    cleanup
  }
}

export default useWalkboxResize
