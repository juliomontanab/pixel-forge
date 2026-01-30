/**
 * useAnimations.js
 *
 * Composable for managing global animations and actor animation states.
 * Handles spritesheet animations, actor assignments, and preview rendering.
 */

import { ref, computed } from 'vue'

// Animation states available for actors
export const ACTOR_ANIMATION_STATES = [
  { key: 'idle', label: 'Idle', icon: '🧍' },
  { key: 'walk-north', label: 'Caminar Norte', icon: '⬆️' },
  { key: 'walk-south', label: 'Caminar Sur', icon: '⬇️' },
  { key: 'walk-east', label: 'Caminar Este', icon: '➡️' },
  { key: 'walk-west', label: 'Caminar Oeste', icon: '⬅️' },
  { key: 'talk', label: 'Hablar', icon: '💬' },
  { key: 'use', label: 'Usar', icon: '🔧' },
  { key: 'pickup', label: 'Recoger', icon: '✋' }
]

/**
 * @param {Object} options
 * @param {Ref<Object>} options.project - Project data ref
 * @param {Ref<Object>} options.currentScene - Current scene ref
 * @param {Ref<Array>} options.globalActors - Global actors computed
 * @param {Function} options.getAssetById - Function to get asset by ID
 * @param {Function} options.getAssetDisplayUrl - Function to get asset display URL
 * @param {Function} options.getGlobalActorById - Function to get global actor by ID
 * @param {Function} options.autoSaveProject - Function to trigger auto-save
 */
