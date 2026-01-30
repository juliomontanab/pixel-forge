/**
 * useGlobalActors.js
 *
 * Composable para la gestión de actores globales del proyecto.
 * Maneja creación, eliminación y colocación de actores en escenas.
 *
 * @example
 * const {
 *   addGlobalActor,
 *   removeGlobalActor,
 *   placeActorInScene,
 *   removeActorFromScene,
 *   getGlobalActorById
 * } = useGlobalActors({
 *   project,
 *   currentScene
 * })
 */

/**
 * Default animations structure for a new actor
 */
export const DEFAULT_ACTOR_ANIMATIONS = {
  idle: null,
  'walk-north': null,
  'walk-south': null,
  'walk-east': null,
  'walk-west': null,
  'talk': null
}

/**
 * Creates a global actors management system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.project - Reactive reference to project data
 * @param {Ref} options.currentScene - Reactive reference to current scene
 * @returns {Object} Global actors management methods
 */
export function useGlobalActors(options = {}) {
  const {
    project,
    currentScene
  } = options

  // =====================
  // ACTOR CRUD
  // =====================

  /**
   * Add a new global actor
   * @param {string} [name='New Actor'] - Actor name
   * @param {string} [costume='default'] - Initial costume
   * @returns {number} ID of the new actor
   */
  const addGlobalActor = (name = 'New Actor', costume = 'default') => {
    if (!project?.value?.globalData?.actors) return null

    const newId = Date.now()
    project.value.globalData.actors.push({
      id: newId,
      name,
      costume,
      animations: { ...DEFAULT_ACTOR_ANIMATIONS }
    })

    return newId
  }

  /**
   * Remove a global actor and all its placements from all scenes
   * @param {number} actorId - ID of actor to remove
   * @returns {boolean} Whether removal was successful
   */
  const removeGlobalActor = (actorId) => {
    if (!project?.value?.globalData?.actors) return false

    const index = project.value.globalData.actors.findIndex(a => a.id === actorId)
    if (index > -1) {
      project.value.globalData.actors.splice(index, 1)

      // Also remove placements from all scenes
      project.value.scenes.forEach(scene => {
        if (scene.actorPlacements) {
          scene.actorPlacements = scene.actorPlacements.filter(p => p.actorId !== actorId)
        }
      })

      return true
    }

    return false
  }

  /**
   * Get a global actor by ID
   * @param {number} actorId - Actor ID
   * @returns {Object|null} Actor object or null
   */
  const getGlobalActorById = (actorId) => {
    if (!project?.value?.globalData?.actors) return null
    return project.value.globalData.actors.find(a => a.id === actorId)
  }

  // =====================
  // ACTOR PLACEMENTS
  // =====================

  /**
   * Place an actor in the current scene
   * @param {number} actorId - ID of actor to place
   * @param {Object} [position] - Optional position override
   * @param {number} [position.x=400] - X coordinate
   * @param {number} [position.y=600] - Y coordinate
   * @returns {number|null} ID of the new placement, or null if failed
   */
  const placeActorInScene = (actorId, position = {}) => {
    const actor = getGlobalActorById(actorId)
    if (!actor) return null

    if (!currentScene?.value?.actorPlacements) return null

    // Check if already placed
    if (currentScene.value.actorPlacements.some(p => p.actorId === actorId)) {
      alert('Actor already placed in this scene')
      return null
    }

    const placementId = Date.now()
    currentScene.value.actorPlacements.push({
      id: placementId,
      actorId: actorId,
      x: position.x ?? 400,
      y: position.y ?? 600,
      w: 64,
      h: 128,
      rotation: 0,
      direction: 'south',
      currentState: 'idle'
    })

    return placementId
  }

  /**
   * Remove an actor placement from the current scene
   * @param {number} placementId - ID of placement to remove
   * @returns {boolean} Whether removal was successful
   */
  const removeActorFromScene = (placementId) => {
    if (!currentScene?.value?.actorPlacements) return false

    const index = currentScene.value.actorPlacements.findIndex(p => p.id === placementId)
    if (index > -1) {
      currentScene.value.actorPlacements.splice(index, 1)
      return true
    }

    return false
  }

  /**
   * Get actor placement by ID in current scene
   * @param {number} placementId - Placement ID
   * @returns {Object|null} Placement object or null
   */
  const getActorPlacement = (placementId) => {
    if (!currentScene?.value?.actorPlacements) return null
    return currentScene.value.actorPlacements.find(p => p.id === placementId)
  }

  /**
   * Update actor placement position
   * @param {number} placementId - Placement ID
   * @param {number} x - New X coordinate
   * @param {number} y - New Y coordinate
   */
  const updateActorPosition = (placementId, x, y) => {
    const placement = getActorPlacement(placementId)
    if (placement) {
      placement.x = x
      placement.y = y
    }
  }

  /**
   * Update actor placement direction
   * @param {number} placementId - Placement ID
   * @param {string} direction - New direction ('north', 'south', 'east', 'west')
   */
  const updateActorDirection = (placementId, direction) => {
    const placement = getActorPlacement(placementId)
    if (placement) {
      placement.direction = direction
    }
  }

  /**
   * Check if an actor is placed in the current scene
   * @param {number} actorId - Actor ID
   * @returns {boolean}
   */
  const isActorInScene = (actorId) => {
    if (!currentScene?.value?.actorPlacements) return false
    return currentScene.value.actorPlacements.some(p => p.actorId === actorId)
  }

  return {
    // Actor CRUD
    addGlobalActor,
    removeGlobalActor,
    getGlobalActorById,

    // Actor placements
    placeActorInScene,
    removeActorFromScene,
    getActorPlacement,
    updateActorPosition,
    updateActorDirection,
    isActorInScene
  }
}

export default useGlobalActors
