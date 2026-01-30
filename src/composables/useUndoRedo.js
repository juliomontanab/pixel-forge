/**
 * useUndoRedo.js
 *
 * Composable para sistema de undo/redo genérico.
 * Mantiene un historial de estados y permite navegar hacia atrás/adelante.
 *
 * @example
 * const {
 *   saveToHistory,
 *   undo,
 *   redo,
 *   canUndo,
 *   canRedo,
 *   clearHistory
 * } = useUndoRedo(stateRef, { maxHistory: 50 })
 */

import { ref, computed, watch } from 'vue'

/**
 * Deep clone helper using JSON serialization
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

/**
 * Creates an undo/redo system for a reactive state
 *
 * @param {Ref} stateRef - The reactive ref to track
 * @param {Object} options - Configuration options
 * @param {number} options.maxHistory - Maximum history size (default: 50)
 * @param {number} options.debounceMs - Debounce time for auto-save to history (default: 500)
 * @param {Function} options.onUndo - Callback after undo
 * @param {Function} options.onRedo - Callback after redo
 * @param {Function} options.onHistorySave - Callback after saving to history
 * @returns {Object} Undo/redo methods and state
 */
export function useUndoRedo(stateRef, options = {}) {
  const {
    maxHistory = 50,
    debounceMs = 500,
    onUndo = null,
    onRedo = null,
    onHistorySave = null
  } = options

  // History state
  const historyStack = ref([])
  const historyIndex = ref(-1)
  const isUndoRedoAction = ref(false)

  // Debounce timeout
  let saveTimeout = null

  /**
   * Save current state to history
   * Called manually or via watcher
   */
  const saveToHistory = () => {
    if (isUndoRedoAction.value) return
    if (!stateRef.value) return

    // Remove any future states if we're not at the end
    if (historyIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
    }

    // Add current state
    historyStack.value.push(deepClone(stateRef.value))

    // Limit history size
    if (historyStack.value.length > maxHistory) {
      historyStack.value.shift()
    }

    historyIndex.value = historyStack.value.length - 1

    if (onHistorySave) {
      onHistorySave(historyIndex.value)
    }
  }

  /**
   * Undo - go back one state
   * @returns {boolean} Whether undo was performed
   */
  const undo = () => {
    if (!canUndo.value) return false

    isUndoRedoAction.value = true
    historyIndex.value--
    stateRef.value = deepClone(historyStack.value[historyIndex.value])

    if (onUndo) {
      onUndo(stateRef.value)
    }

    // Reset flag in next tick
    setTimeout(() => {
      isUndoRedoAction.value = false
    }, 0)

    return true
  }

  /**
   * Redo - go forward one state
   * @returns {boolean} Whether redo was performed
   */
  const redo = () => {
    if (!canRedo.value) return false

    isUndoRedoAction.value = true
    historyIndex.value++
    stateRef.value = deepClone(historyStack.value[historyIndex.value])

    if (onRedo) {
      onRedo(stateRef.value)
    }

    // Reset flag in next tick
    setTimeout(() => {
      isUndoRedoAction.value = false
    }, 0)

    return true
  }

  /**
   * Clear all history and reinitialize
   */
  const clearHistory = () => {
    historyStack.value = []
    historyIndex.value = -1
    saveToHistory()
  }

  /**
   * Initialize history with current state
   */
  const initHistory = () => {
    if (historyStack.value.length === 0) {
      saveToHistory()
    }
  }

  // Computed properties
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)
  const historyLength = computed(() => historyStack.value.length)
  const currentHistoryIndex = computed(() => historyIndex.value)

  /**
   * Setup automatic history saving on state changes (debounced)
   * Call this in onMounted if you want auto-tracking
   *
   * @param {Ref<boolean>} isMountedRef - Optional ref to check if component is still mounted
   * @returns {Function} Stop watching function
   */
  const watchState = (isMountedRef = null) => {
    return watch(stateRef, () => {
      if (isUndoRedoAction.value) return
      if (isMountedRef && !isMountedRef.value) return

      // Debounce history save
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        if (!isMountedRef || isMountedRef.value) {
          saveToHistory()
        }
      }, debounceMs)
    }, { deep: true })
  }

  /**
   * Cleanup function - call in onUnmounted
   */
  const cleanup = () => {
    clearTimeout(saveTimeout)
  }

  return {
    // Methods
    saveToHistory,
    undo,
    redo,
    clearHistory,
    initHistory,
    watchState,
    cleanup,

    // State (readonly)
    canUndo,
    canRedo,
    historyLength,
    currentHistoryIndex,
    isUndoRedoAction,

    // Internal (for advanced use)
    historyStack,
    historyIndex
  }
}

export default useUndoRedo
