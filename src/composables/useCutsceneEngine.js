/**
 * useCutsceneEngine.js
 *
 * Composable para el motor de cutscenes estilo SCUMM.
 * Maneja la ejecución de cutscenes, acciones y triggers.
 *
 * @example
 * const {
 *   startCutscene,
 *   advanceCutscene,
 *   endCutscene,
 *   skipCutscene,
 *   checkSceneEnterTriggers,
 *   executeCutsceneAction
 * } = useCutsceneEngine({
 *   currentScene,
 *   project,
 *   playModeState,
 *   playMusic,
 *   stopMusic,
 *   playSFX,
 *   showPlayMessage,
 *   walkToPoint,
 *   playAddToInventory,
 *   playRemoveFromInventory,
 *   fadeIn,
 *   fadeOut,
 *   changeSceneWithTransition
 * })
 */

/**
 * Creates a cutscene engine
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.currentScene - Reactive reference to current scene
 * @param {Ref} options.project - Reactive reference to project data
 * @param {Ref} options.playModeState - Reactive reference to play mode state
 * @param {Function} options.playMusic - Function to play music
 * @param {Function} options.stopMusic - Function to stop music
 * @param {Function} options.playSFX - Function to play sound effects
 * @param {Function} options.showPlayMessage - Function to show messages
 * @param {Function} options.walkToPoint - Function to walk player to point
 * @param {Function} options.playAddToInventory - Function to add item to inventory
 * @param {Function} options.playRemoveFromInventory - Function to remove item from inventory
 * @param {Function} options.fadeIn - Function for fade in transition
 * @param {Function} options.fadeOut - Function for fade out transition
 * @param {Function} options.changeSceneWithTransition - Function to change scene
 * @returns {Object} Cutscene engine methods
 */
