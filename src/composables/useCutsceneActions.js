/**
 * useCutsceneActions.js
 *
 * Composable para edición de acciones de cutscenes.
 * Maneja agregar, remover y reordenar acciones de cutscenes.
 *
 * @example
 * const {
 *   getDefaultParams,
 *   addAction,
 *   removeAction,
 *   moveAction,
 *   ACTION_TYPES
 * } = useCutsceneActions({ selectedElements })
 */

/**
 * Default parameters for each action type
 */
export const ACTION_TYPES = {
  dialog: { actorId: null, text: '', emotion: null },
  'move-actor': { actorId: null, x: 0, y: 0, walk: true },
  'actor-direction': { actorId: null, direction: 'south' },
  'actor-costume': { actorId: null, costume: '' },
  'play-sfx': { sfxId: null },
  'play-music': { musicId: null, fadeIn: 0 },
  'stop-music': { fadeOut: 0 },
  wait: { duration: 1000 },
  'fade-in': { duration: 500, color: '#000000' },
  'fade-out': { duration: 500, color: '#000000' },
  'camera-pan': { x: 0, y: 0, duration: 1000 },
  'camera-shake': { intensity: 5, duration: 500 },
  'change-scene': { sceneId: '', transition: 'fade' }
}

/**
 * Creates cutscene action editing utilities
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.selectedElements - Reactive reference to selected elements
 * @returns {Object} Cutscene action methods
 */
export function useCutsceneActions(options = {}) {
  const { selectedElements } = options

  // =====================
  // HELPER FUNCTIONS
  // =====================

  /**
   * Get the currently selected cutscene (if any)
   * @returns {Object|null} Selected cutscene or null
   */
  const getSelectedCutscene = () => {
    if (!selectedElements?.value) return null
    if (selectedElements.value.length !== 1) return null
    if (selectedElements.value[0].type !== 'cutscene') return null
    return selectedElements.value[0].element
  }

  /**
   * Get default parameters for an action type
   * @param {string} type - Action type
   * @returns {Object} Default parameters
   */
  const getDefaultParams = (type) => {
    return ACTION_TYPES[type] ? { ...ACTION_TYPES[type] } : {}
  }

  // =====================
  // ACTION MANAGEMENT
  // =====================

  /**
   * Add a new action to the selected cutscene
   * @param {Event} event - Select change event
   */
  const addAction = (event) => {
    const type = event.target.value
    if (!type) return

    const cutscene = getSelectedCutscene()
    if (!cutscene) return

    if (!cutscene.actions) {
      cutscene.actions = []
    }

    cutscene.actions.push({
      id: Date.now(),
      type,
      delay: 0,
      duration: type === 'wait' ? 1000 : 0,
      params: getDefaultParams(type)
    })

    // Reset select
    event.target.value = ''
  }

  /**
   * Add action directly (without event)
   * @param {Object} cutscene - Cutscene to add action to
   * @param {string} type - Action type
   * @returns {Object} The created action
   */
  const addActionDirect = (cutscene, type) => {
    if (!cutscene) return null

    if (!cutscene.actions) {
      cutscene.actions = []
    }

    const action = {
      id: Date.now(),
      type,
      delay: 0,
      duration: type === 'wait' ? 1000 : 0,
      params: getDefaultParams(type)
    }

    cutscene.actions.push(action)
    return action
  }

  /**
   * Remove an action from the selected cutscene
   * @param {number} index - Index of action to remove
   */
  const removeAction = (index) => {
    const cutscene = getSelectedCutscene()
    if (!cutscene?.actions) return

    cutscene.actions.splice(index, 1)
  }

  /**
   * Remove action from a specific cutscene
   * @param {Object} cutscene - Cutscene to remove action from
   * @param {number} index - Index of action to remove
   */
  const removeActionFrom = (cutscene, index) => {
    if (!cutscene?.actions) return
    cutscene.actions.splice(index, 1)
  }

  /**
   * Move an action up or down in the list
   * @param {number} index - Current index of action
   * @param {number} direction - Direction to move (-1 = up, 1 = down)
   */
  const moveAction = (index, direction) => {
    const cutscene = getSelectedCutscene()
    if (!cutscene?.actions) return

    const actions = cutscene.actions
    const newIndex = index + direction

    if (newIndex >= 0 && newIndex < actions.length) {
      const [action] = actions.splice(index, 1)
      actions.splice(newIndex, 0, action)
    }
  }

  /**
   * Move action in a specific cutscene
   * @param {Object} cutscene - Cutscene containing the action
   * @param {number} index - Current index of action
   * @param {number} direction - Direction to move
   */
  const moveActionIn = (cutscene, index, direction) => {
    if (!cutscene?.actions) return

    const actions = cutscene.actions
    const newIndex = index + direction

    if (newIndex >= 0 && newIndex < actions.length) {
      const [action] = actions.splice(index, 1)
      actions.splice(newIndex, 0, action)
    }
  }

  /**
   * Duplicate an action
   * @param {number} index - Index of action to duplicate
   */
  const duplicateAction = (index) => {
    const cutscene = getSelectedCutscene()
    if (!cutscene?.actions || !cutscene.actions[index]) return

    const action = cutscene.actions[index]
    const duplicate = {
      ...JSON.parse(JSON.stringify(action)),
      id: Date.now()
    }

    cutscene.actions.splice(index + 1, 0, duplicate)
  }

  /**
   * Update action parameters
   * @param {number} index - Index of action
   * @param {Object} params - New parameters
   */
  const updateActionParams = (index, params) => {
    const cutscene = getSelectedCutscene()
    if (!cutscene?.actions || !cutscene.actions[index]) return

    cutscene.actions[index].params = {
      ...cutscene.actions[index].params,
      ...params
    }
  }

  return {
    // Helpers
    getSelectedCutscene,
    getDefaultParams,

    // Action management (event-based)
    addAction,
    removeAction,
    moveAction,

    // Action management (direct)
    addActionDirect,
    removeActionFrom,
    moveActionIn,
    duplicateAction,
    updateActionParams,

    // Constants
    ACTION_TYPES
  }
}

export default useCutsceneActions
