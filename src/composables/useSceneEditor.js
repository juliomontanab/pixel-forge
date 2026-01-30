/**
 * useSceneEditor.js
 *
 * Composable para manejo del estado base del editor de escenas.
 * Incluye estructura de proyecto, escenas, globalData y validación.
 *
 * @example
 * const {
 *   project,
 *   currentScene,
 *   globalData,
 *   availableScenes,
 *   switchScene,
 *   createScene,
 *   deleteScene,
 *   duplicateScene
 * } = useSceneEditor()
 */

import { ref, computed, watch } from 'vue'

// =====================
// CONSTANTS
// =====================

export const DEFAULT_WIDTH = 1920
export const DEFAULT_HEIGHT = 1200

/**
 * Default verbs for SCUMM-style adventure games
 */
export const DEFAULT_VERBS = [
  { id: 1, name: 'Mirar', icon: '👁', key: 'l' },
  { id: 2, name: 'Recoger', icon: '✋', key: 'p' },
  { id: 3, name: 'Usar', icon: '🔧', key: 'u' },
  { id: 4, name: 'Abrir', icon: '📂', key: 'o' },
  { id: 5, name: 'Cerrar', icon: '📁', key: 'c' },
  { id: 6, name: 'Empujar', icon: '👉', key: 'e' },
  { id: 7, name: 'Tirar', icon: '👈', key: 'y' },
  { id: 8, name: 'Hablar', icon: '💬', key: 't' },
  { id: 9, name: 'Dar', icon: '🎁', key: 'g' }
]

// =====================
// STRUCTURE HELPERS
// =====================

/**
 * Deep clone helper using JSON serialization
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

/**
 * Ensure scene has all required properties (migration/validation)
 * @param {Object} scene - Scene object
 * @returns {Object} Validated scene
 */
export const ensureSceneStructure = (scene) => {
  if (!scene) return scene

  // Arrays that must exist
  const arrayProps = [
    'images', 'walkboxes', 'exits', 'actorPlacements', 'hotspots', 'zplanes',
    'dialogs', 'puzzles', 'sfx', 'music', 'cutscenes', 'animations',
    'particles', 'groups', 'elementFolders'
  ]
  arrayProps.forEach(prop => {
    if (!scene[prop]) scene[prop] = []
  })

  // Lighting structure
  if (!scene.lighting) {
    scene.lighting = { ambient: { color: '#ffffff', intensity: 1.0 }, lights: [] }
  }
  if (!scene.lighting.ambient) {
    scene.lighting.ambient = { color: '#ffffff', intensity: 1.0 }
  }
  if (!scene.lighting.lights) {
    scene.lighting.lights = []
  }

  // Ensure elements have folderPath (migration)
  scene.images?.forEach(img => { if (!img.folderPath) img.folderPath = '/' })
  scene.hotspots?.forEach(h => { if (!h.folderPath) h.folderPath = '/' })

  return scene
}

/**
 * Ensure globalData has all required properties (migration/validation)
 * @param {Object} globalData - Global data object
 * @returns {Object} Validated global data
 */
export const ensureGlobalDataStructure = (globalData) => {
  if (!globalData) return globalData

  // Arrays that must exist
  if (!globalData.assets) globalData.assets = []
  if (!globalData.assetFolders) globalData.assetFolders = []
  if (!globalData.audioAssets) globalData.audioAssets = []
  if (!globalData.animations) globalData.animations = []
  if (!globalData.items) globalData.items = []
  if (!globalData.inventory) globalData.inventory = []
  if (!globalData.actors) globalData.actors = []
  if (!globalData.verbs) globalData.verbs = []
  if (!globalData.variables) globalData.variables = {}

  // Ensure each asset has folderPath
  globalData.assets.forEach(asset => {
    if (!asset.folderPath) asset.folderPath = '/'
  })

  return globalData
}

/**
 * Create a new empty scene with all required properties
 * @param {Object} options
 * @param {string} [options.name] - Scene name
 * @param {number} [options.width] - Scene width
 * @param {number} [options.height] - Scene height
 * @returns {Object} New scene object
 */
