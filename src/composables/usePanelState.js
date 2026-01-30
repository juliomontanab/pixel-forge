/**
 * usePanelState.js
 *
 * Composable para manejo del estado de paneles y secciones del editor.
 * Controla apertura/cierre de paneles, secciones colapsadas, y visibilidad de elementos.
 *
 * @example
 * const {
 *   leftPanelOpen,
 *   rightPanelOpen,
 *   collapsedSections,
 *   visibleTypes,
 *   toggleSection,
 *   toggleVisibility,
 *   togglePanel
 * } = usePanelState()
 */

import { ref, computed, watch } from 'vue'

/**
 * Default collapsed sections state
 */
const defaultCollapsedSections = {
  // Scene elements
  images: true,
  walkboxes: true,
  exits: true,
  actorPlacements: true,
  hotspots: true,
  zplanes: true,
  dialogs: true,
  puzzles: true,
  sfx: true,
  music: true,
  cutscenes: true,
  animations: true,
  lights: true,
  particles: true,
  // Global sections
  assets: true,
  audioAssets: true,
  globalActors: true,
  verbs: true,
  items: true,
  inventory: true
}

/**
 * Default element visibility state
 */
const defaultVisibleTypes = {
  images: true,
  walkboxes: true,
  exits: true,
  actors: true,
  hotspots: true,
  zplanes: true,
  animations: true,
  lights: true,
  particles: true
}

/**
 * Local storage key for persisting panel state
 */
const STORAGE_KEY = 'pixel-forge-panel-state'

/**
 * Creates a panel state management system
 *
 * @param {Object} options - Configuration options
 * @param {boolean} [options.persistToStorage] - Persist state to localStorage (default: true)
 * @param {Object} [options.initialCollapsed] - Initial collapsed sections state
 * @param {Object} [options.initialVisible] - Initial visibility state
 * @returns {Object} Panel state management methods
 */
export function usePanelState(options = {}) {
  const {
    persistToStorage = true,
    initialCollapsed = {},
    initialVisible = {}
  } = options

  // Panel open/close state
  const leftPanelOpen = ref(true)
  const rightPanelOpen = ref(true)

  // Section collapsed state
  const collapsedSections = ref({
    ...defaultCollapsedSections,
    ...initialCollapsed
  })

  // Element type visibility state
  const visibleTypes = ref({
    ...defaultVisibleTypes,
    ...initialVisible
  })

  // Grid visibility
  const showGrid = ref(true)

  /**
   * Load state from localStorage
   */
  const loadFromStorage = () => {
    if (!persistToStorage) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)

        if (data.leftPanelOpen !== undefined) leftPanelOpen.value = data.leftPanelOpen
        if (data.rightPanelOpen !== undefined) rightPanelOpen.value = data.rightPanelOpen
        if (data.collapsedSections) {
          collapsedSections.value = { ...collapsedSections.value, ...data.collapsedSections }
        }
        if (data.visibleTypes) {
          visibleTypes.value = { ...visibleTypes.value, ...data.visibleTypes }
        }
        if (data.showGrid !== undefined) showGrid.value = data.showGrid
      }
    } catch (err) {
      console.warn('[usePanelState] Error loading from storage:', err)
    }
  }

  /**
   * Save state to localStorage
   */
  const saveToStorage = () => {
    if (!persistToStorage) return

    try {
      const data = {
        leftPanelOpen: leftPanelOpen.value,
        rightPanelOpen: rightPanelOpen.value,
        collapsedSections: collapsedSections.value,
        visibleTypes: visibleTypes.value,
        showGrid: showGrid.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (err) {
      console.warn('[usePanelState] Error saving to storage:', err)
    }
  }

  // Auto-save on changes (debounced)
  let saveTimeout = null
  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(saveToStorage, 500)
  }

  // Watch for changes and save
  if (persistToStorage) {
    watch([leftPanelOpen, rightPanelOpen, collapsedSections, visibleTypes, showGrid], debouncedSave, { deep: true })
  }

  /**
   * Toggle a panel's open state
   * @param {'left'|'right'} panel
   */
  const togglePanel = (panel) => {
    if (panel === 'left') {
      leftPanelOpen.value = !leftPanelOpen.value
    } else if (panel === 'right') {
      rightPanelOpen.value = !rightPanelOpen.value
    }
  }

  /**
   * Toggle a section's collapsed state
   * @param {string} section - Section key
   */
  const toggleSection = (section) => {
    collapsedSections.value[section] = !collapsedSections.value[section]
  }

  /**
   * Set a section's collapsed state
   * @param {string} section
   * @param {boolean} collapsed
   */
  const setCollapsed = (section, collapsed) => {
    collapsedSections.value[section] = collapsed
  }

  /**
   * Collapse all sections
   */
  const collapseAll = () => {
    Object.keys(collapsedSections.value).forEach(key => {
      collapsedSections.value[key] = true
    })
  }

  /**
   * Expand all sections
   */
  const expandAll = () => {
    Object.keys(collapsedSections.value).forEach(key => {
      collapsedSections.value[key] = false
    })
  }

  /**
   * Toggle element type visibility
   * @param {string} type - Element type key
   */
  const toggleVisibility = (type) => {
    visibleTypes.value[type] = !visibleTypes.value[type]
  }

  /**
   * Set element type visibility
   * @param {string} type
   * @param {boolean} visible
   */
  const setVisibility = (type, visible) => {
    visibleTypes.value[type] = visible
  }

  /**
   * Show all element types
   */
  const showAll = () => {
    Object.keys(visibleTypes.value).forEach(key => {
      visibleTypes.value[key] = true
    })
  }

  /**
   * Hide all element types
   */
  const hideAll = () => {
    Object.keys(visibleTypes.value).forEach(key => {
      visibleTypes.value[key] = false
    })
  }

  /**
   * Toggle grid visibility
   */
  const toggleGrid = () => {
    showGrid.value = !showGrid.value
  }

  /**
   * Check if a section is collapsed
   * @param {string} section
   * @returns {boolean}
   */
  const isCollapsed = (section) => {
    return collapsedSections.value[section] ?? true
  }

  /**
   * Check if an element type is visible
   * @param {string} type
   * @returns {boolean}
   */
  const isVisible = (type) => {
    return visibleTypes.value[type] ?? true
  }

  // Computed: any type hidden
  const hasHiddenTypes = computed(() => {
    return Object.values(visibleTypes.value).some(v => !v)
  })

  // Computed: all types visible
  const allTypesVisible = computed(() => {
    return Object.values(visibleTypes.value).every(v => v)
  })

  // Load initial state from storage
  if (persistToStorage) {
    loadFromStorage()
  }

  return {
    // Panel state
    leftPanelOpen,
    rightPanelOpen,
    togglePanel,

    // Section state
    collapsedSections,
    toggleSection,
    setCollapsed,
    isCollapsed,
    collapseAll,
    expandAll,

    // Visibility state
    visibleTypes,
    toggleVisibility,
    setVisibility,
    isVisible,
    showAll,
    hideAll,
    hasHiddenTypes,
    allTypesVisible,

    // Grid
    showGrid,
    toggleGrid,

    // Storage
    loadFromStorage,
    saveToStorage,

    // Defaults (for reset)
    defaultCollapsedSections,
    defaultVisibleTypes
  }
}

export default usePanelState
