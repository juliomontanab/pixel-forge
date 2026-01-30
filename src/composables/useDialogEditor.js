/**
 * useDialogEditor.js
 *
 * Composable para edición de diálogos.
 * Maneja líneas de diálogo, choices y helpers de visualización.
 *
 * @example
 * const {
 *   addDialogLine,
 *   removeDialogLine,
 *   addDialogChoice,
 *   removeDialogChoice,
 *   getActorById
 * } = useDialogEditor({ project, getAnimationSpritesheetUrl })
 */

/**
 * Creates dialog editor utilities
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.project - Reactive reference to project data
 * @param {Function} [options.getActorCurrentAnimation] - Function to get actor's current animation
 * @param {Function} [options.getAnimationSpritesheetUrl] - Function to get spritesheet URL
 * @param {Function} [options.getAnimationSpritesheetSize] - Function to get spritesheet size
 * @param {Ref} [options.actorPreviewFrames] - Actor preview frames ref
 * @returns {Object} Dialog editor methods
 */
export function useDialogEditor(options = {}) {
  const {
    project,
    getActorCurrentAnimation,
    getAnimationSpritesheetUrl,
    getAnimationSpritesheetSize,
    actorPreviewFrames
  } = options

  // =====================
  // ACTOR HELPERS
  // =====================

  /**
   * Get actor by ID (from global actors)
   * @param {number} actorId - Actor ID
   * @returns {Object|null} Actor object or null
   */
  const getActorById = (actorId) => {
    return project.value.globalData?.actors?.find(a => a.id === actorId) || null
  }

  /**
   * Get all global actors
   * @returns {Array} Array of actors
   */
  const getAllActors = () => {
    return project.value.globalData?.actors || []
  }

  /**
   * Check if actor has animation for any state
   * @param {number} actorId - Actor ID
   * @returns {boolean}
   */
  const hasActorAnimation = (actorId) => {
    const actor = getActorById(actorId)
    if (!actor || !actor.animations) return false

    // Check if any animation is assigned
    return Object.values(actor.animations).some(animId => animId !== null)
  }

  /**
   * Get style for dialog actor preview (smaller version for panel)
   * @param {number} actorId - Actor ID
   * @returns {Object} Style object
   */
  const getDialogActorPreviewStyle = (actorId) => {
    const actor = getActorById(actorId)
    if (!actor) return {}

    if (!getActorCurrentAnimation || !getAnimationSpritesheetUrl || !getAnimationSpritesheetSize) {
      return {}
    }

    const anim = getActorCurrentAnimation(actor)
    if (!anim || !anim.frames?.length) return {}

    const spritesheetUrl = getAnimationSpritesheetUrl(anim)
    if (!spritesheetUrl) return {}

    const frameIndex = actorPreviewFrames?.value?.[actor.id] || 0
    const frame = anim.frames[frameIndex % anim.frames.length]
    const size = getAnimationSpritesheetSize(anim)

    return {
      width: '64px',
      height: '64px',
      backgroundImage: `url(${spritesheetUrl})`,
      backgroundPosition: `-${frame.x}px -${frame.y}px`,
      backgroundSize: `${size.width}px ${size.height}px`,
      imageRendering: 'pixelated'
    }
  }

  // =====================
  // DIALOG LINE MANAGEMENT
  // =====================

  /**
   * Add a new line to a dialog
   * @param {Object} dialog - Dialog object
   * @param {Object} [lineData] - Optional initial line data
   */
  const addDialogLine = (dialog, lineData = null) => {
    if (!dialog) return

    if (!dialog.lines) {
      dialog.lines = []
    }

    const defaultLine = {
      speaker: dialog.actor || null,
      text: ''
    }

    dialog.lines.push(lineData || defaultLine)
  }

  /**
   * Remove a line from a dialog
   * @param {Object} dialog - Dialog object
   * @param {number} index - Index of line to remove
   */
  const removeDialogLine = (dialog, index) => {
    if (!dialog?.lines) return

    // Keep at least one line
    if (dialog.lines.length > 1) {
      dialog.lines.splice(index, 1)
    }
  }

  /**
   * Move a dialog line up or down
   * @param {Object} dialog - Dialog object
   * @param {number} index - Current index
   * @param {number} direction - Direction (-1 = up, 1 = down)
   */
  const moveDialogLine = (dialog, index, direction) => {
    if (!dialog?.lines) return

    const newIndex = index + direction
    if (newIndex >= 0 && newIndex < dialog.lines.length) {
      const [line] = dialog.lines.splice(index, 1)
      dialog.lines.splice(newIndex, 0, line)
    }
  }

  /**
   * Duplicate a dialog line
   * @param {Object} dialog - Dialog object
   * @param {number} index - Index of line to duplicate
   */
  const duplicateDialogLine = (dialog, index) => {
    if (!dialog?.lines || !dialog.lines[index]) return

    const line = dialog.lines[index]
    const duplicate = { ...JSON.parse(JSON.stringify(line)) }

    dialog.lines.splice(index + 1, 0, duplicate)
  }

  // =====================
  // DIALOG CHOICE MANAGEMENT
  // =====================

  /**
   * Add a choice to a dialog
   * @param {Object} dialog - Dialog object
   * @param {Object} [choiceData] - Optional initial choice data
   */
  const addDialogChoice = (dialog, choiceData = null) => {
    if (!dialog) return

    if (!dialog.choices) {
      dialog.choices = []
    }

    const defaultChoice = {
      id: Date.now(),
      text: '',
      targetDialog: null
    }

    dialog.choices.push(choiceData || defaultChoice)
  }

  /**
   * Remove a choice from a dialog
   * @param {Object} dialog - Dialog object
   * @param {number} index - Index of choice to remove
   */
  const removeDialogChoice = (dialog, index) => {
    if (!dialog?.choices) return
    dialog.choices.splice(index, 1)
  }

  /**
   * Update a dialog choice
   * @param {Object} dialog - Dialog object
   * @param {number} index - Index of choice
   * @param {Object} updates - Properties to update
   */
  const updateDialogChoice = (dialog, index, updates) => {
    if (!dialog?.choices || !dialog.choices[index]) return
    Object.assign(dialog.choices[index], updates)
  }

  /**
   * Move a dialog choice up or down
   * @param {Object} dialog - Dialog object
   * @param {number} index - Current index
   * @param {number} direction - Direction (-1 = up, 1 = down)
   */
  const moveDialogChoice = (dialog, index, direction) => {
    if (!dialog?.choices) return

    const newIndex = index + direction
    if (newIndex >= 0 && newIndex < dialog.choices.length) {
      const [choice] = dialog.choices.splice(index, 1)
      dialog.choices.splice(newIndex, 0, choice)
    }
  }

  // =====================
  // DIALOG CRUD
  // =====================

  /**
   * Create a default dialog object
   * @param {Object} [overrides] - Optional overrides
   * @returns {Object} New dialog object
   */
  const createDefaultDialog = (overrides = {}) => {
    return {
      id: Date.now(),
      name: 'New Dialog',
      actor: null,
      lines: [{ speaker: null, text: '' }],
      choices: [],
      ...overrides
    }
  }

  /**
   * Get all dialogs in current scene
   * @param {Object} scene - Scene object
   * @returns {Array} Array of dialogs
   */
  const getSceneDialogs = (scene) => {
    return scene?.dialogs || []
  }

  return {
    // Actor helpers
    getActorById,
    getAllActors,
    hasActorAnimation,
    getDialogActorPreviewStyle,

    // Dialog line management
    addDialogLine,
    removeDialogLine,
    moveDialogLine,
    duplicateDialogLine,

    // Dialog choice management
    addDialogChoice,
    removeDialogChoice,
    updateDialogChoice,
    moveDialogChoice,

    // Dialog CRUD
    createDefaultDialog,
    getSceneDialogs
  }
}

export default useDialogEditor