export const createEmptyScene = (options = {}) => {
  const {
    name = 'New Scene',
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT
  } = options

  return {
    id: 'scene-' + Date.now(),
    name,
    width,
    height,
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

/**
 * Create a new empty project with all required structure
 * @param {Object} options
 * @param {string} [options.name] - Project name
 * @returns {Object} New project object
 */
export const createEmptyProject = (options = {}) => {
  const { name = 'Untitled Project' } = options

  return {
    id: 'project-' + Date.now(),
    name,
    version: '1.0.0',
    globalData: {
      assets: [],
      assetFolders: [],
      audioAssets: [],
      animations: [],
      items: [],
      inventory: [],
      actors: [],
      variables: {},
      verbs: deepClone(DEFAULT_VERBS)
    },
    scenes: [createEmptyScene({ name: 'Scene 1' })],
    currentSceneId: null // Will be set to first scene
  }
}

// =====================
// MAIN COMPOSABLE
// =====================

/**
 * Creates a scene editor state management system
 *
 * @param {Object} options - Configuration options
 * @param {Object} [options.initialProject] - Initial project data
 * @param {Function} [options.onSceneChange] - Callback when scene changes
 * @param {Function} [options.onProjectChange] - Callback when project changes
 * @returns {Object} Scene editor state and methods
 */
export function useSceneEditor(options = {}) {
  const {
    initialProject = null,
    onSceneChange = null,
    onProjectChange = null
  } = options

  // =====================
  // PROJECT STATE
  // =====================

  const project = ref(initialProject || createEmptyProject())

  // Set initial currentSceneId if not set
  if (!project.value.currentSceneId && project.value.scenes.length > 0) {
    project.value.currentSceneId = project.value.scenes[0].id
  }

  // =====================
  // COMPUTED: PROJECT
  // =====================

  /**
   * Project name (get/set)
   */
  const projectName = computed({
    get: () => project.value.name,
    set: (val) => { project.value.name = val }
  })

  /**
   * Project ID
   */
  const projectId = computed(() => project.value.id)

  /**
   * Check if ID is a valid UUID (from backend)
   */
  const isUUID = (id) => {
    return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  }

  /**
   * Whether project has a backend-assigned UUID
   */
  const hasBackendId = computed(() => isUUID(project.value.id))

  // =====================
  // COMPUTED: SCENES
  // =====================

  /**
   * List of available scenes (id, name)
   */
  const availableScenes = computed(() =>
    project.value.scenes.map(s => ({ id: s.id, name: s.name }))
  )

  /**
   * Current scene (reactive, with validation)
   */
  const currentScene = computed({
    get: () => {
      const scene = project.value.scenes.find(s => s.id === project.value.currentSceneId)
      const foundScene = scene || project.value.scenes[0]
      return ensureSceneStructure(foundScene)
    },
    set: (newScene) => {
      const index = project.value.scenes.findIndex(s => s.id === project.value.currentSceneId)
      if (index !== -1) {
        project.value.scenes[index] = newScene
      }
    }
  })

  /**
   * Current scene ID
   */
  const currentSceneId = computed(() => project.value.currentSceneId)

  /**
   * Current scene index
   */
  const currentSceneIndex = computed(() =>
    project.value.scenes.findIndex(s => s.id === project.value.currentSceneId)
  )

  /**
   * Total number of scenes
   */
  const sceneCount = computed(() => project.value.scenes.length)

  // =====================
  // COMPUTED: GLOBAL DATA
  // =====================

  /**
   * Global data object
   */
  const globalData = computed(() => {
    ensureGlobalDataStructure(project.value.globalData)
    return project.value.globalData
  })

  // Shortcuts for common global data arrays
  const globalAssets = computed(() => project.value.globalData?.assets || [])
  const globalAssetFolders = computed(() => project.value.globalData?.assetFolders || [])
  const globalAudioAssets = computed(() => project.value.globalData?.audioAssets || [])
  const globalAnimations = computed(() => project.value.globalData?.animations || [])
  const globalItems = computed(() => project.value.globalData?.items || [])
  const globalInventory = computed(() => project.value.globalData?.inventory || [])
  const globalActors = computed(() => project.value.globalData?.actors || [])
  const globalVerbs = computed(() => project.value.globalData?.verbs || [])
  const globalVariables = computed(() => project.value.globalData?.variables || {})

  // =====================
  // SCENE MANAGEMENT
  // =====================

  /**
   * Switch to a different scene
   * @param {string} sceneId - Scene ID to switch to
   * @param {Object} [options]
   * @param {Function} [options.onSwitch] - Callback after switching
   * @returns {boolean} Whether switch was successful
   */
  const switchScene = (sceneId, options = {}) => {
    if (!project.value.scenes.some(s => s.id === sceneId)) {
      return false
    }

    project.value.currentSceneId = sceneId

    if (options.onSwitch) {
      options.onSwitch(sceneId)
    }
    if (onSceneChange) {
      onSceneChange(sceneId)
    }

    return true
  }

  /**
   * Create a new scene
   * @param {Object} [options]
   * @param {string} [options.name] - Scene name
   * @param {boolean} [options.switchTo] - Whether to switch to new scene (default: true)
   * @returns {Object} The created scene
   */
  const createScene = (options = {}) => {
    const { name = 'New Scene', switchTo = true } = options

    const newScene = createEmptyScene({ name })
    project.value.scenes.push(newScene)

    if (switchTo) {
      project.value.currentSceneId = newScene.id
      if (onSceneChange) {
        onSceneChange(newScene.id)
      }
    }

    return newScene
  }

  /**
   * Delete a scene by ID
   * @param {string} sceneId - Scene ID to delete
   * @returns {boolean} Whether deletion was successful
   */
  const deleteScene = (sceneId) => {
    if (project.value.scenes.length <= 1) {
      console.warn('[useSceneEditor] Cannot delete the last scene')
      return false
    }

    const index = project.value.scenes.findIndex(s => s.id === sceneId)
    if (index === -1) return false

    const wasCurrentScene = project.value.currentSceneId === sceneId
    project.value.scenes.splice(index, 1)

    // If we deleted the current scene, switch to another
    if (wasCurrentScene) {
      project.value.currentSceneId = project.value.scenes[0].id
      if (onSceneChange) {
        onSceneChange(project.value.currentSceneId)
      }
    }

    return true
  }

  /**
   * Delete the current scene
   * @returns {boolean} Whether deletion was successful
   */
  const deleteCurrentScene = () => {
    return deleteScene(project.value.currentSceneId)
  }

  /**
   * Duplicate a scene
   * @param {string} sceneId - Scene ID to duplicate
   * @param {Object} [options]
   * @param {boolean} [options.switchTo] - Whether to switch to duplicated scene (default: true)
   * @returns {Object|null} The duplicated scene or null if failed
   */
  const duplicateScene = (sceneId, options = {}) => {
    const { switchTo = true } = options

    const original = project.value.scenes.find(s => s.id === sceneId)
    if (!original) return null

    const duplicated = {
      ...deepClone(original),
      id: 'scene-' + Date.now(),
      name: original.name + ' (copy)'
    }

    project.value.scenes.push(duplicated)

    if (switchTo) {
      project.value.currentSceneId = duplicated.id
      if (onSceneChange) {
        onSceneChange(duplicated.id)
      }
    }

    return duplicated
  }

  /**
   * Duplicate the current scene
   * @param {Object} [options]
   * @returns {Object|null} The duplicated scene
   */
  const duplicateCurrentScene = (options = {}) => {
    return duplicateScene(project.value.currentSceneId, options)
  }

  /**
   * Rename a scene
   * @param {string} sceneId - Scene ID
   * @param {string} newName - New name
   * @returns {boolean} Whether rename was successful
   */
  const renameScene = (sceneId, newName) => {
    const scene = project.value.scenes.find(s => s.id === sceneId)
    if (!scene) return false

    scene.name = newName
    return true
  }

  /**
   * Rename the current scene
   * @param {string} newName - New name
   * @returns {boolean} Whether rename was successful
   */
  const renameCurrentScene = (newName) => {
    return renameScene(project.value.currentSceneId, newName)
  }

  /**
   * Get a scene by ID
   * @param {string} sceneId
   * @returns {Object|null}
   */
  const getSceneById = (sceneId) => {
    return project.value.scenes.find(s => s.id === sceneId) || null
  }

  /**
   * Move scene to a different position
   * @param {string} sceneId
   * @param {number} newIndex
   * @returns {boolean}
   */
  const moveScene = (sceneId, newIndex) => {
    const currentIndex = project.value.scenes.findIndex(s => s.id === sceneId)
    if (currentIndex === -1) return false
    if (newIndex < 0 || newIndex >= project.value.scenes.length) return false

    const [scene] = project.value.scenes.splice(currentIndex, 1)
    project.value.scenes.splice(newIndex, 0, scene)

    return true
  }

  // =====================
  // PROJECT MANAGEMENT
  // =====================

  /**
   * Load a project from data
   * @param {Object} projectData - Project data to load
   * @param {Object} [options]
   * @param {boolean} [options.validate] - Whether to validate structure (default: true)
   */
  const loadProject = (projectData, options = {}) => {
    const { validate = true } = options

    if (validate) {
      // Ensure globalData structure
      ensureGlobalDataStructure(projectData.globalData)

      // Ensure each scene structure
      projectData.scenes?.forEach(scene => ensureSceneStructure(scene))
    }

    project.value = projectData

    // Set currentSceneId if not set
    if (!project.value.currentSceneId && project.value.scenes.length > 0) {
      project.value.currentSceneId = project.value.scenes[0].id
    }

    if (onProjectChange) {
      onProjectChange(project.value)
    }
  }

  /**
   * Reset to a new empty project
   * @param {Object} [options]
   * @param {string} [options.name] - Project name
   */
  const resetProject = (options = {}) => {
    const newProject = createEmptyProject(options)
    newProject.currentSceneId = newProject.scenes[0].id
    project.value = newProject

    if (onProjectChange) {
      onProjectChange(project.value)
    }
  }

  /**
   * Export project as JSON string
   * @param {Object} [options]
   * @param {boolean} [options.pretty] - Pretty print (default: true)
   * @returns {string} JSON string
   */
  const exportProject = (options = {}) => {
    const { pretty = true } = options
    return pretty
      ? JSON.stringify(project.value, null, 2)
      : JSON.stringify(project.value)
  }

  /**
   * Get a deep clone of the project
   * @returns {Object}
   */
  const cloneProject = () => {
    return deepClone(project.value)
  }

  // =====================
  // GLOBAL ACTOR HELPERS
  // =====================

  /**
   * Get global actor by ID
   * @param {number|string} actorId
   * @returns {Object|null}
   */
  const getGlobalActorById = (actorId) => {
    return project.value.globalData.actors.find(a => a.id === actorId) || null
  }

  /**
   * Add a new global actor
   * @param {Object} [actorData] - Optional initial data
   * @returns {Object} The created actor
   */
  const addGlobalActor = (actorData = {}) => {
    const actor = {
      id: Date.now(),
      name: 'New Actor',
      costume: 'default',
      animations: {
        idle: null,
        'walk-north': null,
        'walk-south': null,
        'walk-east': null,
        'walk-west': null,
        'talk': null
      },
      ...actorData
    }
    project.value.globalData.actors.push(actor)
    return actor
  }

  /**
   * Remove a global actor
   * @param {number|string} actorId
   * @returns {boolean}
   */
  const removeGlobalActor = (actorId) => {
    const index = project.value.globalData.actors.findIndex(a => a.id === actorId)
    if (index === -1) return false

    project.value.globalData.actors.splice(index, 1)

    // Also remove placements from all scenes
    project.value.scenes.forEach(scene => {
      if (scene.actorPlacements) {
        scene.actorPlacements = scene.actorPlacements.filter(p => p.actorId !== actorId)
      }
    })

    return true
  }

  // =====================
  // VERBS HELPERS
  // =====================

  /**
   * Reset verbs to default
   */
  const resetVerbsToDefault = () => {
    project.value.globalData.verbs = deepClone(DEFAULT_VERBS)
  }

  /**
   * Get verb by ID
   * @param {number|string} verbId
   * @returns {Object|null}
   */
  const getVerbById = (verbId) => {
    return project.value.globalData.verbs.find(v => v.id === verbId) || null
  }

  // =====================
  // WATCH FOR CHANGES
  // =====================

  // Optional: watch for project changes
  if (onProjectChange) {
    watch(project, () => {
      onProjectChange(project.value)
    }, { deep: true })
  }

  return {
    // Core state
    project,
    projectName,
    projectId,
    hasBackendId,

    // Scenes
    currentScene,
    currentSceneId,
    currentSceneIndex,
    availableScenes,
    sceneCount,

    // Scene operations
    switchScene,
    createScene,
    deleteScene,
    deleteCurrentScene,
    duplicateScene,
    duplicateCurrentScene,
    renameScene,
    renameCurrentScene,
    getSceneById,
    moveScene,

    // Global data
    globalData,
    globalAssets,
    globalAssetFolders,
    globalAudioAssets,
    globalAnimations,
    globalItems,
    globalInventory,
    globalActors,
    globalVerbs,
    globalVariables,

    // Global actor helpers
    getGlobalActorById,
    addGlobalActor,
    removeGlobalActor,

    // Verb helpers
    resetVerbsToDefault,
    getVerbById,

    // Project operations
    loadProject,
    resetProject,
    exportProject,
    cloneProject,

    // Structure helpers
    ensureSceneStructure,
    ensureGlobalDataStructure,

    // Utilities
    isUUID,
    deepClone,

    // Constants
    DEFAULT_WIDTH,
    DEFAULT_HEIGHT,
    DEFAULT_VERBS
  }
}

export default useSceneEditor
