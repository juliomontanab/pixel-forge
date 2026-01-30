/**
 * useSceneManagement.js
 *
 * Composable para la gestión de escenas del proyecto.
 * Maneja creación, eliminación, duplicación y renombrado de escenas.
 *
 * @example
 * const {
 *   switchScene,
 *   createNewScene,
 *   deleteCurrentScene,
 *   duplicateCurrentScene,
 *   showRenameSceneModal,
 *   renameSceneValue,
 *   openRenameSceneModal,
 *   confirmRenameScene
 * } = useSceneManagement({
 *   project,
 *   currentScene,
 *   selectedElements,
 *   defaultWidth,
 *   defaultHeight
 * })
 */

import { ref } from 'vue'

// Default resolution: 1920x1200 (16:10 WUXGA)
export const DEFAULT_WIDTH = 1920
export const DEFAULT_HEIGHT = 1200

/**
 * Creates a scene management system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.project - Reactive reference to project data
 * @param {Ref} options.currentScene - Reactive reference to current scene (computed)
 * @param {Ref} options.selectedElements - Reactive reference to selected elements
 * @param {number} [options.defaultWidth=1920] - Default scene width
 * @param {number} [options.defaultHeight=1200] - Default scene height
 * @returns {Object} Scene management methods and state
 */
export function useSceneManagement(options = {}) {
  const {
    project,
    currentScene,
    selectedElements,
    defaultWidth = DEFAULT_WIDTH,
    defaultHeight = DEFAULT_HEIGHT
  } = options

  // =====================
  // STATE
  // =====================

  const showRenameSceneModal = ref(false)
  const renameSceneValue = ref('')

  // =====================
  // HELPERS
  // =====================

  /**
   * Deep clone helper
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

  /**
   * Create an empty scene structure
   * @param {string} id - Scene ID
   * @param {string} name - Scene name
   * @returns {Object} Empty scene object
   */
  const createEmptyScene = (id, name = 'New Scene') => {
    return {
      id,
      name,
      width: defaultWidth,
      height: defaultHeight,
      background: null,
      images: [],
      walkboxes: [],
      exits: [],
      actorPlacements: [],
      hotspots: [],
      zplanes: [],
      dialogs: [],
      puzzles: [],
      sfx: [],
      music: [],
      cutscenes: [],
      animations: [],
      lighting: {
        ambient: { color: '#ffffff', intensity: 1.0 },
        lights: []
      },
      particles: [],
      groups: [],
      elementFolders: []
    }
  }

  // =====================
  // SCENE OPERATIONS
  // =====================

  /**
   * Switch to a different scene
   * @param {string} sceneId - ID of scene to switch to
   */
  const switchScene = (sceneId) => {
    if (!project?.value) return

    if (project.value.scenes.some(s => s.id === sceneId)) {
      project.value.currentSceneId = sceneId
      if (selectedElements?.value) {
        selectedElements.value = []
      }
    }
  }

  /**
   * Create a new scene and switch to it
   * @param {string} [name='New Scene'] - Name for the new scene
   * @returns {string} ID of the new scene
   */
  const createNewScene = (name = 'New Scene') => {
    if (!project?.value) return null

    const newId = 'scene-' + Date.now()
    const newScene = createEmptyScene(newId, name)

    project.value.scenes.push(newScene)
    project.value.currentSceneId = newId

    if (selectedElements?.value) {
      selectedElements.value = []
    }

    return newId
  }

  /**
   * Delete current scene (cannot delete last scene)
   * @returns {boolean} Whether deletion was successful
   */
  const deleteCurrentScene = () => {
    if (!project?.value) return false

    if (project.value.scenes.length <= 1) {
      alert('Cannot delete the last scene')
      return false
    }

    const currentId = project.value.currentSceneId
    const index = project.value.scenes.findIndex(s => s.id === currentId)

    if (index > -1) {
      project.value.scenes.splice(index, 1)
      // Switch to another scene
      project.value.currentSceneId = project.value.scenes[0].id

      if (selectedElements?.value) {
        selectedElements.value = []
      }

      return true
    }

    return false
  }

  /**
   * Duplicate current scene
   * @returns {string|null} ID of the duplicated scene, or null if failed
   */
  const duplicateCurrentScene = () => {
    if (!project?.value || !currentScene?.value) return null

    const current = currentScene.value
    const newId = 'scene-' + Date.now()
    const duplicated = {
      ...deepClone(current),
      id: newId,
      name: current.name + ' (copy)'
    }

    project.value.scenes.push(duplicated)
    project.value.currentSceneId = newId

    if (selectedElements?.value) {
      selectedElements.value = []
    }

    return newId
  }

  // =====================
  // RENAME MODAL
  // =====================

  /**
   * Open rename scene modal
   */
  const openRenameSceneModal = () => {
    if (!currentScene?.value) return

    renameSceneValue.value = currentScene.value.name
    showRenameSceneModal.value = true
  }

  /**
   * Confirm rename scene
   */
  const confirmRenameScene = () => {
    if (!project?.value) return

    if (renameSceneValue.value.trim()) {
      const scene = project.value.scenes.find(s => s.id === project.value.currentSceneId)
      if (scene) {
        scene.name = renameSceneValue.value.trim()
      }
    }
    showRenameSceneModal.value = false
  }

  /**
   * Cancel rename scene modal
   */
  const cancelRenameScene = () => {
    showRenameSceneModal.value = false
    renameSceneValue.value = ''
  }

  /**
   * Get scene by ID
   * @param {string} sceneId - Scene ID
   * @returns {Object|null} Scene object or null
   */
  const getSceneById = (sceneId) => {
    if (!project?.value) return null
    return project.value.scenes.find(s => s.id === sceneId)
  }

  /**
   * Get all scenes
   * @returns {Array} Array of scenes
   */
  const getAllScenes = () => {
    if (!project?.value) return []
    return project.value.scenes
  }

  return {
    // State
    showRenameSceneModal,
    renameSceneValue,

    // Scene operations
    switchScene,
    createNewScene,
    deleteCurrentScene,
    duplicateCurrentScene,

    // Rename modal
    openRenameSceneModal,
    confirmRenameScene,
    cancelRenameScene,

    // Helpers
    createEmptyScene,
    getSceneById,
    getAllScenes
  }
}

export default useSceneManagement
