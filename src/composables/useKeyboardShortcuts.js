/**
 * useKeyboardShortcuts.js
 *
 * Composable para manejo de atajos de teclado.
 * Permite registrar shortcuts con modificadores y prevenir conflictos con inputs.
 *
 * @example
 * const { registerShortcut, unregisterAll } = useKeyboardShortcuts()
 *
 * registerShortcut({
 *   key: 'z',
 *   ctrl: true,
 *   handler: () => undo(),
 *   description: 'Undo'
 * })
 */

import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Check if the active element is an input or textarea
 * @returns {boolean}
 */
const isInputFocused = () => {
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable
}

/**
 * Creates a keyboard shortcuts system
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.preventDefault - Whether to prevent default on all shortcuts (default: true)
 * @param {boolean} options.ignoreInputs - Whether to ignore shortcuts when input is focused (default: true)
 * @param {boolean} options.autoRegister - Whether to auto-register event listener (default: true)
 * @returns {Object} Shortcut management methods
 */
export function useKeyboardShortcuts(options = {}) {
  const {
    preventDefault = true,
    ignoreInputs = true,
    autoRegister = true
  } = options

  // Registered shortcuts
  const shortcuts = ref([])

  /**
   * @typedef {Object} Shortcut
   * @property {string} key - The key (e.g., 'z', 'Delete', 'Escape')
   * @property {boolean} [ctrl] - Requires Ctrl/Cmd
   * @property {boolean} [shift] - Requires Shift
   * @property {boolean} [alt] - Requires Alt/Option
   * @property {Function} handler - Function to execute
   * @property {string} [description] - Human-readable description
   * @property {boolean} [allowInInput] - Allow in input fields (default: false)
   * @property {boolean} [preventDefault] - Prevent default (default: true)
   */

  /**
   * Register a keyboard shortcut
   * @param {Shortcut} shortcut - Shortcut configuration
   * @returns {string} Shortcut ID for unregistering
   */
  const registerShortcut = (shortcut) => {
    const id = `shortcut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    shortcuts.value.push({ ...shortcut, id })
    return id
  }

  /**
   * Register multiple shortcuts at once
   * @param {Shortcut[]} shortcutList - Array of shortcuts
   * @returns {string[]} Array of shortcut IDs
   */
  const registerShortcuts = (shortcutList) => {
    return shortcutList.map(s => registerShortcut(s))
  }

  /**
   * Unregister a shortcut by ID
   * @param {string} id - Shortcut ID
   */
  const unregisterShortcut = (id) => {
    shortcuts.value = shortcuts.value.filter(s => s.id !== id)
  }

  /**
   * Unregister all shortcuts
   */
  const unregisterAll = () => {
    shortcuts.value = []
  }

  /**
   * Check if a shortcut matches the event
   * @param {Shortcut} shortcut
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  const matchesEvent = (shortcut, event) => {
    // Check key (case-insensitive for letters)
    const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
    if (!keyMatches) return false

    // Check modifiers
    const ctrlMatches = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey)
    const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey
    const altMatches = shortcut.alt ? event.altKey : !event.altKey

    return ctrlMatches && shiftMatches && altMatches
  }

  /**
   * Main keyboard event handler
   * @param {KeyboardEvent} event
   */
  const handleKeyDown = (event) => {
    const inputFocused = isInputFocused()

    for (const shortcut of shortcuts.value) {
      // Skip if input is focused and shortcut doesn't allow it
      if (inputFocused && ignoreInputs && !shortcut.allowInInput) {
        continue
      }

      if (matchesEvent(shortcut, event)) {
        // Prevent default if configured
        if (shortcut.preventDefault !== false && preventDefault) {
          event.preventDefault()
        }

        // Execute handler
        shortcut.handler(event)

        // Stop checking other shortcuts (first match wins)
        return
      }
    }
  }

  /**
   * Start listening for keyboard events
   */
  const startListening = () => {
    document.addEventListener('keydown', handleKeyDown)
  }

  /**
   * Stop listening for keyboard events
   */
  const stopListening = () => {
    document.removeEventListener('keydown', handleKeyDown)
  }

  /**
   * Get all registered shortcuts (for help display)
   * @returns {Array} List of shortcuts with descriptions
   */
  const getShortcutList = () => {
    return shortcuts.value.map(s => ({
      key: s.key,
      ctrl: s.ctrl || false,
      shift: s.shift || false,
      alt: s.alt || false,
      description: s.description || ''
    }))
  }

  /**
   * Format a shortcut for display (e.g., "Ctrl+Z")
   * @param {Shortcut} shortcut
   * @returns {string}
   */
  const formatShortcut = (shortcut) => {
    const parts = []
    if (shortcut.ctrl) parts.push('Ctrl')
    if (shortcut.shift) parts.push('Shift')
    if (shortcut.alt) parts.push('Alt')
    parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key)
    return parts.join('+')
  }

  // Auto-register if configured
  if (autoRegister) {
    onMounted(() => {
      startListening()
    })

    onUnmounted(() => {
      stopListening()
    })
  }

  return {
    // Methods
    registerShortcut,
    registerShortcuts,
    unregisterShortcut,
    unregisterAll,
    startListening,
    stopListening,
    getShortcutList,
    formatShortcut,

    // State
    shortcuts
  }
}

/**
 * Preset shortcuts for common editor operations
 * Use with registerShortcuts()
 *
 * @param {Object} handlers - Object with handler functions
 * @returns {Shortcut[]} Array of shortcuts
 */
export function createEditorShortcuts(handlers) {
  const shortcuts = []

  if (handlers.undo) {
    shortcuts.push({
      key: 'z',
      ctrl: true,
      handler: handlers.undo,
      description: 'Undo'
    })
  }

  if (handlers.redo) {
    shortcuts.push({
      key: 'z',
      ctrl: true,
      shift: true,
      handler: handlers.redo,
      description: 'Redo'
    })
    shortcuts.push({
      key: 'y',
      ctrl: true,
      handler: handlers.redo,
      description: 'Redo'
    })
  }

  if (handlers.copy) {
    shortcuts.push({
      key: 'c',
      ctrl: true,
      handler: handlers.copy,
      description: 'Copy'
    })
  }

  if (handlers.paste) {
    shortcuts.push({
      key: 'v',
      ctrl: true,
      handler: handlers.paste,
      description: 'Paste'
    })
  }

  if (handlers.cut) {
    shortcuts.push({
      key: 'x',
      ctrl: true,
      handler: handlers.cut,
      description: 'Cut'
    })
  }

  if (handlers.delete) {
    shortcuts.push({
      key: 'Delete',
      handler: handlers.delete,
      description: 'Delete'
    })
    shortcuts.push({
      key: 'Backspace',
      handler: handlers.delete,
      description: 'Delete'
    })
  }

  if (handlers.deselect) {
    shortcuts.push({
      key: 'Escape',
      handler: handlers.deselect,
      description: 'Deselect',
      allowInInput: true
    })
  }

  if (handlers.save) {
    shortcuts.push({
      key: 's',
      ctrl: true,
      handler: handlers.save,
      description: 'Save'
    })
  }

  if (handlers.selectAll) {
    shortcuts.push({
      key: 'a',
      ctrl: true,
      handler: handlers.selectAll,
      description: 'Select All'
    })
  }

  return shortcuts
}

export default useKeyboardShortcuts