export function useAnimations(options = {}) {
  const {
    project,
    currentScene,
    globalActors,
    getAssetById,
    getAssetDisplayUrl,
    getGlobalActorById,
    autoSaveProject
  } = options

  // Track animation preview frame indices
  const actorPreviewFrames = ref({}) // { actorId/placementId: frameIndex }

  // Modal state for spritesheet editor
  const spritesheetEditorOpen = ref(false)

  // ==================
  // COMPUTED
  // ==================

  // Global animations from project
  const globalAnimations = computed(() => project.value?.globalData?.animations || [])

  // Global assets (for spritesheet lookup)
  const globalAssets = computed(() => project.value?.globalData?.assets || [])

  // ==================
  // CRUD OPERATIONS
  // ==================

  /**
   * Open the spritesheet editor modal
   */
  const openSpritesheetEditor = () => {
    spritesheetEditorOpen.value = true
  }

  /**
   * Close the spritesheet editor modal
   */
  const closeSpritesheetEditor = () => {
    spritesheetEditorOpen.value = false
  }

  /**
   * Delete a global animation
   * @param {number} animId - Animation ID to delete
   */
  const deleteAnimation = (animId) => {
    // Use filter + reassignment for guaranteed reactivity
    project.value.globalData.animations = project.value.globalData.animations.filter(a => a.id !== animId)

    // Also check scene animations for backward compatibility
    if (currentScene.value?.animations) {
      currentScene.value.animations = currentScene.value.animations.filter(a => a.id !== animId)
    }
  }

  /**
   * Save a new animation
   * @param {Object} animData - Animation data
   */
  const saveAnimation = (animData) => {
    if (!project.value.globalData.animations) {
      project.value.globalData.animations = []
    }
    project.value.globalData.animations = [...project.value.globalData.animations, animData]
    autoSaveProject?.()
  }

  /**
   * Update an existing animation
   * @param {Object} animData - Animation data with ID
   */
  const updateAnimation = (animData) => {
    const idx = project.value.globalData.animations.findIndex(a => a.id === animData.id)
    if (idx !== -1) {
      project.value.globalData.animations[idx] = animData
      project.value.globalData.animations = [...project.value.globalData.animations]
      autoSaveProject?.()
    }
  }

  /**
   * Assign an animation to an actor state
   * @param {Object} params - Assignment params
   * @param {number} params.actorId - Actor ID
   * @param {string} params.state - Animation state key
   * @param {number} params.animationId - Animation ID
   * @param {boolean} params.mirror - Whether to mirror the animation
   */
  const assignAnimationToActor = ({ actorId, state, animationId, mirror }) => {
    const actor = project.value.globalData.actors.find(a => a.id === actorId)
    if (actor) {
      if (!actor.animations) actor.animations = {}
      actor.animations[state] = { id: animationId, mirror }
      autoSaveProject?.()
    }
  }

  // ==================
  // GETTERS
  // ==================

  /**
   * Get animation by ID (checks global first, then scene)
   * @param {number} animId - Animation ID
   * @returns {Object|null} Animation object or null
   */
  const getAnimationById = (animId) => {
    if (!animId) return null
    return globalAnimations.value.find(a => a.id === animId) ||
           currentScene.value?.animations?.find(a => a.id === animId)
  }

  /**
   * Get spritesheet URL for an animation
   * @param {Object} anim - Animation object
   * @returns {string|null} Spritesheet URL or null
   */
  const getAnimationSpritesheetUrl = (anim) => {
    if (!anim) return null

    // If animation references an asset
    if (anim.spritesheetAssetId) {
      const asset = getAssetById?.(anim.spritesheetAssetId)
      return getAssetDisplayUrl?.(asset)
    }

    // Legacy: inline spritesheet data
    if (anim.spritesheet?.data) {
      return anim.spritesheet.data
    }

    return null
  }

  /**
   * Get spritesheet dimensions for an animation
   * @param {Object} anim - Animation object
   * @returns {{ width: number, height: number }}
   */
  const getAnimationSpritesheetSize = (anim) => {
    if (!anim) return { width: 0, height: 0 }

    // First check if dimensions are saved directly on the animation
    if (anim.spritesheetWidth && anim.spritesheetHeight) {
      return { width: anim.spritesheetWidth, height: anim.spritesheetHeight }
    }

    if (anim.spritesheet) {
      return { width: anim.spritesheet.width, height: anim.spritesheet.height }
    }

    if (anim.spritesheetAssetId) {
      const asset = globalAssets.value.find(a => a.id === anim.spritesheetAssetId)
      if (asset) {
        return { width: asset.width || 256, height: asset.height || 256 }
      }
    }

    return { width: 256, height: 256 }
  }

  // ==================
  // ANIMATION ASSIGNMENT HELPERS
  // ==================

  /**
   * Get animation ID from assignment (handles both old format and new {id, mirror} format)
   * @param {number|Object} assignment - Animation assignment
   * @returns {number|null}
   */
  const getAnimationIdFromAssignment = (assignment) => {
    if (!assignment) return null
    if (typeof assignment === 'number') return assignment
    if (typeof assignment === 'object' && assignment.id) return assignment.id
    return null
  }

  /**
   * Check if animation assignment has mirror flag
   * @param {number|Object} assignment - Animation assignment
   * @returns {boolean}
   */
  const isAnimationMirrored = (assignment) => {
    if (!assignment) return false
    if (typeof assignment === 'object' && assignment.mirror) return true
    return false
  }

  /**
   * Get which actors/states are using a specific animation
   * @param {number} animId - Animation ID
   * @returns {Array} Array of usage info objects
   */
  const getAnimationUsage = (animId) => {
    if (!animId || !globalActors?.value) return []
    const usage = []
    for (const actor of globalActors.value) {
      if (actor.animations) {
        for (const [state, assignment] of Object.entries(actor.animations)) {
          const assignedId = getAnimationIdFromAssignment(assignment)
          if (assignedId === animId) {
            const stateInfo = ACTOR_ANIMATION_STATES.find(s => s.key === state)
            const mirror = isAnimationMirrored(assignment)
            usage.push({
              actorId: actor.id,
              actorName: actor.name,
              state: state,
              stateLabel: stateInfo?.label || state,
              stateIcon: stateInfo?.icon || '🎬',
              mirror: mirror
            })
          }
        }
      }
    }
    return usage
  }

  // ==================
  // ACTOR ANIMATION PREVIEW
  // ==================

  /**
   * Get current animation for actor based on state
   * @param {Object} actor - Actor object
   * @param {string} stateOverride - Optional state override
   * @returns {Object|null} Animation with _mirror flag
   */
  const getActorCurrentAnimation = (actor, stateOverride = null) => {
    if (!actor?.animations) return null
    const state = stateOverride || actor.currentState
    if (!state) return null

    const assignment = actor.animations[state]
    if (!assignment) return null

    const animId = getAnimationIdFromAssignment(assignment)
    if (!animId) return null

    const mirror = isAnimationMirrored(assignment)

    // Search in global animations first, then scene animations for backward compatibility
    const anim = globalAnimations.value.find(a => a.id === animId) ||
                 currentScene.value?.animations?.find(a => a.id === animId)

    if (!anim) return null
    return { ...anim, _mirror: mirror }
  }

  /**
   * Get style for actor animation preview
   * @param {Object} actor - Actor object
   * @returns {Object} CSS style object
   */
  const getActorAnimationStyle = (actor) => {
    const anim = getActorCurrentAnimation(actor)
    if (!anim || !anim.frames?.length) return {}

    const spritesheetUrl = getAnimationSpritesheetUrl(anim)
    if (!spritesheetUrl) return {}

    const frameIndex = actorPreviewFrames.value[actor.id] || 0
    const frame = anim.frames[frameIndex % anim.frames.length]
    const size = getAnimationSpritesheetSize(anim)

    const style = {
      width: '100%',
      height: '100%',
      backgroundImage: `url(${spritesheetUrl})`,
      backgroundPosition: `-${frame.x}px -${frame.y}px`,
      backgroundSize: `${size.width}px ${size.height}px`,
      imageRendering: 'pixelated'
    }

    if (anim._mirror) {
      style.transform = 'scaleX(-1)'
    }

    return style
  }

  /**
   * Get animation for actor placement (combines global actor + placement state)
   * @param {Object} placement - Actor placement object
   * @returns {Object|null} Animation with _mirror flag
   */
  const getActorPlacementAnimation = (placement) => {
    const globalActor = getGlobalActorById?.(placement.actorId)
    if (!globalActor || !globalActor.animations) return null

    const state = placement.currentState || 'idle'
    let assignment = globalActor.animations[state]

    // If requested state doesn't have animation, try to find any available animation
    if (!assignment) {
      // Priority: idle > walk-south > first available
      const fallbackStates = ['idle', 'walk-south', 'walk-east', 'walk-west', 'walk-north']
      for (const fallbackState of fallbackStates) {
        if (globalActor.animations[fallbackState]) {
          assignment = globalActor.animations[fallbackState]
          break
        }
      }
      // If still no animation, get the first one available
      if (!assignment) {
        const availableAnims = Object.entries(globalActor.animations).filter(([k, v]) => v != null)
        if (availableAnims.length > 0) {
          assignment = availableAnims[0][1]
        }
      }
    }

    if (!assignment) return null

    const animId = getAnimationIdFromAssignment(assignment)
    const mirror = isAnimationMirrored(assignment)

    if (!animId) return null

    const anim = globalAnimations.value.find(a => a.id === animId) ||
                 currentScene.value?.animations?.find(a => a.id === animId)

    if (!anim) return null
    return { ...anim, _mirror: mirror }
  }

  /**
   * Get style for actor placement animation preview
   * @param {Object} placement - Actor placement object
   * @returns {Object} CSS style object
   */
  const getActorPlacementAnimationStyle = (placement) => {
    const anim = getActorPlacementAnimation(placement)
    if (!anim || !anim.frames?.length) return {}

    const spritesheetUrl = getAnimationSpritesheetUrl(anim)
    if (!spritesheetUrl) return {}

    const frameIndex = actorPreviewFrames.value[placement.id] || 0
    const frame = anim.frames[frameIndex % anim.frames.length]
    const size = getAnimationSpritesheetSize(anim)

    const style = {
      width: '100%',
      height: '100%',
      backgroundImage: `url(${spritesheetUrl})`,
      backgroundPosition: `-${frame.x}px -${frame.y}px`,
      backgroundSize: `${size.width}px ${size.height}px`,
      imageRendering: 'pixelated'
    }

    if (anim._mirror) {
      style.transform = 'scaleX(-1)'
    }

    return style
  }

  /**
   * Advance animation preview frame for an actor/placement
   * @param {number|string} id - Actor ID or placement ID
   * @param {number} totalFrames - Total frames in animation
   */
  const advancePreviewFrame = (id, totalFrames) => {
    const current = actorPreviewFrames.value[id] || 0
    actorPreviewFrames.value[id] = (current + 1) % totalFrames
  }

  /**
   * Reset preview frame for an actor/placement
   * @param {number|string} id - Actor ID or placement ID
   */
  const resetPreviewFrame = (id) => {
    actorPreviewFrames.value[id] = 0
  }

  return {
    // State
    spritesheetEditorOpen,
    actorPreviewFrames,

    // Computed
    globalAnimations,

    // Constants
    actorAnimationStates: ACTOR_ANIMATION_STATES,

    // CRUD
    openSpritesheetEditor,
    closeSpritesheetEditor,
    deleteAnimation,
    saveAnimation,
    updateAnimation,
    assignAnimationToActor,

    // Getters
    getAnimationById,
    getAnimationSpritesheetUrl,
    getAnimationSpritesheetSize,
    getAnimationIdFromAssignment,
    isAnimationMirrored,
    getAnimationUsage,

    // Actor preview
    getActorCurrentAnimation,
    getActorAnimationStyle,
    getActorPlacementAnimation,
    getActorPlacementAnimationStyle,
    advancePreviewFrame,
    resetPreviewFrame
  }
}
