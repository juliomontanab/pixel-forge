/**
 * useContextMenu.js
 *
 * Composable para el menú contextual y sistema de grupos de elementos.
 * Maneja agrupación, desagrupación, duplicación y eliminación de elementos.
 *
 * @example
 * const {
 *   contextMenu,
 *   showContextMenu,
 *   closeContextMenu,
 *   createGroup,
 *   ungroupSelected,
 *   selectGroup,
 *   canGroup,
 *   selectionInGroup
 * } = useContextMenu({
 *   currentScene,
 *   selectedElements,
 *   getElementGroup,
 *   getElementByTypeAndId
 * })
 */

import { ref, computed } from 'vue'

/**
 * Creates a context menu and grouping system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.currentScene - Reactive reference to current scene
 * @param {Ref} options.selectedElements - Reactive reference to selected elements
 * @param {Function} options.getElementGroup - Function to get group for an element
 * @param {Function} options.getElementByTypeAndId - Function to get element by type and ID
 * @returns {Object} Context menu methods and state
 */
export function useContextMenu(options = {}) {
  const {
    currentScene,
    selectedElements,
    getElementGroup,
    getElementByTypeAndId
  } = options

  // =====================
  // STATE
  // =====================

  const contextMenu = ref({
    visible: false,
    x: 0,
    y: 0
  })

  // =====================
  // GROUP HELPERS
  // =====================

  /**
   * Check if element is in a group
   * @param {string} type - Element type
   * @param {number|string} elementId - Element ID
   * @returns {boolean}
   */
  const isElementInGroup = (type, elementId) => {
    if (!type || elementId === undefined || elementId === null) return false
    const group = getElementGroup?.(type, elementId)
    return !!group
  }

  // =====================
  // GROUP OPERATIONS
  // =====================

  /**
   * Create a new group from selected elements
   */
  const createGroup = () => {
    if (!selectedElements?.value || selectedElements.value.length < 2) return

    if (!currentScene.value.groups) {
      currentScene.value.groups = []
    }

    const newGroup = {
      id: 'group-' + Date.now(),
      name: 'New Group',
      members: selectedElements.value.map(sel => ({
        type: sel.type,
        id: sel.element.id
      })),
      locked: false
    }

    currentScene.value.groups.push(newGroup)
    closeContextMenu()
  }

  /**
   * Ungroup selected elements - removes ALL groups containing any selected element
   */
  const ungroupSelected = () => {
    if (!selectedElements?.value || selectedElements.value.length === 0) return
    if (!currentScene.value.groups) return

    // Find all groups that contain any of the selected elements
    const groupsToRemove = new Set()
    selectedElements.value.forEach(sel => {
      const group = getElementGroup?.(sel.type, sel.element.id)
      if (group) {
        groupsToRemove.add(group.id)
      }
    })

    // Remove those groups
    currentScene.value.groups = currentScene.value.groups.filter(g => !groupsToRemove.has(g.id))
    closeContextMenu()
  }

  /**
   * Clear ALL groups in the current scene
   */
  const clearAllGroups = () => {
    currentScene.value.groups = []
    closeContextMenu()
  }

  /**
   * Select all elements in the same group as the first selected element
   */
  const selectGroup = () => {
    if (!selectedElements?.value || selectedElements.value.length === 0) return

    const firstSelected = selectedElements.value[0]
    const group = getElementGroup?.(firstSelected.type, firstSelected.element.id)

    if (group && getElementByTypeAndId) {
      const newSelection = []

      group.members.forEach(member => {
        const element = getElementByTypeAndId(member.type, member.id)
        if (element) {
          newSelection.push({ type: member.type, element })
        }
      })

      selectedElements.value = newSelection
    }
    closeContextMenu()
  }

  // =====================
  // ELEMENT OPERATIONS
  // =====================

  /**
   * Get the array name for an element type
   * @param {string} type - Element type
   * @returns {string} Array name in scene
   */
  const getArrayNameForType = (type) => {
    switch (type) {
      case 'image': return 'images'
      case 'walkbox': return 'walkboxes'
      case 'exit': return 'exits'
      case 'actor': return 'actorPlacements'
      case 'hotspot': return 'hotspots'
      case 'zplane': return 'zplanes'
      case 'light': return 'lighting.lights'
      case 'particle': return 'particles'
      default: return null
    }
  }

  /**
   * Duplicate selected elements
   * @param {number} [offset=20] - Position offset for duplicates
   */
  const duplicateSelected = (offset = 20) => {
    if (!selectedElements?.value || selectedElements.value.length === 0) return

    const newSelection = []

    selectedElements.value.forEach(sel => {
      const original = sel.element
      const newId = Date.now() + Math.random()

      // Deep clone the element
      const duplicate = JSON.parse(JSON.stringify(original))
      duplicate.id = newId
      duplicate.name = (original.name || sel.type) + ' (copy)'

      // Offset position
      if (duplicate.x !== undefined) duplicate.x += offset
      if (duplicate.y !== undefined) duplicate.y += offset
      if (duplicate.points) {
        duplicate.points = duplicate.points.map(p => ({ x: p.x + offset, y: p.y + offset }))
      }

      // Add to appropriate array
      switch (sel.type) {
        case 'image':
          currentScene.value.images.push(duplicate)
          break
        case 'walkbox':
          currentScene.value.walkboxes.push(duplicate)
          break
        case 'exit':
          currentScene.value.exits.push(duplicate)
          break
        case 'actor':
          currentScene.value.actorPlacements.push(duplicate)
          break
        case 'hotspot':
          currentScene.value.hotspots.push(duplicate)
          break
        case 'zplane':
          currentScene.value.zplanes.push(duplicate)
          break
        case 'light':
          currentScene.value.lighting.lights.push(duplicate)
          break
        case 'particle':
          currentScene.value.particles.push(duplicate)
          break
      }

      newSelection.push({ type: sel.type, element: duplicate })
    })

    selectedElements.value = newSelection
    closeContextMenu()
  }

  /**
   * Delete selected elements
   */
  const deleteSelected = () => {
    if (!selectedElements?.value) return

    selectedElements.value.forEach(sel => {
      let array = null
      switch (sel.type) {
        case 'image':
          array = currentScene.value.images
          break
        case 'walkbox':
          array = currentScene.value.walkboxes
          break
        case 'exit':
          array = currentScene.value.exits
          break
        case 'actor':
          array = currentScene.value.actorPlacements
          break
        case 'hotspot':
          array = currentScene.value.hotspots
          break
        case 'zplane':
          array = currentScene.value.zplanes
          break
        case 'light':
          array = currentScene.value.lighting?.lights
          break
        case 'particle':
          array = currentScene.value.particles
          break
      }

      if (array) {
        const idx = array.findIndex(e => e.id === sel.element.id)
        if (idx > -1) array.splice(idx, 1)
      }

      // Also remove from any group
      if (currentScene.value.groups) {
        currentScene.value.groups.forEach(group => {
          const memberIdx = group.members.findIndex(m => m.type === sel.type && m.id === sel.element.id)
          if (memberIdx > -1) group.members.splice(memberIdx, 1)
        })
        // Clean up empty groups
        currentScene.value.groups = currentScene.value.groups.filter(g => g.members.length > 0)
      }
    })

    selectedElements.value = []
    closeContextMenu()
  }

  // =====================
  // CONTEXT MENU CONTROLS
  // =====================

  /**
   * Show context menu at event position
   * @param {MouseEvent} event
   */
  const showContextMenu = (event) => {
    event.preventDefault()

    // Only show context menu if there are selected elements
    if (!selectedElements?.value || selectedElements.value.length === 0) return

    contextMenu.value = {
      visible: true,
      x: event.clientX,
      y: event.clientY
    }
  }

  /**
   * Show context menu for a specific element (right-click on element)
   * @param {MouseEvent} event
   * @param {string} type - Element type
   * @param {Object} element - Element object
   */
  const showElementContextMenu = (event, type, element) => {
    event.preventDefault()
    event.stopPropagation()

    if (!selectedElements?.value) return

    // If the element is not selected, select it (replacing current selection)
    const isSelected = selectedElements.value.some(
      s => s.type === type && s.element.id === element.id
    )

    if (!isSelected) {
      // If Ctrl/Cmd is held, add to selection instead of replacing
      if (event.ctrlKey || event.metaKey) {
        selectedElements.value = [...selectedElements.value, { type, element }]
      } else {
        selectedElements.value = [{ type, element }]
      }
    }

    contextMenu.value = {
      visible: true,
      x: event.clientX,
      y: event.clientY
    }
  }

  /**
   * Close context menu
   */
  const closeContextMenu = () => {
    contextMenu.value.visible = false
  }

  /**
   * Handle global click to close context menu
   * @param {MouseEvent} event
   */
  const handleGlobalClick = (event) => {
    if (contextMenu.value.visible) {
      closeContextMenu()
    }
  }

  // =====================
  // COMPUTED
  // =====================

  /**
   * Check if current selection can be grouped (2+ elements)
   */
  const canGroup = computed(() => {
    return selectedElements?.value?.length >= 2
  })

  /**
   * Check if current selection is in a group
   */
  const selectionInGroup = computed(() => {
    if (!selectedElements?.value || selectedElements.value.length === 0) return false
    const first = selectedElements.value[0]
    return isElementInGroup(first.type, first.element.id)
  })

  /**
   * Get the group of current selection
   */
  const selectedGroup = computed(() => {
    if (!selectedElements?.value || selectedElements.value.length === 0) return null
    const first = selectedElements.value[0]
    return getElementGroup?.(first.type, first.element.id)
  })

  return {
    // State
    contextMenu,

    // Group helpers
    isElementInGroup,

    // Group operations
    createGroup,
    ungroupSelected,
    clearAllGroups,
    selectGroup,

    // Element operations
    duplicateSelected,
    deleteSelected,
    getArrayNameForType,

    // Context menu controls
    showContextMenu,
    showElementContextMenu,
    closeContextMenu,
    handleGlobalClick,

    // Computed
    canGroup,
    selectionInGroup,
    selectedGroup
  }
}

export default useContextMenu