export function useCutsceneEngine(options = {}) {
  const {
    currentScene,
    project,
    playModeState,
    playMusic,
    stopMusic,
    playSFX,
    showPlayMessage,
    walkToPoint,
    playAddToInventory,
    playRemoveFromInventory,
    fadeIn,
    fadeOut,
    changeSceneWithTransition
  } = options

  // =====================
  // CUTSCENE LIFECYCLE
  // =====================

  /**
   * Check for scene-enter triggers
   */
  const checkSceneEnterTriggers = () => {
    const cutscene = currentScene.value?.cutscenes?.find(c => c.trigger === 'scene-enter')
    if (cutscene && !cutscene.hasPlayed) {
      cutscene.hasPlayed = true
      startCutscene(cutscene)
    }
  }

  /**
   * Start a cutscene
   * @param {Object} cutscene - Cutscene to start
   */
  const startCutscene = (cutscene) => {
    if (!playModeState?.value) return

    playModeState.value.currentCutscene = cutscene
    playModeState.value.cutsceneActionIndex = 0
    playModeState.value.isCutscenePlaying = true

    executeCutsceneAction()
  }

  /**
   * Execute current cutscene action
   */
  const executeCutsceneAction = () => {
    if (!playModeState?.value) return

    const cutscene = playModeState.value.currentCutscene
    if (!cutscene) return

    const actionIndex = playModeState.value.cutsceneActionIndex
    const action = cutscene.actions?.[actionIndex]

    if (!action) {
      endCutscene()
      return
    }

    // Execute action after delay
    playModeState.value.cutsceneTimeout = setTimeout(() => {
      performCutsceneAction(action)
    }, action.delay || 0)
  }

  /**
   * Perform a single cutscene action
   * @param {Object} action - Action to perform
   */
  const performCutsceneAction = (action) => {
    if (!playModeState?.value) return

    switch (action.type) {
      case 'dialog':
        if (showPlayMessage) {
          showPlayMessage(action.params?.text || '')
        }
        break

      case 'move-actor':
        if (action.params?.actorId === playModeState.value.playerActorId) {
          if (walkToPoint) {
            walkToPoint(action.params.x, action.params.y)
          }
          playModeState.value.walkCallback = () => advanceCutscene()
          return // Don't advance yet, wait for walk
        }
        break

      case 'actor-direction':
        if (action.params?.actorId === playModeState.value.playerActorId) {
          playModeState.value.playerDirection = action.params.direction
        }
        break

      case 'actor-costume':
        // Handle costume change (would need access to actor data)
        if (action.params?.actorId && action.params?.costume) {
          const actor = project.value?.globalData?.actors?.find(a => a.id === action.params.actorId)
          if (actor) {
            actor.currentCostume = action.params.costume
          }
        }
        break

      case 'play-sfx':
        if (action.params?.sfxId && playSFX) {
          const sfx = currentScene.value?.sfx?.find(s => s.id === action.params.sfxId)
          if (sfx) playSFX(sfx)
        }
        break

      case 'play-music':
        if (action.params?.musicId && playMusic) {
          const music = currentScene.value?.music?.find(m => m.id === action.params.musicId)
          if (music) playMusic(music)
        }
        break

      case 'stop-music':
        if (stopMusic) {
          stopMusic(action.params?.fadeOut || 0)
        }
        break

      case 'wait':
        playModeState.value.cutsceneTimeout = setTimeout(() => {
          advanceCutscene()
        }, action.params?.duration || 1000)
        return // Don't advance yet

      case 'fade-in':
        if (fadeIn) {
          fadeIn(action.params?.duration || 1000)
        }
        playModeState.value.cutsceneTimeout = setTimeout(() => {
          advanceCutscene()
        }, action.params?.duration || 1000)
        return

      case 'fade-out':
        if (fadeOut) {
          fadeOut(action.params?.duration || 1000)
        }
        playModeState.value.cutsceneTimeout = setTimeout(() => {
          advanceCutscene()
        }, action.params?.duration || 1000)
        return

      case 'change-scene':
        if (action.params?.sceneId && changeSceneWithTransition) {
          changeSceneWithTransition(action.params.sceneId, {
            checkSceneEnterTriggers,
            onCutsceneAdvance: advanceCutscene
          })
          return // Scene change handles continuation
        }
        break

      case 'set-variable':
        if (action.params?.variable) {
          playModeState.value.variables[action.params.variable] = action.params.value ?? true
        }
        break

      case 'add-item':
        if (action.params?.itemId && playAddToInventory) {
          playAddToInventory(action.params.itemId)
        }
        break

      case 'remove-item':
        if (action.params?.itemId && playRemoveFromInventory) {
          playRemoveFromInventory(action.params.itemId)
        }
        break

      case 'camera-pan':
        // Camera panning would require canvas/viewport manipulation
        // For now, just wait the duration
        playModeState.value.cutsceneTimeout = setTimeout(() => {
          advanceCutscene()
        }, action.params?.duration || 1000)
        return

      case 'camera-shake':
        // Camera shake effect
        // Would need to implement shake on the canvas
        playModeState.value.cutsceneTimeout = setTimeout(() => {
          advanceCutscene()
        }, action.params?.duration || 500)
        return

      default:
        // Unknown action type
        console.warn(`Unknown cutscene action type: ${action.type}`)
    }

    // Advance after action duration
    const duration = action.duration || 100
    playModeState.value.cutsceneTimeout = setTimeout(() => {
      advanceCutscene()
    }, duration)
  }

  /**
   * Advance to next cutscene action
   */
  const advanceCutscene = () => {
    if (!playModeState?.value) return

    playModeState.value.cutsceneActionIndex++
    executeCutsceneAction()
  }

  /**
   * End cutscene
   */
  const endCutscene = () => {
    if (!playModeState?.value) return

    playModeState.value.currentCutscene = null
    playModeState.value.cutsceneActionIndex = 0
    playModeState.value.isCutscenePlaying = false
    playModeState.value.playerState = 'idle'
  }

  /**
   * Skip cutscene (if skippable)
   */
  const skipCutscene = () => {
    if (!playModeState?.value) return

    if (playModeState.value.currentCutscene?.skippable) {
      if (playModeState.value.cutsceneTimeout) {
        clearTimeout(playModeState.value.cutsceneTimeout)
      }
      endCutscene()
    }
  }

  /**
   * Check if a cutscene should trigger based on object interaction
   * @param {Object} obj - Object that was interacted with
   * @returns {Object|null} Cutscene to trigger, or null
   */
  const checkObjectInteractionTrigger = (obj) => {
    if (!obj || !currentScene.value?.cutscenes) return null

    const cutscene = currentScene.value.cutscenes.find(c =>
      c.trigger === 'object-interact' &&
      c.triggerTarget === obj.element?.id
    )

    if (cutscene && !cutscene.hasPlayed) {
      return cutscene
    }

    return null
  }

  /**
   * Check if a cutscene should trigger based on puzzle being solved
   * @param {number} puzzleId - ID of the puzzle that was solved
   * @returns {Object|null} Cutscene to trigger, or null
   */
  const checkPuzzleSolvedTrigger = (puzzleId) => {
    if (!currentScene.value?.cutscenes) return null

    const cutscene = currentScene.value.cutscenes.find(c =>
      c.trigger === 'puzzle-solved' &&
      c.triggerTarget === puzzleId
    )

    if (cutscene && !cutscene.hasPlayed) {
      return cutscene
    }

    return null
  }

  /**
   * Create a new cutscene with default values
   * @param {string} name - Cutscene name
   * @returns {Object} New cutscene object
   */
  const createCutscene = (name = 'New Cutscene') => {
    return {
      id: Date.now(),
      name,
      trigger: 'manual',
      triggerTarget: null,
      skippable: true,
      hasPlayed: false,
      actions: []
    }
  }

  /**
   * Create a new cutscene action
   * @param {string} type - Action type
   * @returns {Object} New action object
   */
  const createCutsceneAction = (type = 'dialog') => {
    const baseAction = {
      id: Date.now(),
      type,
      delay: 0,
      duration: 1000,
      params: {}
    }

    // Set default params based on type
    switch (type) {
      case 'dialog':
        baseAction.params = { text: '', actorId: null }
        break
      case 'move-actor':
        baseAction.params = { actorId: null, x: 0, y: 0, walk: true }
        break
      case 'actor-direction':
        baseAction.params = { actorId: null, direction: 'south' }
        break
      case 'actor-costume':
        baseAction.params = { actorId: null, costume: '' }
        break
      case 'play-sfx':
        baseAction.params = { sfxId: null }
        break
      case 'play-music':
        baseAction.params = { musicId: null, fadeIn: 0 }
        break
      case 'stop-music':
        baseAction.params = { fadeOut: 500 }
        break
      case 'wait':
        baseAction.params = { duration: 1000 }
        break
      case 'fade-in':
      case 'fade-out':
        baseAction.params = { duration: 1000, color: '#000000' }
        break
      case 'change-scene':
        baseAction.params = { sceneId: null, transition: 'fade' }
        break
      case 'set-variable':
        baseAction.params = { variable: '', value: true }
        break
      case 'add-item':
      case 'remove-item':
        baseAction.params = { itemId: null }
        break
      case 'camera-pan':
        baseAction.params = { x: 0, y: 0, duration: 1000 }
        break
      case 'camera-shake':
        baseAction.params = { intensity: 5, duration: 500 }
        break
    }

    return baseAction
  }

  /**
   * Get available action types
   * @returns {Array} List of action types with labels
   */
  const getActionTypes = () => {
    return [
      { id: 'dialog', name: 'Dialog', icon: '💬' },
      { id: 'move-actor', name: 'Move Actor', icon: '🚶' },
      { id: 'actor-direction', name: 'Change Direction', icon: '↩️' },
      { id: 'actor-costume', name: 'Change Costume', icon: '👕' },
      { id: 'play-sfx', name: 'Play Sound', icon: '🔊' },
      { id: 'play-music', name: 'Play Music', icon: '🎵' },
      { id: 'stop-music', name: 'Stop Music', icon: '🔇' },
      { id: 'wait', name: 'Wait', icon: '⏱️' },
      { id: 'fade-in', name: 'Fade In', icon: '🌅' },
      { id: 'fade-out', name: 'Fade Out', icon: '🌑' },
      { id: 'change-scene', name: 'Change Scene', icon: '🚪' },
      { id: 'set-variable', name: 'Set Variable', icon: '📝' },
      { id: 'add-item', name: 'Add Item', icon: '➕' },
      { id: 'remove-item', name: 'Remove Item', icon: '➖' },
      { id: 'camera-pan', name: 'Camera Pan', icon: '📷' },
      { id: 'camera-shake', name: 'Camera Shake', icon: '📳' }
    ]
  }

  /**
   * Get available trigger types
   * @returns {Array} List of trigger types with labels
   */
  const getTriggerTypes = () => {
    return [
      { id: 'manual', name: 'Manual', icon: '✋' },
      { id: 'scene-enter', name: 'On Scene Enter', icon: '🚪' },
      { id: 'object-interact', name: 'On Object Interact', icon: '👆' },
      { id: 'puzzle-solved', name: 'On Puzzle Solved', icon: '🧩' }
    ]
  }

  return {
    // Lifecycle
    startCutscene,
    executeCutsceneAction,
    performCutsceneAction,
    advanceCutscene,
    endCutscene,
    skipCutscene,

    // Triggers
    checkSceneEnterTriggers,
    checkObjectInteractionTrigger,
    checkPuzzleSolvedTrigger,

    // Creation helpers
    createCutscene,
    createCutsceneAction,

    // Metadata
    getActionTypes,
    getTriggerTypes
  }
}

export default useCutsceneEngine
