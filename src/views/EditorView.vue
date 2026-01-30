<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClaudeSocket } from '@/composables/useClaudeSocket'
import { useProjectApi } from '@/composables/useProjectApi'
import { useAssetApi } from '@/composables/useAssetApi'

// Refactored components
import {
  PixelModal,
  ConfirmModal,
  PromptModal,
  ListSelectModal,
  ContextMenu,
  BackgroundScaleModal,
  AssetManagerModal,
  AudioManagerModal,
  SpritesheetEditorModal,
  CanvasGrid,
  CanvasWalkbox,
  CanvasElement,
  CanvasLighting,
  CanvasParticles,
  EditorHeader,
  EditorStatusBar,
  PlayModeOverlay,
  SceneActionsBar,
  ZoomControls,
  LeftPanel,
  PropertiesPanel,
  SceneTabs,
  ElementList
} from '@/components'

const { getProjectById, saveProject: saveProjectToApi } = useProjectApi()
const { uploadAsset: uploadAssetToS3, getAssetUrl, getAssetUrls, deleteAsset: deleteAssetFromS3, isUploading, uploadProgress, ASSET_CATEGORIES } = useAssetApi()

// User data for S3 paths
const currentUserId = computed(() => {
  const userData = localStorage.getItem('pixel-forge-user')
  if (userData) {
    const user = JSON.parse(userData)
    return user.email || 'anonymous'
  }
  return 'anonymous'
})

const route = useRoute()
const router = useRouter()

// Project data
const projectId = computed(() => route.params.projectId)
const isNewProject = computed(() => projectId.value === 'new')

// Default resolution: 1920x1200 (16:10 WUXGA)
const DEFAULT_WIDTH = 1920
const DEFAULT_HEIGHT = 1200

// =====================
// PROJECT STRUCTURE
// =====================
// The project contains all scenes and global data
const project = ref({
  id: 'project-1',
  name: isNewProject.value ? 'Untitled Project' : 'Demo Project',
  version: '1.0.0',

  // Global data (shared across all scenes)
  globalData: {
    // Asset library (images used across the project)
    // { id, name, s3Key, category, folderPath, width, height, type, contentType }
    assets: [],
    // Asset folder organization
    // { id, path, name, parentPath, icon }
    assetFolders: [],
    // Audio library (sounds and music)
    audioAssets: [],  // { id, name, data (base64), duration, type (sfx/music), format }
    // Global animations (spritesheets with frame definitions)
    // { id, name, spritesheetAssetId, frames: [{x,y,w,h}], frameRate, loop, pingPong }
    animations: [],
    // Item definitions (global - player carries them between scenes)
    items: [],
    // Player's current inventory (global)
    inventory: [],
    // Global actor definitions (characters that can appear in multiple scenes)
    actors: [
      { id: 1, name: 'Guybrush', costume: 'default', animations: { idle: null, 'walk-north': null, 'walk-south': null, 'walk-east': null, 'walk-west': null, 'talk': null } },
      { id: 2, name: 'Elaine', costume: 'default', animations: { idle: null, 'walk-north': null, 'walk-south': null, 'walk-east': null, 'walk-west': null, 'talk': null } }
    ],
    // Game state variables/flags
    variables: {},
    // Verbs (global - same verbs across all scenes)
    verbs: [
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
  },

  // All scenes in the project
  scenes: [
    {
      id: 'scene-1',
      name: 'Oficina',
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      background: null,
      // Spatial elements
      images: [
        { id: 1, name: 'Escritorio', x: 600, y: 720, w: 480, h: 240, rotation: 0, interactive: true, pickable: false, src: null },
        { id: 2, name: 'Lampara', x: 300, y: 480, w: 120, h: 360, rotation: 0, interactive: true, pickable: true, src: null }
      ],
      walkboxes: [
        { id: 1, points: [{x:0,y:900}, {x:1920,y:900}, {x:1920,y:1200}, {x:0,y:1200}], rotation: 0, mask: 0 }
      ],
      exits: [
        { id: 1, name: 'Puerta', x: 1680, y: 600, w: 180, h: 480, rotation: 0, targetScene: 'scene-2' }
      ],
      // Actor placements in this scene (references to global actors)
      actorPlacements: [],  // { actorId, x, y, w, h, rotation, direction, currentState }
      hotspots: [],
      zplanes: [],
      // Scene-specific data
      dialogs: [],
      puzzles: [],
      sfx: [],
      music: [],
      cutscenes: [],
      animations: [],
      // Lighting system
      lighting: {
        ambient: { color: '#ffffff', intensity: 1.0 },
        lights: []
      },
      // Particle emitters
      particles: [],
      // Element groups
      groups: [],
      // Element folder organization (for images, hotspots, etc.)
      // { id, path, name, parentPath, elementType, collapsed }
      elementFolders: []
    },
    {
      id: 'scene-2',
      name: 'Pasillo',
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      background: null,
      images: [],
      walkboxes: [],
      exits: [
        { id: 1, name: 'Puerta Oficina', x: 100, y: 600, w: 180, h: 480, rotation: 0, targetScene: 'scene-1' }
      ],
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
  ],

  // Currently selected scene ID
  currentSceneId: 'scene-1'
})

// Computed: Project name (for backward compatibility)
const projectName = computed({
  get: () => project.value.name,
  set: (val) => { project.value.name = val }
})

// Computed: Available scenes list
const availableScenes = computed(() =>
  project.value.scenes.map(s => ({ id: s.id, name: s.name }))
)

// Ensure scene has all required properties
const ensureSceneStructure = (scene) => {
  if (!scene) return scene

  // Arrays that must exist
  const arrayProps = ['images', 'walkboxes', 'exits', 'actorPlacements', 'hotspots', 'zplanes',
                      'dialogs', 'puzzles', 'sfx', 'music', 'cutscenes', 'animations', 'particles', 'groups', 'elementFolders']
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

// Ensure globalData has all required properties
const ensureGlobalDataStructure = (globalData) => {
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

// Computed: Current scene (reactive reference to the active scene)
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

// Computed: Global data shortcuts
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

// Switch to a different scene
const switchScene = (sceneId) => {
  if (project.value.scenes.some(s => s.id === sceneId)) {
    project.value.currentSceneId = sceneId
    selectedElements.value = []
  }
}

// Create a new scene
const createNewScene = () => {
  const newId = 'scene-' + Date.now()
  const newScene = {
    id: newId,
    name: 'New Scene',
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
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
  project.value.scenes.push(newScene)
  project.value.currentSceneId = newId
  selectedElements.value = []
}

// Delete current scene
const deleteCurrentScene = () => {
  if (project.value.scenes.length <= 1) {
    alert('Cannot delete the last scene')
    return
  }
  const currentId = project.value.currentSceneId
  const index = project.value.scenes.findIndex(s => s.id === currentId)
  project.value.scenes.splice(index, 1)
  // Switch to another scene
  project.value.currentSceneId = project.value.scenes[0].id
  selectedElements.value = []
}

// Duplicate current scene
const duplicateCurrentScene = () => {
  const current = currentScene.value
  const newId = 'scene-' + Date.now()
  const duplicated = {
    ...deepClone(current),
    id: newId,
    name: current.name + ' (copy)'
  }
  project.value.scenes.push(duplicated)
  project.value.currentSceneId = newId
  selectedElements.value = []
}

// Rename scene modal
const showRenameSceneModal = ref(false)
const renameSceneValue = ref('')

const openRenameSceneModal = () => {
  renameSceneValue.value = currentScene.value.name
  showRenameSceneModal.value = true
}

const confirmRenameScene = () => {
  if (renameSceneValue.value.trim()) {
    const scene = project.value.scenes.find(s => s.id === project.value.currentSceneId)
    if (scene) {
      scene.name = renameSceneValue.value.trim()
    }
  }
  showRenameSceneModal.value = false
}

// =====================
// GLOBAL ACTOR MANAGEMENT
// =====================

// Add global actor
const addGlobalActor = () => {
  project.value.globalData.actors.push({
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
    }
  })
}

// Remove global actor
const removeGlobalActor = (actorId) => {
  const index = project.value.globalData.actors.findIndex(a => a.id === actorId)
  if (index > -1) {
    project.value.globalData.actors.splice(index, 1)
    // Also remove placements from all scenes
    project.value.scenes.forEach(scene => {
      scene.actorPlacements = scene.actorPlacements.filter(p => p.actorId !== actorId)
    })
  }
}

// Place actor in current scene
const placeActorInScene = (actorId) => {
  const actor = project.value.globalData.actors.find(a => a.id === actorId)
  if (!actor) return

  // Check if already placed
  if (currentScene.value.actorPlacements.some(p => p.actorId === actorId)) {
    alert('Actor already placed in this scene')
    return
  }

  currentScene.value.actorPlacements.push({
    id: Date.now(),
    actorId: actorId,
    x: 400,
    y: 600,
    w: 64,
    h: 128,
    rotation: 0,
    direction: 'south',
    currentState: 'idle'
  })
}

// Remove actor from current scene
const removeActorFromScene = (placementId) => {
  const index = currentScene.value.actorPlacements.findIndex(p => p.id === placementId)
  if (index > -1) {
    currentScene.value.actorPlacements.splice(index, 1)
  }
}

// Get global actor by ID
const getGlobalActorById = (actorId) => {
  return project.value.globalData.actors.find(a => a.id === actorId)
}

// =====================
// UNDO/REDO SYSTEM
// =====================
const MAX_HISTORY = 50
const historyStack = ref([])
const historyIndex = ref(-1)
const isUndoRedoAction = ref(false)

// Deep clone helper
const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

// Save current state to history
const saveToHistory = () => {
  if (isUndoRedoAction.value) return

  // Remove any future states if we're not at the end
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
  }

  // Add current state
  historyStack.value.push(deepClone(currentScene.value))

  // Limit history size
  if (historyStack.value.length > MAX_HISTORY) {
    historyStack.value.shift()
  }

  historyIndex.value = historyStack.value.length - 1
}

// Check if ID looks like a UUID (from backend)
const isUUID = (id) => {
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// Normalize interactive elements to ensure they have interactions array
const normalizeInteractiveElements = (scenes) => {
  if (!scenes) return scenes

  return scenes.map(scene => ({
    ...scene,
    // Normalize hotspots
    hotspots: (scene.hotspots || []).map(h => ({
      ...h,
      description: h.description || '',
      interactions: h.interactions || []
    })),
    // Normalize images (only interactive ones need it, but add to all for consistency)
    images: (scene.images || []).map(img => ({
      ...img,
      description: img.description || '',
      interactions: img.interactions || []
    }))
  }))
}

// Load project from API (MongoDB)
const loadProjectFromApi = async (id) => {
  try {
    console.log('[Editor] Cargando proyecto desde API:', id)
    const projectData = await getProjectById(id)

    if (projectData) {
      console.log('[Editor] Proyecto cargado desde API:', projectData.name)

      // Ensure globalData has all required arrays
      const gd = projectData.globalData || {}

      // Update project ref with data from API
      project.value = {
        id: projectData.projectId,
        name: projectData.name || 'Untitled Project',
        version: projectData.version || '1.0.0',
        currentSceneId: projectData.currentSceneId || 1,
        globalData: {
          assets: (gd.assets || []).map(a => ({ ...a, folderPath: a.folderPath || '/' })),
          assetFolders: gd.assetFolders || [],
          audioAssets: gd.audioAssets || [],
          animations: gd.animations || [],
          actors: gd.actors || [],
          items: gd.items || [],
          inventory: gd.inventory || [],
          verbs: gd.verbs || [
            { id: 1, name: 'Mirar', icon: '👁', key: 'l' },
            { id: 2, name: 'Recoger', icon: '✋', key: 'p' },
            { id: 3, name: 'Usar', icon: '🔧', key: 'u' },
            { id: 4, name: 'Abrir', icon: '📂', key: 'o' },
            { id: 5, name: 'Cerrar', icon: '📁', key: 'c' },
            { id: 6, name: 'Empujar', icon: '👉', key: 'e' },
            { id: 7, name: 'Tirar', icon: '👈', key: 'y' },
            { id: 8, name: 'Hablar', icon: '💬', key: 't' },
            { id: 9, name: 'Dar', icon: '🎁', key: 'g' }
          ],
          variables: gd.variables || {}
        },
        scenes: normalizeInteractiveElements(projectData.scenes || [])
      }

      // Set current scene
      if (project.value.scenes.length > 0) {
        const sceneToLoad = project.value.scenes.find(s => s.id === project.value.currentSceneId)
          || project.value.scenes[0]
        currentScene.value = sceneToLoad
      }

      // Cargar URLs de assets desde S3 (en background)
      setTimeout(() => loadAssetUrls(), 100)

      return true
    }
  } catch (e) {
    console.error('[Editor] Error cargando desde API:', e)
  }
  return false
}

// Initialize: Load project and history
onMounted(async () => {
  // Check if it's a UUID (project from backend)
  if (projectId.value && isUUID(projectId.value)) {
    console.log('[Editor] Detectado UUID, cargando desde API...')
    const loadedFromApi = await loadProjectFromApi(projectId.value)

    if (!loadedFromApi) {
      // Fallback to localStorage
      console.log('[Editor] Fallback a localStorage')
      const loaded = loadProjectFromStorage(projectId.value)
      if (!loaded) {
        console.log('[Editor] Project not found, using default')
      }
    }
  } else if (projectId.value && projectId.value !== 'new') {
    // Try to load from localStorage (legacy IDs)
    const loaded = loadProjectFromStorage(projectId.value)
    if (!loaded) {
      console.log('Project not found in localStorage, using default')
    }
  } else if (projectId.value === 'new') {
    createNewProject()
  }

  // Initialize history
  saveToHistory()
})

// Undo action
const undo = () => {
  if (!canUndo.value) return

  isUndoRedoAction.value = true
  historyIndex.value--
  currentScene.value = deepClone(historyStack.value[historyIndex.value])
  selectedElements.value = []

  setTimeout(() => { isUndoRedoAction.value = false }, 0)
}

// Redo action
const redo = () => {
  if (!canRedo.value) return

  isUndoRedoAction.value = true
  historyIndex.value++
  currentScene.value = deepClone(historyStack.value[historyIndex.value])
  selectedElements.value = []

  setTimeout(() => { isUndoRedoAction.value = false }, 0)
}

// Computed properties for undo/redo availability
const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)

// Watch for scene changes (debounced save to history + auto-save to DB)
let saveTimeout = null
let autoSaveTimeout = null
let isMounted = true
const AUTO_SAVE_DEBOUNCE = 3000 // 3 seconds

watch(currentScene, () => {
  if (isUndoRedoAction.value || !isMounted) return

  // Debounce history save (500ms)
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    if (isMounted) {
      saveToHistory()
    }
  }, 500)

  // Debounce auto-save to MongoDB (3 seconds)
  clearTimeout(autoSaveTimeout)
  autoSaveTimeout = setTimeout(async () => {
    if (isMounted && isUUID(project.value.id)) {
      console.log('[Editor] Auto-saving to MongoDB...')
      await autoSaveProject()
    }
  }, AUTO_SAVE_DEBOUNCE)
}, { deep: true })

// UI state
const leftPanelOpen = ref(true)
const rightPanelOpen = ref(true)
const selectedElements = ref([])
const zoom = ref(1.0) // Start at 100%
const showGrid = ref(true) // Grid visibility

// =====================
// PLAY MODE
// =====================
const playMode = ref(false)
const playModeState = ref({
  // Player state
  playerActorId: null,
  playerPlacementId: null,  // ID of the actor placement being controlled
  playerPosition: { x: 400, y: 600 },
  playerSize: { w: 64, h: 64 },  // Dimensions from actor placement
  playerDirection: 'south',
  playerState: 'idle',

  // Interaction
  selectedVerb: null,
  hoveredObject: null,
  selectedItem: null,         // Item selected for "Use X with Y"

  // Dialog
  currentDialog: null,
  dialogLineIndex: 0,
  dialogChoices: null,        // Current choice options

  // Movement
  isWalking: false,
  walkTarget: null,
  walkCallback: null,         // Function to call when walk completes

  // Messages
  messageText: '',
  messageTimeout: null,

  // Cutscene
  currentCutscene: null,
  cutsceneActionIndex: 0,
  cutsceneTimeout: null,
  isCutscenePlaying: false,

  // Transitions
  fadeOverlay: 0,             // 0 = transparent, 1 = fully black
  isFading: false,

  // Audio
  currentMusic: null,         // Currently playing music element
  musicAudio: null,           // HTML Audio element for music

  // Game state (copied from project for runtime modifications)
  inventory: [],              // Runtime copy of inventory
  variables: {}               // Runtime copy of game variables
})

// Enter play mode
const enterPlayMode = () => {
  // Check if there's at least one actor to play with
  const hasActorPlacement = currentScene.value.actorPlacements?.length > 0
  const hasGlobalActor = project.value.globalData.actors?.length > 0

  if (!hasActorPlacement && !hasGlobalActor) {
    alert('¡No hay ningún actor en la escena!\n\nPara jugar, primero debes:\n1. Crear un Actor en "Global Actors"\n2. Agregar un "Actor Placement" en la escena')
    return
  }

  // Find player actor (first actor placement, or first global actor)
  const firstPlacement = currentScene.value.actorPlacements[0]
  if (firstPlacement) {
    playModeState.value.playerActorId = firstPlacement.actorId
    playModeState.value.playerPlacementId = firstPlacement.id  // Track which placement is being controlled
    playModeState.value.playerPosition = { x: firstPlacement.x + firstPlacement.w / 2, y: firstPlacement.y + firstPlacement.h }
    playModeState.value.playerSize = { w: firstPlacement.w, h: firstPlacement.h }
    playModeState.value.playerDirection = firstPlacement.direction || 'south'
  } else if (project.value.globalData.actors.length > 0) {
    playModeState.value.playerActorId = project.value.globalData.actors[0].id
    playModeState.value.playerPlacementId = null
    playModeState.value.playerPosition = { x: currentScene.value.width / 2, y: currentScene.value.height / 2 }
    playModeState.value.playerSize = { w: 64, h: 64 }
  }

  // Reset player state
  playModeState.value.playerState = 'idle'
  playModeState.value.selectedVerb = project.value.globalData.verbs[0]?.id || null
  playModeState.value.hoveredObject = null
  playModeState.value.selectedItem = null
  playModeState.value.isWalking = false
  playModeState.value.walkCallback = null
  playModeState.value.messageText = ''

  // Reset dialog
  playModeState.value.currentDialog = null
  playModeState.value.dialogLineIndex = 0
  playModeState.value.dialogChoices = null

  // Reset cutscene
  playModeState.value.currentCutscene = null
  playModeState.value.cutsceneActionIndex = 0
  playModeState.value.isCutscenePlaying = false
  if (playModeState.value.cutsceneTimeout) {
    clearTimeout(playModeState.value.cutsceneTimeout)
  }

  // Reset transitions
  playModeState.value.fadeOverlay = 0
  playModeState.value.isFading = false

  // Initialize runtime game state (copy from project)
  playModeState.value.inventory = [...(project.value.globalData.inventory || [])]
  playModeState.value.variables = { ...(project.value.globalData.variables || {}) }

  // Stop any playing audio
  stopPlayModeAudio()

  playMode.value = true
  selectedElements.value = []

  // Check for scene-enter cutscenes
  checkSceneEnterTriggers()

  // Start scene music if configured
  playSceneMusic()
}

// Exit play mode
const exitPlayMode = () => {
  playMode.value = false
  playModeState.value.isWalking = false
  playModeState.value.currentDialog = null
  playModeState.value.isCutscenePlaying = false

  if (playModeState.value.messageTimeout) {
    clearTimeout(playModeState.value.messageTimeout)
  }
  if (playModeState.value.cutsceneTimeout) {
    clearTimeout(playModeState.value.cutsceneTimeout)
  }

  // Stop all audio
  stopPlayModeAudio()
}

// =====================
// AUDIO SYSTEM
// =====================

// Stop all play mode audio
const stopPlayModeAudio = () => {
  if (playModeState.value.musicAudio) {
    playModeState.value.musicAudio.pause()
    playModeState.value.musicAudio = null
  }
  playModeState.value.currentMusic = null
}

// Play scene music (if configured)
const playSceneMusic = () => {
  const musicEntry = currentScene.value.music?.[0]  // Play first music entry
  if (musicEntry?.audioAssetId) {
    playMusic(musicEntry)
  }
}

// Play a music track
const playMusic = (musicEntry) => {
  const audioAsset = getAudioAssetById(musicEntry.audioAssetId)
  if (!audioAsset) return

  // Stop current music
  if (playModeState.value.musicAudio) {
    playModeState.value.musicAudio.pause()
  }

  const audio = new Audio(audioAsset.data)
  audio.volume = (musicEntry.volume || 100) / 100
  audio.loop = musicEntry.loop !== false
  audio.play().catch(() => {})  // Ignore autoplay restrictions

  playModeState.value.musicAudio = audio
  playModeState.value.currentMusic = musicEntry
}

// Stop music
const stopMusic = (fadeOut = 0) => {
  if (!playModeState.value.musicAudio) return

  if (fadeOut > 0) {
    const audio = playModeState.value.musicAudio
    const startVolume = audio.volume
    const fadeStep = startVolume / (fadeOut / 50)
    const fadeInterval = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - fadeStep)
      if (audio.volume <= 0) {
        clearInterval(fadeInterval)
        audio.pause()
        playModeState.value.musicAudio = null
        playModeState.value.currentMusic = null
      }
    }, 50)
  } else {
    playModeState.value.musicAudio.pause()
    playModeState.value.musicAudio = null
    playModeState.value.currentMusic = null
  }
}

// Play a sound effect
const playSFX = (sfxIdOrEntry) => {
  let audioAssetId
  let volume = 100

  if (typeof sfxIdOrEntry === 'object') {
    audioAssetId = sfxIdOrEntry.audioAssetId
    volume = sfxIdOrEntry.volume || 100
  } else {
    const sfxEntry = currentScene.value.sfx?.find(s => s.id === sfxIdOrEntry)
    audioAssetId = sfxEntry?.audioAssetId
    volume = sfxEntry?.volume || 100
  }

  const audioAsset = getAudioAssetById(audioAssetId)
  if (!audioAsset) return

  const audio = new Audio(audioAsset.data)
  audio.volume = volume / 100
  audio.play().catch(() => {})
}

// =====================
// INVENTORY SYSTEM (Play Mode)
// =====================

// Add item to play mode inventory
const playAddToInventory = (itemId) => {
  if (!playModeState.value.inventory.includes(itemId)) {
    playModeState.value.inventory.push(itemId)
    const item = project.value.globalData.items.find(i => i.id === itemId)
    if (item) {
      showPlayMessage(`Picked up: ${item.name}`)
    }
  }
}

// Remove item from play mode inventory
const playRemoveFromInventory = (itemId) => {
  const index = playModeState.value.inventory.indexOf(itemId)
  if (index > -1) {
    playModeState.value.inventory.splice(index, 1)
  }
}

// Check if player has item
const hasItem = (itemId) => {
  return playModeState.value.inventory.includes(itemId)
}

// Get inventory items (full data)
const getInventoryItems = computed(() => {
  return playModeState.value.inventory
    .map(id => project.value.globalData.items.find(i => i.id === id))
    .filter(Boolean)
})

// Select inventory item for "Use X with Y"
const selectInventoryItem = (itemId) => {
  if (playModeState.value.selectedItem === itemId) {
    playModeState.value.selectedItem = null
  } else {
    playModeState.value.selectedItem = itemId
    const item = project.value.globalData.items.find(i => i.id === itemId)
    showPlayMessage(`Using ${item?.name}...`)
  }
}

// Use item with object
const useItemWith = (item, targetObj) => {
  // Check if item can be used with target
  const useWith = item.useWith || []
  const targetName = targetObj.element?.name || targetObj.type

  // Check for matching useWith entry
  for (const usage of useWith) {
    if (usage.target === targetName || usage.targetId === targetObj.element?.id) {
      // Execute the result
      executeItemUsage(item, usage)
      playModeState.value.selectedItem = null
      return true
    }
  }

  showPlayMessage(`I can't use ${item.name} with that.`)
  playModeState.value.selectedItem = null
  return false
}

// Execute item usage result
const executeItemUsage = (item, usage) => {
  if (usage.message) {
    showPlayMessage(usage.message)
  }
  if (usage.removeItem) {
    playRemoveFromInventory(item.id)
  }
  if (usage.addItem) {
    playAddToInventory(usage.addItem)
  }
  if (usage.setVariable) {
    playModeState.value.variables[usage.setVariable] = usage.variableValue ?? true
  }
  if (usage.triggerCutscene) {
    const cutscene = currentScene.value.cutscenes?.find(c => c.id === usage.triggerCutscene)
    if (cutscene) startCutscene(cutscene)
  }
  if (usage.solvePuzzle) {
    solvePuzzle(usage.solvePuzzle)
  }
}

// =====================
// PUZZLE SYSTEM
// =====================

// Check puzzle conditions
const checkPuzzleConditions = (puzzle) => {
  if (!puzzle.conditions) return true

  for (const condition of puzzle.conditions) {
    switch (condition.type) {
      case 'has-item':
        if (!hasItem(condition.itemId)) return false
        break
      case 'variable':
        if (playModeState.value.variables[condition.variable] !== condition.value) return false
        break
      case 'puzzle-solved':
        const otherPuzzle = currentScene.value.puzzles?.find(p => p.id === condition.puzzleId)
        if (!otherPuzzle?.solved) return false
        break
    }
  }
  return true
}

// Attempt to solve a puzzle
const attemptPuzzle = (puzzle) => {
  if (puzzle.solved) {
    showPlayMessage("Already solved.")
    return
  }

  if (!checkPuzzleConditions(puzzle)) {
    // Show hint if available
    const hint = puzzle.hints?.[0]
    showPlayMessage(hint || "Something is missing...")
    return
  }

  solvePuzzle(puzzle.id)
}

// Mark puzzle as solved and execute results
const solvePuzzle = (puzzleId) => {
  const puzzle = currentScene.value.puzzles?.find(p => p.id === puzzleId)
  if (!puzzle || puzzle.solved) return

  puzzle.solved = true
  showPlayMessage(puzzle.result?.message || "Puzzle solved!")

  // Execute puzzle results
  if (puzzle.result) {
    if (puzzle.result.addItem) {
      playAddToInventory(puzzle.result.addItem)
    }
    if (puzzle.result.removeItem) {
      playRemoveFromInventory(puzzle.result.removeItem)
    }
    if (puzzle.result.setVariable) {
      playModeState.value.variables[puzzle.result.setVariable] = puzzle.result.variableValue ?? true
    }
    if (puzzle.result.triggerCutscene) {
      const cutscene = currentScene.value.cutscenes?.find(c => c.id === puzzle.result.triggerCutscene)
      if (cutscene) startCutscene(cutscene)
    }
    if (puzzle.result.playSFX) {
      playSFX(puzzle.result.playSFX)
    }
  }
}

// =====================
// CUTSCENE SYSTEM
// =====================

// Check for scene-enter triggers
const checkSceneEnterTriggers = () => {
  const cutscene = currentScene.value.cutscenes?.find(c => c.trigger === 'scene-enter')
  if (cutscene && !cutscene.hasPlayed) {
    cutscene.hasPlayed = true
    startCutscene(cutscene)
  }
}

// Start a cutscene
const startCutscene = (cutscene) => {
  playModeState.value.currentCutscene = cutscene
  playModeState.value.cutsceneActionIndex = 0
  playModeState.value.isCutscenePlaying = true

  executeCutsceneAction()
}

// Execute current cutscene action
const executeCutsceneAction = () => {
  const cutscene = playModeState.value.currentCutscene
  if (!cutscene) return

  const actionIndex = playModeState.value.cutsceneActionIndex
  const action = cutscene.actions?.[actionIndex]

  if (!action) {
    // Cutscene finished
    endCutscene()
    return
  }

  // Execute action after delay
  playModeState.value.cutsceneTimeout = setTimeout(() => {
    performCutsceneAction(action)
  }, action.delay || 0)
}

// Perform a single cutscene action
const performCutsceneAction = (action) => {
  switch (action.type) {
    case 'dialog':
      showPlayMessage(action.params?.text || '')
      break

    case 'move-actor':
      if (action.params?.actorId === playModeState.value.playerActorId) {
        walkToPoint(action.params.x, action.params.y)
        playModeState.value.walkCallback = () => advanceCutscene()
        return  // Don't advance yet, wait for walk
      }
      break

    case 'actor-direction':
      if (action.params?.actorId === playModeState.value.playerActorId) {
        playModeState.value.playerDirection = action.params.direction
      }
      break

    case 'play-sfx':
      if (action.params?.sfxId) {
        const sfx = currentScene.value.sfx?.find(s => s.id === action.params.sfxId)
        if (sfx) playSFX(sfx)
      }
      break

    case 'play-music':
      if (action.params?.musicId) {
        const music = currentScene.value.music?.find(m => m.id === action.params.musicId)
        if (music) playMusic(music)
      }
      break

    case 'stop-music':
      stopMusic(action.params?.fadeOut || 0)
      break

    case 'wait':
      playModeState.value.cutsceneTimeout = setTimeout(() => {
        advanceCutscene()
      }, action.params?.duration || 1000)
      return  // Don't advance yet

    case 'fade-in':
      fadeIn(action.params?.duration || 1000)
      playModeState.value.cutsceneTimeout = setTimeout(() => {
        advanceCutscene()
      }, action.params?.duration || 1000)
      return

    case 'fade-out':
      fadeOut(action.params?.duration || 1000)
      playModeState.value.cutsceneTimeout = setTimeout(() => {
        advanceCutscene()
      }, action.params?.duration || 1000)
      return

    case 'change-scene':
      if (action.params?.sceneId) {
        changeSceneWithTransition(action.params.sceneId)
        return  // Scene change handles continuation
      }
      break

    case 'set-variable':
      if (action.params?.variable) {
        playModeState.value.variables[action.params.variable] = action.params.value ?? true
      }
      break

    case 'add-item':
      if (action.params?.itemId) {
        playAddToInventory(action.params.itemId)
      }
      break

    case 'remove-item':
      if (action.params?.itemId) {
        playRemoveFromInventory(action.params.itemId)
      }
      break
  }

  // Advance after action duration
  const duration = action.duration || 100
  playModeState.value.cutsceneTimeout = setTimeout(() => {
    advanceCutscene()
  }, duration)
}

// Advance to next cutscene action
const advanceCutscene = () => {
  playModeState.value.cutsceneActionIndex++
  executeCutsceneAction()
}

// End cutscene
const endCutscene = () => {
  playModeState.value.currentCutscene = null
  playModeState.value.cutsceneActionIndex = 0
  playModeState.value.isCutscenePlaying = false
  playModeState.value.playerState = 'idle'
}

// Skip cutscene (if skippable)
const skipCutscene = () => {
  if (playModeState.value.currentCutscene?.skippable) {
    if (playModeState.value.cutsceneTimeout) {
      clearTimeout(playModeState.value.cutsceneTimeout)
    }
    endCutscene()
  }
}

// =====================
// TRANSITIONS
// =====================

// Fade out (to black)
const fadeOut = (duration = 1000) => {
  playModeState.value.isFading = true
  const steps = 20
  const stepDuration = duration / steps
  let step = 0

  const interval = setInterval(() => {
    step++
    playModeState.value.fadeOverlay = step / steps
    if (step >= steps) {
      clearInterval(interval)
      playModeState.value.isFading = false
    }
  }, stepDuration)
}

// Fade in (from black)
const fadeIn = (duration = 1000) => {
  playModeState.value.isFading = true
  playModeState.value.fadeOverlay = 1
  const steps = 20
  const stepDuration = duration / steps
  let step = 0

  const interval = setInterval(() => {
    step++
    playModeState.value.fadeOverlay = 1 - (step / steps)
    if (step >= steps) {
      clearInterval(interval)
      playModeState.value.fadeOverlay = 0
      playModeState.value.isFading = false
    }
  }, stepDuration)
}

// Change scene with fade transition
const changeSceneWithTransition = (sceneId) => {
  fadeOut(500)
  setTimeout(() => {
    switchScene(sceneId)
    // Reinitialize player position for new scene
    const firstPlacement = currentScene.value.actorPlacements[0]
    if (firstPlacement) {
      playModeState.value.playerPosition = {
        x: firstPlacement.x + firstPlacement.w / 2,
        y: firstPlacement.y + firstPlacement.h
      }
      playModeState.value.playerDirection = firstPlacement.direction || 'south'
    }
    playModeState.value.playerState = 'idle'
    playModeState.value.isWalking = false

    // Play new scene music
    playSceneMusic()

    // Check for scene-enter triggers
    checkSceneEnterTriggers()

    fadeIn(500)

    // Continue cutscene if active
    if (playModeState.value.isCutscenePlaying) {
      setTimeout(() => advanceCutscene(), 600)
    }
  }, 500)
}

// =====================
// VARIABLES
// =====================

// Set game variable
const setVariable = (name, value) => {
  playModeState.value.variables[name] = value
}

// Get game variable
const getVariable = (name) => {
  return playModeState.value.variables[name]
}

// Check variable condition
const checkVariable = (name, expectedValue) => {
  return playModeState.value.variables[name] === expectedValue
}

// Get player actor data
const getPlayerActor = computed(() => {
  if (!playModeState.value.playerActorId) return null
  return project.value.globalData.actors.find(a => a.id === playModeState.value.playerActorId)
})

// Get player actor placement in current scene
const getPlayerPlacement = computed(() => {
  if (!playModeState.value.playerActorId) return null
  return currentScene.value.actorPlacements.find(p => p.actorId === playModeState.value.playerActorId)
})

// Check if a point is inside any walkbox
const isPointInWalkbox = (x, y) => {
  for (const wb of currentScene.value.walkboxes) {
    if (isPointInPolygon(x, y, wb.points)) {
      return true
    }
  }
  return false
}

// Point in polygon check (ray casting algorithm)
const isPointInPolygon = (x, y, points) => {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y
    const xj = points[j].x, yj = points[j].y
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

// Find closest walkable point to target
const findClosestWalkablePoint = (targetX, targetY) => {
  if (isPointInWalkbox(targetX, targetY)) {
    return { x: targetX, y: targetY }
  }

  // Find closest point on any walkbox edge
  let closestPoint = null
  let closestDist = Infinity

  for (const wb of currentScene.value.walkboxes) {
    for (let i = 0; i < wb.points.length; i++) {
      const p1 = wb.points[i]
      const p2 = wb.points[(i + 1) % wb.points.length]

      const closest = closestPointOnSegment(targetX, targetY, p1.x, p1.y, p2.x, p2.y)
      const dist = Math.hypot(closest.x - targetX, closest.y - targetY)

      if (dist < closestDist) {
        closestDist = dist
        closestPoint = closest
      }
    }
  }

  return closestPoint || { x: targetX, y: targetY }
}

// Find closest point on line segment
const closestPointOnSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy

  if (len2 === 0) return { x: x1, y: y1 }

  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))

  return { x: x1 + t * dx, y: y1 + t * dy }
}

// Handle click in play mode
const onPlayModeClick = (event) => {
  if (!playMode.value) return

  const coords = getSceneCoords(event)

  // If dialog is active, advance it
  if (playModeState.value.currentDialog) {
    advanceDialog()
    return
  }

  // Check if clicking on an interactive object
  const clickedObject = findObjectAtPoint(coords.x, coords.y)

  if (clickedObject) {
    handleObjectInteraction(clickedObject)
  } else {
    // Walk to clicked point
    walkToPoint(coords.x, coords.y)
  }
}

// Find object at point (hotspot, image, exit, actor)
const findObjectAtPoint = (x, y) => {
  // Check exits
  for (const exit of currentScene.value.exits) {
    if (x >= exit.x && x <= exit.x + exit.w && y >= exit.y && y <= exit.y + exit.h) {
      return { type: 'exit', element: exit }
    }
  }

  // Check hotspots
  for (const hotspot of currentScene.value.hotspots) {
    if (x >= hotspot.x && x <= hotspot.x + hotspot.w && y >= hotspot.y && y <= hotspot.y + hotspot.h) {
      return { type: 'hotspot', element: hotspot }
    }
  }

  // Check interactive images
  for (const img of currentScene.value.images) {
    if (img.interactive && x >= img.x && x <= img.x + img.w && y >= img.y && y <= img.y + img.h) {
      return { type: 'image', element: img }
    }
  }

  // Check actor placements (not the player)
  for (const placement of currentScene.value.actorPlacements) {
    if (placement.actorId !== playModeState.value.playerActorId) {
      if (x >= placement.x && x <= placement.x + placement.w && y >= placement.y && y <= placement.y + placement.h) {
        return { type: 'actor', element: placement }
      }
    }
  }

  return null
}

// Handle interaction with an object
const handleObjectInteraction = (obj) => {
  // If using an item, handle "Use X with Y"
  if (playModeState.value.selectedItem) {
    const item = project.value.globalData.items.find(i => i.id === playModeState.value.selectedItem)
    if (item) {
      useItemWith(item, obj)
      return
    }
  }

  const verb = project.value.globalData.verbs.find(v => v.id === playModeState.value.selectedVerb)
  const verbName = verb?.name?.toLowerCase() || 'look at'
  const verbId = verb?.id || 1

  // =====================
  // CHECK CUSTOM INTERACTIONS FIRST
  // =====================
  if ((obj.type === 'hotspot' || obj.type === 'image') && obj.element.interactions?.length > 0) {
    // Find interaction for this verb
    const interaction = obj.element.interactions.find(i => i.verbId === verbId)

    if (interaction) {
      // Check condition if exists
      if (interaction.hasCondition && interaction.condition) {
        const varValue = playModeState.value.variables[interaction.condition.varName]
        const condValue = interaction.condition.value
        let conditionMet = false

        switch (interaction.condition.operator) {
          case '==': conditionMet = varValue == condValue; break
          case '!=': conditionMet = varValue != condValue; break
          case '>': conditionMet = Number(varValue) > Number(condValue); break
          case '<': conditionMet = Number(varValue) < Number(condValue); break
          case '>=': conditionMet = Number(varValue) >= Number(condValue); break
          case '<=': conditionMet = Number(varValue) <= Number(condValue); break
        }

        if (!conditionMet) {
          // Condition not met, use default behavior or show nothing
          showPlayMessage("Nothing happens.")
          return
        }
      }

      // Execute the interaction action
      executeInteractionAction(interaction, obj)
      return
    }
  }

  // Check for description (default "look at" response)
  // Support both English and Spanish verb names
  const isLookVerb = verbName === 'look at' || verbName === 'look' || verbName === 'examine' ||
                     verbName === 'mirar' || verbName === 'examinar' || verbName === 'ver' ||
                     verbId === 1 // First verb is usually "look"
  if (isLookVerb &&
      (obj.type === 'hotspot' || obj.type === 'image') &&
      obj.element.description) {
    showPlayMessage(obj.element.description)
    return
  }

  // Check for puzzle interaction
  if (obj.type === 'hotspot' || obj.type === 'image') {
    const puzzle = currentScene.value.puzzles?.find(p =>
      p.triggerObject === obj.element.id ||
      p.triggerObject === obj.element.name
    )
    if (puzzle && (verbName === 'use' || verbName === 'open' || verbName === 'push' || verbName === 'pull')) {
      attemptPuzzle(puzzle)
      return
    }
  }

  // Check for cutscene trigger
  if (obj.type === 'hotspot' || obj.type === 'image' || obj.type === 'actor') {
    const cutscene = currentScene.value.cutscenes?.find(c =>
      c.trigger === 'object-interact' &&
      c.triggerTarget === obj.element.id
    )
    if (cutscene && !cutscene.hasPlayed) {
      cutscene.hasPlayed = true
      startCutscene(cutscene)
      return
    }
  }

  // Helper functions to detect verb types (supports English and Spanish)
  const isLookVerbType = ['look at', 'look', 'examine', 'mirar', 'examinar', 'ver'].includes(verbName)
  const isWalkVerbType = ['walk to', 'walk', 'go', 'ir', 'caminar', 'ir a'].includes(verbName)
  const isPickupVerbType = ['pick up', 'take', 'get', 'recoger', 'tomar', 'coger', 'agarrar'].includes(verbName)
  const isTalkVerbType = ['talk to', 'talk', 'speak', 'hablar', 'hablar con', 'conversar'].includes(verbName)
  const isUseVerbType = ['use', 'usar', 'utilizar'].includes(verbName)
  const isOpenVerbType = ['open', 'abrir'].includes(verbName)
  const isCloseVerbType = ['close', 'cerrar'].includes(verbName)
  const isPushPullVerbType = ['push', 'pull', 'empujar', 'tirar', 'jalar'].includes(verbName)
  const isGiveVerbType = ['give', 'dar', 'entregar'].includes(verbName)

  // Default interactions based on verb type
  if (isLookVerbType) {
    // Check for examine dialog on item
    if (obj.element.examineDialog) {
      showPlayMessage(obj.element.examineDialog)
    } else if (obj.element.description) {
      showPlayMessage(obj.element.description)
    } else {
      showPlayMessage(`Es ${obj.element.name || obj.type}.`)
    }
  } else if (isWalkVerbType) {
    if (obj.type === 'exit') {
      if (obj.element.targetScene) {
        changeSceneWithTransition(obj.element.targetScene)
      } else {
        showPlayMessage("Esta salida no lleva a ningún lado.")
      }
    } else {
      walkToPoint(obj.element.x + (obj.element.w || 0) / 2, obj.element.y + (obj.element.h || 0))
    }
  } else if (isPickupVerbType) {
    if (obj.type === 'image' && obj.element.pickable) {
      // Find corresponding item
      const item = project.value.globalData.items.find(i =>
        i.name === obj.element.name || i.linkedImageId === obj.element.id
      )
      if (item) {
        playAddToInventory(item.id)
        // Hide the image (picked up)
        obj.element.visible = false
        if (item.pickupDialog) {
          showPlayMessage(item.pickupDialog)
        }
      } else {
        playAddToInventory(obj.element.id)  // Use element id as item
        showPlayMessage(`Recogido: ${obj.element.name}`)
      }
    } else {
      showPlayMessage("No puedo recoger eso.")
    }
  } else if (isTalkVerbType) {
    if (obj.type === 'actor') {
      const dialog = currentScene.value.dialogs.find(d => d.actor === obj.element.actorId)
      if (dialog) {
        startDialog(dialog)
      } else {
        showPlayMessage("No parece querer hablar.")
      }
    } else {
      showPlayMessage("No puedo hablar con eso.")
    }
  } else if (isUseVerbType) {
    // Try to use the object directly
    if (obj.type === 'exit') {
      if (obj.element.targetScene) {
        changeSceneWithTransition(obj.element.targetScene)
      } else {
        showPlayMessage("Esta salida no lleva a ningún lado.")
      }
    } else {
      showPlayMessage("Necesito usar algo con eso.")
    }
  } else if (isOpenVerbType) {
    showPlayMessage("No puedo abrir eso.")
  } else if (isCloseVerbType) {
    showPlayMessage("No puedo cerrar eso.")
  } else if (isPushPullVerbType) {
    showPlayMessage("No se mueve.")
  } else if (isGiveVerbType) {
    showPlayMessage("No puedo dar eso.")
  } else {
    // Default fallback
    showPlayMessage(`No puedo hacer eso.`)
  }
}

// Walk player to a point
const walkToPoint = (targetX, targetY) => {
  const walkableTarget = findClosestWalkablePoint(targetX, targetY)

  playModeState.value.walkTarget = walkableTarget
  playModeState.value.isWalking = true

  // Determine direction
  const dx = walkableTarget.x - playModeState.value.playerPosition.x
  const dy = walkableTarget.y - playModeState.value.playerPosition.y

  if (Math.abs(dx) > Math.abs(dy)) {
    playModeState.value.playerDirection = dx > 0 ? 'east' : 'west'
  } else {
    playModeState.value.playerDirection = dy > 0 ? 'south' : 'north'
  }

  playModeState.value.playerState = `walk-${playModeState.value.playerDirection}`
}

// Update walk animation (called from animation loop)
const updateWalk = () => {
  if (!playModeState.value.isWalking || !playModeState.value.walkTarget) return

  const speed = 4  // pixels per frame
  const target = playModeState.value.walkTarget
  const pos = playModeState.value.playerPosition

  const dx = target.x - pos.x
  const dy = target.y - pos.y
  const dist = Math.hypot(dx, dy)

  if (dist < speed) {
    // Arrived
    playModeState.value.playerPosition = { ...target }
    playModeState.value.isWalking = false
    playModeState.value.playerState = 'idle'
    playModeState.value.walkTarget = null

    // Call walk callback if set (for cutscenes)
    if (playModeState.value.walkCallback) {
      const callback = playModeState.value.walkCallback
      playModeState.value.walkCallback = null
      callback()
    }
  } else {
    // Move towards target
    const moveX = (dx / dist) * speed
    const moveY = (dy / dist) * speed
    playModeState.value.playerPosition.x += moveX
    playModeState.value.playerPosition.y += moveY

    // Update direction
    if (Math.abs(dx) > Math.abs(dy)) {
      playModeState.value.playerDirection = dx > 0 ? 'east' : 'west'
    } else {
      playModeState.value.playerDirection = dy > 0 ? 'south' : 'north'
    }
    playModeState.value.playerState = `walk-${playModeState.value.playerDirection}`
  }
}

// Show a message in play mode
const showPlayMessage = (text) => {
  playModeState.value.messageText = text
  if (playModeState.value.messageTimeout) {
    clearTimeout(playModeState.value.messageTimeout)
  }
  playModeState.value.messageTimeout = setTimeout(() => {
    playModeState.value.messageText = ''
  }, 3000)
}

// Execute an interaction action
const executeInteractionAction = (interaction, obj) => {
  const params = interaction.params || {}

  switch (interaction.action) {
    case 'dialog':
      // Show dialog text
      if (params.text) {
        if (params.actorId) {
          const actor = project.value.globalData.actors.find(a => a.id === params.actorId)
          showPlayMessage(`${actor?.name || 'Someone'}: "${params.text}"`)
        } else {
          showPlayMessage(params.text)
        }
      }
      break

    case 'dialogRef':
      // Play a dialog from the scene's dialog list
      if (params.dialogId) {
        const dialog = currentScene.value.dialogs.find(d => d.id === params.dialogId)
        if (dialog) {
          startDialog(dialog)
        }
      }
      break

    case 'cutscene':
      // Play a cutscene
      if (params.cutsceneId) {
        const cutscene = currentScene.value.cutscenes.find(c => c.id === params.cutsceneId)
        if (cutscene) {
          startCutscene(cutscene)
        }
      }
      break

    case 'pickup':
      // Pick up an item
      if (params.itemId) {
        playAddToInventory(params.itemId)
        const item = project.value.globalData.items.find(i => i.id === params.itemId)
        showPlayMessage(`Picked up: ${item?.name || 'item'}`)

        // Optionally hide the element
        if (params.removeFromScene && obj.element) {
          obj.element.visible = false
        }
      }
      break

    case 'use_item':
      // Check if player has required item
      if (params.requiredItemId) {
        const hasItem = playModeState.value.inventory.includes(params.requiredItemId)
        if (hasItem) {
          showPlayMessage(params.successText || "It worked!")
        } else {
          showPlayMessage(params.failText || "I need something to use with this.")
        }
      }
      break

    case 'change_scene':
      // Change to another scene
      if (params.sceneId) {
        changeSceneWithTransition(params.sceneId)
      }
      break

    case 'set_variable':
      // Set a game variable
      if (params.varName) {
        if (!playModeState.value.variables) {
          playModeState.value.variables = {}
        }
        playModeState.value.variables[params.varName] = params.varValue
        console.log(`[PlayMode] Variable set: ${params.varName} = ${params.varValue}`)
      }
      break

    case 'custom':
      // Custom script (basic eval - be careful!)
      if (params.script) {
        try {
          // Create a safe context with game functions
          const context = {
            showMessage: showPlayMessage,
            setVariable: (name, value) => {
              if (!playModeState.value.variables) playModeState.value.variables = {}
              playModeState.value.variables[name] = value
            },
            getVariable: (name) => playModeState.value.variables?.[name],
            addItem: playAddToInventory,
            hasItem: (id) => playModeState.value.inventory.includes(id),
            changeScene: changeSceneWithTransition
          }
          // Execute script with context
          const fn = new Function(...Object.keys(context), params.script)
          fn(...Object.values(context))
        } catch (e) {
          console.error('[PlayMode] Custom script error:', e)
        }
      }
      break

    default:
      showPlayMessage("Nothing happens.")
  }
}

// Start a dialog
const startDialog = (dialog) => {
  playModeState.value.currentDialog = dialog
  playModeState.value.dialogLineIndex = 0
  playModeState.value.playerState = 'talk'
}

// Advance to next dialog line or close
const advanceDialog = () => {
  if (!playModeState.value.currentDialog) return

  const dialog = playModeState.value.currentDialog
  playModeState.value.dialogLineIndex++

  if (playModeState.value.dialogLineIndex >= (dialog.lines?.length || 0)) {
    // Dialog finished
    playModeState.value.currentDialog = null
    playModeState.value.dialogLineIndex = 0
    playModeState.value.playerState = 'idle'
  }
}

// Get current dialog line
const getCurrentDialogLine = computed(() => {
  if (!playModeState.value.currentDialog) return null
  return playModeState.value.currentDialog.lines?.[playModeState.value.dialogLineIndex]
})

// Select verb
const selectVerb = (verbId) => {
  playModeState.value.selectedVerb = verbId
}

// Get current animation for player based on state
const getPlayerCurrentAnimation = () => {
  const playerActor = getPlayerActor.value
  if (!playerActor || !playerActor.animations) return null

  const state = playModeState.value.playerState || 'idle'
  const assignment = playerActor.animations[state]

  // Only return animation if it exists for the current state
  if (!assignment) return null

  // Handle both old format (just ID) and new format ({ id, mirror })
  const animId = getAnimationIdFromAssignment(assignment)
  if (!animId) return null

  const mirror = isAnimationMirrored(assignment)

  // Search in global animations first, then scene animations for backward compatibility
  const anim = globalAnimations.value.find(a => a.id === animId) ||
               currentScene.value.animations?.find(a => a.id === animId)

  if (!anim) return null

  // Return animation with mirror info attached
  return { ...anim, _mirror: mirror }
}

// Get style for player animation frame
const getPlayerAnimationStyle = () => {
  const anim = getPlayerCurrentAnimation()
  if (!anim || !anim.frames || anim.frames.length === 0) return {}

  const spritesheetUrl = getAnimationSpritesheetUrl(anim)
  if (!spritesheetUrl) return {}

  // Use actor preview frames for animation timing
  const playerActor = getPlayerActor.value
  const frameIndex = actorPreviewFrames.value[playerActor?.id] || 0
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

  // Apply mirror transform if needed
  if (anim._mirror) {
    style.transform = 'scaleX(-1)'
  }

  return style
}

// Walk animation loop
let walkAnimationFrame = null
const startWalkLoop = () => {
  const loop = () => {
    if (playMode.value) {
      updateWalk()
      walkAnimationFrame = requestAnimationFrame(loop)
    }
  }
  walkAnimationFrame = requestAnimationFrame(loop)
}

const stopWalkLoop = () => {
  if (walkAnimationFrame) {
    cancelAnimationFrame(walkAnimationFrame)
    walkAnimationFrame = null
  }
}

// Watch play mode to start/stop walk loop
watch(playMode, (isPlaying) => {
  if (isPlaying) {
    startWalkLoop()
  } else {
    stopWalkLoop()
  }
})

// Actor preview frames (for canvas animation)
const actorPreviewFrames = ref({}) // { actorId: frameIndex }

// Light types
const lightTypes = [
  { id: 'point', name: 'Point Light', icon: '💡' },
  { id: 'spot', name: 'Spotlight', icon: '🔦' },
  { id: 'directional', name: 'Directional', icon: '☀️' },
  { id: 'area', name: 'Area Light', icon: '⬜' }
]

// Particle presets
const particlePresets = {
  fire: {
    name: 'Fire',
    icon: '🔥',
    emitRate: 30,
    lifetime: { min: 0.5, max: 1.5 },
    speed: { min: 50, max: 150 },
    direction: { min: -30, max: 30 },
    gravity: -50,
    size: { start: 20, end: 5 },
    color: { start: '#ff6600', end: '#ff000033' },
    shape: 'circle'
  },
  smoke: {
    name: 'Smoke',
    icon: '💨',
    emitRate: 15,
    lifetime: { min: 2, max: 4 },
    speed: { min: 20, max: 50 },
    direction: { min: -20, max: 20 },
    gravity: -30,
    size: { start: 10, end: 40 },
    color: { start: '#666666aa', end: '#99999900' },
    shape: 'circle'
  },
  rain: {
    name: 'Rain',
    icon: '🌧️',
    emitRate: 100,
    lifetime: { min: 0.5, max: 1 },
    speed: { min: 400, max: 600 },
    direction: { min: 170, max: 180 },
    gravity: 200,
    size: { start: 2, end: 2 },
    color: { start: '#88bbffaa', end: '#88bbff88' },
    shape: 'line'
  },
  snow: {
    name: 'Snow',
    icon: '❄️',
    emitRate: 40,
    lifetime: { min: 3, max: 6 },
    speed: { min: 20, max: 60 },
    direction: { min: 160, max: 200 },
    gravity: 20,
    size: { start: 4, end: 4 },
    color: { start: '#ffffffcc', end: '#ffffff66' },
    shape: 'circle'
  },
  dust: {
    name: 'Dust',
    icon: '✨',
    emitRate: 10,
    lifetime: { min: 2, max: 5 },
    speed: { min: 5, max: 20 },
    direction: { min: 0, max: 360 },
    gravity: 5,
    size: { start: 3, end: 1 },
    color: { start: '#d4a57466', end: '#d4a57400' },
    shape: 'circle'
  },
  magic: {
    name: 'Magic',
    icon: '✨',
    emitRate: 25,
    lifetime: { min: 1, max: 2 },
    speed: { min: 30, max: 80 },
    direction: { min: 0, max: 360 },
    gravity: -10,
    size: { start: 8, end: 2 },
    color: { start: '#ff88ffff', end: '#8888ff00' },
    shape: 'star'
  },
  bubbles: {
    name: 'Bubbles',
    icon: '🫧',
    emitRate: 8,
    lifetime: { min: 2, max: 4 },
    speed: { min: 30, max: 60 },
    direction: { min: -30, max: 30 },
    gravity: -40,
    size: { start: 6, end: 12 },
    color: { start: '#aaddff66', end: '#aaddff00' },
    shape: 'circle'
  },
  sparks: {
    name: 'Sparks',
    icon: '⚡',
    emitRate: 50,
    lifetime: { min: 0.2, max: 0.5 },
    speed: { min: 100, max: 300 },
    direction: { min: 0, max: 360 },
    gravity: 150,
    size: { start: 3, end: 1 },
    color: { start: '#ffff00ff', end: '#ff880000' },
    shape: 'circle'
  }
}

// Particle system state for preview
const activeParticles = ref({}) // { emitterId: [{ x, y, vx, vy, life, maxLife, size, color }] }
let particleAnimationFrame = null
let lastParticleTime = 0

// Get particle style for rendering
const getParticleStyle = (particle, emitter) => {
  const progress = 1 - (particle.life / particle.maxLife)
  const currentSize = particle.size.start + (particle.size.end - particle.size.start) * progress

  // Interpolate color
  const startColor = parseColor(particle.color.start)
  const endColor = parseColor(particle.color.end)
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * progress)
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * progress)
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * progress)
  const a = startColor.a + (endColor.a - startColor.a) * progress

  return {
    position: 'absolute',
    left: particle.x * zoom.value + 'px',
    top: particle.y * zoom.value + 'px',
    width: currentSize * zoom.value + 'px',
    height: emitter.shape === 'line' ? (currentSize * 4) * zoom.value + 'px' : currentSize * zoom.value + 'px',
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
    borderRadius: emitter.shape === 'circle' ? '50%' : emitter.shape === 'star' ? '0' : '0',
    transform: emitter.shape === 'star' ? 'rotate(45deg)' : 'none',
    pointerEvents: 'none'
  }
}

// Parse hex color to RGBA
const parseColor = (hex) => {
  const result = { r: 255, g: 255, b: 255, a: 1 }
  if (!hex) return result

  // Remove # if present
  hex = hex.replace('#', '')

  if (hex.length === 6) {
    result.r = parseInt(hex.slice(0, 2), 16)
    result.g = parseInt(hex.slice(2, 4), 16)
    result.b = parseInt(hex.slice(4, 6), 16)
    result.a = 1
  } else if (hex.length === 8) {
    result.r = parseInt(hex.slice(0, 2), 16)
    result.g = parseInt(hex.slice(2, 4), 16)
    result.b = parseInt(hex.slice(4, 6), 16)
    result.a = parseInt(hex.slice(6, 8), 16) / 255
  }

  return result
}

// Get light preview style (glow around light icon)
const getLightPreviewStyle = (light) => {
  const size = light.type === 'point' || light.type === 'spot' ? light.radius * 2 : 200
  return {
    width: size * zoom.value + 'px',
    height: size * zoom.value + 'px',
    background: `radial-gradient(circle, ${light.color}66 0%, transparent 70%)`,
    transform: 'translate(-50%, -50%)',
    left: '50%',
    top: '50%',
    position: 'absolute',
    pointerEvents: 'none',
    opacity: light.intensity
  }
}

// Get lighting gradient for the overlay
const getLightingGradient = () => {
  if (!currentScene.value.lighting) return 'transparent'

  const ambient = currentScene.value.lighting.ambient
  const lights = currentScene.value.lighting.lights.filter(l => l.enabled)

  if (lights.length === 0) {
    // Just ambient darkness
    return ambient.color
  }

  // Create a CSS gradient with light sources
  // Note: This is a simplified 2D representation
  const gradients = lights.map(light => {
    const x = (light.x / currentScene.value.width) * 100
    const y = (light.y / currentScene.value.height) * 100
    const radius = light.type === 'directional' ? 100 : (light.radius / Math.max(currentScene.value.width, currentScene.value.height)) * 100

    return `radial-gradient(circle at ${x}% ${y}%, transparent 0%, transparent ${radius * 0.5}%, ${ambient.color}88 ${radius}%)`
  })

  return gradients.join(', ')
}

// Particle emitter resize
const startResizeParticle = (event, emitter, direction) => {
  event.preventDefault()
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = emitter.width
  const startHeight = emitter.height
  const startEmitterX = emitter.x
  const startEmitterY = emitter.y

  const onMouseMove = (e) => {
    const dx = (e.clientX - startX) / zoom.value
    const dy = (e.clientY - startY) / zoom.value

    let newWidth = startWidth
    let newHeight = startHeight
    let newX = startEmitterX
    let newY = startEmitterY

    if (direction.includes('e')) newWidth = Math.max(10, startWidth + dx * 2)
    if (direction.includes('w')) newWidth = Math.max(10, startWidth - dx * 2)
    if (direction.includes('s')) newHeight = Math.max(10, startHeight + dy * 2)
    if (direction.includes('n')) newHeight = Math.max(10, startHeight - dy * 2)

    emitter.width = newWidth
    emitter.height = newHeight
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// Update particle system
const updateParticles = (deltaTime) => {
  if (!currentScene.value.particles) return

  currentScene.value.particles.forEach(emitter => {
    if (!emitter.enabled) {
      activeParticles.value[emitter.id] = []
      return
    }

    // Initialize particle array if needed
    if (!activeParticles.value[emitter.id]) {
      activeParticles.value[emitter.id] = []
    }

    const particles = activeParticles.value[emitter.id]

    // Emit new particles
    const emitCount = emitter.emitRate * deltaTime
    for (let i = 0; i < emitCount; i++) {
      if (Math.random() < emitCount - Math.floor(emitCount) || i < Math.floor(emitCount)) {
        // Random position within emission area
        const px = emitter.x + (Math.random() - 0.5) * emitter.width
        const py = emitter.y + (Math.random() - 0.5) * emitter.height

        // Random direction and speed
        const dir = (emitter.direction.min + Math.random() * (emitter.direction.max - emitter.direction.min)) * Math.PI / 180
        const speed = emitter.speed.min + Math.random() * (emitter.speed.max - emitter.speed.min)
        const vx = Math.sin(dir) * speed
        const vy = -Math.cos(dir) * speed

        // Random lifetime
        const lifetime = emitter.lifetime.min + Math.random() * (emitter.lifetime.max - emitter.lifetime.min)

        particles.push({
          x: px,
          y: py,
          vx,
          vy,
          life: lifetime,
          maxLife: lifetime,
          size: { start: emitter.size.start, end: emitter.size.end },
          color: { start: emitter.color.start, end: emitter.color.end }
        })
      }
    }

    // Update existing particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]

      // Apply velocity
      p.x += p.vx * deltaTime
      p.y += p.vy * deltaTime

      // Apply gravity
      p.vy += emitter.gravity * deltaTime

      // Decrease lifetime
      p.life -= deltaTime

      // Remove dead particles
      if (p.life <= 0) {
        particles.splice(i, 1)
      }
    }

    // Limit max particles
    if (particles.length > 500) {
      particles.splice(0, particles.length - 500)
    }
  })
}

// Particle animation loop
const startParticleLoop = () => {
  lastParticleTime = performance.now()

  const loop = (currentTime) => {
    const deltaTime = (currentTime - lastParticleTime) / 1000
    lastParticleTime = currentTime

    updateParticles(deltaTime)
    updateParallaxInLoop(currentTime)

    particleAnimationFrame = requestAnimationFrame(loop)
  }

  particleAnimationFrame = requestAnimationFrame(loop)
}

const stopParticleLoop = () => {
  if (particleAnimationFrame) {
    cancelAnimationFrame(particleAnimationFrame)
    particleAnimationFrame = null
  }
}

// Section collapsed state (all start collapsed)
const collapsedSections = ref({
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
})

// Element visibility state (all start visible)
const visibleTypes = ref({
  images: true,
  walkboxes: true,
  exits: true,
  actors: true,
  hotspots: true,
  zplanes: true,
  animations: true,
  lights: true,
  particles: true
})

// Toggle section collapsed state
const toggleSection = (type) => {
  collapsedSections.value[type] = !collapsedSections.value[type]
}

// Toggle element type visibility
const toggleVisibility = (type) => {
  visibleTypes.value[type] = !visibleTypes.value[type]
}

// Select all elements of a type
const selectAllOfType = (type, arrayName) => {
  const elements = currentScene.value[arrayName]
  if (!elements || elements.length === 0) return

  // Check if all are already selected
  const allSelected = elements.every(el =>
    selectedElements.value.some(s => s.type === type && s.element.id === el.id)
  )

  if (allSelected) {
    // Deselect all of this type
    selectedElements.value = selectedElements.value.filter(s => s.type !== type)
  } else {
    // Select all of this type (add to existing selection)
    const newSelections = elements
      .filter(el => !selectedElements.value.some(s => s.type === type && s.element.id === el.id))
      .map(el => ({ type, element: el }))
    selectedElements.value = [...selectedElements.value, ...newSelections]
  }
}

// Check if all elements of a type are selected
const isAllSelectedOfType = (type, arrayName) => {
  const elements = currentScene.value[arrayName]
  if (!elements || elements.length === 0) return false
  return elements.every(el =>
    selectedElements.value.some(s => s.type === type && s.element.id === el.id)
  )
}

// Check if some (but not all) elements of a type are selected
const isSomeSelectedOfType = (type, arrayName) => {
  const elements = currentScene.value[arrayName]
  if (!elements || elements.length === 0) return false
  const selectedCount = elements.filter(el =>
    selectedElements.value.some(s => s.type === type && s.element.id === el.id)
  ).length
  return selectedCount > 0 && selectedCount < elements.length
}

// Element counts
const elementCounts = computed(() => ({
  images: currentScene.value.images.length,
  walkboxes: currentScene.value.walkboxes.length,
  exits: currentScene.value.exits.length,
  actorPlacements: currentScene.value.actorPlacements.length,
  hotspots: currentScene.value.hotspots.length,
  zplanes: currentScene.value.zplanes.length,
  dialogs: currentScene.value.dialogs.length,
  puzzles: currentScene.value.puzzles.length,
  verbs: project.value.globalData.verbs.length,
  sfx: currentScene.value.sfx.length,
  music: currentScene.value.music.length,
  cutscenes: currentScene.value.cutscenes.length,
  animations: project.value.globalData?.animations?.length || 0,
  lights: currentScene.value.lighting?.lights?.length || 0,
  particles: currentScene.value.particles?.length || 0,
  assets: project.value.globalData.assets.length,
  audioAssets: project.value.globalData.audioAssets.length,
  items: project.value.globalData.items.length,
  inventory: project.value.globalData.inventory.length,
  globalActors: project.value.globalData.actors.length
}))

// =====================
// LOCAL STORAGE
// =====================
const STORAGE_PREFIX = 'pixel-forge-'
const PROJECTS_LIST_KEY = 'pixel-forge-projects'
const lastSaved = ref(null)
const autoSaveEnabled = ref(true)
const saveStatus = ref('saved')  // 'saved', 'saving', 'unsaved'
let localStorageSaveTimeout = null

// Get storage key for a project
const getProjectStorageKey = (id) => `${STORAGE_PREFIX}project-${id}`

// Save project to localStorage
const saveProjectToStorage = () => {
  try {
    saveStatus.value = 'saving'
    const key = getProjectStorageKey(project.value.id)
    const data = JSON.stringify(project.value)
    localStorage.setItem(key, data)

    // Update projects list
    updateProjectsList()

    lastSaved.value = new Date()
    saveStatus.value = 'saved'
    console.log('Project saved to localStorage:', project.value.name)
    return true
  } catch (err) {
    console.error('Error saving project:', err)
    saveStatus.value = 'unsaved'
    return false
  }
}

// Clean up invalid groups in a scene
const cleanupSceneGroups = (scene) => {
  if (!scene.groups || !Array.isArray(scene.groups)) {
    scene.groups = []
    return
  }

  // Helper to check if element exists
  const elementExists = (type, id) => {
    const arrayMap = {
      image: scene.images,
      walkbox: scene.walkboxes,
      exit: scene.exits,
      actorPlacement: scene.actorPlacements,
      hotspot: scene.hotspots,
      zplane: scene.zplanes,
      particle: scene.particles
    }
    if (type === 'light') {
      return scene.lighting?.lights?.some(e => String(e.id) === String(id))
    }
    const arr = arrayMap[type]
    return arr && arr.some(e => String(e.id) === String(id))
  }

  // Filter out groups with invalid members
  scene.groups = scene.groups.filter(group => {
    if (!group || !group.members || !Array.isArray(group.members)) return false

    // Remove members that don't exist
    group.members = group.members.filter(m => {
      if (!m || !m.type || m.id === undefined) return false
      return elementExists(m.type, m.id)
    })

    // Keep group only if it has at least 2 members
    return group.members.length >= 2
  })
}

// Load project from localStorage
const loadProjectFromStorage = (id) => {
  try {
    const key = getProjectStorageKey(id)
    const data = localStorage.getItem(key)
    if (data) {
      const loaded = JSON.parse(data)
      // Validate basic structure
      if (loaded.scenes && loaded.globalData) {
        // Clean up groups in all scenes
        loaded.scenes.forEach(scene => cleanupSceneGroups(scene))

        // Normalize interactive elements (hotspots, images)
        loaded.scenes = normalizeInteractiveElements(loaded.scenes)

        // Apply migration for new globalData fields
        ensureGlobalDataStructure(loaded.globalData)

        // Ensure each scene has elementFolders
        loaded.scenes.forEach(scene => ensureSceneStructure(scene))

        project.value = loaded
        lastSaved.value = new Date()
        saveStatus.value = 'saved'
        console.log('Project loaded from localStorage:', loaded.name)

        // Load asset URLs from S3 (for assets that have s3Key)
        setTimeout(() => loadAssetUrls(), 100)

        return true
      }
    }
    return false
  } catch (err) {
    console.error('Error loading project:', err)
    return false
  }
}

// Update projects list in localStorage
const updateProjectsList = () => {
  try {
    const listData = localStorage.getItem(PROJECTS_LIST_KEY)
    const list = listData ? JSON.parse(listData) : []

    // Find or create entry for this project
    const existingIndex = list.findIndex(p => p.id === project.value.id)
    const entry = {
      id: project.value.id,
      name: project.value.name,
      updatedAt: new Date().toISOString(),
      scenesCount: project.value.scenes.length
    }

    if (existingIndex >= 0) {
      list[existingIndex] = entry
    } else {
      list.push(entry)
    }

    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(list))
  } catch (err) {
    console.error('Error updating projects list:', err)
  }
}

// Get all saved projects
const getSavedProjects = () => {
  try {
    const listData = localStorage.getItem(PROJECTS_LIST_KEY)
    return listData ? JSON.parse(listData) : []
  } catch (err) {
    console.error('Error getting projects list:', err)
    return []
  }
}

// Delete project from localStorage
const deleteProjectFromStorage = (id) => {
  try {
    const key = getProjectStorageKey(id)
    localStorage.removeItem(key)

    // Update projects list
    const listData = localStorage.getItem(PROJECTS_LIST_KEY)
    if (listData) {
      const list = JSON.parse(listData)
      const filtered = list.filter(p => p.id !== id)
      localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(filtered))
    }
    return true
  } catch (err) {
    console.error('Error deleting project:', err)
    return false
  }
}

// Create new project with unique ID
const createNewProject = () => {
  const newId = 'project-' + Date.now()
  project.value = {
    id: newId,
    name: 'Untitled Project',
    version: '1.0.0',
    globalData: {
      assets: [],
      audioAssets: [],
      items: [],
      inventory: [],
      actors: [],
      variables: {},
      verbs: [
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
    },
    scenes: [{
      id: 'scene-1',
      name: 'Scene 1',
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
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
      animations: []
    }],
    currentSceneId: 'scene-1'
  }
  selectedElements.value = []
  saveProjectToStorage()
  // Update URL
  router.replace({ params: { projectId: newId } })
}

// Auto-save watcher for localStorage (debounced)
watch(project, () => {
  if (!autoSaveEnabled.value) return

  saveStatus.value = 'unsaved'

  if (localStorageSaveTimeout) clearTimeout(localStorageSaveTimeout)
  localStorageSaveTimeout = setTimeout(() => {
    saveProjectToStorage()
  }, 2000)  // Auto-save after 2 seconds of inactivity
}, { deep: true })

// Format last saved time
const formatLastSaved = computed(() => {
  if (!lastSaved.value) return 'Never'
  const now = new Date()
  const diff = Math.floor((now - lastSaved.value) / 1000)

  if (diff < 10) return 'Just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return lastSaved.value.toLocaleTimeString()
})

// Actions
const handleSave = async () => {
  if (saveProjectToStorage()) {
    // Also save to MongoDB if project has valid UUID
    await autoSaveProject()
  }
}

// Open Scene Map
const openSceneMap = () => {
  // Save before navigating
  saveProjectToStorage()
  router.push(`/scene-map/${project.value.id}`)
}

const handleExport = () => {
  // Export the entire project (all scenes + global data)
  const data = JSON.stringify(project.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.value.name.toLowerCase().replace(/\s+/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Import project from JSON
const handleImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      const imported = JSON.parse(text)
      // Validate basic structure
      if (imported.scenes && imported.globalData) {
        project.value = imported
        selectedElements.value = []
        alert('Project imported successfully!')
      } else {
        alert('Invalid project file format')
      }
    } catch (err) {
      alert('Error reading file: ' + err.message)
    }
  }
  input.click()
}

const handleDeleteElement = () => {
  if (selectedElements.value.length === 0) return

  // Map type to array name (scene-level elements)
  const sceneTypeToArray = {
    image: 'images',
    walkbox: 'walkboxes',
    exit: 'exits',
    actorPlacement: 'actorPlacements',
    actor: 'actorPlacements',
    hotspot: 'hotspots',
    zplane: 'zplanes',
    dialog: 'dialogs',
    puzzle: 'puzzles',
    sfx: 'sfx',
    music: 'music',
    cutscene: 'cutscenes',
    animation: 'animations',
    particle: 'particles'
  }

  // Map type to array name (global elements)
  const globalTypeToArray = {
    verb: 'verbs',
    item: 'items',
    globalActor: 'actors'
  }

  // Delete all selected elements
  selectedElements.value.forEach(({ type, element }) => {
    // Remove from any group this element belongs to
    if (currentScene.value.groups) {
      currentScene.value.groups.forEach(group => {
        group.members = group.members.filter(m => !(m.type === type && m.id === element.id))
      })
      // Remove empty groups
      currentScene.value.groups = currentScene.value.groups.filter(g => g.members.length > 0)
    }

    // Check if it's a global element
    if (globalTypeToArray[type]) {
      const arrayName = globalTypeToArray[type]
      const array = project.value.globalData[arrayName]
      if (array) {
        const idx = array.findIndex(e => e.id === element.id)
        if (idx > -1) array.splice(idx, 1)
      }
      return
    }

    // Special handling for lights (nested in lighting.lights)
    if (type === 'light') {
      if (currentScene.value.lighting?.lights) {
        const idx = currentScene.value.lighting.lights.findIndex(e => e.id === element.id)
        if (idx > -1) currentScene.value.lighting.lights.splice(idx, 1)
      }
      return
    }

    // Scene-level element
    const arrayName = sceneTypeToArray[type]
    if (arrayName && currentScene.value[arrayName]) {
      currentScene.value[arrayName] = currentScene.value[arrayName].filter(e => e.id !== element.id)
    }
  })

  selectedElements.value = []
}

// =====================
// COPY/PASTE SYSTEM
// =====================

const clipboard = ref([])

// Generate unique name with sub-index
const generateUniqueName = (baseName, type, arrayName) => {
  const existingNames = currentScene.value[arrayName].map(el => el.name)

  // Check if baseName already has a sub-index pattern (name-N)
  const baseMatch = baseName.match(/^(.+)-(\d+)$/)
  let coreName = baseMatch ? baseMatch[1] : baseName

  // Find all existing names that match the pattern
  let maxIndex = 1
  const pattern = new RegExp(`^${coreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-(\\d+))?$`)

  existingNames.forEach(name => {
    const match = name.match(pattern)
    if (match) {
      const index = match[1] ? parseInt(match[1], 10) : 1
      if (index >= maxIndex) {
        maxIndex = index + 1
      }
    }
  })

  // If the exact name doesn't exist and it's the first copy, just use coreName-2
  if (!existingNames.includes(baseName)) {
    return baseName
  }

  return `${coreName}-${maxIndex}`
}

// Copy selected elements to clipboard
const handleCopy = () => {
  if (selectedElements.value.length === 0) return

  // Deep clone selected elements
  clipboard.value = selectedElements.value.map(({ type, element }) => ({
    type,
    element: JSON.parse(JSON.stringify(element))
  }))
}

// Paste elements from clipboard
const handlePaste = () => {
  if (clipboard.value.length === 0) return

  // Scene-level elements
  const sceneTypeToArray = {
    image: 'images',
    walkbox: 'walkboxes',
    exit: 'exits',
    actorPlacement: 'actorPlacements',
    hotspot: 'hotspots',
    zplane: 'zplanes',
    dialog: 'dialogs',
    puzzle: 'puzzles',
    sfx: 'sfx',
    music: 'music',
    cutscene: 'cutscenes',
    animation: 'animations'
  }

  // Global elements
  const globalTypeToArray = {
    verb: 'verbs',
    item: 'items',
    globalActor: 'actors'
  }

  const pastedElements = []
  const PASTE_OFFSET = 20 // Offset for pasted elements

  clipboard.value.forEach(({ type, element }) => {
    // Determine if this is a scene or global element
    const isGlobal = !!globalTypeToArray[type]
    const arrayName = isGlobal ? globalTypeToArray[type] : sceneTypeToArray[type]
    const targetArray = isGlobal ? project.value.globalData[arrayName] : currentScene.value[arrayName]
    if (!arrayName || !targetArray) return

    // Create new element with unique ID
    const newElement = JSON.parse(JSON.stringify(element))
    newElement.id = Date.now() + Math.random() * 1000 // Ensure unique ID

    // Generate unique name
    newElement.name = generateUniqueName(element.name, type, arrayName)

    // Offset position for spatial elements
    if (newElement.x !== undefined && newElement.y !== undefined) {
      newElement.x = Math.min(newElement.x + PASTE_OFFSET, currentScene.value.width - (newElement.w || 0))
      newElement.y = Math.min(newElement.y + PASTE_OFFSET, currentScene.value.height - (newElement.h || 0))
    }

    // Handle walkbox points offset
    if (type === 'walkbox' && newElement.points) {
      newElement.points = newElement.points.map(p => ({
        x: Math.min(p.x + PASTE_OFFSET, currentScene.value.width),
        y: Math.min(p.y + PASTE_OFFSET, currentScene.value.height)
      }))
    }

    // Add to appropriate array (scene or global)
    targetArray.push(newElement)
    pastedElements.push({ type, element: newElement })
  })

  // Select pasted elements
  selectedElements.value = pastedElements
}

// Keyboard shortcuts
const handleKeyDown = (event) => {
  const isInput = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'

  // Undo: Ctrl+Z (or Cmd+Z on Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undo()
    return
  }

  // Redo: Ctrl+Shift+Z or Ctrl+Y (or Cmd+Shift+Z / Cmd+Y on Mac)
  if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
    event.preventDefault()
    redo()
    return
  }

  // Copy: Ctrl+C (or Cmd+C on Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
    if (!isInput && selectedElements.value.length > 0) {
      event.preventDefault()
      handleCopy()
      return
    }
  }

  // Paste: Ctrl+V (or Cmd+V on Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
    if (!isInput && clipboard.value.length > 0) {
      event.preventDefault()
      handlePaste()
      return
    }
  }

  // Delete element
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (!isInput) {
      event.preventDefault()
      handleDeleteElement()
    }
  }

  // Deselect
  if (event.key === 'Escape') {
    selectedElements.value = []
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', handleGlobalClick)
  startActorAnimationPreview()
  startParticleLoop()
})

// Reset verbs to default SCUMM-style verbs
const resetVerbsToDefault = () => {
  if (confirm('¿Resetear verbos a los valores por defecto? Esto reemplazará todos los verbos actuales.')) {
    project.value.globalData.verbs = [
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
    console.log('[Editor] Verbos reseteados a valores por defecto')
  }
}

const handleAddElement = (type) => {
  const newElement = {
    id: Date.now(),
    name: `New ${type}`,
    x: DEFAULT_WIDTH / 2 - 100,
    y: DEFAULT_HEIGHT / 2 - 100,
    w: 200,
    h: 200,
    rotation: 0
  }

  switch (type) {
    case 'image':
      currentScene.value.images.push({
        ...newElement,
        src: null,
        assetId: null,
        zOrder: 0,
        interactive: false,
        pickable: false,
        description: '', // Texto por defecto al mirar
        interactions: [], // { verbId, action, params }
        folderPath: '/', // Organización por carpetas
        // Parallax properties
        parallax: {
          enabled: false,
          depth: 1.0,       // 0=fixed, <1=background(slow), 1=normal, >1=foreground(fast)
          repeatX: false,   // Tile horizontally
          repeatY: false,   // Tile vertically
          autoScrollX: 0,   // Auto-scroll speed X (px/sec)
          autoScrollY: 0    // Auto-scroll speed Y (px/sec)
        }
      })
      break
    case 'walkbox':
      currentScene.value.walkboxes.push({
        id: Date.now(),
        name: 'New walkbox',
        points: [
          {x: DEFAULT_WIDTH/2 - 200, y: DEFAULT_HEIGHT - 300},
          {x: DEFAULT_WIDTH/2 + 200, y: DEFAULT_HEIGHT - 300},
          {x: DEFAULT_WIDTH/2 + 200, y: DEFAULT_HEIGHT - 100},
          {x: DEFAULT_WIDTH/2 - 200, y: DEFAULT_HEIGHT - 100}
        ],
        rotation: 0,
        mask: 0
      })
      break
    case 'exit':
      currentScene.value.exits.push({ ...newElement, targetScene: '' })
      break
    case 'actor':
      currentScene.value.actors.push({
        ...newElement,
        costume: null,
        direction: 'south',
        animations: {
          idle: null,
          'walk-north': null,
          'walk-south': null,
          'walk-east': null,
          'walk-west': null,
          'talk': null
        },
        currentState: 'idle'
      })
      break
    case 'hotspot':
      currentScene.value.hotspots.push({
        ...newElement,
        description: '', // Texto por defecto al mirar
        interactions: [], // { verbId, action, params }
        folderPath: '/' // Organización por carpetas
      })
      break
    case 'zplane':
      currentScene.value.zplanes.push({ ...newElement, maskImage: null, zIndex: 1 })
      break
    case 'dialog':
      currentScene.value.dialogs.push({
        id: Date.now(),
        name: 'New Dialog',
        actor: null,
        lines: [
          { id: 1, speaker: 'Player', text: 'Hello!' },
          { id: 2, speaker: 'NPC', text: 'Hi there!' }
        ],
        choices: []
      })
      break
    case 'puzzle':
      currentScene.value.puzzles.push({
        id: Date.now(),
        name: 'New Puzzle',
        description: '',
        type: 'item-combination',
        // Conditions (vary by type)
        conditions: {
          items: [],              // For item-combination: [itemId1, itemId2]
          useItem: null,          // For use-on-object/actor: itemId to use
          targetObject: null,     // For use-on-object: hotspot/image ID
          targetActor: null,      // For use-on-actor: actor ID
          sequence: [],           // For sequence: ['action1', 'action2']
          dialogId: null,         // For dialog-choice: dialog ID
          correctChoices: []      // For dialog-choice: [choiceId1, choiceId2]
        },
        // Result when solved
        result: {
          type: 'none',           // none, give-item, remove-item, unlock-exit, play-cutscene, change-state, show-dialog
          giveItem: null,         // Item ID to give
          removeItems: [],        // Item IDs to remove/consume
          unlockExit: null,       // Exit ID to unlock
          playCutscene: null,     // Cutscene ID to play
          changeState: null,      // { objectType, objectId, newState }
          showDialog: null        // Dialog ID to show
        },
        // State
        solved: false,
        // Hints
        hints: []                 // [{ afterAttempts: number, text: string }]
      })
      break
    case 'verb':
      project.value.globalData.verbs.push({
        id: Date.now(),
        name: 'New Verb',
        icon: '❓',
        key: ''
      })
      break
    case 'sfx':
      currentScene.value.sfx.push({
        id: Date.now(),
        name: 'New SFX',
        file: null,
        audioAssetId: null,
        volume: 100,
        loop: false,
        trigger: 'manual'
      })
      break
    case 'music':
      currentScene.value.music.push({
        id: Date.now(),
        name: 'New Music',
        file: null,
        audioAssetId: null,
        volume: 80,
        loop: true,
        fadeIn: 0,
        fadeOut: 0
      })
      break
    case 'cutscene':
      currentScene.value.cutscenes.push({
        id: Date.now(),
        name: 'New Cutscene',
        trigger: 'manual',
        triggerTarget: null,
        skippable: true,
        actions: []
      })
      break
    case 'item':
      project.value.globalData.items.push({
        id: Date.now(),
        name: 'New Item',
        description: 'A useful item',
        icon: '📦',
        iconAssetId: null,        // Asset ID for image-based icon
        image: null,              // Optional: image data for inventory display
        combinable: true,         // Can be combined with other items
        useWith: [],              // Object types this item can be used on: ['hotspot', 'actor', 'exit']
        pickupDialog: null,       // Dialog to show when picked up
        examineDialog: null       // Dialog to show when examined
      })
      break
    case 'light':
      currentScene.value.lighting.lights.push({
        id: Date.now(),
        name: 'New Light',
        type: 'point',            // point, spot, directional, area
        x: DEFAULT_WIDTH / 2,
        y: DEFAULT_HEIGHT / 2,
        color: '#ffcc00',
        intensity: 1.0,
        radius: 300,              // for point/spot
        angle: 45,                // for spot (cone angle in degrees)
        direction: 180,           // for spot/directional (direction in degrees)
        falloff: 'smooth',        // none, linear, smooth
        enabled: true,
        castShadows: false,
        // Area light specific
        width: 200,
        height: 100
      })
      break
    case 'particle':
      const preset = particlePresets.fire
      currentScene.value.particles.push({
        id: Date.now(),
        name: 'New Emitter',
        preset: 'fire',
        x: DEFAULT_WIDTH / 2,
        y: DEFAULT_HEIGHT / 2,
        width: 50,                // Emission area width
        height: 10,               // Emission area height
        enabled: true,
        // Emission settings
        emitRate: preset.emitRate,
        // Particle lifetime
        lifetime: { ...preset.lifetime },
        // Movement
        speed: { ...preset.speed },
        direction: { ...preset.direction },
        gravity: preset.gravity,
        // Size
        size: { ...preset.size },
        // Color
        color: { ...preset.color },
        // Shape
        shape: preset.shape,      // circle, square, star, line
        // Blend mode
        blendMode: 'screen'       // normal, screen, add, multiply
      })
      break
  }
}

const handleSelectElement = (type, element, event) => {
  // Check if element is already in selection
  const isAlreadySelected = selectedElements.value.some(
    s => s.type === type && s.element.id === element.id
  )

  // Check for modifier keys (Ctrl/Cmd for multi-select)
  const isMultiSelect = event && (event.ctrlKey || event.metaKey || event.shiftKey)

  if (isMultiSelect) {
    // Multi-select mode: toggle selection
    if (isAlreadySelected) {
      // Will be handled in drag end for canvas elements
      if (!event) {
        // Panel click - toggle immediately
        selectedElements.value = selectedElements.value.filter(
          s => !(s.type === type && s.element.id === element.id)
        )
      }
    } else {
      // Add to selection
      selectedElements.value = [...selectedElements.value, { type, element }]
    }
  } else {
    // Single select mode: replace selection
    if (!isAlreadySelected) {
      selectedElements.value = [{ type, element }]
    }
    // If already selected and clicking again, keep it selected (for drag)
  }

  // Start drag - selection toggle for already-selected elements happens on drag end
  if (event) {
    startDrag(event, type, element, isAlreadySelected)
  }
}

// =====================
// CUTSCENE ACTIONS
// =====================

// Default params for each action type
const getDefaultParams = (type) => {
  switch (type) {
    case 'dialog':
      return { actorId: null, text: '', emotion: null }
    case 'move-actor':
      return { actorId: null, x: 0, y: 0, walk: true }
    case 'actor-direction':
      return { actorId: null, direction: 'south' }
    case 'actor-costume':
      return { actorId: null, costume: '' }
    case 'play-sfx':
      return { sfxId: null }
    case 'play-music':
      return { musicId: null, fadeIn: 0 }
    case 'stop-music':
      return { fadeOut: 0 }
    case 'wait':
      return { duration: 1000 }
    case 'fade-in':
      return { duration: 500, color: '#000000' }
    case 'fade-out':
      return { duration: 500, color: '#000000' }
    case 'camera-pan':
      return { x: 0, y: 0, duration: 1000 }
    case 'camera-shake':
      return { intensity: 5, duration: 500 }
    case 'change-scene':
      return { sceneId: '', transition: 'fade' }
    default:
      return {}
  }
}

// Add a new action to the selected cutscene
const addAction = (event) => {
  const type = event.target.value
  if (!type) return

  if (selectedElements.value.length === 1 && selectedElements.value[0].type === 'cutscene') {
    const cutscene = selectedElements.value[0].element
    cutscene.actions.push({
      id: Date.now(),
      type,
      delay: 0,
      duration: type === 'wait' ? 1000 : 0,
      params: getDefaultParams(type)
    })
  }

  // Reset select
  event.target.value = ''
}

// Remove an action from the selected cutscene
const removeAction = (index) => {
  if (selectedElements.value.length === 1 && selectedElements.value[0].type === 'cutscene') {
    selectedElements.value[0].element.actions.splice(index, 1)
  }
}

// Move an action up or down in the list
const moveAction = (index, direction) => {
  if (selectedElements.value.length === 1 && selectedElements.value[0].type === 'cutscene') {
    const actions = selectedElements.value[0].element.actions
    const newIndex = index + direction
    if (newIndex >= 0 && newIndex < actions.length) {
      const [action] = actions.splice(index, 1)
      actions.splice(newIndex, 0, action)
    }
  }
}

// =====================
// DRAG & DROP SYSTEM
// =====================

const canvasRef = ref(null)
const isDragging = ref(false)
const didDragMove = ref(false) // Track if actual movement happened
const dragState = ref({
  startX: 0,
  startY: 0,
  clickedElement: null, // { type, element } - the element that was clicked to start drag
  elements: [] // Array of { type, element, startX, startY, originalPoints }
})

// Get mouse position relative to canvas in scene coordinates
const getSceneCoords = (event) => {
  if (!canvasRef.value) return { x: 0, y: 0 }

  const rect = canvasRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left) / zoom.value
  const y = (event.clientY - rect.top) / zoom.value

  return { x: Math.round(x), y: Math.round(y) }
}

// Start dragging an element (or all selected elements)
const startDrag = (event, type, element, wasAlreadySelected = false) => {
  event.preventDefault()
  event.stopPropagation()

  isDragging.value = true
  didDragMove.value = false
  const coords = getSceneCoords(event)

  // Check if this is a multi-select operation
  const isMultiSelect = event.ctrlKey || event.metaKey || event.shiftKey

  // Start with selected elements
  let elementsToDrag = [...selectedElements.value]

  // If any selected element is in a group, include all group members
  const processedGroups = new Set()
  selectedElements.value.forEach(sel => {
    const group = getElementGroup(sel.type, sel.element.id)
    if (group && !processedGroups.has(group.id)) {
      processedGroups.add(group.id)
      // Add all group members that aren't already in the drag list
      group.members.forEach(member => {
        const alreadyIncluded = elementsToDrag.some(
          e => e.type === member.type && e.element.id === member.id
        )
        if (!alreadyIncluded) {
          const memberElement = getElementByTypeAndId(member.type, member.id)
          if (memberElement) {
            elementsToDrag.push({ type: member.type, element: memberElement })
          }
        }
      })
    }
  })

  // Store original positions for all elements being dragged
  const elementsData = elementsToDrag.map(({ type: t, element: el }) => {
    if (t === 'walkbox' && el.points) {
      return {
        type: t,
        element: el,
        startX: el.points[0].x,
        startY: el.points[0].y,
        originalPoints: el.points.map(p => ({ x: p.x, y: p.y }))
      }
    } else {
      return {
        type: t,
        element: el,
        startX: el.x,
        startY: el.y,
        originalPoints: null
      }
    }
  })

  dragState.value = {
    startX: coords.x,
    startY: coords.y,
    // Only store clickedElement for toggle if it was multi-select AND already selected
    clickedElement: (wasAlreadySelected && isMultiSelect) ? { type, element } : null,
    elements: elementsData
  }

  // Add global listeners
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

// Handle drag movement
const onDragMove = (event) => {
  if (!isDragging.value || dragState.value.elements.length === 0) return

  const coords = getSceneCoords(event)
  const dx = coords.x - dragState.value.startX
  const dy = coords.y - dragState.value.startY

  // Mark that actual movement happened (with threshold to avoid micro-movements)
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    didDragMove.value = true
  }

  // Move all elements being dragged
  dragState.value.elements.forEach(({ type, element, startX, startY, originalPoints }) => {
    if (type === 'walkbox' && element.points && originalPoints) {
      // For walkboxes, move all points
      element.points.forEach((point, i) => {
        point.x = Math.max(0, Math.min(currentScene.value.width, originalPoints[i].x + dx))
        point.y = Math.max(0, Math.min(currentScene.value.height, originalPoints[i].y + dy))
      })
    } else {
      // For regular elements with x, y, w, h
      element.x = Math.max(0, Math.min(currentScene.value.width - (element.w || 0), startX + dx))
      element.y = Math.max(0, Math.min(currentScene.value.height - (element.h || 0), startY + dy))
    }
  })
}

// End dragging
const onDragEnd = () => {
  // If it was just a click (no drag movement) on an already-selected element, deselect it
  if (!didDragMove.value && dragState.value.clickedElement) {
    const { type, element } = dragState.value.clickedElement
    selectedElements.value = selectedElements.value.filter(
      s => !(s.type === type && s.element.id === element.id)
    )
  }

  isDragging.value = false
  didDragMove.value = false
  dragState.value = {
    startX: 0,
    startY: 0,
    clickedElement: null,
    elements: []
  }

  // Remove global listeners
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

// =====================
// RESIZE SYSTEM
// =====================
const isResizing = ref(false)
const resizeState = ref({
  element: null,
  handle: null, // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
  startX: 0,
  startY: 0,
  originalX: 0,
  originalY: 0,
  originalW: 0,
  originalH: 0
})

const MIN_SIZE = 20 // Minimum element size

// Start resizing
const startResize = (event, element, handle) => {
  event.preventDefault()
  event.stopPropagation()

  isResizing.value = true
    const coords = getSceneCoords(event)

  resizeState.value = {
    element,
    handle,
    startX: coords.x,
    startY: coords.y,
    originalX: element.x,
    originalY: element.y,
    originalW: element.w,
    originalH: element.h
  }

  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

// Handle resize movement
const onResizeMove = (event) => {
  if (!isResizing.value || !resizeState.value.element) return

  const coords = getSceneCoords(event)
  const dx = coords.x - resizeState.value.startX
  const dy = coords.y - resizeState.value.startY
  const el = resizeState.value.element
  const handle = resizeState.value.handle

  let newX = resizeState.value.originalX
  let newY = resizeState.value.originalY
  let newW = resizeState.value.originalW
  let newH = resizeState.value.originalH

  // Handle horizontal resize
  if (handle.includes('w')) {
    newX = Math.max(0, resizeState.value.originalX + dx)
    newW = Math.max(MIN_SIZE, resizeState.value.originalW - dx)
    if (newX + newW > resizeState.value.originalX + resizeState.value.originalW) {
      newX = resizeState.value.originalX + resizeState.value.originalW - MIN_SIZE
      newW = MIN_SIZE
    }
  } else if (handle.includes('e')) {
    newW = Math.max(MIN_SIZE, Math.min(currentScene.value.width - newX, resizeState.value.originalW + dx))
  }

  // Handle vertical resize
  if (handle.includes('n')) {
    newY = Math.max(0, resizeState.value.originalY + dy)
    newH = Math.max(MIN_SIZE, resizeState.value.originalH - dy)
    if (newY + newH > resizeState.value.originalY + resizeState.value.originalH) {
      newY = resizeState.value.originalY + resizeState.value.originalH - MIN_SIZE
      newH = MIN_SIZE
    }
  } else if (handle.includes('s')) {
    newH = Math.max(MIN_SIZE, Math.min(currentScene.value.height - newY, resizeState.value.originalH + dy))
  }

  el.x = newX
  el.y = newY
  el.w = newW
  el.h = newH
}

// End resizing
const onResizeEnd = () => {
  isResizing.value = false
    resizeState.value = {
    element: null,
    handle: null,
    startX: 0,
    startY: 0,
    originalX: 0,
    originalY: 0,
    originalW: 0,
    originalH: 0
  }

  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

// =====================
// ROTATION SYSTEM
// =====================
const isRotating = ref(false)
const rotateState = ref({
  element: null,
  centerX: 0,
  centerY: 0,
  startAngle: 0,
  originalRotation: 0
})

// Start rotating
const startRotate = (event, element) => {
  event.preventDefault()
  event.stopPropagation()

  isRotating.value = true
    const coords = getSceneCoords(event)

  // Calculate element center
  const centerX = element.x + element.w / 2
  const centerY = element.y + element.h / 2

  // Calculate starting angle from center to mouse
  const startAngle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI)

  rotateState.value = {
    element,
    centerX,
    centerY,
    startAngle,
    originalRotation: element.rotation || 0
  }

  document.addEventListener('mousemove', onRotateMove)
  document.addEventListener('mouseup', onRotateEnd)
}

// Handle rotation movement
const onRotateMove = (event) => {
  if (!isRotating.value || !rotateState.value.element) return

  const coords = getSceneCoords(event)
  const { centerX, centerY, startAngle, originalRotation, element } = rotateState.value

  // Calculate current angle from center to mouse
  const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI)

  // Calculate rotation delta
  let deltaAngle = currentAngle - startAngle
  let newRotation = originalRotation + deltaAngle

  // Normalize to 0-360
  newRotation = ((newRotation % 360) + 360) % 360

  // Shift key for 15° snap
  if (event.shiftKey) {
    newRotation = Math.round(newRotation / 15) * 15
  }

  element.rotation = newRotation
}

// End rotating
const onRotateEnd = () => {
  isRotating.value = false
    rotateState.value = {
    element: null,
    centerX: 0,
    centerY: 0,
    startAngle: 0,
    originalRotation: 0
  }

  document.removeEventListener('mousemove', onRotateMove)
  document.removeEventListener('mouseup', onRotateEnd)
}

// Start rotating a walkbox (uses same rotation system but calculates center from points)
const startWalkboxRotate = (event, walkbox) => {
  event.preventDefault()
  event.stopPropagation()

  isRotating.value = true
  const coords = getSceneCoords(event)

  // Calculate walkbox center from points
  const center = getWalkboxCenter(walkbox)

  // Calculate starting angle from center to mouse
  const startAngle = Math.atan2(coords.y - center.y, coords.x - center.x) * (180 / Math.PI)

  rotateState.value = {
    element: walkbox,
    centerX: center.x,
    centerY: center.y,
    startAngle,
    originalRotation: walkbox.rotation || 0
  }

  document.addEventListener('mousemove', onRotateMove)
  document.addEventListener('mouseup', onRotateEnd)
}

// =====================
// SPRITESHEET EDITOR
// =====================
const spritesheetEditorOpen = ref(false)

// Open spritesheet editor (component manages its own state internally)
const openSpritesheetEditor = () => {
  spritesheetEditorOpen.value = true
}

// Delete global animation
const deleteAnimation = (animId) => {
  // Use filter + reassignment for guaranteed reactivity
  project.value.globalData.animations = project.value.globalData.animations.filter(a => a.id !== animId)

  // Also check scene animations for backward compatibility
  currentScene.value.animations = currentScene.value.animations.filter(a => a.id !== animId)
}

// Handler for SpritesheetEditorModal: Save new animation
const handleSaveAnimation = (animData) => {
  if (!project.value.globalData.animations) {
    project.value.globalData.animations = []
  }
  project.value.globalData.animations = [...project.value.globalData.animations, animData]
  autoSaveProject()
}

// Handler for SpritesheetEditorModal: Update existing animation
const handleUpdateAnimation = (animData) => {
  const idx = project.value.globalData.animations.findIndex(a => a.id === animData.id)
  if (idx !== -1) {
    project.value.globalData.animations[idx] = animData
    project.value.globalData.animations = [...project.value.globalData.animations]
    autoSaveProject()
  }
}

// Handler for SpritesheetEditorModal: Assign animation to actor
const handleAssignAnimation = ({ actorId, state, animationId, mirror }) => {
  const actor = project.value.globalData.actors.find(a => a.id === actorId)
  if (actor) {
    if (!actor.animations) actor.animations = {}
    actor.animations[state] = { id: animationId, mirror }
    autoSaveProject()
  }
}

// Get animation by ID (check global first, then scene)
const getAnimationById = (animId) => {
  if (!animId) return null
  return project.value.globalData.animations.find(a => a.id === animId) ||
         currentScene.value.animations.find(a => a.id === animId)
}

// Get spritesheet URL for an animation
const getAnimationSpritesheetUrl = (anim) => {
  if (!anim) return null

  // If animation references an asset
  if (anim.spritesheetAssetId) {
    const asset = getAssetById(anim.spritesheetAssetId)
    return getAssetDisplayUrl(asset)
  }

  // Legacy: inline spritesheet data
  if (anim.spritesheet?.data) {
    return anim.spritesheet.data
  }

  return null
}

// Get spritesheet dimensions for an animation
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

// Helper: Get animation ID from assignment (handles both old format and new {id, mirror} format)
const getAnimationIdFromAssignment = (assignment) => {
  if (!assignment) return null
  if (typeof assignment === 'number') return assignment
  if (typeof assignment === 'object' && assignment.id) return assignment.id
  return null
}

// Helper: Check if animation assignment has mirror flag
const isAnimationMirrored = (assignment) => {
  if (!assignment) return false
  if (typeof assignment === 'object' && assignment.mirror) return true
  return false
}

// Get which actors/states are using a specific animation
const getAnimationUsage = (animId) => {
  if (!animId) return []
  const usage = []
  for (const actor of globalActors.value) {
    if (actor.animations) {
      for (const [state, assignment] of Object.entries(actor.animations)) {
        const assignedId = getAnimationIdFromAssignment(assignment)
        if (assignedId === animId) {
          const stateInfo = actorAnimationStates.find(s => s.key === state)
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

// Animation states available for actors
const actorAnimationStates = [
  { key: 'idle', label: 'Idle', icon: '🧍' },
  { key: 'walk-north', label: 'Caminar Norte', icon: '⬆️' },
  { key: 'walk-south', label: 'Caminar Sur', icon: '⬇️' },
  { key: 'walk-east', label: 'Caminar Este', icon: '➡️' },
  { key: 'walk-west', label: 'Caminar Oeste', icon: '⬅️' },
  { key: 'talk', label: 'Hablar', icon: '💬' },
  { key: 'use', label: 'Usar', icon: '🔧' },
  { key: 'pickup', label: 'Recoger', icon: '✋' }
]

// =====================
// ACTOR ANIMATION PREVIEW
// =====================

// Get current animation for actor based on state
const getActorCurrentAnimation = (actor, stateOverride = null) => {
  if (!actor.animations) return null
  const state = stateOverride || actor.currentState
  if (!state) return null

  const assignment = actor.animations[state]
  if (!assignment) return null

  const animId = getAnimationIdFromAssignment(assignment)
  if (!animId) return null

  const mirror = isAnimationMirrored(assignment)

  // Search in global animations first, then scene animations for backward compatibility
  const anim = globalAnimations.value.find(a => a.id === animId) ||
               currentScene.value.animations?.find(a => a.id === animId)

  if (!anim) return null
  return { ...anim, _mirror: mirror }
}

// Get style for actor animation preview
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

// Get actor by ID (from global actors, for dialogs)
const getActorById = (actorId) => {
  return project.value.globalData.actors.find(a => a.id === actorId)
}

// Get animation for actor placement (combines global actor + placement state)
const getActorPlacementAnimation = (placement) => {
  const globalActor = getGlobalActorById(placement.actorId)
  if (!globalActor || !globalActor.animations) return null

  const state = placement.currentState || 'idle'
  let assignment = globalActor.animations[state]
  let mirror = false

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
  mirror = isAnimationMirrored(assignment)

  if (!animId) return null

  const anim = globalAnimations.value.find(a => a.id === animId) ||
               currentScene.value.animations?.find(a => a.id === animId)

  if (!anim) return null
  return { ...anim, _mirror: mirror }
}

// Get style for actor placement animation preview
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

// Check if actor has animation for current state (for global actors)
const hasActorAnimation = (actorId) => {
  const actor = getGlobalActorById(actorId)
  if (!actor || !actor.animations) return false
  // Check if any animation is assigned
  return Object.values(actor.animations).some(animId => animId !== null)
}

// Get style for dialog actor preview (smaller version for panel)
const getDialogActorPreviewStyle = (actorId) => {
  const actor = getActorById(actorId)
  if (!actor) return {}

  const anim = getActorCurrentAnimation(actor)
  if (!anim || !anim.frames?.length) return {}

  const spritesheetUrl = getAnimationSpritesheetUrl(anim)
  if (!spritesheetUrl) return {}

  const frameIndex = actorPreviewFrames.value[actor.id] || 0
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

// Dialog line management
const removeDialogLine = (dialog, index) => {
  if (dialog.lines.length > 1) {
    dialog.lines.splice(index, 1)
  }
}

// Dialog choice management
const addDialogChoice = (dialog) => {
  if (!dialog.choices) dialog.choices = []
  dialog.choices.push({ id: Date.now(), text: '', targetDialog: null })
}

const removeDialogChoice = (dialog, index) => {
  dialog.choices.splice(index, 1)
}

// =====================
// ITEM & INVENTORY SYSTEM (GLOBAL)
// =====================

// Get item by ID (from global items)
const getItemById = (itemId) => {
  return project.value.globalData.items.find(i => i.id === itemId)
}

// Get item icon style (returns background style if asset, null if emoji)
const getItemIconStyle = (item) => {
  if (!item) return null
  if (item.iconAssetId) {
    const asset = getAssetById(item.iconAssetId)
    if (asset) {
      const url = getAssetDisplayUrl(asset)
      if (url) {
        return {
          backgroundImage: `url(${url})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }
      }
    }
  }
  return null
}

// Check if item has asset icon
const itemHasAssetIcon = (item) => {
  if (!item) return false
  return item.iconAssetId && getAssetById(item.iconAssetId)
}

// Add item to inventory (global)
const addToInventory = (itemId) => {
  if (!project.value.globalData.inventory.includes(itemId)) {
    project.value.globalData.inventory.push(itemId)
  }
}

// Remove item from inventory (global)
const removeFromInventory = (itemId) => {
  const index = project.value.globalData.inventory.indexOf(itemId)
  if (index > -1) {
    project.value.globalData.inventory.splice(index, 1)
  }
}

// Toggle item in inventory (for modal)
const toggleInventoryItem = (itemId) => {
  if (project.value.globalData.inventory.includes(itemId)) {
    removeFromInventory(itemId)
  } else {
    addToInventory(itemId)
  }
}

// Modal for adding items to inventory
const showAddToInventoryModal = ref(false)
const showPlaceActorModal = ref(false)

// =====================
// ASSET MANAGEMENT
// =====================
const showAssetManagerModal = ref(false)
const assetUploadDragging = ref(false)
const assetUrlCache = ref({}) // Cache de URLs firmadas: { s3Key: url }
const selectedAssetCategory = ref('object') // Categoría seleccionada para upload
const assetFilterCategory = ref('all') // Filtro de visualización
const assetSearchQuery = ref('') // Búsqueda por nombre

// Folder management state
const selectedAssetFolder = ref('/') // Carpeta actual para upload/filtrado
const showSubfolderContents = ref(true) // Mostrar contenido de subcarpetas
const showNewFolderInput = ref(false) // Mostrar input para nueva carpeta
const newFolderName = ref('') // Nombre para nueva carpeta
const renamingFolderId = ref(null) // ID de carpeta en edición
const renamingFolderValue = ref('') // Nuevo nombre durante edición

// Labels amigables para categorías
const categoryLabels = {
  image: {
    background: 'Background',
    object: 'Object',
    sprite: 'Sprite',
    ui: 'UI Element',
    other: 'Other'
  },
  audio: {
    music: 'Music',
    sfx: 'Sound Effect',
    ambient: 'Ambient',
    voice: 'Voice',
    other: 'Other'
  }
}

// Assets filtrados
const filteredAssets = computed(() => {
  let assets = project.value.globalData.assets || []

  // Filtrar por carpeta seleccionada
  if (selectedAssetFolder.value !== '/') {
    assets = assets.filter(a => {
      const folderPath = a.folderPath || '/'
      if (showSubfolderContents.value) {
        // Incluir contenido de subcarpetas
        return folderPath === selectedAssetFolder.value ||
               folderPath.startsWith(selectedAssetFolder.value + '/')
      }
      return folderPath === selectedAssetFolder.value
    })
  }

  // Filtrar por categoría
  if (assetFilterCategory.value !== 'all') {
    assets = assets.filter(a => a.category === assetFilterCategory.value)
  }

  // Filtrar por búsqueda
  if (assetSearchQuery.value.trim()) {
    const query = assetSearchQuery.value.toLowerCase()
    assets = assets.filter(a => a.name.toLowerCase().includes(query))
  }

  return assets
})

// Conteo de assets por categoría
const assetCountByCategory = computed(() => {
  const counts = { all: 0, background: 0, object: 0, sprite: 0, ui: 0, other: 0 }
  const assets = project.value.globalData.assets || []

  assets.forEach(a => {
    counts.all++
    const cat = a.category || 'other'
    if (counts[cat] !== undefined) {
      counts[cat]++
    } else {
      counts.other++
    }
  })

  return counts
})

// =====================
// FOLDER MANAGEMENT
// =====================

// Get subfolders of a parent folder
const getSubfolders = (parentPath) => {
  const folders = project.value.globalData.assetFolders || []
  return folders.filter(f => f.parentPath === parentPath)
}

// Get items count in a folder (for display)
const getFolderAssetCount = (folderPath, recursive = true) => {
  const assets = project.value.globalData.assets || []
  if (recursive) {
    return assets.filter(a =>
      (a.folderPath || '/') === folderPath ||
      (a.folderPath || '/').startsWith(folderPath + '/')
    ).length
  }
  return assets.filter(a => (a.folderPath || '/') === folderPath).length
}

// Build folder tree for rendering
const assetFolderTree = computed(() => {
  const folders = project.value.globalData.assetFolders || []

  const buildNode = (path) => {
    const folder = folders.find(f => f.path === path)
    const children = folders.filter(f => f.parentPath === path)

    return {
      ...folder,
      children: children.map(c => buildNode(c.path)),
      itemCount: getFolderAssetCount(path, false)
    }
  }

  // Root node
  const rootChildren = folders.filter(f => f.parentPath === '/')
  return {
    id: 0,
    path: '/',
    name: 'Raíz',
    icon: '📁',
    children: rootChildren.map(c => buildNode(c.path)),
    itemCount: getFolderAssetCount('/', false)
  }
})

// Create a new folder
const createAssetFolder = (name, parentPath = '/') => {
  if (!name || !name.trim()) return

  const sanitizedName = name.trim().replace(/[\/\\]/g, '-')
  const newPath = parentPath === '/' ? `/${sanitizedName}` : `${parentPath}/${sanitizedName}`

  // Check if folder already exists
  const existing = project.value.globalData.assetFolders.find(f => f.path === newPath)
  if (existing) {
    alert('Ya existe una carpeta con ese nombre')
    return
  }

  const newFolder = {
    id: Date.now(),
    path: newPath,
    name: sanitizedName,
    parentPath: parentPath,
    icon: '📁'
  }

  project.value.globalData.assetFolders.push(newFolder)
  newFolderName.value = ''
  console.log('[Editor] Carpeta creada:', newPath)
}

// Rename a folder
const renameAssetFolder = (folderId, newName) => {
  if (!newName || !newName.trim()) return

  const folders = project.value.globalData.assetFolders
  const folder = folders.find(f => f.id === folderId)
  if (!folder) return

  const sanitizedName = newName.trim().replace(/[\/\\]/g, '-')
  const oldPath = folder.path
  const newPath = folder.parentPath === '/'
    ? `/${sanitizedName}`
    : `${folder.parentPath}/${sanitizedName}`

  // Check if new path conflicts
  const conflict = folders.find(f => f.path === newPath && f.id !== folderId)
  if (conflict) {
    alert('Ya existe una carpeta con ese nombre')
    return
  }

  // Update folder
  folder.path = newPath
  folder.name = sanitizedName

  // Update all child folders
  folders.forEach(f => {
    if (f.path.startsWith(oldPath + '/')) {
      f.path = f.path.replace(oldPath, newPath)
    }
    if (f.parentPath === oldPath) {
      f.parentPath = newPath
    }
  })

  // Update all assets in this folder and children
  const assets = project.value.globalData.assets || []
  assets.forEach(asset => {
    if (asset.folderPath === oldPath) {
      asset.folderPath = newPath
    } else if (asset.folderPath && asset.folderPath.startsWith(oldPath + '/')) {
      asset.folderPath = asset.folderPath.replace(oldPath, newPath)
    }
  })

  renamingFolderId.value = null
  renamingFolderValue.value = ''
  console.log('[Editor] Carpeta renombrada:', oldPath, '->', newPath)
}

// Delete a folder (moves contents to parent)
const deleteAssetFolder = (folderId) => {
  const folders = project.value.globalData.assetFolders
  const folder = folders.find(f => f.id === folderId)
  if (!folder) return

  const folderPath = folder.path
  const parentPath = folder.parentPath

  // Confirm deletion
  const itemCount = getFolderAssetCount(folderPath, true)
  if (itemCount > 0) {
    if (!confirm(`Esta carpeta contiene ${itemCount} asset(s). El contenido se moverá a la carpeta padre. ¿Continuar?`)) {
      return
    }
  }

  // Move all assets in this folder to parent
  const assets = project.value.globalData.assets || []
  assets.forEach(asset => {
    if (asset.folderPath === folderPath) {
      asset.folderPath = parentPath
    }
  })

  // Move child folders to parent
  folders.forEach(f => {
    if (f.parentPath === folderPath) {
      f.parentPath = parentPath
      const folderName = f.name
      f.path = parentPath === '/' ? `/${folderName}` : `${parentPath}/${folderName}`
    }
  })

  // Remove the folder
  const idx = folders.findIndex(f => f.id === folderId)
  if (idx > -1) folders.splice(idx, 1)

  // Reset selection if deleted folder was selected
  if (selectedAssetFolder.value === folderPath) {
    selectedAssetFolder.value = parentPath
  }

  console.log('[Editor] Carpeta eliminada:', folderPath)
}

// Move an asset to a different folder
const moveAssetToFolder = (assetId, targetFolderPath) => {
  const asset = project.value.globalData.assets.find(a => a.id === assetId)
  if (asset) {
    asset.folderPath = targetFolderPath
    console.log('[Editor] Asset movido a carpeta:', assetId, '->', targetFolderPath)
  }
}

// Select folder (for upload and filtering)
const selectAssetFolder = (folderPath) => {
  selectedAssetFolder.value = folderPath
}

// Start renaming a folder
const startRenamingFolder = (folder) => {
  renamingFolderId.value = folder.id
  renamingFolderValue.value = folder.name
}

// Cancel folder renaming
const cancelRenamingFolder = () => {
  renamingFolderId.value = null
  renamingFolderValue.value = ''
}

// Get asset by ID
const getAssetById = (assetId) => {
  return project.value.globalData.assets.find(a => a.id === assetId)
}

// =====================
// BACKGROUND SCALING
// =====================
const showBackgroundScaleModal = ref(false)
const backgroundScaleMode = ref('cover') // 'cover' | 'contain' | 'stretch'
const isScalingBackground = ref(false)

// Check if current background needs scaling (dimensions don't match canvas)
const backgroundNeedsScaling = computed(() => {
  if (!currentScene.value?.background) return false
  const asset = getAssetById(currentScene.value.background)
  if (!asset) return false
  return asset.width !== currentScene.value.width || asset.height !== currentScene.value.height
})

// Get current background asset info
const currentBackgroundAsset = computed(() => {
  if (!currentScene.value?.background) return null
  return getAssetById(currentScene.value.background)
})

// Scale background image to fit canvas
const scaleBackgroundToCanvas = async () => {
  const asset = currentBackgroundAsset.value
  if (!asset) return

  isScalingBackground.value = true

  try {
    // Get a fresh URL from S3 (not cached) to ensure CORS works
    let url = null
    if (asset.s3Key) {
      console.log('[Editor] Getting fresh URL for:', asset.s3Key)
      url = await getAssetUrl(asset.s3Key)
    }
    if (!url) {
      url = getAssetDisplayUrl(asset)
    }
    if (!url) {
      throw new Error('No se pudo obtener la URL del asset')
    }

    console.log('[Editor] Fetching image from:', url.substring(0, 100) + '...')

    // Fetch image as blob with explicit CORS mode
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()
    console.log('[Editor] Image fetched, blob size:', blob.size)
    const blobUrl = URL.createObjectURL(blob)

    // Load the image from blob URL (no CORS issues)
    const img = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(blobUrl) // Clean up
        resolve(image)
      }
      image.onerror = (e) => {
        URL.revokeObjectURL(blobUrl)
        reject(e)
      }
      image.src = blobUrl
    })

    const canvasW = currentScene.value.width
    const canvasH = currentScene.value.height
    const imgW = img.width
    const imgH = img.height

    // Create canvas for scaling
    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')

    // Calculate scaling based on mode
    let sx = 0, sy = 0, sw = imgW, sh = imgH
    let dx = 0, dy = 0, dw = canvasW, dh = canvasH

    if (backgroundScaleMode.value === 'cover') {
      // Cover: fill entire canvas, may crop
      const scale = Math.max(canvasW / imgW, canvasH / imgH)
      const scaledW = imgW * scale
      const scaledH = imgH * scale
      dx = (canvasW - scaledW) / 2
      dy = (canvasH - scaledH) / 2
      dw = scaledW
      dh = scaledH
    } else if (backgroundScaleMode.value === 'contain') {
      // Contain: fit entire image, may have empty space (black bars)
      const scale = Math.min(canvasW / imgW, canvasH / imgH)
      const scaledW = imgW * scale
      const scaledH = imgH * scale
      dx = (canvasW - scaledW) / 2
      dy = (canvasH - scaledH) / 2
      dw = scaledW
      dh = scaledH
      // Fill background with dark color first
      ctx.fillStyle = '#0f0f23'
      ctx.fillRect(0, 0, canvasW, canvasH)
    }
    // 'stretch' uses default values (full image to full canvas)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)

    // Convert canvas to blob for upload
    const outputBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0))
    const file = new File([outputBlob], `${asset.name}_scaled_${canvasW}x${canvasH}.png`, { type: 'image/png' })

    // Upload as new asset
    const result = await uploadAssetToS3(file, currentUserId.value, projectId.value, asset.category || 'background')

    // Add new asset to project
    const newAsset = {
      id: Date.now(),
      name: `${asset.name} (${canvasW}×${canvasH})`,
      s3Key: result.s3Key,
      category: asset.category || 'background',
      folderPath: asset.folderPath || '/',
      width: canvasW,
      height: canvasH,
      type: 'image',
      contentType: 'image/png'
    }

    project.value.globalData.assets.push(newAsset)

    // Cache the URL
    assetUrlCache.value[result.s3Key] = result.url

    // Set as current background
    currentScene.value.background = newAsset.id

    showBackgroundScaleModal.value = false
    autoSaveProject()

    console.log('[Editor] Background scaled and saved:', newAsset.name)
  } catch (e) {
    console.error('[Editor] Error scaling background:', e)
    alert('Error al escalar la imagen: ' + e.message)
  } finally {
    isScalingBackground.value = false
  }
}

// Get display URL for an asset (from cache or S3 key)
const getAssetDisplayUrl = (asset) => {
  if (!asset) return null
  // Si tiene data base64 (legacy), usarla directamente
  if (asset.data && asset.data.startsWith('data:')) {
    return asset.data
  }
  // Si tiene s3Key, buscar en cache
  if (asset.s3Key && assetUrlCache.value[asset.s3Key]) {
    return assetUrlCache.value[asset.s3Key]
  }
  // Placeholder mientras carga
  return null
}

// Load URLs for all S3 assets
const loadAssetUrls = async () => {
  const assetsWithS3 = project.value.globalData.assets.filter(a => a.s3Key && !assetUrlCache.value[a.s3Key])
  if (assetsWithS3.length === 0) return

  const s3Keys = assetsWithS3.map(a => a.s3Key)
  try {
    const urls = await getAssetUrls(s3Keys)
    assetUrlCache.value = { ...assetUrlCache.value, ...urls }
    console.log('[Editor] URLs de assets cargadas:', Object.keys(urls).length)
  } catch (e) {
    console.error('[Editor] Error cargando URLs de assets:', e)
  }
}

// Upload asset from file (to S3)
const handleAssetUpload = async (file) => {
  if (!file || !file.type.startsWith('image/')) return

  // Obtener dimensiones de la imagen
  const getImageDimensions = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = () => resolve({ width: 0, height: 0 })
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  try {
    const { width, height } = await getImageDimensions(file)
    const category = selectedAssetCategory.value

    // Subir a S3 con categoría
    const { s3Key, url } = await uploadAssetToS3(file, currentUserId.value, project.value.id, category)

    // Crear asset con referencia a S3
    const asset = {
      id: Date.now(),
      name: file.name.replace(/\.[^.]+$/, ''),
      s3Key: s3Key,
      category: category,
      folderPath: selectedAssetFolder.value || '/',
      width: width,
      height: height,
      type: 'image',
      contentType: file.type
    }

    // Guardar URL en cache
    assetUrlCache.value[s3Key] = url

    // Agregar al proyecto
    project.value.globalData.assets.push(asset)
    console.log('[Editor] Asset subido a S3:', s3Key, 'categoría:', category)

    // Auto-guardar proyecto en MongoDB para persistir el asset
    await autoSaveProject()
  } catch (e) {
    console.error('[Editor] Error subiendo asset:', e)
    alert('Error subiendo imagen: ' + e.message)
  }
}

// Auto-save project to MongoDB
const autoSaveProject = async () => {
  if (!isUUID(project.value.id)) {
    console.log('[Editor] Proyecto no tiene UUID, no se puede auto-guardar')
    return
  }

  try {
    const projectData = {
      projectId: project.value.id,
      name: project.value.name,
      version: project.value.version,
      currentSceneId: project.value.currentSceneId,
      globalData: project.value.globalData,
      scenes: project.value.scenes
    }

    await saveProjectToApi(projectData, currentUserId.value)
    console.log('[Editor] Proyecto auto-guardado')
  } catch (e) {
    console.error('[Editor] Error auto-guardando proyecto:', e)
  }
}

// Handle file input change
const onAssetFileChange = (event) => {
  const files = event.target.files
  if (files) {
    Array.from(files).forEach(handleAssetUpload)
  }
  event.target.value = ''
}

// Handle drag/drop
const onAssetDragOver = (event) => {
  event.preventDefault()
  assetUploadDragging.value = true
}

const onAssetDragLeave = () => {
  assetUploadDragging.value = false
}

const onAssetDrop = (event) => {
  event.preventDefault()
  assetUploadDragging.value = false
  const files = event.dataTransfer.files
  if (files) {
    Array.from(files).forEach(handleAssetUpload)
  }
}

// Handle asset drag start (for moving between folders)
const handleAssetDragStart = (event, asset) => {
  event.dataTransfer.setData('application/json', JSON.stringify({
    type: 'asset',
    assetId: asset.id,
    sourcePath: asset.folderPath || '/'
  }))
  event.dataTransfer.effectAllowed = 'move'
}

// Handle folder drop (receiving dragged asset)
const handleFolderDrop = (event, targetFolderPath) => {
  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'))
    if (data.type === 'asset') {
      moveAssetToFolder(data.assetId, targetFolderPath)
    }
  } catch (e) {
    // Not a valid asset drag
  }
}

// Delete asset
const deleteAsset = async (assetId) => {
  const asset = project.value.globalData.assets.find(a => a.id === assetId)
  if (!asset) return

  // Si tiene s3Key, eliminar de S3
  if (asset.s3Key) {
    try {
      await deleteAssetFromS3(asset.s3Key, currentUserId.value, project.value.id)
      // Limpiar cache
      delete assetUrlCache.value[asset.s3Key]
      console.log('[Editor] Asset eliminado de S3:', asset.s3Key)
    } catch (e) {
      console.error('[Editor] Error eliminando de S3:', e)
    }
  }

  // Eliminar del proyecto
  const idx = project.value.globalData.assets.findIndex(a => a.id === assetId)
  if (idx > -1) {
    project.value.globalData.assets.splice(idx, 1)
    // Auto-guardar proyecto
    await autoSaveProject()
  }
}

// =====================
// AUDIO MANAGEMENT
// =====================
const showAudioManagerModal = ref(false)
const audioUploadDragging = ref(false)
const currentlyPlayingAudio = ref(null)  // { id, audioElement }

// Get audio asset by ID
const getAudioAssetById = (audioId) => {
  return project.value.globalData.audioAssets.find(a => a.id === audioId)
}

// Upload audio from file
const handleAudioUpload = (file) => {
  if (!file || !file.type.startsWith('audio/')) return

  const reader = new FileReader()
  reader.onload = (e) => {
    // Create audio element to get duration
    const audio = new Audio()
    audio.onloadedmetadata = () => {
      const audioAsset = {
        id: Date.now(),
        name: file.name.replace(/\.[^.]+$/, ''),
        data: e.target.result,
        duration: audio.duration,
        format: file.type.split('/')[1] || 'unknown',
        type: 'sfx'  // Default, can be changed to 'music'
      }
      project.value.globalData.audioAssets.push(audioAsset)
    }
    audio.src = e.target.result
  }
  reader.readAsDataURL(file)
}

// Handle audio file input change
const onAudioFileChange = (event) => {
  const files = event.target.files
  if (files) {
    Array.from(files).forEach(handleAudioUpload)
  }
  event.target.value = ''
}

// Handle audio drag/drop
const onAudioDragOver = (event) => {
  event.preventDefault()
  audioUploadDragging.value = true
}

const onAudioDragLeave = () => {
  audioUploadDragging.value = false
}

const onAudioDrop = (event) => {
  event.preventDefault()
  audioUploadDragging.value = false
  const files = event.dataTransfer.files
  if (files) {
    Array.from(files).forEach(handleAudioUpload)
  }
}

// Delete audio asset
const deleteAudioAsset = (audioId) => {
  // Stop if currently playing
  if (currentlyPlayingAudio.value?.id === audioId) {
    stopAudioPreview()
  }
  const idx = project.value.globalData.audioAssets.findIndex(a => a.id === audioId)
  if (idx > -1) {
    project.value.globalData.audioAssets.splice(idx, 1)
  }
}

// Play audio preview
const playAudioPreview = (audioAsset) => {
  // Stop any currently playing audio
  stopAudioPreview()

  const audio = new Audio(audioAsset.data)
  audio.volume = 0.5
  audio.onended = () => {
    currentlyPlayingAudio.value = null
  }
  audio.play()
  currentlyPlayingAudio.value = { id: audioAsset.id, audioElement: audio }
}

// Stop audio preview
const stopAudioPreview = () => {
  if (currentlyPlayingAudio.value?.audioElement) {
    currentlyPlayingAudio.value.audioElement.pause()
    currentlyPlayingAudio.value.audioElement.currentTime = 0
  }
  currentlyPlayingAudio.value = null
}

// Format duration as mm:ss
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Get light icon by type
const getLightIcon = (type) => {
  const found = lightTypes.find(lt => lt.id === type)
  return found ? found.icon : '💡'
}

// Get particle icon by preset
const getParticleIcon = (preset) => {
  return particlePresets[preset]?.icon || '✨'
}

// Apply particle preset
const applyParticlePreset = (emitter, presetName) => {
  const preset = particlePresets[presetName]
  if (!preset) return

  emitter.preset = presetName
  emitter.emitRate = preset.emitRate
  emitter.lifetime = { ...preset.lifetime }
  emitter.speed = { ...preset.speed }
  emitter.direction = { ...preset.direction }
  emitter.gravity = preset.gravity
  emitter.size = { ...preset.size }
  emitter.color = { ...preset.color }
  emitter.shape = preset.shape
}

// Delete selected light
const deleteSelectedLight = () => {
  if (selectedElements.value.length === 0 || selectedElements.value[0].type !== 'light') return

  const lightId = selectedElements.value[0].element.id
  const idx = currentScene.value.lighting.lights.findIndex(l => l.id === lightId)
  if (idx > -1) {
    currentScene.value.lighting.lights.splice(idx, 1)
    selectedElements.value = []
  }
}

// Delete selected particle emitter
const deleteSelectedParticle = () => {
  if (selectedElements.value.length === 0 || selectedElements.value[0].type !== 'particle') return

  const emitterId = selectedElements.value[0].element.id
  const idx = currentScene.value.particles.findIndex(p => p.id === emitterId)
  if (idx > -1) {
    currentScene.value.particles.splice(idx, 1)
    // Clean up active particles
    delete activeParticles.value[emitterId]
    selectedElements.value = []
  }
}

// =====================
// CONTEXT MENU & GROUPS
// =====================

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0
})

// Get group for an element
const getElementGroup = (type, elementId) => {
  if (!currentScene.value.groups || !Array.isArray(currentScene.value.groups)) return null
  if (!type || elementId === undefined || elementId === null) return null

  return currentScene.value.groups.find(g => {
    if (!g || !g.members || !Array.isArray(g.members)) return false
    return g.members.some(m => {
      if (!m || !m.type || m.id === undefined || m.id === null) return false
      // Use == for comparison to handle string/number differences
      return m.type === type && String(m.id) === String(elementId)
    })
  })
}

// Check if element is in a group
const isElementInGroup = (type, elementId) => {
  if (!type || elementId === undefined || elementId === null) return false
  const group = getElementGroup(type, elementId)
  // Use !! to properly convert to boolean (undefined/null both become false)
  return !!group
}

// Create a new group from selected elements
const createGroup = () => {
  if (selectedElements.value.length < 2) return

  if (!currentScene.value.groups) {
    currentScene.value.groups = []
  }

  const newGroup = {
    id: 'group-' + Date.now(),
    name: 'New Group',
    members: selectedElements.value.map(sel => ({
      type: sel.type,
      id: sel.element.id
    })),
    locked: false
  }

  currentScene.value.groups.push(newGroup)
  closeContextMenu()
}

// Ungroup selected elements - removes ALL groups containing any selected element
const ungroupSelected = () => {
  if (selectedElements.value.length === 0) return
  if (!currentScene.value.groups) return

  // Find all groups that contain any of the selected elements
  const groupsToRemove = new Set()
  selectedElements.value.forEach(sel => {
    const group = getElementGroup(sel.type, sel.element.id)
    if (group) {
      groupsToRemove.add(group.id)
    }
  })

  // Remove those groups
  currentScene.value.groups = currentScene.value.groups.filter(g => !groupsToRemove.has(g.id))
  closeContextMenu()
}

// Clear ALL groups in the current scene
const clearAllGroups = () => {
  currentScene.value.groups = []
  closeContextMenu()
}

// Select all elements in the same group
const selectGroup = () => {
  if (selectedElements.value.length === 0) return

  const firstSelected = selectedElements.value[0]
  const group = getElementGroup(firstSelected.type, firstSelected.element.id)

  if (group) {
    const newSelection = []

    group.members.forEach(member => {
      const element = getElementByTypeAndId(member.type, member.id)
      if (element) {
        newSelection.push({ type: member.type, element })
      }
    })

    selectedElements.value = newSelection
  }
  closeContextMenu()
}

// Get element by type and ID
const getElementByTypeAndId = (type, id) => {
  switch (type) {
    case 'image': return currentScene.value.images.find(e => e.id === id)
    case 'walkbox': return currentScene.value.walkboxes.find(e => e.id === id)
    case 'exit': return currentScene.value.exits.find(e => e.id === id)
    case 'actor': return currentScene.value.actorPlacements.find(e => e.id === id)
    case 'hotspot': return currentScene.value.hotspots.find(e => e.id === id)
    case 'zplane': return currentScene.value.zplanes.find(e => e.id === id)
    case 'light': return currentScene.value.lighting?.lights.find(e => e.id === id)
    case 'particle': return currentScene.value.particles.find(e => e.id === id)
    default: return null
  }
}

// Duplicate selected elements
const duplicateSelected = () => {
  if (selectedElements.value.length === 0) return

  const newSelection = []
  const offset = 20

  selectedElements.value.forEach(sel => {
    const original = sel.element
    const newId = Date.now() + Math.random()

    // Deep clone the element
    const duplicate = JSON.parse(JSON.stringify(original))
    duplicate.id = newId
    duplicate.name = (original.name || sel.type) + ' (copy)'

    // Offset position
    if (duplicate.x !== undefined) duplicate.x += offset
    if (duplicate.y !== undefined) duplicate.y += offset
    if (duplicate.points) {
      duplicate.points = duplicate.points.map(p => ({ x: p.x + offset, y: p.y + offset }))
    }

    // Add to appropriate array
    switch (sel.type) {
      case 'image': currentScene.value.images.push(duplicate); break
      case 'walkbox': currentScene.value.walkboxes.push(duplicate); break
      case 'exit': currentScene.value.exits.push(duplicate); break
      case 'actor': currentScene.value.actorPlacements.push(duplicate); break
      case 'hotspot': currentScene.value.hotspots.push(duplicate); break
      case 'zplane': currentScene.value.zplanes.push(duplicate); break
      case 'light': currentScene.value.lighting.lights.push(duplicate); break
      case 'particle': currentScene.value.particles.push(duplicate); break
    }

    newSelection.push({ type: sel.type, element: duplicate })
  })

  selectedElements.value = newSelection
  closeContextMenu()
}

// Delete selected elements
const deleteSelected = () => {
  selectedElements.value.forEach(sel => {
    switch (sel.type) {
      case 'image':
        const imgIdx = currentScene.value.images.findIndex(e => e.id === sel.element.id)
        if (imgIdx > -1) currentScene.value.images.splice(imgIdx, 1)
        break
      case 'walkbox':
        const wbIdx = currentScene.value.walkboxes.findIndex(e => e.id === sel.element.id)
        if (wbIdx > -1) currentScene.value.walkboxes.splice(wbIdx, 1)
        break
      case 'exit':
        const exIdx = currentScene.value.exits.findIndex(e => e.id === sel.element.id)
        if (exIdx > -1) currentScene.value.exits.splice(exIdx, 1)
        break
      case 'actor':
        const acIdx = currentScene.value.actorPlacements.findIndex(e => e.id === sel.element.id)
        if (acIdx > -1) currentScene.value.actorPlacements.splice(acIdx, 1)
        break
      case 'hotspot':
        const hsIdx = currentScene.value.hotspots.findIndex(e => e.id === sel.element.id)
        if (hsIdx > -1) currentScene.value.hotspots.splice(hsIdx, 1)
        break
      case 'zplane':
        const zpIdx = currentScene.value.zplanes.findIndex(e => e.id === sel.element.id)
        if (zpIdx > -1) currentScene.value.zplanes.splice(zpIdx, 1)
        break
      case 'light':
        const ltIdx = currentScene.value.lighting.lights.findIndex(e => e.id === sel.element.id)
        if (ltIdx > -1) currentScene.value.lighting.lights.splice(ltIdx, 1)
        break
      case 'particle':
        const ptIdx = currentScene.value.particles.findIndex(e => e.id === sel.element.id)
        if (ptIdx > -1) currentScene.value.particles.splice(ptIdx, 1)
        break
    }

    // Also remove from any group
    if (currentScene.value.groups) {
      currentScene.value.groups.forEach(group => {
        const memberIdx = group.members.findIndex(m => m.type === sel.type && m.id === sel.element.id)
        if (memberIdx > -1) group.members.splice(memberIdx, 1)
      })
      // Clean up empty groups
      currentScene.value.groups = currentScene.value.groups.filter(g => g.members.length > 0)
    }
  })

  selectedElements.value = []
  closeContextMenu()
}

// Show context menu
const showContextMenu = (event) => {
  event.preventDefault()

  // Only show context menu if there are selected elements
  if (selectedElements.value.length === 0) return

  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY
  }
}

// Show context menu for a specific element (right-click on element)
const showElementContextMenu = (event, type, element) => {
  event.preventDefault()
  event.stopPropagation()

  // If the element is not selected, select it (replacing current selection)
  const isSelected = selectedElements.value.some(
    s => s.type === type && s.element.id === element.id
  )

  if (!isSelected) {
    // If Ctrl/Cmd is held, add to selection instead of replacing
    if (event.ctrlKey || event.metaKey) {
      selectedElements.value = [...selectedElements.value, { type, element }]
    } else {
      selectedElements.value = [{ type, element }]
    }
  }

  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY
  }
}

// Close context menu
const closeContextMenu = () => {
  contextMenu.value.visible = false
}

// Handle click outside to close context menu
const handleGlobalClick = (event) => {
  if (contextMenu.value.visible) {
    closeContextMenu()
  }
}

// Check if current selection can be grouped
const canGroup = computed(() => {
  return selectedElements.value.length >= 2
})

// Check if current selection is in a group
const selectionInGroup = computed(() => {
  if (selectedElements.value.length === 0) return false
  const first = selectedElements.value[0]
  return isElementInGroup(first.type, first.element.id)
})

// Get the group of current selection
const selectedGroup = computed(() => {
  if (selectedElements.value.length === 0) return null
  const first = selectedElements.value[0]
  return getElementGroup(first.type, first.element.id)
})

// =====================
// PARALLAX SYSTEM
// =====================

// Camera state for parallax effect
const cameraPosition = ref({ x: 0, y: 0 })
const parallaxScrollOffsets = ref({}) // { imageId: { x, y } } for auto-scroll

// Ensure parallax defaults exist on an image
const ensureParallaxDefaults = (image) => {
  if (!image.parallax) {
    image.parallax = {
      enabled: false,
      depth: 1.0,
      repeatX: false,
      repeatY: false,
      autoScrollX: 0,
      autoScrollY: 0
    }
  }
}

// Calculate parallax offset for an image
const getParallaxOffset = (image) => {
  if (!image.parallax?.enabled) return { x: 0, y: 0 }

  const depth = image.parallax.depth
  const autoOffset = parallaxScrollOffsets.value[image.id] || { x: 0, y: 0 }

  // Parallax offset based on camera position and depth
  // depth < 1: moves slower than camera (far background)
  // depth = 1: moves with camera (normal)
  // depth > 1: moves faster than camera (foreground)
  const parallaxX = cameraPosition.value.x * (1 - depth)
  const parallaxY = cameraPosition.value.y * (1 - depth)

  return {
    x: parallaxX + autoOffset.x,
    y: parallaxY + autoOffset.y
  }
}

// Get style for parallax image rendering
const getParallaxImageStyle = (image) => {
  const offset = getParallaxOffset(image)
  const asset = image.assetId ? getAssetById(image.assetId) : null

  let style = {
    left: (image.x + offset.x) * zoom.value + 'px',
    top: (image.y + offset.y) * zoom.value + 'px',
    width: image.w * zoom.value + 'px',
    height: image.h * zoom.value + 'px',
    transform: `rotate(${image.rotation || 0}deg)`
  }

  if (asset) {
    const assetUrl = getAssetDisplayUrl(asset)
    if (assetUrl) {
      style.backgroundImage = `url(${assetUrl})`
    }
    style.backgroundSize = image.parallax?.repeatX || image.parallax?.repeatY ? `${image.w * zoom.value}px ${image.h * zoom.value}px` : 'contain'
    style.backgroundPosition = 'center'
    style.backgroundRepeat = image.parallax?.repeatX && image.parallax?.repeatY ? 'repeat'
      : image.parallax?.repeatX ? 'repeat-x'
      : image.parallax?.repeatY ? 'repeat-y'
      : 'no-repeat'
  }

  return style
}

// Update parallax auto-scroll offsets
const updateParallaxAutoScroll = (deltaTime) => {
  if (!currentScene.value?.images) return

  currentScene.value.images.forEach(image => {
    if (image.parallax?.enabled && (image.parallax.autoScrollX || image.parallax.autoScrollY)) {
      if (!parallaxScrollOffsets.value[image.id]) {
        parallaxScrollOffsets.value[image.id] = { x: 0, y: 0 }
      }

      const offset = parallaxScrollOffsets.value[image.id]
      offset.x += image.parallax.autoScrollX * deltaTime
      offset.y += image.parallax.autoScrollY * deltaTime

      // Wrap around for tiling images
      if (image.parallax.repeatX && Math.abs(offset.x) > image.w) {
        offset.x = offset.x % image.w
      }
      if (image.parallax.repeatY && Math.abs(offset.y) > image.h) {
        offset.y = offset.y % image.h
      }
    }
  })
}

// Update camera position (for Play Mode - follows player)
const updateCameraForPlayer = () => {
  if (!playMode.value || !playModeState.value.playerActorId) return

  const playerX = playModeState.value.playerPosition.x
  const playerY = playModeState.value.playerPosition.y

  // Center camera on player with some deadzone
  const targetX = playerX - currentScene.value.width / 2
  const targetY = playerY - currentScene.value.height / 2

  // Smooth camera follow
  cameraPosition.value.x += (targetX - cameraPosition.value.x) * 0.1
  cameraPosition.value.y += (targetY - cameraPosition.value.y) * 0.1

  // Clamp camera to scene bounds (optional - for larger scenes)
  // cameraPosition.value.x = Math.max(0, Math.min(cameraPosition.value.x, currentScene.value.width - 1280))
  // cameraPosition.value.y = Math.max(0, Math.min(cameraPosition.value.y, currentScene.value.height - 720))
}

// Integrate parallax updates into particle loop (reuse existing animation frame)
let lastParallaxTime = 0
const updateParallaxInLoop = (currentTime) => {
  if (lastParallaxTime === 0) lastParallaxTime = currentTime
  const deltaTime = (currentTime - lastParallaxTime) / 1000
  lastParallaxTime = currentTime

  updateParallaxAutoScroll(deltaTime)
  if (playMode.value) {
    updateCameraForPlayer()
  }
}

// Get all scene objects (for puzzle targeting)
const getAllSceneObjects = computed(() => {
  const objects = []
  currentScene.value.hotspots.forEach(h => objects.push({ type: 'hotspot', id: h.id, name: h.name }))
  currentScene.value.images.forEach(i => objects.push({ type: 'image', id: i.id, name: i.name }))
  currentScene.value.exits.forEach(e => objects.push({ type: 'exit', id: e.id, name: e.name }))
  return objects
})

// Puzzle helper functions
const addPuzzleHint = (puzzle) => {
  if (!puzzle.hints) puzzle.hints = []
  puzzle.hints.push({ afterAttempts: puzzle.hints.length + 1, text: '' })
}

const removePuzzleHint = (puzzle, index) => {
  puzzle.hints.splice(index, 1)
}

const addConditionItem = (puzzle) => {
  if (!puzzle.conditions.items) puzzle.conditions.items = []
  puzzle.conditions.items.push(null)
}

const removeConditionItem = (puzzle, index) => {
  puzzle.conditions.items.splice(index, 1)
}

const addSequenceStep = (puzzle) => {
  if (!puzzle.conditions.sequence) puzzle.conditions.sequence = []
  puzzle.conditions.sequence.push('')
}

const removeSequenceStep = (puzzle, index) => {
  puzzle.conditions.sequence.splice(index, 1)
}

const addResultRemoveItem = (puzzle) => {
  if (!puzzle.result.removeItems) puzzle.result.removeItems = []
  puzzle.result.removeItems.push(null)
}

const removeResultRemoveItem = (puzzle, index) => {
  puzzle.result.removeItems.splice(index, 1)
}

// Toggle item useWith types
const toggleUseWith = (item, type) => {
  if (!item.useWith) item.useWith = []
  const index = item.useWith.indexOf(type)
  if (index > -1) {
    item.useWith.splice(index, 1)
  } else {
    item.useWith.push(type)
  }
}

// Toggle correct choice for dialog puzzles
const toggleCorrectChoice = (puzzle, choiceId) => {
  if (!puzzle.conditions.correctChoices) puzzle.conditions.correctChoices = []
  const index = puzzle.conditions.correctChoices.indexOf(choiceId)
  if (index > -1) {
    puzzle.conditions.correctChoices.splice(index, 1)
  } else {
    puzzle.conditions.correctChoices.push(choiceId)
  }
}

// Actor animation preview interval
let actorPreviewInterval = null

const startActorAnimationPreview = () => {
  if (actorPreviewInterval) return
  actorPreviewInterval = setInterval(() => {
    // Animate actor placements in current scene
    currentScene.value.actorPlacements.forEach(placement => {
      const anim = getActorPlacementAnimation(placement)
      if (anim && anim.frames.length > 0) {
        const current = actorPreviewFrames.value[placement.id] || 0
        actorPreviewFrames.value[placement.id] = (current + 1) % anim.frames.length
      }
    })

    // Also animate player actor in play mode
    if (playMode.value && playModeState.value.playerActorId) {
      const playerAnim = getPlayerCurrentAnimation()
      if (playerAnim && playerAnim.frames.length > 0) {
        const actorId = playModeState.value.playerActorId
        const current = actorPreviewFrames.value[actorId] || 0
        actorPreviewFrames.value[actorId] = (current + 1) % playerAnim.frames.length
      }
    }
  }, 1000 / 12) // 12 FPS
}

const stopActorAnimationPreview = () => {
  if (actorPreviewInterval) {
    clearInterval(actorPreviewInterval)
    actorPreviewInterval = null
  }
}

// =====================
// WALKBOX RESIZE SYSTEM
// =====================

// Get center point of walkbox for label positioning
const getWalkboxCenter = (wb) => {
  const sumX = wb.points.reduce((sum, p) => sum + p.x, 0)
  const sumY = wb.points.reduce((sum, p) => sum + p.y, 0)
  return {
    x: sumX / wb.points.length,
    y: sumY / wb.points.length
  }
}

// Vertex drag state
const isDraggingVertex = ref(false)
const vertexDragState = ref({
  walkbox: null,
  vertexIndex: null,
  startX: 0,
  startY: 0,
  originalX: 0,
  originalY: 0
})

// Start dragging a vertex
const startVertexDrag = (event, walkbox, vertexIndex) => {
  event.preventDefault()
  event.stopPropagation()

  isDraggingVertex.value = true
  const coords = getSceneCoords(event)
  const point = walkbox.points[vertexIndex]

  vertexDragState.value = {
    walkbox,
    vertexIndex,
    startX: coords.x,
    startY: coords.y,
    originalX: point.x,
    originalY: point.y
  }

  document.addEventListener('mousemove', onVertexDragMove)
  document.addEventListener('mouseup', onVertexDragEnd)
}

// Handle vertex drag movement
const onVertexDragMove = (event) => {
  if (!isDraggingVertex.value || !vertexDragState.value.walkbox) return

  const coords = getSceneCoords(event)
  const dx = coords.x - vertexDragState.value.startX
  const dy = coords.y - vertexDragState.value.startY

  const newX = Math.max(0, Math.min(currentScene.value.width, vertexDragState.value.originalX + dx))
  const newY = Math.max(0, Math.min(currentScene.value.height, vertexDragState.value.originalY + dy))

  vertexDragState.value.walkbox.points[vertexDragState.value.vertexIndex].x = newX
  vertexDragState.value.walkbox.points[vertexDragState.value.vertexIndex].y = newY
}

// End vertex dragging
const onVertexDragEnd = () => {
  isDraggingVertex.value = false
  vertexDragState.value = {
    walkbox: null,
    vertexIndex: null,
    startX: 0,
    startY: 0,
    originalX: 0,
    originalY: 0
  }

  document.removeEventListener('mousemove', onVertexDragMove)
  document.removeEventListener('mouseup', onVertexDragEnd)
}

// Add a new vertex on an edge
const addWalkboxVertex = (walkbox, edgeIndex, event) => {
  event.preventDefault()
  event.stopPropagation()

  // Get the two points of this edge
  const p1 = walkbox.points[edgeIndex]
  const p2 = walkbox.points[(edgeIndex + 1) % walkbox.points.length]

  // Calculate midpoint of the edge (more reliable than mouse position)
  const midX = Math.round((p1.x + p2.x) / 2)
  const midY = Math.round((p1.y + p2.y) / 2)

  // Insert new point after edgeIndex
  walkbox.points.splice(edgeIndex + 1, 0, {
    x: midX,
    y: midY
  })

  console.log(`[Walkbox] Added vertex at (${midX}, ${midY}) on edge ${edgeIndex}`)
}

// Remove a vertex (minimum 3 vertices required)
const removeWalkboxVertex = (walkbox, vertexIndex) => {
  if (walkbox.points.length <= 3) return

  walkbox.points.splice(vertexIndex, 1)
}

// =====================
// INTERACTION SYSTEM
// =====================

// Add a new interaction to an element (hotspot, image)
const addInteraction = (element) => {
  if (!element.interactions) {
    element.interactions = []
  }

  element.interactions.push({
    verbId: null,
    action: 'dialog',
    params: {
      text: '',
      actorId: null
    },
    hasCondition: false,
    condition: {
      varName: '',
      operator: '==',
      value: ''
    }
  })
}

// Remove an interaction from an element
const removeInteraction = (element, index) => {
  if (element.interactions && element.interactions.length > index) {
    element.interactions.splice(index, 1)
  }
}

// Get verb by ID
const getVerbById = (verbId) => {
  return project.value.globalData.verbs.find(v => v.id === verbId)
}

// Canvas click handler (deselect when clicking empty area)
const onCanvasClick = (event) => {
  // Deselect if clicking on empty areas (not on an element)
  const clickedOnElement = event.target.closest('.element-rect')
  if (!clickedOnElement) {
    selectedElements.value = []
  }
}

// =====================
// AI PANEL - Claude Integration
// =====================
const {
  connect: claudeConnect,
  disconnect: claudeDisconnect,
  generateProject: claudeGenerateProject,
  isConnected: claudeIsConnected,
  isRegistered: claudeIsRegistered,
  isGenerating: claudeIsGenerating,
  lastError: claudeLastError
} = useClaudeSocket()

// AI Panel state
const aiPanelOpen = ref(false)
const aiScript = ref('')
const aiStatus = ref('idle') // idle, connecting, generating, complete, error
const aiStatusMessage = ref('')

// Sample script template
const sampleScript = `# MI JUEGO DE AVENTURAS
Género: Mystery
Tono: Noir, misterioso

---

## PERSONAJES

### DETECTIVE
- Rol: Protagonista
- Descripción: Hombre de 40 años, gabardina gris, cínico
- Ubicación inicial: Oficina

### SECRETARIA
- Rol: NPC
- Descripción: Mujer joven, eficiente, sabe más de lo que dice
- Ubicación inicial: Recepción

---

## ITEMS

### LLAVE_CAJÓN
- Descripción: Una pequeña llave de latón
- Icono: 🔑
- Usar en: hotspot

### CARTA_MISTERIOSA
- Descripción: Una carta con amenazas
- Icono: ✉️
- Examinar: "Dice: Te estoy vigilando..."

---

## ESCENAS

### Oficina del Detective
Descripción: Oficina desordenada, humo de cigarro, luz tenue
Música: jazz_noir
Iluminación: Tenue, lámpara de escritorio

#### Elementos:
- Escritorio (hotspot) → Examinar papeles
- Cajón cerrado (hotspot) → Necesita LLAVE_CAJÓN
- Puerta (exit) → Recepción
- Ventana (decorativo) + luz ambiental

### Recepción
Descripción: Recepción elegante pero deteriorada
Música: jazz_suave

#### Elementos:
- Escritorio de secretaria (hotspot) → Hablar con secretaria
- Puerta oficina (exit) → Oficina del Detective
- Maceta (hotspot) → Esconde LLAVE_CAJÓN

---

## DIÁLOGOS

### Hablar con Secretaria
Actor: SECRETARIA

[DETECTIVE] "Buenos días. ¿Algún mensaje?"
[SECRETARIA] "Nada importante, jefe. Solo... tenga cuidado."

Opciones:
  → "¿Cuidado con qué?" → Revela pista
  → "Gracias" → Termina

---

## PUZZLES

### Abrir el cajón
Tipo: use-on-object
Requiere: LLAVE_CAJÓN en cajón cerrado
Resultado: Obtener CARTA_MISTERIOSA
Pista: "Este cajón está cerrado con llave..."`

// Open AI Panel
const openAiPanel = async () => {
  aiPanelOpen.value = true

  // Connect to WebSocket if not connected
  if (!claudeIsConnected.value) {
    aiStatus.value = 'connecting'
    aiStatusMessage.value = 'Conectando al servidor de IA...'

    try {
      // Use project ID as user ID for now (can be replaced with real auth)
      await claudeConnect(projectId.value || 'anonymous')
      aiStatus.value = 'idle'
      aiStatusMessage.value = 'Conectado. Escribe tu script y presiona Generar.'
    } catch (error) {
      aiStatus.value = 'error'
      aiStatusMessage.value = 'Error de conexión: ' + error.message
    }
  }
}

// Close AI Panel
const closeAiPanel = () => {
  aiPanelOpen.value = false
}

// Load sample script
const loadSampleScript = () => {
  aiScript.value = sampleScript
}

// Generate project from script
const handleAiGenerate = async () => {
  if (!aiScript.value.trim()) {
    aiStatus.value = 'error'
    aiStatusMessage.value = 'Escribe un script primero'
    return
  }

  aiStatus.value = 'generating'
  aiStatusMessage.value = 'Generando proyecto con Claude...'

  try {
    const generatedProject = await claudeGenerateProject(aiScript.value, {
      projectId: projectId.value !== 'new' ? projectId.value : null,
      onStarted: () => {
        aiStatusMessage.value = 'Claude está procesando tu script...'
      }
    })

    // Load generated project
    loadGeneratedProject(generatedProject)

    aiStatus.value = 'complete'
    aiStatusMessage.value = 'Proyecto generado exitosamente!'

    // Close panel after 2 seconds
    setTimeout(() => {
      aiPanelOpen.value = false
      aiStatus.value = 'idle'
    }, 2000)

  } catch (error) {
    aiStatus.value = 'error'
    aiStatusMessage.value = 'Error: ' + error.message
  }
}

// Load generated project into editor
const loadGeneratedProject = (generatedProject) => {
  if (!generatedProject) return

  // Update project data
  project.value.name = generatedProject.name || project.value.name
  project.value.version = generatedProject.version || '1.0.0'

  // Update global data
  if (generatedProject.globalData) {
    if (generatedProject.globalData.actors) {
      project.value.globalData.actors = generatedProject.globalData.actors
    }
    if (generatedProject.globalData.items) {
      project.value.globalData.items = generatedProject.globalData.items
    }
    if (generatedProject.globalData.verbs) {
      project.value.globalData.verbs = generatedProject.globalData.verbs
    }
    if (generatedProject.globalData.inventory) {
      project.value.globalData.inventory = generatedProject.globalData.inventory
    }
    if (generatedProject.globalData.variables) {
      project.value.globalData.variables = generatedProject.globalData.variables
    }
  }

  // Update scenes
  if (generatedProject.scenes && generatedProject.scenes.length > 0) {
    project.value.scenes = generatedProject.scenes.map((scene, index) => ({
      ...scene,
      id: scene.id || `scene-${Date.now()}-${index}`,
      width: scene.width || DEFAULT_WIDTH,
      height: scene.height || DEFAULT_HEIGHT,
      // Ensure all required arrays exist
      images: scene.images || [],
      walkboxes: scene.walkboxes || [],
      exits: scene.exits || [],
      actorPlacements: scene.actorPlacements || [],
      hotspots: scene.hotspots || [],
      zplanes: scene.zplanes || [],
      dialogs: scene.dialogs || [],
      puzzles: scene.puzzles || [],
      sfx: scene.sfx || [],
      music: scene.music || [],
      cutscenes: scene.cutscenes || [],
      animations: scene.animations || [],
      lighting: scene.lighting || { ambient: { color: '#ffffff', intensity: 1.0 }, lights: [] },
      particles: scene.particles || [],
      groups: scene.groups || []
    }))

    // Set current scene to first scene
    project.value.currentSceneId = project.value.scenes[0].id
  }

  // Clear selection and reset history
  selectedElements.value = []
  history.value = [deepClone(currentScene.value)]
  historyIndex.value = 0

  // Trigger save
  saveStatus.value = 'unsaved'
}

// Cleanup on unmount
onUnmounted(() => {
  // Mark as unmounted to prevent any pending operations
  isMounted = false

  // Clear pending timeout to prevent accessing destroyed refs
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }

  // Clear MongoDB auto-save timeout
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = null
  }

  // Clear localStorage auto-save timeout
  if (localStorageSaveTimeout) {
    clearTimeout(localStorageSaveTimeout)
    localStorageSaveTimeout = null
  }

  // Final save before leaving
  if (saveStatus.value === 'unsaved') {
    saveProjectToStorage()
  }

  // Stop any playing audio
  stopAudioPreview()

  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.removeEventListener('mousemove', onVertexDragMove)
  document.removeEventListener('mouseup', onVertexDragEnd)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleGlobalClick)
  stopActorAnimationPreview()
  stopParticleLoop()

  // Disconnect Claude WebSocket
  claudeDisconnect()
})
</script>

<template>
  <div class="editor-container">
    <!-- Header -->
    <header class="editor-header">
      <div class="header-left">
        <button class="back-btn" @click="router.push('/dashboard')">← BACK</button>
        <div class="project-info">
          <input
            v-model="projectName"
            class="project-name-input"
            type="text"
          />
        </div>
      </div>
      <div class="header-center">
        <!-- Scene Tabs -->
        <SceneTabs
          :scenes="availableScenes"
          :current-scene-id="project.currentSceneId"
          :can-delete="project.scenes.length > 1"
          @switch="switchScene"
          @new="createNewScene"
          @rename="openRenameSceneModal"
          @duplicate="duplicateCurrentScene"
          @delete="deleteCurrentScene"
        />
      </div>
      <div class="header-right">
        <button class="header-btn undo-btn" @click="undo" :disabled="!canUndo" title="Undo (Ctrl+Z)">↩</button>
        <button class="header-btn redo-btn" @click="redo" :disabled="!canRedo" title="Redo (Ctrl+Shift+Z)">↪</button>
        <span class="header-separator">|</span>
        <div class="save-status" :class="saveStatus" :title="'Last saved: ' + formatLastSaved">
          <span class="save-indicator"></span>
          <span class="save-text">{{ saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : formatLastSaved }}</span>
        </div>
        <button class="header-btn" @click="handleSave" title="Save (Auto-save enabled)">💾</button>
        <button class="header-btn" @click="handleExport" title="Export Project">📦</button>
        <button class="header-btn" @click="handleImport" title="Import Project">📂</button>
        <span class="header-separator">|</span>
        <button class="header-btn ai-btn" @click="openAiPanel" title="AI Assistant - Generate from Script">🤖 AI</button>
        <button class="header-btn map-btn" @click="openSceneMap" title="Scene Map">🗺️ MAP</button>
        <button class="header-btn play-btn" @click="enterPlayMode" title="Play Mode (Test Game)">▶️ PLAY</button>
      </div>
    </header>

    <!-- Main editor area -->
    <div class="editor-main">
      <!-- Left Panel - Elements -->
      <aside class="panel left-panel pixel-border" :class="{ open: leftPanelOpen }">
        <div class="panel-tab left-tab" @click="leftPanelOpen = !leftPanelOpen">
          <span class="tab-text">Elements</span>
          <span class="tab-arrow">{{ leftPanelOpen ? '◀' : '▶' }}</span>
        </div>
        <div class="panel-header">
          <h3 class="panel-title">Elements</h3>
        </div>

        <div class="panel-content pixel-scrollbar">
          <!-- Images Section (now includes interactive objects) -->
          <div class="element-section" :class="{ collapsed: collapsedSections.images }">
            <div class="section-header" @click="toggleSection('images')">
              <span class="collapse-icon">{{ collapsedSections.images ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('image', 'images')"
                :indeterminate="isSomeSelectedOfType('image', 'images')"
                @click.stop="selectAllOfType('image', 'images')"
                title="Select all"
              />
              <span class="section-icon text-image">🖼</span>
              <span class="section-name">Images</span>
              <span class="section-count">{{ elementCounts.images }}</span>
              <button
                class="visibility-btn"
                :class="{ hidden: !visibleTypes.images }"
                @click.stop="toggleVisibility('images')"
                title="Toggle visibility"
              >{{ visibleTypes.images ? '👁' : '👁' }}</button>
              <button class="add-btn" @click.stop="handleAddElement('image')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.images">
              <div
                v-for="img in currentScene.images"
                :key="img.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'image' && s.element.id === img.id) }"
                @click="handleSelectElement('image', img)"
              >
                <span class="item-icon text-image">🖼</span>
                <span class="item-id">#{{ img.id }}</span>
                <span class="item-name">{{ img.name }}</span>
                <span v-if="img.interactive" class="item-badge interactive">⚡</span>
              </div>
            </div>
          </div>

          <!-- Walkboxes Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.walkboxes }">
            <div class="section-header" @click="toggleSection('walkboxes')">
              <span class="collapse-icon">{{ collapsedSections.walkboxes ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('walkbox', 'walkboxes')"
                :indeterminate="isSomeSelectedOfType('walkbox', 'walkboxes')"
                @click.stop="selectAllOfType('walkbox', 'walkboxes')"
                title="Select all"
              />
              <span class="section-icon text-walkbox">▢</span>
              <span class="section-name">Walkboxes</span>
              <span class="section-count">{{ elementCounts.walkboxes }}</span>
              <button
                class="visibility-btn"
                :class="{ hidden: !visibleTypes.walkboxes }"
                @click.stop="toggleVisibility('walkboxes')"
                title="Toggle visibility"
              >{{ visibleTypes.walkboxes ? '👁' : '👁' }}</button>
              <button class="add-btn" @click.stop="handleAddElement('walkbox')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.walkboxes">
              <div
                v-for="wb in currentScene.walkboxes"
                :key="wb.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'walkbox' && s.element.id === wb.id) }"
                @click="handleSelectElement('walkbox', wb)"
              >
                <span class="item-icon text-walkbox">▢</span>
                <span class="item-id">#{{ wb.id }}</span>
                <span class="item-name">Walkbox {{ wb.id }}</span>
              </div>
            </div>
          </div>

          <!-- Exits Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.exits }">
            <div class="section-header" @click="toggleSection('exits')">
              <span class="collapse-icon">{{ collapsedSections.exits ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('exit', 'exits')"
                :indeterminate="isSomeSelectedOfType('exit', 'exits')"
                @click.stop="selectAllOfType('exit', 'exits')"
                title="Select all"
              />
              <span class="section-icon text-exit">→</span>
              <span class="section-name">Exits</span>
              <span class="section-count">{{ elementCounts.exits }}</span>
              <button
                class="visibility-btn"
                :class="{ hidden: !visibleTypes.exits }"
                @click.stop="toggleVisibility('exits')"
                title="Toggle visibility"
              >{{ visibleTypes.exits ? '👁' : '👁' }}</button>
              <button class="add-btn" @click.stop="handleAddElement('exit')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.exits">
              <div
                v-for="exit in currentScene.exits"
                :key="exit.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'exit' && s.element.id === exit.id) }"
                @click="handleSelectElement('exit', exit)"
              >
                <span class="item-icon text-exit">→</span>
                <span class="item-id">#{{ exit.id }}</span>
                <span class="item-name">{{ exit.name }}</span>
              </div>
            </div>
          </div>

          <!-- Actor Placements Section (Scene-specific) -->
          <div class="element-section" :class="{ collapsed: collapsedSections.actorPlacements }">
            <div class="section-header" @click="toggleSection('actorPlacements')">
              <span class="collapse-icon">{{ collapsedSections.actorPlacements ? '▶' : '▼' }}</span>
              <span class="section-icon text-actor">👤</span>
              <span class="section-name">Actors in Scene</span>
              <span class="section-count">{{ elementCounts.actorPlacements }}</span>
              <button
                class="visibility-btn"
                :class="{ hidden: !visibleTypes.actors }"
                @click.stop="toggleVisibility('actors')"
                title="Toggle visibility"
              >{{ visibleTypes.actors ? '👁' : '👁' }}</button>
              <button class="add-btn" @click.stop="showPlaceActorModal = true" title="Place actor in scene">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.actorPlacements">
              <div
                v-for="placement in currentScene.actorPlacements"
                :key="placement.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'actorPlacement' && s.element.id === placement.id) }"
                @click="handleSelectElement('actorPlacement', placement)"
              >
                <span class="item-icon text-actor">👤</span>
                <span class="item-name">{{ getGlobalActorById(placement.actorId)?.name || 'Unknown' }}</span>
                <button class="remove-item-btn" @click.stop="removeActorFromScene(placement.id)" title="Remove from scene">×</button>
              </div>
              <p v-if="currentScene.actorPlacements.length === 0" class="empty-section">No actors placed</p>
            </div>
          </div>

          <!-- Hotspots Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.hotspots }">
            <div class="section-header" @click="toggleSection('hotspots')">
              <span class="collapse-icon">{{ collapsedSections.hotspots ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('hotspot', 'hotspots')"
                :indeterminate="isSomeSelectedOfType('hotspot', 'hotspots')"
                @click.stop="selectAllOfType('hotspot', 'hotspots')"
                title="Select all"
              />
              <span class="section-icon text-hotspot">◎</span>
              <span class="section-name">Hotspots</span>
              <span class="section-count">{{ elementCounts.hotspots }}</span>
              <button
                class="visibility-btn"
                :class="{ hidden: !visibleTypes.hotspots }"
                @click.stop="toggleVisibility('hotspots')"
                title="Toggle visibility"
              >{{ visibleTypes.hotspots ? '👁' : '👁' }}</button>
              <button class="add-btn" @click.stop="handleAddElement('hotspot')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.hotspots">
              <div
                v-for="hotspot in currentScene.hotspots"
                :key="hotspot.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'hotspot' && s.element.id === hotspot.id) }"
                @click="handleSelectElement('hotspot', hotspot)"
              >
                <span class="item-icon text-hotspot">◎</span>
                <span class="item-id">#{{ hotspot.id }}</span>
                <span class="item-name">{{ hotspot.name }}</span>
              </div>
              <p v-if="currentScene.hotspots.length === 0" class="empty-section">No hotspots</p>
            </div>
          </div>

          <!-- Z-Planes Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.zplanes }">
            <div class="section-header" @click="toggleSection('zplanes')">
              <span class="collapse-icon">{{ collapsedSections.zplanes ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('zplane', 'zplanes')"
                :indeterminate="isSomeSelectedOfType('zplane', 'zplanes')"
                @click.stop="selectAllOfType('zplane', 'zplanes')"
                title="Select all"
              />
              <span class="section-icon text-zplane">▤</span>
              <span class="section-name">Z-Planes</span>
              <span class="section-count">{{ elementCounts.zplanes }}</span>
              <button
                class="visibility-btn"
                :class="{ hidden: !visibleTypes.zplanes }"
                @click.stop="toggleVisibility('zplanes')"
                title="Toggle visibility"
              >{{ visibleTypes.zplanes ? '👁' : '👁' }}</button>
              <button class="add-btn" @click.stop="handleAddElement('zplane')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.zplanes">
              <div
                v-for="zp in currentScene.zplanes"
                :key="zp.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'zplane' && s.element.id === zp.id) }"
                @click="handleSelectElement('zplane', zp)"
              >
                <span class="item-icon text-zplane">▤</span>
                <span class="item-id">#{{ zp.id }}</span>
                <span class="item-name">{{ zp.name }}</span>
              </div>
              <p v-if="currentScene.zplanes.length === 0" class="empty-section">No z-planes</p>
            </div>
          </div>

          <!-- Section divider for data elements -->
          <div class="section-divider">
            <span class="divider-text">DATA ELEMENTS</span>
          </div>

          <!-- Dialogs Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.dialogs }">
            <div class="section-header" @click="toggleSection('dialogs')">
              <span class="collapse-icon">{{ collapsedSections.dialogs ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('dialog', 'dialogs')"
                :indeterminate="isSomeSelectedOfType('dialog', 'dialogs')"
                @click.stop="selectAllOfType('dialog', 'dialogs')"
                title="Select all"
              />
              <span class="section-icon text-dialog">💬</span>
              <span class="section-name">Dialogs</span>
              <span class="section-count">{{ elementCounts.dialogs }}</span>
              <button class="add-btn" @click.stop="handleAddElement('dialog')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.dialogs">
              <div
                v-for="dialog in currentScene.dialogs"
                :key="dialog.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'dialog' && s.element.id === dialog.id) }"
                @click="handleSelectElement('dialog', dialog)"
              >
                <span class="item-icon text-dialog">💬</span>
                <span class="item-id">#{{ dialog.id }}</span>
                <span class="item-name">{{ dialog.name }}</span>
              </div>
              <p v-if="currentScene.dialogs.length === 0" class="empty-section">No dialogs</p>
            </div>
          </div>

          <!-- Puzzles Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.puzzles }">
            <div class="section-header" @click="toggleSection('puzzles')">
              <span class="collapse-icon">{{ collapsedSections.puzzles ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('puzzle', 'puzzles')"
                :indeterminate="isSomeSelectedOfType('puzzle', 'puzzles')"
                @click.stop="selectAllOfType('puzzle', 'puzzles')"
                title="Select all"
              />
              <span class="section-icon text-puzzle">🧩</span>
              <span class="section-name">Puzzles</span>
              <span class="section-count">{{ elementCounts.puzzles }}</span>
              <button class="add-btn" @click.stop="handleAddElement('puzzle')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.puzzles">
              <div
                v-for="puzzle in currentScene.puzzles"
                :key="puzzle.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'puzzle' && s.element.id === puzzle.id) }"
                @click="handleSelectElement('puzzle', puzzle)"
              >
                <span class="item-icon text-puzzle">🧩</span>
                <span class="item-id">#{{ puzzle.id }}</span>
                <span class="item-name">{{ puzzle.name }}</span>
              </div>
              <p v-if="currentScene.puzzles.length === 0" class="empty-section">No puzzles</p>
            </div>
          </div>

          <!-- Verbs section moved to Global Data area -->

          <!-- SFX Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.sfx }">
            <div class="section-header" @click="toggleSection('sfx')">
              <span class="collapse-icon">{{ collapsedSections.sfx ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('sfx', 'sfx')"
                :indeterminate="isSomeSelectedOfType('sfx', 'sfx')"
                @click.stop="selectAllOfType('sfx', 'sfx')"
                title="Select all"
              />
              <span class="section-icon text-sfx">🔊</span>
              <span class="section-name">SFX</span>
              <span class="section-count">{{ elementCounts.sfx }}</span>
              <button class="add-btn" @click.stop="handleAddElement('sfx')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.sfx">
              <div
                v-for="sound in currentScene.sfx"
                :key="sound.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'sfx' && s.element.id === sound.id) }"
                @click="handleSelectElement('sfx', sound)"
              >
                <span class="item-icon text-sfx">🔊</span>
                <span class="item-id">#{{ sound.id }}</span>
                <span class="item-name">{{ sound.name }}</span>
              </div>
              <p v-if="currentScene.sfx.length === 0" class="empty-section">No sound effects</p>
            </div>
          </div>

          <!-- Music Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.music }">
            <div class="section-header" @click="toggleSection('music')">
              <span class="collapse-icon">{{ collapsedSections.music ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('music', 'music')"
                :indeterminate="isSomeSelectedOfType('music', 'music')"
                @click.stop="selectAllOfType('music', 'music')"
                title="Select all"
              />
              <span class="section-icon text-music">🎵</span>
              <span class="section-name">Music</span>
              <span class="section-count">{{ elementCounts.music }}</span>
              <button class="add-btn" @click.stop="handleAddElement('music')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.music">
              <div
                v-for="track in currentScene.music"
                :key="track.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'music' && s.element.id === track.id) }"
                @click="handleSelectElement('music', track)"
              >
                <span class="item-icon text-music">🎵</span>
                <span class="item-id">#{{ track.id }}</span>
                <span class="item-name">{{ track.name }}</span>
              </div>
              <p v-if="currentScene.music.length === 0" class="empty-section">No music tracks</p>
            </div>
          </div>

          <!-- Cutscenes Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.cutscenes }">
            <div class="section-header" @click="toggleSection('cutscenes')">
              <span class="collapse-icon">{{ collapsedSections.cutscenes ? '▶' : '▼' }}</span>
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelectedOfType('cutscene', 'cutscenes')"
                :indeterminate="isSomeSelectedOfType('cutscene', 'cutscenes')"
                @click.stop="selectAllOfType('cutscene', 'cutscenes')"
                title="Select all"
              />
              <span class="section-icon text-cutscene">🎬</span>
              <span class="section-name">Cutscenes</span>
              <span class="section-count">{{ elementCounts.cutscenes }}</span>
              <button class="add-btn" @click.stop="handleAddElement('cutscene')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.cutscenes">
              <div
                v-for="cutscene in currentScene.cutscenes"
                :key="cutscene.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'cutscene' && s.element.id === cutscene.id) }"
                @click="handleSelectElement('cutscene', cutscene)"
              >
                <span class="item-icon text-cutscene">🎬</span>
                <span class="item-id">#{{ cutscene.id }}</span>
                <span class="item-name">{{ cutscene.name }}</span>
                <span class="item-badge" v-if="cutscene.actions.length > 0">{{ cutscene.actions.length }}</span>
              </div>
              <p v-if="currentScene.cutscenes.length === 0" class="empty-section">No cutscenes</p>
            </div>
          </div>

          <!-- Animations Section (Global) -->
          <div class="element-section" :class="{ collapsed: collapsedSections.animations }">
            <div class="section-header" @click="toggleSection('animations')">
              <span class="collapse-icon">{{ collapsedSections.animations ? '▶' : '▼' }}</span>
              <span class="section-icon text-animation">🎞</span>
              <span class="section-name">Animations</span>
              <span class="section-count">{{ globalAnimations.length }}</span>
              <button class="add-btn" @click.stop="openSpritesheetEditor()" title="Open Spritesheet Editor">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.animations">
              <div
                v-for="anim in globalAnimations"
                :key="anim.id"
                class="element-item animation-item-extended"
                :class="{ selected: selectedElements.some(s => s.type === 'animation' && s.element.id === anim.id) }"
                @click="handleSelectElement('animation', anim)"
              >
                <div class="animation-item-main">
                  <span class="item-icon text-animation">🎞</span>
                  <span class="item-name">{{ anim.name }}</span>
                  <span class="item-badge">{{ anim.frames?.length || 0 }}f</span>
                </div>
                <div class="animation-item-usage" v-if="getAnimationUsage(anim.id).length > 0">
                  <span
                    v-for="usage in getAnimationUsage(anim.id)"
                    :key="`${usage.actorId}-${usage.state}`"
                    class="usage-tag"
                    :title="`${usage.actorName} - ${usage.stateLabel}`"
                  >
                    {{ usage.stateIcon }} {{ usage.actorName }}
                  </span>
                </div>
                <div class="animation-item-usage unassigned" v-else>
                  <span class="usage-tag unused">Sin asignar</span>
                </div>
              </div>
              <p v-if="globalAnimations.length === 0" class="empty-section">No animations</p>
            </div>
          </div>

          <!-- Lights Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.lights }">
            <div class="section-header" @click="toggleSection('lights')">
              <span class="collapse-icon">{{ collapsedSections.lights ? '▶' : '▼' }}</span>
              <button
                class="visibility-toggle"
                :class="{ hidden: !visibleTypes.lights }"
                @click.stop="toggleVisibility('lights')"
                title="Toggle visibility"
              >{{ visibleTypes.lights ? '👁' : '👁' }}</button>
              <span class="section-icon text-light">💡</span>
              <span class="section-name">Lights</span>
              <span class="section-count">{{ elementCounts.lights }}</span>
              <button class="add-btn" @click.stop="handleAddElement('light')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.lights">
              <!-- Ambient light settings -->
              <div class="ambient-light-settings" v-if="currentScene.lighting && currentScene.lighting.ambient">
                <label>Ambient:</label>
                <input
                  type="color"
                  v-model="currentScene.lighting.ambient.color"
                  class="ambient-color"
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  v-model.number="currentScene.lighting.ambient.intensity"
                  class="ambient-intensity"
                />
                <span class="intensity-value">{{ currentScene.lighting.ambient.intensity.toFixed(1) }}</span>
              </div>
              <div
                v-for="light in currentScene.lighting.lights"
                :key="light.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'light' && s.element.id === light.id) }"
                @click="handleSelectElement('light', light)"
              >
                <span class="item-icon text-light">{{ getLightIcon(light.type) }}</span>
                <span class="item-id">#{{ light.id }}</span>
                <span class="item-name">{{ light.name }}</span>
                <span class="light-color-preview" :style="{ backgroundColor: light.color }"></span>
              </div>
              <p v-if="currentScene.lighting.lights.length === 0" class="empty-section">No lights</p>
            </div>
          </div>

          <!-- Particles Section -->
          <div class="element-section" :class="{ collapsed: collapsedSections.particles }">
            <div class="section-header" @click="toggleSection('particles')">
              <span class="collapse-icon">{{ collapsedSections.particles ? '▶' : '▼' }}</span>
              <button
                class="visibility-toggle"
                :class="{ hidden: !visibleTypes.particles }"
                @click.stop="toggleVisibility('particles')"
                title="Toggle visibility"
              >{{ visibleTypes.particles ? '👁' : '👁' }}</button>
              <span class="section-icon text-particle">✨</span>
              <span class="section-name">Particles</span>
              <span class="section-count">{{ elementCounts.particles }}</span>
              <button class="add-btn" @click.stop="handleAddElement('particle')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.particles">
              <div
                v-for="emitter in currentScene.particles"
                :key="emitter.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'particle' && s.element.id === emitter.id) }"
                @click="handleSelectElement('particle', emitter)"
              >
                <span class="item-icon text-particle">{{ getParticleIcon(emitter.preset) }}</span>
                <span class="item-id">#{{ emitter.id }}</span>
                <span class="item-name">{{ emitter.name }}</span>
                <span class="item-badge">{{ emitter.preset }}</span>
              </div>
              <p v-if="currentScene.particles.length === 0" class="empty-section">No particle emitters</p>
            </div>
          </div>

          <!-- GLOBAL DATA SEPARATOR -->
          <div class="section-separator">
            <span class="separator-label">🌍 GLOBAL DATA</span>
          </div>

          <!-- Assets Section (Global) -->
          <div class="element-section global-section" :class="{ collapsed: collapsedSections.assets }">
            <div class="section-header" @click="toggleSection('assets')">
              <span class="collapse-icon">{{ collapsedSections.assets ? '▶' : '▼' }}</span>
              <span class="section-icon text-asset">🖼️</span>
              <span class="section-name">Assets</span>
              <span class="section-count">{{ elementCounts.assets }}</span>
              <button class="add-btn" @click.stop="showAssetManagerModal = true" title="Open Asset Manager">📁</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.assets">
              <div
                v-for="asset in project.globalData.assets"
                :key="asset.id"
                class="element-item asset-item"
              >
                <div
                  class="asset-thumbnail"
                  :style="{ backgroundImage: getAssetDisplayUrl(asset) ? `url(${getAssetDisplayUrl(asset)})` : 'none' }"
                >
                  <span v-if="asset.s3Key" class="s3-indicator">☁️</span>
                </div>
                <span class="item-name">{{ asset.name }}</span>
                <span class="asset-dims">{{ asset.width }}×{{ asset.height }}</span>
              </div>
              <p v-if="project.globalData.assets.length === 0" class="empty-section">No assets</p>
              <button class="manage-assets-btn" @click="showAssetManagerModal = true">Manage Assets</button>
            </div>
          </div>

          <!-- Audio Assets Section (Global) -->
          <div class="element-section global-section" :class="{ collapsed: collapsedSections.audioAssets }">
            <div class="section-header" @click="toggleSection('audioAssets')">
              <span class="collapse-icon">{{ collapsedSections.audioAssets ? '▶' : '▼' }}</span>
              <span class="section-icon text-audio">🔊</span>
              <span class="section-name">Audio</span>
              <span class="section-count">{{ elementCounts.audioAssets }}</span>
              <button class="add-btn" @click.stop="showAudioManagerModal = true" title="Open Audio Manager">📁</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.audioAssets">
              <div
                v-for="audio in project.globalData.audioAssets"
                :key="audio.id"
                class="element-item audio-item"
              >
                <span class="audio-type-icon">{{ audio.type === 'music' ? '🎵' : '🔊' }}</span>
                <span class="item-name">{{ audio.name }}</span>
                <span class="audio-duration">{{ formatDuration(audio.duration) }}</span>
                <button
                  class="audio-play-btn"
                  @click.stop="currentlyPlayingAudio?.id === audio.id ? stopAudioPreview() : playAudioPreview(audio)"
                  :title="currentlyPlayingAudio?.id === audio.id ? 'Stop' : 'Play'"
                >
                  {{ currentlyPlayingAudio?.id === audio.id ? '⏹' : '▶' }}
                </button>
              </div>
              <p v-if="project.globalData.audioAssets.length === 0" class="empty-section">No audio</p>
              <button class="manage-assets-btn" @click="showAudioManagerModal = true">Manage Audio</button>
            </div>
          </div>

          <!-- Global Actors Section -->
          <div class="element-section global-section" :class="{ collapsed: collapsedSections.globalActors }">
            <div class="section-header" @click="toggleSection('globalActors')">
              <span class="collapse-icon">{{ collapsedSections.globalActors ? '▶' : '▼' }}</span>
              <span class="section-icon text-actor">👥</span>
              <span class="section-name">Characters</span>
              <span class="section-count">{{ elementCounts.globalActors }}</span>
              <button class="add-btn" @click.stop="addGlobalActor" title="Add new character">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.globalActors">
              <div
                v-for="actor in project.globalData.actors"
                :key="actor.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'globalActor' && s.element.id === actor.id) }"
                @click="handleSelectElement('globalActor', actor)"
              >
                <span class="item-icon text-actor">👤</span>
                <span class="item-name">{{ actor.name }}</span>
                <button
                  class="place-actor-btn"
                  @click.stop="placeActorInScene(actor.id)"
                  title="Place in current scene"
                  :disabled="currentScene.actorPlacements.some(p => p.actorId === actor.id)"
                >📍</button>
              </div>
              <p v-if="project.globalData.actors.length === 0" class="empty-section">No characters</p>
            </div>
          </div>

          <!-- Items Section (Global) -->
          <div class="element-section global-section" :class="{ collapsed: collapsedSections.items }">
            <div class="section-header" @click="toggleSection('items')">
              <span class="collapse-icon">{{ collapsedSections.items ? '▶' : '▼' }}</span>
              <span class="section-icon text-item">📦</span>
              <span class="section-name">Items</span>
              <span class="section-count">{{ elementCounts.items }}</span>
              <button class="add-btn" @click.stop="handleAddElement('item')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.items">
              <div
                v-for="item in project.globalData.items"
                :key="item.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'item' && s.element.id === item.id) }"
                @click="handleSelectElement('item', item)"
              >
                <span
                  v-if="itemHasAssetIcon(item)"
                  class="item-icon item-icon-asset"
                  :style="getItemIconStyle(item)"
                ></span>
                <span v-else class="item-icon text-item">{{ item.icon || '📦' }}</span>
                <span class="item-id">#{{ item.id }}</span>
                <span class="item-name">{{ item.name }}</span>
              </div>
              <p v-if="project.globalData.items.length === 0" class="empty-section">No items defined</p>
            </div>
          </div>

          <!-- Inventory Section (Global - Player's Items) -->
          <div class="element-section global-section" :class="{ collapsed: collapsedSections.inventory }">
            <div class="section-header" @click="toggleSection('inventory')">
              <span class="collapse-icon">{{ collapsedSections.inventory ? '▶' : '▼' }}</span>
              <span class="section-icon text-inventory">🎒</span>
              <span class="section-name">Inventory</span>
              <span class="section-count">{{ elementCounts.inventory }}</span>
              <button class="add-btn" @click.stop="showAddToInventoryModal = true" title="Add item to inventory">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.inventory">
              <div
                v-for="itemId in project.globalData.inventory"
                :key="itemId"
                class="element-item inventory-item"
              >
                <span
                  v-if="itemHasAssetIcon(getItemById(itemId))"
                  class="item-icon item-icon-asset"
                  :style="getItemIconStyle(getItemById(itemId))"
                ></span>
                <span v-else class="item-icon text-item">{{ getItemById(itemId)?.icon || '📦' }}</span>
                <span class="item-name">{{ getItemById(itemId)?.name || 'Unknown' }}</span>
                <button class="remove-item-btn" @click.stop="removeFromInventory(itemId)" title="Remove from inventory">×</button>
              </div>
              <p v-if="project.globalData.inventory.length === 0" class="empty-section">Inventory empty</p>
            </div>
          </div>

          <!-- Verbs Section (Global) -->
          <div class="element-section global-section" :class="{ collapsed: collapsedSections.verbs }">
            <div class="section-header" @click="toggleSection('verbs')">
              <span class="collapse-icon">{{ collapsedSections.verbs ? '▶' : '▼' }}</span>
              <span class="section-icon text-verb">🎯</span>
              <span class="section-name">Verbs</span>
              <span class="section-count">{{ elementCounts.verbs }}</span>
              <button class="reset-btn" @click.stop="resetVerbsToDefault" title="Reset to default verbs">↺</button>
              <button class="add-btn" @click.stop="handleAddElement('verb')">+</button>
            </div>
            <div class="section-list" v-show="!collapsedSections.verbs">
              <div
                v-for="verb in project.globalData.verbs"
                :key="verb.id"
                class="element-item"
                :class="{ selected: selectedElements.some(s => s.type === 'verb' && s.element.id === verb.id) }"
                @click="handleSelectElement('verb', verb)"
              >
                <span class="item-icon text-verb">{{ verb.icon }}</span>
                <span class="item-id">#{{ verb.id }}</span>
                <span class="item-name">{{ verb.name }}</span>
              </div>
              <p v-if="project.globalData.verbs.length === 0" class="empty-section">No verbs</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Canvas Area -->
      <main class="canvas-area" :class="{ 'play-mode-active': playMode }">
        <div class="canvas-container pixel-grid">
          <div
            ref="canvasRef"
            class="canvas-wrapper"
            :class="{ dragging: isDragging, 'play-mode': playMode }"
            :style="{
              width: currentScene.width * zoom + 'px',
              height: currentScene.height * zoom + 'px'
            }"
            @click="playMode ? onPlayModeClick($event) : onCanvasClick($event)"
            @contextmenu="showContextMenu"
          >
            <!-- Background -->
            <div
              class="canvas-background"
              :class="{ 'has-image': currentScene.background && getAssetById(currentScene.background) }"
              :style="currentScene.background && getAssetById(currentScene.background) && getAssetDisplayUrl(getAssetById(currentScene.background)) ? {
                backgroundImage: `url(${getAssetDisplayUrl(getAssetById(currentScene.background))})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}"
            >
              <span v-if="!currentScene.background" class="background-placeholder">
                🎨<br>
                <span class="pixel-font-sm">Select background in Scene properties</span>
              </span>
              <span v-else-if="!getAssetDisplayUrl(getAssetById(currentScene.background))" class="background-loading">
                ⏳ Loading...
              </span>
            </div>

            <!-- Grid overlay -->
            <div
              v-if="showGrid"
              class="canvas-grid"
              :style="{
                '--grid-size': (32 * zoom) + 'px',
                '--center-x': (currentScene.width / 2 * zoom) + 'px',
                '--center-y': (currentScene.height / 2 * zoom) + 'px'
              }"
            >
              <div class="grid-center-h"></div>
              <div class="grid-center-v"></div>
            </div>

            <!-- Elements overlay -->
            <div class="elements-overlay">
              <!-- Walkboxes -->
              <!-- Walkboxes (SVG polygons) -->
              <svg
                v-if="visibleTypes.walkboxes && !playMode"
                class="walkbox-svg-layer"
                :width="currentScene.width * zoom"
                :height="currentScene.height * zoom"
              >
                <g
                  v-for="wb in currentScene.walkboxes"
                  :key="'wb-' + wb.id"
                  :transform="`rotate(${wb.rotation || 0}, ${getWalkboxCenter(wb).x * zoom}, ${getWalkboxCenter(wb).y * zoom})`"
                >
                  <!-- Polygon fill -->
                  <polygon
                    :points="wb.points.map(p => `${p.x * zoom},${p.y * zoom}`).join(' ')"
                    class="walkbox-polygon"
                    :class="{ selected: selectedElements.some(s => s.type === 'walkbox' && s.element.id === wb.id) }"
                    @mousedown="handleSelectElement('walkbox', wb, $event)"
                    @click.stop
                  />

                  <!-- Edges (clickable to add vertices) -->
                  <template v-if="selectedElements.some(s => s.type === 'walkbox' && s.element.id === wb.id)">
                    <!-- Invisible thick line for easier clicking -->
                    <line
                      v-for="(point, idx) in wb.points"
                      :key="'edge-' + idx"
                      :x1="point.x * zoom"
                      :y1="point.y * zoom"
                      :x2="wb.points[(idx + 1) % wb.points.length].x * zoom"
                      :y2="wb.points[(idx + 1) % wb.points.length].y * zoom"
                      class="walkbox-edge"
                      @click.stop="addWalkboxVertex(wb, idx, $event)"
                    />
                    <!-- "+" indicator at edge midpoint -->
                    <g
                      v-for="(point, idx) in wb.points"
                      :key="'edge-add-' + idx"
                      class="walkbox-edge-add"
                      @click.stop="addWalkboxVertex(wb, idx, $event)"
                    >
                      <circle
                        :cx="((point.x + wb.points[(idx + 1) % wb.points.length].x) / 2) * zoom"
                        :cy="((point.y + wb.points[(idx + 1) % wb.points.length].y) / 2) * zoom"
                        r="10"
                        class="walkbox-edge-add-bg"
                      />
                      <text
                        :x="((point.x + wb.points[(idx + 1) % wb.points.length].x) / 2) * zoom"
                        :y="((point.y + wb.points[(idx + 1) % wb.points.length].y) / 2) * zoom"
                        class="walkbox-edge-add-icon"
                      >+</text>
                    </g>
                  </template>

                  <!-- Vertex handles -->
                  <template v-if="selectedElements.some(s => s.type === 'walkbox' && s.element.id === wb.id)">
                    <circle
                      v-for="(point, idx) in wb.points"
                      :key="'vertex-' + idx"
                      :cx="point.x * zoom"
                      :cy="point.y * zoom"
                      r="6"
                      class="walkbox-vertex"
                      :class="{ 'can-delete': wb.points.length > 3 }"
                      @mousedown.stop="startVertexDrag($event, wb, idx)"
                      @dblclick.stop="removeWalkboxVertex(wb, idx)"
                    />
                  </template>

                  <!-- Rotate handle -->
                  <template v-if="selectedElements.some(s => s.type === 'walkbox' && s.element.id === wb.id)">
                    <line
                      :x1="getWalkboxCenter(wb).x * zoom"
                      :y1="getWalkboxCenter(wb).y * zoom - 30"
                      :x2="getWalkboxCenter(wb).x * zoom"
                      :y2="getWalkboxCenter(wb).y * zoom - 55"
                      class="walkbox-rotate-line"
                    />
                    <circle
                      :cx="getWalkboxCenter(wb).x * zoom"
                      :cy="getWalkboxCenter(wb).y * zoom - 60"
                      r="8"
                      class="walkbox-rotate-handle"
                      @mousedown.stop="startWalkboxRotate($event, wb)"
                    />
                  </template>

                  <!-- Label -->
                  <text
                    :x="getWalkboxCenter(wb).x * zoom"
                    :y="getWalkboxCenter(wb).y * zoom"
                    class="walkbox-label"
                  >
                    Walkbox #{{ wb.id }}
                  </text>
                </g>
              </svg>

              <!-- Exits -->
              <template v-if="visibleTypes.exits && !playMode">
                <div
                  v-for="exit in currentScene.exits"
                  :key="'exit-' + exit.id"
                  class="element-rect exit-element"
                  :class="{ selected: selectedElements.some(s => s.type === 'exit' && s.element.id === exit.id) }"
                  :style="{
                    left: exit.x * zoom + 'px',
                    top: exit.y * zoom + 'px',
                    width: exit.w * zoom + 'px',
                    height: exit.h * zoom + 'px',
                    transform: `rotate(${exit.rotation || 0}deg)`
                  }"
                  @mousedown="handleSelectElement('exit', exit, $event)"
                  @contextmenu="showElementContextMenu($event, 'exit', exit)"
                  @click.stop
                >
                  <span class="element-label">{{ exit.name }}</span>
                  <!-- Resize & Rotate handles -->
                  <template v-if="selectedElements.some(s => s.type === 'exit' && s.element.id === exit.id)">
                    <div class="rotate-line"></div>
                    <div class="rotate-handle" @mousedown.stop="startRotate($event, exit)"></div>
                    <div class="resize-handle nw" @mousedown.stop="startResize($event, exit, 'nw')"></div>
                    <div class="resize-handle n" @mousedown.stop="startResize($event, exit, 'n')"></div>
                    <div class="resize-handle ne" @mousedown.stop="startResize($event, exit, 'ne')"></div>
                    <div class="resize-handle e" @mousedown.stop="startResize($event, exit, 'e')"></div>
                    <div class="resize-handle se" @mousedown.stop="startResize($event, exit, 'se')"></div>
                    <div class="resize-handle s" @mousedown.stop="startResize($event, exit, 's')"></div>
                    <div class="resize-handle sw" @mousedown.stop="startResize($event, exit, 'sw')"></div>
                    <div class="resize-handle w" @mousedown.stop="startResize($event, exit, 'w')"></div>
                  </template>
                </div>
              </template>

              <!-- Actors -->
              <template v-if="visibleTypes.actors">
                <div
                  v-for="placement in currentScene.actorPlacements"
                  v-show="!playMode || placement.id !== playModeState.playerPlacementId"
                  :key="'actor-' + placement.id"
                  class="element-rect actor-element"
                  :class="{
                    selected: selectedElements.some(s => s.type === 'actorPlacement' && s.element.id === placement.id),
                    dragging: isDragging && dragState.element?.id === placement.id
                  }"
                  :style="{
                    left: placement.x * zoom + 'px',
                    top: placement.y * zoom + 'px',
                    width: placement.w * zoom + 'px',
                    height: placement.h * zoom + 'px',
                    transform: `rotate(${placement.rotation || 0}deg)`
                  }"
                  @mousedown="handleSelectElement('actorPlacement', placement, $event)"
                  @contextmenu="showElementContextMenu($event, 'actorPlacement', placement)"
                  @click.stop
                >
                  <!-- Actor animation preview -->
                  <div
                    v-if="getActorPlacementAnimation(placement)"
                    class="actor-animation-preview"
                    :style="getActorPlacementAnimationStyle(placement)"
                  ></div>
                  <span v-else class="element-label">{{ getGlobalActorById(placement.actorId)?.name || 'Unknown' }}</span>
                  <!-- Actor name overlay when has animation -->
                  <span v-if="getActorPlacementAnimation(placement)" class="actor-name-overlay">{{ getGlobalActorById(placement.actorId)?.name }}</span>
                  <!-- Resize & Rotate handles -->
                  <template v-if="selectedElements.some(s => s.type === 'actorPlacement' && s.element.id === placement.id)">
                    <div class="rotate-line"></div>
                    <div class="rotate-handle" @mousedown.stop="startRotate($event, placement)"></div>
                    <div class="resize-handle nw" @mousedown.stop="startResize($event, placement, 'nw')"></div>
                    <div class="resize-handle n" @mousedown.stop="startResize($event, placement, 'n')"></div>
                    <div class="resize-handle ne" @mousedown.stop="startResize($event, placement, 'ne')"></div>
                    <div class="resize-handle e" @mousedown.stop="startResize($event, placement, 'e')"></div>
                    <div class="resize-handle se" @mousedown.stop="startResize($event, placement, 'se')"></div>
                    <div class="resize-handle s" @mousedown.stop="startResize($event, placement, 's')"></div>
                    <div class="resize-handle sw" @mousedown.stop="startResize($event, placement, 'sw')"></div>
                    <div class="resize-handle w" @mousedown.stop="startResize($event, placement, 'w')"></div>
                  </template>
                </div>
              </template>

              <!-- Hotspots -->
              <template v-if="visibleTypes.hotspots && !playMode">
                <div
                  v-for="hotspot in currentScene.hotspots"
                  :key="'hotspot-' + hotspot.id"
                  class="element-rect hotspot-element"
                  :class="{
                    selected: selectedElements.some(s => s.type === 'hotspot' && s.element.id === hotspot.id),
                  dragging: isDragging && dragState.element?.id === hotspot.id
                }"
                :style="{
                  left: hotspot.x * zoom + 'px',
                  top: hotspot.y * zoom + 'px',
                  width: hotspot.w * zoom + 'px',
                  height: hotspot.h * zoom + 'px',
                  transform: `rotate(${hotspot.rotation || 0}deg)`
                }"
                @mousedown="handleSelectElement('hotspot', hotspot, $event)"
                @contextmenu="showElementContextMenu($event, 'hotspot', hotspot)"
                @click.stop
              >
                <span class="element-label">{{ hotspot.name }}</span>
                <!-- Resize & Rotate handles -->
                <template v-if="selectedElements.some(s => s.type === 'hotspot' && s.element.id === hotspot.id)">
                  <div class="rotate-line"></div>
                  <div class="rotate-handle" @mousedown.stop="startRotate($event, hotspot)"></div>
                  <div class="resize-handle nw" @mousedown.stop="startResize($event, hotspot, 'nw')"></div>
                  <div class="resize-handle n" @mousedown.stop="startResize($event, hotspot, 'n')"></div>
                  <div class="resize-handle ne" @mousedown.stop="startResize($event, hotspot, 'ne')"></div>
                  <div class="resize-handle e" @mousedown.stop="startResize($event, hotspot, 'e')"></div>
                  <div class="resize-handle se" @mousedown.stop="startResize($event, hotspot, 'se')"></div>
                  <div class="resize-handle s" @mousedown.stop="startResize($event, hotspot, 's')"></div>
                  <div class="resize-handle sw" @mousedown.stop="startResize($event, hotspot, 'sw')"></div>
                  <div class="resize-handle w" @mousedown.stop="startResize($event, hotspot, 'w')"></div>
                </template>
              </div>
              </template>

              <!-- Images -->
              <template v-if="visibleTypes.images">
                <div
                  v-for="img in currentScene.images"
                  :key="'img-' + img.id"
                  class="element-rect image-element"
                  :class="{
                    selected: selectedElements.some(s => s.type === 'image' && s.element.id === img.id),
                    dragging: isDragging && dragState.element?.id === img.id,
                    'has-asset': img.assetId && getAssetById(img.assetId),
                    'has-parallax': img.parallax?.enabled,
                    'in-group': isElementInGroup('image', img.id)
                  }"
                  :style="img.parallax?.enabled ? getParallaxImageStyle(img) : {
                    left: img.x * zoom + 'px',
                    top: img.y * zoom + 'px',
                    width: img.w * zoom + 'px',
                    height: img.h * zoom + 'px',
                    transform: `rotate(${img.rotation || 0}deg)`,
                    ...(img.assetId && getAssetById(img.assetId) && getAssetDisplayUrl(getAssetById(img.assetId)) ? {
                      backgroundImage: `url(${getAssetDisplayUrl(getAssetById(img.assetId))})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    } : {})
                  }"
                  @mousedown="handleSelectElement('image', img, $event)"
                  @contextmenu="showElementContextMenu($event, 'image', img)"
                  @click.stop
                >
                  <span v-if="!img.assetId || !getAssetById(img.assetId)" class="element-label">{{ img.name }}</span>
                  <!-- Parallax indicator -->
                  <span v-if="img.parallax?.enabled" class="parallax-indicator" :title="'Depth: ' + img.parallax.depth">
                    ↕ {{ img.parallax.depth.toFixed(1) }}
                  </span>
                  <!-- Group indicator -->
                  <span v-if="isElementInGroup('image', img.id)" class="group-indicator">
                    🔗 {{ getElementGroup('image', img.id)?.name }}
                  </span>
                  <!-- Resize & Rotate handles -->
                  <template v-if="selectedElements.some(s => s.type === 'image' && s.element.id === img.id)">
                    <div class="rotate-line"></div>
                    <div class="rotate-handle" @mousedown.stop="startRotate($event, img)"></div>
                    <div class="resize-handle nw" @mousedown.stop="startResize($event, img, 'nw')"></div>
                    <div class="resize-handle n" @mousedown.stop="startResize($event, img, 'n')"></div>
                    <div class="resize-handle ne" @mousedown.stop="startResize($event, img, 'ne')"></div>
                    <div class="resize-handle e" @mousedown.stop="startResize($event, img, 'e')"></div>
                    <div class="resize-handle se" @mousedown.stop="startResize($event, img, 'se')"></div>
                    <div class="resize-handle s" @mousedown.stop="startResize($event, img, 's')"></div>
                    <div class="resize-handle sw" @mousedown.stop="startResize($event, img, 'sw')"></div>
                    <div class="resize-handle w" @mousedown.stop="startResize($event, img, 'w')"></div>
                  </template>
                </div>
              </template>

              <!-- Z-Planes -->
              <template v-if="visibleTypes.zplanes && !playMode">
                <div
                  v-for="zp in currentScene.zplanes"
                  :key="'zp-' + zp.id"
                  class="element-rect zplane-element"
                  :class="{
                    selected: selectedElements.some(s => s.type === 'zplane' && s.element.id === zp.id),
                    dragging: isDragging && dragState.element?.id === zp.id
                  }"
                  :style="{
                    left: zp.x * zoom + 'px',
                    top: zp.y * zoom + 'px',
                    width: zp.w * zoom + 'px',
                    height: zp.h * zoom + 'px',
                    transform: `rotate(${zp.rotation || 0}deg)`
                  }"
                  @mousedown="handleSelectElement('zplane', zp, $event)"
                  @contextmenu="showElementContextMenu($event, 'zplane', zp)"
                  @click.stop
                >
                  <span class="element-label">{{ zp.name }}</span>
                  <!-- Resize & Rotate handles -->
                  <template v-if="selectedElements.some(s => s.type === 'zplane' && s.element.id === zp.id)">
                    <div class="rotate-line"></div>
                    <div class="rotate-handle" @mousedown.stop="startRotate($event, zp)"></div>
                    <div class="resize-handle nw" @mousedown.stop="startResize($event, zp, 'nw')"></div>
                    <div class="resize-handle n" @mousedown.stop="startResize($event, zp, 'n')"></div>
                    <div class="resize-handle ne" @mousedown.stop="startResize($event, zp, 'ne')"></div>
                    <div class="resize-handle e" @mousedown.stop="startResize($event, zp, 'e')"></div>
                    <div class="resize-handle se" @mousedown.stop="startResize($event, zp, 'se')"></div>
                    <div class="resize-handle s" @mousedown.stop="startResize($event, zp, 's')"></div>
                    <div class="resize-handle sw" @mousedown.stop="startResize($event, zp, 'sw')"></div>
                    <div class="resize-handle w" @mousedown.stop="startResize($event, zp, 'w')"></div>
                  </template>
                </div>
              </template>

              <!-- Particle Emitters (visible as draggable boxes in editor) -->
              <template v-if="visibleTypes.particles">
                <div
                  v-for="emitter in currentScene.particles"
                  :key="'particle-' + emitter.id"
                  class="element-rect particle-element"
                  :class="{
                    selected: selectedElements.some(s => s.type === 'particle' && s.element.id === emitter.id),
                    dragging: isDragging && dragState.element?.id === emitter.id,
                    disabled: !emitter.enabled
                  }"
                  :style="{
                    left: (emitter.x - emitter.width / 2) * zoom + 'px',
                    top: (emitter.y - emitter.height / 2) * zoom + 'px',
                    width: emitter.width * zoom + 'px',
                    height: emitter.height * zoom + 'px'
                  }"
                  @mousedown="handleSelectElement('particle', emitter, $event)"
                  @contextmenu="showElementContextMenu($event, 'particle', emitter)"
                  @click.stop
                >
                  <span class="element-label">{{ getParticleIcon(emitter.preset) }} {{ emitter.name }}</span>
                  <!-- Resize handles -->
                  <template v-if="selectedElements.some(s => s.type === 'particle' && s.element.id === emitter.id)">
                    <div class="resize-handle nw" @mousedown.stop="startResizeParticle($event, emitter, 'nw')"></div>
                    <div class="resize-handle ne" @mousedown.stop="startResizeParticle($event, emitter, 'ne')"></div>
                    <div class="resize-handle se" @mousedown.stop="startResizeParticle($event, emitter, 'se')"></div>
                    <div class="resize-handle sw" @mousedown.stop="startResizeParticle($event, emitter, 'sw')"></div>
                  </template>
                </div>
                <!-- Render active particles -->
                <div
                  v-for="emitter in currentScene.particles.filter(e => e.enabled)"
                  :key="'particles-render-' + emitter.id"
                  class="particles-container"
                  :style="{
                    left: 0,
                    top: 0,
                    width: currentScene.width * zoom + 'px',
                    height: currentScene.height * zoom + 'px',
                    mixBlendMode: emitter.blendMode || 'screen'
                  }"
                >
                  <div
                    v-for="(particle, idx) in (activeParticles[emitter.id] || [])"
                    :key="idx"
                    class="particle"
                    :style="getParticleStyle(particle, emitter)"
                  ></div>
                </div>
              </template>

              <!-- Lights (visible as draggable icons in editor) -->
              <template v-if="visibleTypes.lights">
                <div
                  v-for="light in currentScene.lighting.lights"
                  :key="'light-' + light.id"
                  class="element-rect light-element"
                  :class="{
                    selected: selectedElements.some(s => s.type === 'light' && s.element.id === light.id),
                    dragging: isDragging && dragState.element?.id === light.id,
                    disabled: !light.enabled,
                    'in-group': isElementInGroup('light', light.id)
                  }"
                  :style="{
                    left: (light.x - 20) * zoom + 'px',
                    top: (light.y - 20) * zoom + 'px',
                    width: 40 * zoom + 'px',
                    height: 40 * zoom + 'px'
                  }"
                  @mousedown="handleSelectElement('light', light, $event)"
                  @contextmenu="showElementContextMenu($event, 'light', light)"
                  @click.stop
                >
                  <span class="light-icon">{{ getLightIcon(light.type) }}</span>
                  <!-- Light preview glow -->
                  <div
                    v-if="light.enabled"
                    class="light-preview-glow"
                    :style="getLightPreviewStyle(light)"
                  ></div>
                </div>
              </template>

              <!-- Lighting Overlay -->
              <div
                v-if="visibleTypes.lights && currentScene.lighting"
                class="lighting-overlay"
                :style="{
                  width: currentScene.width * zoom + 'px',
                  height: currentScene.height * zoom + 'px',
                  background: getLightingGradient(),
                  mixBlendMode: 'multiply',
                  opacity: 1 - currentScene.lighting.ambient.intensity
                }"
              ></div>

              <!-- Play Mode: Player Character -->
              <div
                v-if="playMode && playModeState.playerActorId"
                class="play-mode-player"
                :style="{
                  left: (playModeState.playerPosition.x - playModeState.playerSize.w / 2) * zoom + 'px',
                  top: (playModeState.playerPosition.y - playModeState.playerSize.h) * zoom + 'px',
                  width: playModeState.playerSize.w * zoom + 'px',
                  height: playModeState.playerSize.h * zoom + 'px'
                }"
              >
                <!-- Player animation if available -->
                <div
                  v-if="getPlayerCurrentAnimation()"
                  class="player-animation"
                  :style="getPlayerAnimationStyle()"
                ></div>
                <div v-else class="player-placeholder">
                  <span class="player-direction-indicator">{{ playModeState.playerDirection.charAt(0).toUpperCase() }}</span>
                </div>
              </div>

              <!-- Play Mode: Walk Target Indicator -->
              <div
                v-if="playMode && playModeState.walkTarget"
                class="walk-target-indicator"
                :style="{
                  left: playModeState.walkTarget.x * zoom + 'px',
                  top: playModeState.walkTarget.y * zoom + 'px'
                }"
              ></div>

              <!-- Play Mode: Message Display (above actor) -->
              <div
                v-if="playMode && playModeState.messageText"
                class="play-message"
                :style="{
                  left: (playModeState.playerPosition.x) * zoom + 'px',
                  top: (playModeState.playerPosition.y - playModeState.playerSize.h - 20) * zoom + 'px'
                }"
              >
                {{ playModeState.messageText }}
              </div>
            </div>
          </div>
        </div>

        <!-- Play Mode UI Overlay -->
        <div v-if="playMode" class="play-mode-overlay">
          <!-- Fade Overlay for Transitions -->
          <div
            v-if="playModeState.fadeOverlay > 0"
            class="fade-overlay"
            :style="{ opacity: playModeState.fadeOverlay }"
          ></div>

          <!-- Exit Play Mode Button -->
          <button class="exit-play-btn" @click="exitPlayMode">✕ EXIT PLAY MODE</button>

          <!-- Cutscene Skip Button -->
          <button
            v-if="playModeState.isCutscenePlaying && playModeState.currentCutscene?.skippable"
            class="skip-cutscene-btn"
            @click="skipCutscene"
          >
            SKIP ▶▶
          </button>

          <!-- Cutscene Indicator -->
          <div v-if="playModeState.isCutscenePlaying" class="cutscene-indicator">
            🎬 CUTSCENE
          </div>

          <!-- Dialog Box -->
          <div v-if="playModeState.currentDialog && getCurrentDialogLine" class="dialog-box" @click="advanceDialog">
            <div class="dialog-speaker">{{ getCurrentDialogLine.speaker || 'Unknown' }}</div>
            <div class="dialog-text">{{ getCurrentDialogLine.text }}</div>
            <div class="dialog-hint">Click to continue...</div>
          </div>

          <!-- Selected Item Indicator -->
          <div v-if="playModeState.selectedItem" class="selected-item-indicator">
            Using: {{ project.globalData.items.find(i => i.id === playModeState.selectedItem)?.name }}
            <button class="cancel-item-btn" @click="playModeState.selectedItem = null">✕</button>
          </div>

          <!-- Verb Bar -->
          <div class="verb-bar" v-if="!playModeState.isCutscenePlaying">
            <button
              v-for="verb in project.globalData.verbs"
              :key="verb.id"
              class="verb-btn"
              :class="{ active: playModeState.selectedVerb === verb.id }"
              @click="selectVerb(verb.id)"
            >
              {{ verb.icon || '' }} {{ verb.name }}
            </button>
          </div>

          <!-- Inventory Bar -->
          <div class="inventory-bar" v-if="!playModeState.isCutscenePlaying">
            <div class="inventory-label">INVENTORY</div>
            <div class="inventory-slots" v-if="getInventoryItems.length > 0">
              <div
                v-for="item in getInventoryItems"
                :key="item.id"
                class="inventory-slot"
                :class="{ selected: playModeState.selectedItem === item.id }"
                :title="item.name"
                @click="selectInventoryItem(item.id)"
              >
                <div
                  v-if="item.iconAssetId && getAssetById(item.iconAssetId)"
                  class="item-icon"
                  :style="{ backgroundImage: getAssetDisplayUrl(getAssetById(item.iconAssetId)) ? `url(${getAssetDisplayUrl(getAssetById(item.iconAssetId))})` : 'none' }"
                ></div>
                <span v-else class="item-name">{{ item.name.substring(0, 3) }}</span>
              </div>
            </div>
            <div v-else class="inventory-empty">Empty</div>
          </div>

          <!-- Hovered Object Name -->
          <div v-if="playModeState.hoveredObject && !playModeState.isCutscenePlaying" class="hovered-object-name">
            {{ playModeState.selectedItem ? 'Use with: ' : '' }}{{ playModeState.hoveredObject.name }}
          </div>

          <!-- Current Music Indicator -->
          <div v-if="playModeState.currentMusic" class="music-indicator">
            🎵 {{ getAudioAssetById(playModeState.currentMusic.audioAssetId)?.name || 'Playing' }}
          </div>
        </div>

        <!-- Zoom controls -->
        <div class="zoom-controls">
          <button class="zoom-btn" @click="zoom = Math.max(0.1, zoom - 0.1)">-</button>
          <span class="zoom-level pixel-font-sm">{{ Math.round(zoom * 100) }}%</span>
          <button class="zoom-btn" @click="zoom = Math.min(2, zoom + 0.1)">+</button>
          <button class="zoom-btn fit-btn" @click="zoom = 0.5">FIT</button>
          <button
            class="zoom-btn grid-btn"
            :class="{ active: showGrid }"
            @click="showGrid = !showGrid"
            title="Toggle grid"
          >▦</button>
        </div>
      </main>

      <!-- Right Panel - Properties -->
      <aside class="panel right-panel pixel-border" :class="{ open: rightPanelOpen }">
        <div class="panel-tab right-tab" @click="rightPanelOpen = !rightPanelOpen">
          <span class="tab-arrow">{{ rightPanelOpen ? '▶' : '◀' }}</span>
          <span class="tab-text">Properties</span>
        </div>
        <div class="panel-header">
          <h3 class="panel-title">Properties</h3>
        </div>

        <div class="panel-content pixel-scrollbar">
          <!-- Scene settings (when nothing selected) -->
          <div v-if="selectedElements.length === 0" class="scene-settings">
            <div class="property-header">
              <span class="property-type">🎬 SCENE</span>
            </div>
            <div class="property-group">
              <label class="property-label">Name</label>
              <input
                v-model="currentScene.name"
                type="text"
                class="property-input"
              />
            </div>
            <div class="property-group">
              <label class="property-label">Size</label>
              <div class="property-row">
                <input
                  v-model.number="currentScene.width"
                  type="number"
                  class="property-input small"
                  placeholder="Width"
                />
                <span class="property-unit">×</span>
                <input
                  v-model.number="currentScene.height"
                  type="number"
                  class="property-input small"
                  placeholder="Height"
                />
              </div>
            </div>
            <div class="property-group">
              <label class="property-label">Background</label>
              <div class="asset-selector">
                <select
                  v-model="currentScene.background"
                  class="property-select"
                  @change="autoSaveProject"
                >
                  <option :value="null">-- No background --</option>
                  <option
                    v-for="asset in project.globalData.assets"
                    :key="asset.id"
                    :value="asset.id"
                  >
                    {{ asset.name }} ({{ asset.width }}×{{ asset.height }})
                  </option>
                </select>
                <div
                  v-if="currentScene.background && getAssetById(currentScene.background)"
                  class="asset-preview-small"
                  :style="{ backgroundImage: getAssetDisplayUrl(getAssetById(currentScene.background)) ? `url(${getAssetDisplayUrl(getAssetById(currentScene.background))})` : 'none' }"
                ></div>
              </div>
              <!-- Scale to canvas button -->
              <div v-if="backgroundNeedsScaling" class="background-scale-hint">
                <span class="size-mismatch-text">
                  ⚠️ {{ currentBackgroundAsset?.width }}×{{ currentBackgroundAsset?.height }} ≠ {{ currentScene.width }}×{{ currentScene.height }}
                </span>
                <button
                  class="scale-background-btn"
                  @click="showBackgroundScaleModal = true"
                  title="Ajustar imagen al tamaño del canvas"
                >
                  📐 Ajustar al Canvas
                </button>
              </div>
            </div>
            <p class="pixel-font-sm text-muted hint-text">Select an element to edit its properties</p>
          </div>

          <!-- Multiple elements selected -->
          <div v-else-if="selectedElements.length > 1" class="properties-form">
            <div class="property-header multi-selection">
              <span class="property-type">{{ selectedElements.length }} SELECTED</span>
              <button class="delete-element-btn" @click="handleDeleteElement" title="Delete all (Del)">
                🗑 DELETE ALL
              </button>
            </div>
            <div class="multi-selection-info">
              <p class="pixel-font-sm text-muted">Multiple elements selected</p>
              <ul class="selection-list">
                <li v-for="(sel, idx) in selectedElements" :key="idx" class="selection-item">
                  <span class="item-type">{{ sel.type }}</span>
                  <span class="item-name">{{ sel.element.name || '#' + sel.element.id }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Single element selected -->
          <div v-else class="properties-form">
            <div class="property-header">
              <span class="property-type">{{ selectedElements[0].type.toUpperCase() }}</span>
              <button class="delete-element-btn" @click="handleDeleteElement" title="Delete (Del)">
                🗑 DELETE
              </button>
            </div>
            <div class="property-group">
              <label class="property-label">ID</label>
              <input
                :value="selectedElements[0].element.id"
                type="text"
                class="property-input"
                disabled
              />
            </div>
            <div class="property-group">
              <label class="property-label">Name</label>
              <input
                v-model="selectedElements[0].element.name"
                type="text"
                class="property-input"
              />
            </div>
            <div class="property-group" v-if="selectedElements[0].element.x !== undefined">
              <label class="property-label">Position</label>
              <div class="property-row">
                <input
                  v-model.number="selectedElements[0].element.x"
                  type="number"
                  class="property-input small"
                  placeholder="X"
                />
                <input
                  v-model.number="selectedElements[0].element.y"
                  type="number"
                  class="property-input small"
                  placeholder="Y"
                />
              </div>
            </div>
            <div class="property-group" v-if="selectedElements[0].element.w !== undefined">
              <label class="property-label">Size</label>
              <div class="property-row">
                <input
                  v-model.number="selectedElements[0].element.w"
                  type="number"
                  class="property-input small"
                  placeholder="W"
                />
                <input
                  v-model.number="selectedElements[0].element.h"
                  type="number"
                  class="property-input small"
                  placeholder="H"
                />
              </div>
            </div>
            <div class="property-group" v-if="selectedElements[0].element.rotation !== undefined">
              <label class="property-label">Rotation</label>
              <div class="property-row">
                <input
                  v-model.number="selectedElements[0].element.rotation"
                  type="number"
                  class="property-input"
                  placeholder="0"
                  min="0"
                  max="360"
                />
                <span class="property-unit">°</span>
              </div>
            </div>
            <!-- Image-specific properties -->
            <div class="property-group" v-if="selectedElements[0].type === 'image'">
              <label class="property-label">Behavior</label>
              <div class="property-checkboxes">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="selectedElements[0].element.interactive"
                  />
                  <span>Interactive</span>
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="selectedElements[0].element.pickable"
                  />
                  <span>Pickable</span>
                </label>
              </div>
            </div>
            <div class="property-group" v-if="selectedElements[0].type === 'image'">
              <label class="property-label">Z-Order</label>
              <input
                v-model.number="selectedElements[0].element.zOrder"
                type="number"
                class="property-input"
                placeholder="0"
              />
            </div>
            <!-- Image Asset -->
            <div class="property-group" v-if="selectedElements[0].type === 'image'">
              <label class="property-label">Image Asset</label>
              <div class="asset-selector">
                <select
                  v-model="selectedElements[0].element.assetId"
                  class="property-select"
                >
                  <option :value="null">-- No image --</option>
                  <option
                    v-for="asset in project.globalData.assets"
                    :key="asset.id"
                    :value="asset.id"
                  >
                    {{ asset.name }} ({{ asset.width }}×{{ asset.height }})
                  </option>
                </select>
                <div
                  v-if="selectedElements[0].element.assetId && getAssetById(selectedElements[0].element.assetId)"
                  class="asset-preview-small"
                  :style="{ backgroundImage: getAssetDisplayUrl(getAssetById(selectedElements[0].element.assetId)) ? `url(${getAssetDisplayUrl(getAssetById(selectedElements[0].element.assetId))})` : 'none' }"
                ></div>
              </div>
            </div>
            <!-- Parallax Properties -->
            <div class="property-group" v-if="selectedElements[0].type === 'image'">
              <label class="property-label">
                <input
                  type="checkbox"
                  v-model="selectedElements[0].element.parallax.enabled"
                  @change="ensureParallaxDefaults(selectedElements[0].element)"
                />
                Parallax Effect
              </label>
            </div>
            <template v-if="selectedElements[0].type === 'image' && selectedElements[0].element.parallax?.enabled">
              <div class="property-group">
                <label class="property-label">Depth Layer</label>
                <div class="parallax-depth-control">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    v-model.number="selectedElements[0].element.parallax.depth"
                    class="property-range"
                  />
                  <span class="property-value">{{ selectedElements[0].element.parallax.depth.toFixed(1) }}</span>
                </div>
                <div class="depth-hints">
                  <span class="hint-item" :class="{ active: selectedElements[0].element.parallax.depth < 0.5 }">🏔 Far BG</span>
                  <span class="hint-item" :class="{ active: selectedElements[0].element.parallax.depth >= 0.5 && selectedElements[0].element.parallax.depth < 1 }">🌳 Mid BG</span>
                  <span class="hint-item" :class="{ active: selectedElements[0].element.parallax.depth >= 1 && selectedElements[0].element.parallax.depth <= 1.1 }">🚶 Normal</span>
                  <span class="hint-item" :class="{ active: selectedElements[0].element.parallax.depth > 1.1 }">🌿 Foreground</span>
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Tiling</label>
                <div class="property-checkboxes">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="selectedElements[0].element.parallax.repeatX" />
                    <span>Repeat X</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="selectedElements[0].element.parallax.repeatY" />
                    <span>Repeat Y</span>
                  </label>
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Auto-Scroll (px/sec)</label>
                <div class="property-row">
                  <label class="property-sublabel">X</label>
                  <input
                    type="number"
                    v-model.number="selectedElements[0].element.parallax.autoScrollX"
                    class="property-input-sm"
                    placeholder="0"
                  />
                  <label class="property-sublabel">Y</label>
                  <input
                    type="number"
                    v-model.number="selectedElements[0].element.parallax.autoScrollY"
                    class="property-input-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </template>
            <!-- Exit-specific properties -->
            <div class="property-group" v-if="selectedElements[0].type === 'exit'">
              <label class="property-label">Target Scene</label>
              <select
                v-model="selectedElements[0].element.targetScene"
                class="property-select"
              >
                <option value="">-- Select scene --</option>
                <option
                  v-for="scene in availableScenes.filter(s => s.id !== currentScene.id)"
                  :key="scene.id"
                  :value="scene.id"
                >
                  {{ scene.name }} ({{ scene.id }})
                </option>
              </select>
            </div>
            <!-- Actor-specific properties -->
            <div class="property-group" v-if="selectedElements[0].type === 'actor'">
              <label class="property-label">Direction</label>
              <select v-model="selectedElements[0].element.direction" class="property-input">
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
              </select>
            </div>
            <!-- Actor Animations -->
            <div class="property-group" v-if="selectedElements[0].type === 'actor' && selectedElements[0].element.animations">
              <label class="property-label">Animations</label>
              <div class="actor-animations-config">
                <div class="animation-preview-state">
                  <span class="animation-label">Preview State:</span>
                  <select v-model="selectedElements[0].element.currentState" class="property-select-sm">
                    <option v-for="state in actorAnimationStates" :key="state.key" :value="state.key">
                      {{ state.icon }} {{ state.label }}
                    </option>
                  </select>
                </div>
                <div class="animation-assignments">
                  <div
                    v-for="state in actorAnimationStates"
                    :key="state.key"
                    class="animation-assignment-row"
                  >
                    <span class="animation-state-name">{{ state.icon }} {{ state.label }}:</span>
                    <select
                      v-model="selectedElements[0].element.animations[state.key]"
                      class="property-select-sm"
                    >
                      <option :value="null">-- Ninguna --</option>
                      <option
                        v-for="anim in globalAnimations"
                        :key="anim.id"
                        :value="anim.id"
                      >
                        {{ anim.name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <!-- Image-specific properties -->
            <div class="property-group" v-if="selectedElements[0].type === 'image'">
              <label class="property-label">Z-Order</label>
              <input
                v-model.number="selectedElements[0].element.zOrder"
                type="number"
                class="property-input"
              />
            </div>

            <!-- ===================== -->
            <!-- INTERACTIONS PANEL (for images and hotspots) -->
            <!-- ===================== -->
            <template v-if="selectedElements[0].type === 'hotspot' || (selectedElements[0].type === 'image' && selectedElements[0].element.interactive)">
              <div class="property-divider"></div>
              <div class="property-group">
                <label class="property-label">🎯 Interactions</label>
                <p class="hint-text pixel-font-xs">Define what happens when player uses verbs on this element</p>
              </div>

              <!-- Default description (Look at) -->
              <div class="property-group">
                <label class="property-label">Default Description</label>
                <textarea
                  v-model="selectedElements[0].element.description"
                  class="property-textarea"
                  placeholder="Text shown when player looks at this..."
                  rows="2"
                ></textarea>
              </div>

              <!-- Interactions list -->
              <div class="property-group">
                <label class="property-label">
                  Verb Actions ({{ selectedElements[0].element.interactions?.length || 0 }})
                  <button class="btn-add-small" @click="addInteraction(selectedElements[0].element)">+ Add</button>
                </label>
                <div class="interactions-list" v-if="selectedElements[0].element.interactions?.length">
                  <div
                    v-for="(interaction, idx) in selectedElements[0].element.interactions"
                    :key="idx"
                    class="interaction-item"
                  >
                    <div class="interaction-header">
                      <select v-model="interaction.verbId" class="property-select small">
                        <option :value="null">-- Verb --</option>
                        <option v-for="verb in project.globalData.verbs" :key="verb.id" :value="verb.id">
                          {{ verb.icon }} {{ verb.name }}
                        </option>
                      </select>
                      <button class="btn-remove-small" @click="removeInteraction(selectedElements[0].element, idx)">✕</button>
                    </div>
                    <div class="interaction-config">
                      <select v-model="interaction.action" class="property-select">
                        <option value="dialog">💬 Show Dialog</option>
                        <option value="dialogRef">📝 Play Dialog (from list)</option>
                        <option value="cutscene">🎬 Play Cutscene</option>
                        <option value="pickup">✋ Pick Up Item</option>
                        <option value="use_item">🔧 Require Item</option>
                        <option value="change_scene">🚪 Change Scene</option>
                        <option value="set_variable">📊 Set Variable</option>
                        <option value="custom">⚡ Custom Script</option>
                      </select>

                      <!-- Dialog action params -->
                      <template v-if="interaction.action === 'dialog'">
                        <textarea
                          v-model="interaction.params.text"
                          class="property-textarea"
                          placeholder="Dialog text..."
                          rows="2"
                        ></textarea>
                        <select v-model="interaction.params.actorId" class="property-select small">
                          <option :value="null">Narrator</option>
                          <option v-for="actor in project.globalData.actors" :key="actor.id" :value="actor.id">
                            {{ actor.name }}
                          </option>
                        </select>
                      </template>

                      <!-- Dialog reference params -->
                      <template v-if="interaction.action === 'dialogRef'">
                        <select v-model="interaction.params.dialogId" class="property-select">
                          <option :value="null">-- Select Dialog --</option>
                          <option v-for="dlg in currentScene.dialogs" :key="dlg.id" :value="dlg.id">
                            {{ dlg.name }}
                          </option>
                        </select>
                      </template>

                      <!-- Cutscene params -->
                      <template v-if="interaction.action === 'cutscene'">
                        <select v-model="interaction.params.cutsceneId" class="property-select">
                          <option :value="null">-- Select Cutscene --</option>
                          <option v-for="cs in currentScene.cutscenes" :key="cs.id" :value="cs.id">
                            {{ cs.name }}
                          </option>
                        </select>
                      </template>

                      <!-- Pickup params -->
                      <template v-if="interaction.action === 'pickup'">
                        <select v-model="interaction.params.itemId" class="property-select">
                          <option :value="null">-- Select Item --</option>
                          <option v-for="item in project.globalData.items" :key="item.id" :value="item.id">
                            {{ item.name }}
                          </option>
                        </select>
                        <label class="checkbox-label small">
                          <input type="checkbox" v-model="interaction.params.removeFromScene" />
                          Remove from scene after pickup
                        </label>
                      </template>

                      <!-- Use item params -->
                      <template v-if="interaction.action === 'use_item'">
                        <select v-model="interaction.params.requiredItemId" class="property-select">
                          <option :value="null">-- Required Item --</option>
                          <option v-for="item in project.globalData.items" :key="item.id" :value="item.id">
                            {{ item.name }}
                          </option>
                        </select>
                        <textarea
                          v-model="interaction.params.successText"
                          class="property-textarea"
                          placeholder="Success message..."
                          rows="1"
                        ></textarea>
                        <textarea
                          v-model="interaction.params.failText"
                          class="property-textarea"
                          placeholder="Fail message (no item)..."
                          rows="1"
                        ></textarea>
                      </template>

                      <!-- Change scene params -->
                      <template v-if="interaction.action === 'change_scene'">
                        <select v-model="interaction.params.sceneId" class="property-select">
                          <option :value="null">-- Select Scene --</option>
                          <option v-for="scene in project.scenes" :key="scene.id" :value="scene.id">
                            {{ scene.name }}
                          </option>
                        </select>
                      </template>

                      <!-- Set variable params -->
                      <template v-if="interaction.action === 'set_variable'">
                        <input
                          v-model="interaction.params.varName"
                          class="property-input"
                          placeholder="Variable name"
                        />
                        <input
                          v-model="interaction.params.varValue"
                          class="property-input"
                          placeholder="Value"
                        />
                      </template>

                      <!-- Custom script -->
                      <template v-if="interaction.action === 'custom'">
                        <textarea
                          v-model="interaction.params.script"
                          class="property-textarea code"
                          placeholder="// Custom script..."
                          rows="3"
                        ></textarea>
                      </template>

                      <!-- Condition (optional) -->
                      <div class="interaction-condition">
                        <label class="checkbox-label small">
                          <input type="checkbox" v-model="interaction.hasCondition" />
                          Requires condition
                        </label>
                        <template v-if="interaction.hasCondition">
                          <div class="condition-row">
                            <input
                              v-model="interaction.condition.varName"
                              class="property-input small"
                              placeholder="Variable"
                            />
                            <select v-model="interaction.condition.operator" class="property-select tiny">
                              <option value="==">==</option>
                              <option value="!=">!=</option>
                              <option value=">">></option>
                              <option value="<"><</option>
                              <option value=">=">>=</option>
                              <option value="<="><=</option>
                            </select>
                            <input
                              v-model="interaction.condition.value"
                              class="property-input small"
                              placeholder="Value"
                            />
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
                <p v-else class="hint-text pixel-font-xs text-muted">No interactions defined. Click "+ Add" to create one.</p>
              </div>
            </template>
            <!-- END INTERACTIONS PANEL -->

            <!-- Z-Plane-specific properties -->
            <div class="property-group" v-if="selectedElements[0].type === 'zplane'">
              <label class="property-label">Z-Index</label>
              <input
                v-model.number="selectedElements[0].element.zIndex"
                type="number"
                class="property-input"
              />
            </div>
            <!-- Walkbox rotation -->
            <div class="property-group" v-if="selectedElements[0].type === 'walkbox' && selectedElements[0].element.rotation !== undefined">
              <label class="property-label">Rotation</label>
              <div class="property-row">
                <input
                  v-model.number="selectedElements[0].element.rotation"
                  type="number"
                  class="property-input"
                  placeholder="0"
                  min="0"
                  max="360"
                />
                <span class="property-unit">°</span>
              </div>
            </div>
            <!-- Walkbox points (simplified display) -->
            <div class="property-group" v-if="selectedElements[0].type === 'walkbox' && selectedElements[0].element.points">
              <label class="property-label">Points</label>
              <div class="walkbox-points">
                <div v-for="(point, idx) in selectedElements[0].element.points" :key="idx" class="point-row">
                  <span class="point-label">P{{ idx + 1 }}:</span>
                  <input v-model.number="point.x" type="number" class="property-input tiny" />
                  <input v-model.number="point.y" type="number" class="property-input tiny" />
                </div>
              </div>
            </div>

            <!-- Dialog properties -->
            <template v-if="selectedElements[0].type === 'dialog'">
              <div class="property-group">
                <label class="property-label">Actor</label>
                <select
                  v-model="selectedElements[0].element.actor"
                  class="property-input"
                >
                  <option :value="null">-- No Actor (Narrator) --</option>
                  <option v-for="actor in project.globalData.actors" :key="actor.id" :value="actor.id">
                    {{ actor.name }}
                  </option>
                </select>
              </div>
              <div class="property-group" v-if="selectedElements[0].element.actor">
                <label class="property-label">Actor Preview</label>
                <div class="dialog-actor-preview">
                  <div
                    v-if="getActorById(selectedElements[0].element.actor)"
                    class="actor-preview-box"
                    :style="getDialogActorPreviewStyle(selectedElements[0].element.actor)"
                  >
                    <span v-if="!hasActorAnimation(selectedElements[0].element.actor)" class="actor-preview-name">
                      {{ getActorById(selectedElements[0].element.actor)?.name }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Lines ({{ selectedElements[0].element.lines?.length || 0 }})</label>
                <div class="dialog-lines">
                  <div v-for="(line, idx) in selectedElements[0].element.lines" :key="line.id || idx" class="dialog-line">
                    <select v-model="line.speaker" class="property-input tiny">
                      <option value="">-- Speaker --</option>
                      <option value="Narrator">Narrator</option>
                      <option v-for="actor in project.globalData.actors" :key="actor.id" :value="actor.name">
                        {{ actor.name }}
                      </option>
                    </select>
                    <input v-model="line.text" type="text" class="property-input" placeholder="Text" />
                    <button class="remove-line-btn" @click="removeDialogLine(selectedElements[0].element, idx)" title="Remove line">×</button>
                  </div>
                </div>
                <button class="add-line-btn" @click="selectedElements[0].element.lines.push({ id: Date.now(), speaker: '', text: '' })">+ Add Line</button>
              </div>
              <div class="property-group">
                <label class="property-label">Choices</label>
                <div class="dialog-choices">
                  <div v-for="(choice, idx) in selectedElements[0].element.choices" :key="choice.id || idx" class="dialog-choice">
                    <input v-model="choice.text" type="text" class="property-input" placeholder="Choice text" />
                    <select v-model="choice.targetDialog" class="property-input tiny">
                      <option :value="null">-- Target --</option>
                      <option v-for="dialog in currentScene.dialogs" :key="dialog.id" :value="dialog.id">
                        {{ dialog.name }}
                      </option>
                    </select>
                    <button class="remove-line-btn" @click="removeDialogChoice(selectedElements[0].element, idx)" title="Remove choice">×</button>
                  </div>
                </div>
                <button class="add-line-btn" @click="addDialogChoice(selectedElements[0].element)">+ Add Choice</button>
              </div>
            </template>

            <!-- Puzzle properties -->
            <template v-if="selectedElements[0].type === 'puzzle'">
              <div class="property-group">
                <label class="property-label">Description</label>
                <textarea
                  v-model="selectedElements[0].element.description"
                  class="property-input property-textarea"
                  placeholder="Puzzle description for designers..."
                ></textarea>
              </div>

              <div class="property-group">
                <label class="property-label">Type</label>
                <select v-model="selectedElements[0].element.type" class="property-input">
                  <option value="item-combination">Item Combination</option>
                  <option value="use-on-object">Use on Object</option>
                  <option value="use-on-actor">Use on Actor</option>
                  <option value="sequence">Sequence</option>
                  <option value="dialog-choice">Dialog Choice</option>
                  <option value="environmental">Environmental</option>
                </select>
              </div>

              <!-- CONDITIONS SECTION -->
              <div class="property-section">
                <label class="property-section-title">Conditions</label>

                <!-- Item Combination: Select 2+ items -->
                <template v-if="selectedElements[0].element.type === 'item-combination'">
                  <div class="property-group">
                    <label class="property-label">Items to Combine</label>
                    <div class="condition-items-list">
                      <div v-for="(itemId, idx) in (selectedElements[0].element.conditions?.items || [])" :key="idx" class="condition-item-row">
                        <select v-model="selectedElements[0].element.conditions.items[idx]" class="property-input">
                          <option :value="null">-- Select Item --</option>
                          <option v-for="item in currentScene.items" :key="item.id" :value="item.id">
                            {{ item.icon }} {{ item.name }}
                          </option>
                        </select>
                        <button class="remove-line-btn" @click="removeConditionItem(selectedElements[0].element, idx)">×</button>
                      </div>
                    </div>
                    <button class="add-line-btn" @click="addConditionItem(selectedElements[0].element)">+ Add Item</button>
                  </div>
                </template>

                <!-- Use on Object: Item + Target Object -->
                <template v-if="selectedElements[0].element.type === 'use-on-object'">
                  <div class="property-group">
                    <label class="property-label">Item to Use</label>
                    <select v-model="selectedElements[0].element.conditions.useItem" class="property-input">
                      <option :value="null">-- Select Item --</option>
                      <option v-for="item in currentScene.items" :key="item.id" :value="item.id">
                        {{ item.icon }} {{ item.name }}
                      </option>
                    </select>
                  </div>
                  <div class="property-group">
                    <label class="property-label">Target Object</label>
                    <select v-model="selectedElements[0].element.conditions.targetObject" class="property-input">
                      <option :value="null">-- Select Object --</option>
                      <optgroup label="Hotspots">
                        <option v-for="h in currentScene.hotspots" :key="'h-'+h.id" :value="{ type: 'hotspot', id: h.id }">
                          {{ h.name }}
                        </option>
                      </optgroup>
                      <optgroup label="Images">
                        <option v-for="i in currentScene.images" :key="'i-'+i.id" :value="{ type: 'image', id: i.id }">
                          {{ i.name }}
                        </option>
                      </optgroup>
                      <optgroup label="Exits">
                        <option v-for="e in currentScene.exits" :key="'e-'+e.id" :value="{ type: 'exit', id: e.id }">
                          {{ e.name }}
                        </option>
                      </optgroup>
                    </select>
                  </div>
                </template>

                <!-- Use on Actor: Item + Target Actor -->
                <template v-if="selectedElements[0].element.type === 'use-on-actor'">
                  <div class="property-group">
                    <label class="property-label">Item to Use/Give</label>
                    <select v-model="selectedElements[0].element.conditions.useItem" class="property-input">
                      <option :value="null">-- Select Item --</option>
                      <option v-for="item in currentScene.items" :key="item.id" :value="item.id">
                        {{ item.icon }} {{ item.name }}
                      </option>
                    </select>
                  </div>
                  <div class="property-group">
                    <label class="property-label">Target Actor</label>
                    <select v-model="selectedElements[0].element.conditions.targetActor" class="property-input">
                      <option :value="null">-- Select Actor --</option>
                      <option v-for="actor in project.globalData.actors" :key="actor.id" :value="actor.id">
                        {{ actor.name }}
                      </option>
                    </select>
                  </div>
                </template>

                <!-- Sequence: List of actions in order -->
                <template v-if="selectedElements[0].element.type === 'sequence'">
                  <div class="property-group">
                    <label class="property-label">Sequence Steps</label>
                    <div class="sequence-steps-list">
                      <div v-for="(step, idx) in (selectedElements[0].element.conditions?.sequence || [])" :key="idx" class="sequence-step-row">
                        <span class="step-number">{{ idx + 1 }}.</span>
                        <input v-model="selectedElements[0].element.conditions.sequence[idx]" type="text" class="property-input" placeholder="Action description" />
                        <button class="remove-line-btn" @click="removeSequenceStep(selectedElements[0].element, idx)">×</button>
                      </div>
                    </div>
                    <button class="add-line-btn" @click="addSequenceStep(selectedElements[0].element)">+ Add Step</button>
                  </div>
                </template>

                <!-- Dialog Choice: Dialog + Correct choices -->
                <template v-if="selectedElements[0].element.type === 'dialog-choice'">
                  <div class="property-group">
                    <label class="property-label">Dialog</label>
                    <select v-model="selectedElements[0].element.conditions.dialogId" class="property-input">
                      <option :value="null">-- Select Dialog --</option>
                      <option v-for="dialog in currentScene.dialogs" :key="dialog.id" :value="dialog.id">
                        {{ dialog.name }}
                      </option>
                    </select>
                  </div>
                  <div class="property-group" v-if="selectedElements[0].element.conditions.dialogId">
                    <label class="property-label">Required Choices</label>
                    <p class="property-hint">Select which choices must be picked to solve</p>
                    <div class="choices-checklist">
                      <label
                        v-for="choice in (currentScene.dialogs.find(d => d.id === selectedElements[0].element.conditions.dialogId)?.choices || [])"
                        :key="choice.id"
                        class="choice-checkbox"
                      >
                        <input
                          type="checkbox"
                          :checked="(selectedElements[0].element.conditions.correctChoices || []).includes(choice.id)"
                          @change="toggleCorrectChoice(selectedElements[0].element, choice.id)"
                        />
                        {{ choice.text || '(empty choice)' }}
                      </label>
                    </div>
                  </div>
                </template>

                <!-- Environmental: Just trigger object -->
                <template v-if="selectedElements[0].element.type === 'environmental'">
                  <div class="property-group">
                    <label class="property-label">Trigger Object</label>
                    <select v-model="selectedElements[0].element.conditions.targetObject" class="property-input">
                      <option :value="null">-- Select Object --</option>
                      <optgroup label="Hotspots">
                        <option v-for="h in currentScene.hotspots" :key="'h-'+h.id" :value="{ type: 'hotspot', id: h.id }">
                          {{ h.name }}
                        </option>
                      </optgroup>
                      <optgroup label="Images">
                        <option v-for="i in currentScene.images" :key="'i-'+i.id" :value="{ type: 'image', id: i.id }">
                          {{ i.name }}
                        </option>
                      </optgroup>
                    </select>
                  </div>
                  <div class="property-group">
                    <label class="property-label">Required Verb</label>
                    <select v-model="selectedElements[0].element.conditions.requiredVerb" class="property-input">
                      <option :value="null">-- Any Verb --</option>
                      <option v-for="verb in currentScene.verbs" :key="verb.id" :value="verb.id">
                        {{ verb.icon }} {{ verb.name }}
                      </option>
                    </select>
                  </div>
                </template>
              </div>

              <!-- RESULT SECTION -->
              <div class="property-section">
                <label class="property-section-title">Result</label>

                <div class="property-group">
                  <label class="property-label">Result Type</label>
                  <select v-model="selectedElements[0].element.result.type" class="property-input">
                    <option value="none">None</option>
                    <option value="give-item">Give Item</option>
                    <option value="remove-item">Remove/Consume Items</option>
                    <option value="unlock-exit">Unlock Exit</option>
                    <option value="play-cutscene">Play Cutscene</option>
                    <option value="change-state">Change Object State</option>
                    <option value="show-dialog">Show Dialog</option>
                  </select>
                </div>

                <!-- Give Item -->
                <template v-if="selectedElements[0].element.result.type === 'give-item'">
                  <div class="property-group">
                    <label class="property-label">Item to Give</label>
                    <select v-model="selectedElements[0].element.result.giveItem" class="property-input">
                      <option :value="null">-- Select Item --</option>
                      <option v-for="item in currentScene.items" :key="item.id" :value="item.id">
                        {{ item.icon }} {{ item.name }}
                      </option>
                    </select>
                  </div>
                </template>

                <!-- Remove Items -->
                <template v-if="selectedElements[0].element.result.type === 'remove-item' || selectedElements[0].element.result.type === 'give-item'">
                  <div class="property-group">
                    <label class="property-label">Items to Remove/Consume</label>
                    <div class="remove-items-list">
                      <div v-for="(itemId, idx) in (selectedElements[0].element.result?.removeItems || [])" :key="idx" class="condition-item-row">
                        <select v-model="selectedElements[0].element.result.removeItems[idx]" class="property-input">
                          <option :value="null">-- Select Item --</option>
                          <option v-for="item in currentScene.items" :key="item.id" :value="item.id">
                            {{ item.icon }} {{ item.name }}
                          </option>
                        </select>
                        <button class="remove-line-btn" @click="removeResultRemoveItem(selectedElements[0].element, idx)">×</button>
                      </div>
                    </div>
                    <button class="add-line-btn" @click="addResultRemoveItem(selectedElements[0].element)">+ Add Item to Remove</button>
                  </div>
                </template>

                <!-- Unlock Exit -->
                <template v-if="selectedElements[0].element.result.type === 'unlock-exit'">
                  <div class="property-group">
                    <label class="property-label">Exit to Unlock</label>
                    <select v-model="selectedElements[0].element.result.unlockExit" class="property-input">
                      <option :value="null">-- Select Exit --</option>
                      <option v-for="exit in currentScene.exits" :key="exit.id" :value="exit.id">
                        {{ exit.name }}
                      </option>
                    </select>
                  </div>
                </template>

                <!-- Play Cutscene -->
                <template v-if="selectedElements[0].element.result.type === 'play-cutscene'">
                  <div class="property-group">
                    <label class="property-label">Cutscene to Play</label>
                    <select v-model="selectedElements[0].element.result.playCutscene" class="property-input">
                      <option :value="null">-- Select Cutscene --</option>
                      <option v-for="cs in currentScene.cutscenes" :key="cs.id" :value="cs.id">
                        {{ cs.name }}
                      </option>
                    </select>
                  </div>
                </template>

                <!-- Change State -->
                <template v-if="selectedElements[0].element.result.type === 'change-state'">
                  <div class="property-group">
                    <label class="property-label">Object to Change</label>
                    <select v-model="selectedElements[0].element.result.changeState" class="property-input">
                      <option :value="null">-- Select Object --</option>
                      <optgroup label="Hotspots">
                        <option v-for="h in currentScene.hotspots" :key="'h-'+h.id" :value="{ type: 'hotspot', id: h.id, newState: '' }">
                          {{ h.name }}
                        </option>
                      </optgroup>
                      <optgroup label="Images">
                        <option v-for="i in currentScene.images" :key="'i-'+i.id" :value="{ type: 'image', id: i.id, newState: '' }">
                          {{ i.name }}
                        </option>
                      </optgroup>
                      <optgroup label="Exits">
                        <option v-for="e in currentScene.exits" :key="'e-'+e.id" :value="{ type: 'exit', id: e.id, newState: '' }">
                          {{ e.name }}
                        </option>
                      </optgroup>
                    </select>
                  </div>
                  <div class="property-group" v-if="selectedElements[0].element.result.changeState">
                    <label class="property-label">New State</label>
                    <input
                      v-model="selectedElements[0].element.result.changeState.newState"
                      type="text"
                      class="property-input"
                      placeholder="e.g., open, closed, broken"
                    />
                  </div>
                </template>

                <!-- Show Dialog -->
                <template v-if="selectedElements[0].element.result.type === 'show-dialog'">
                  <div class="property-group">
                    <label class="property-label">Dialog to Show</label>
                    <select v-model="selectedElements[0].element.result.showDialog" class="property-input">
                      <option :value="null">-- Select Dialog --</option>
                      <option v-for="dialog in currentScene.dialogs" :key="dialog.id" :value="dialog.id">
                        {{ dialog.name }}
                      </option>
                    </select>
                  </div>
                </template>
              </div>

              <!-- HINTS SECTION -->
              <div class="property-section">
                <label class="property-section-title">Hints</label>
                <div class="hints-list">
                  <div v-for="(hint, idx) in (selectedElements[0].element.hints || [])" :key="idx" class="hint-row">
                    <div class="hint-header">
                      <label>After</label>
                      <input v-model.number="hint.afterAttempts" type="number" min="1" class="property-input tiny" />
                      <label>attempts:</label>
                      <button class="remove-line-btn" @click="removePuzzleHint(selectedElements[0].element, idx)">×</button>
                    </div>
                    <textarea v-model="hint.text" class="property-input property-textarea" placeholder="Hint text..."></textarea>
                  </div>
                </div>
                <button class="add-line-btn" @click="addPuzzleHint(selectedElements[0].element)">+ Add Hint</button>
              </div>

              <!-- STATE -->
              <div class="property-group">
                <label class="property-label">
                  <input type="checkbox" v-model="selectedElements[0].element.solved" />
                  Solved (for testing)
                </label>
              </div>
            </template>

            <!-- Item properties -->
            <template v-if="selectedElements[0].type === 'item'">
              <div class="property-group">
                <label class="property-label">Description</label>
                <textarea
                  v-model="selectedElements[0].element.description"
                  class="property-input property-textarea"
                  placeholder="Item description..."
                ></textarea>
              </div>
              <div class="property-group">
                <label class="property-label">Icon (Emoji)</label>
                <input
                  v-model="selectedElements[0].element.icon"
                  type="text"
                  class="property-input"
                  placeholder="Emoji (e.g., 🔑)"
                />
              </div>
              <div class="property-group">
                <label class="property-label">Icon (Image Asset)</label>
                <div class="asset-selector">
                  <select
                    v-model="selectedElements[0].element.iconAssetId"
                    class="property-select"
                  >
                    <option :value="null">-- Use emoji --</option>
                    <option
                      v-for="asset in project.globalData.assets"
                      :key="asset.id"
                      :value="asset.id"
                    >
                      {{ asset.name }}
                    </option>
                  </select>
                  <div
                    v-if="selectedElements[0].element.iconAssetId && getAssetById(selectedElements[0].element.iconAssetId)"
                    class="asset-preview-small"
                    :style="{ backgroundImage: getAssetDisplayUrl(getAssetById(selectedElements[0].element.iconAssetId)) ? `url(${getAssetDisplayUrl(getAssetById(selectedElements[0].element.iconAssetId))})` : 'none' }"
                  ></div>
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">
                  <input type="checkbox" v-model="selectedElements[0].element.combinable" />
                  Can be combined with other items
                </label>
              </div>
              <div class="property-group">
                <label class="property-label">Can be used on</label>
                <div class="use-with-checkboxes">
                  <label>
                    <input type="checkbox" :checked="(selectedElements[0].element.useWith || []).includes('hotspot')" @change="toggleUseWith(selectedElements[0].element, 'hotspot')" />
                    Hotspots
                  </label>
                  <label>
                    <input type="checkbox" :checked="(selectedElements[0].element.useWith || []).includes('actor')" @change="toggleUseWith(selectedElements[0].element, 'actor')" />
                    Actors
                  </label>
                  <label>
                    <input type="checkbox" :checked="(selectedElements[0].element.useWith || []).includes('exit')" @change="toggleUseWith(selectedElements[0].element, 'exit')" />
                    Exits
                  </label>
                  <label>
                    <input type="checkbox" :checked="(selectedElements[0].element.useWith || []).includes('image')" @change="toggleUseWith(selectedElements[0].element, 'image')" />
                    Images
                  </label>
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Pickup Dialog</label>
                <select v-model="selectedElements[0].element.pickupDialog" class="property-input">
                  <option :value="null">-- None --</option>
                  <option v-for="dialog in currentScene.dialogs" :key="dialog.id" :value="dialog.id">
                    {{ dialog.name }}
                  </option>
                </select>
              </div>
              <div class="property-group">
                <label class="property-label">Examine Dialog</label>
                <select v-model="selectedElements[0].element.examineDialog" class="property-input">
                  <option :value="null">-- None --</option>
                  <option v-for="dialog in currentScene.dialogs" :key="dialog.id" :value="dialog.id">
                    {{ dialog.name }}
                  </option>
                </select>
              </div>
              <div class="property-group">
                <button class="action-btn" @click="addToInventory(selectedElements[0].element.id)">
                  Add to Inventory
                </button>
              </div>
            </template>

            <!-- Verb properties -->
            <template v-if="selectedElements[0].type === 'verb'">
              <div class="property-group">
                <label class="property-label">Icon</label>
                <input
                  v-model="selectedElements[0].element.icon"
                  type="text"
                  class="property-input"
                  placeholder="Emoji icon"
                />
              </div>
              <div class="property-group">
                <label class="property-label">Hotkey</label>
                <input
                  v-model="selectedElements[0].element.key"
                  type="text"
                  class="property-input"
                  placeholder="Key (e.g., 'l')"
                  maxlength="1"
                />
              </div>
            </template>

            <!-- SFX properties -->
            <template v-if="selectedElements[0].type === 'sfx'">
              <div class="property-group">
                <label class="property-label">Audio File</label>
                <div class="audio-selector">
                  <select
                    v-model="selectedElements[0].element.audioAssetId"
                    class="property-select"
                  >
                    <option :value="null">-- Select audio --</option>
                    <option
                      v-for="audio in project.globalData.audioAssets.filter(a => a.type === 'sfx')"
                      :key="audio.id"
                      :value="audio.id"
                    >
                      {{ audio.name }} ({{ formatDuration(audio.duration) }})
                    </option>
                  </select>
                  <button
                    v-if="selectedElements[0].element.audioAssetId && getAudioAssetById(selectedElements[0].element.audioAssetId)"
                    class="audio-preview-btn"
                    @click="currentlyPlayingAudio?.id === selectedElements[0].element.audioAssetId ? stopAudioPreview() : playAudioPreview(getAudioAssetById(selectedElements[0].element.audioAssetId))"
                    :title="currentlyPlayingAudio?.id === selectedElements[0].element.audioAssetId ? 'Stop' : 'Preview'"
                  >
                    {{ currentlyPlayingAudio?.id === selectedElements[0].element.audioAssetId ? '⏹' : '▶' }}
                  </button>
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Volume ({{ selectedElements[0].element.volume }}%)</label>
                <input
                  v-model.number="selectedElements[0].element.volume"
                  type="range"
                  min="0"
                  max="100"
                  class="property-slider"
                />
              </div>
              <div class="property-group">
                <label class="property-label">Trigger</label>
                <select v-model="selectedElements[0].element.trigger" class="property-input">
                  <option value="manual">Manual</option>
                  <option value="enter">On Room Enter</option>
                  <option value="action">On Action</option>
                  <option value="dialog">On Dialog</option>
                </select>
              </div>
              <div class="property-group">
                <label class="property-label">
                  <input type="checkbox" v-model="selectedElements[0].element.loop" />
                  Loop
                </label>
              </div>
            </template>

            <!-- Music properties -->
            <template v-if="selectedElements[0].type === 'music'">
              <div class="property-group">
                <label class="property-label">Audio File</label>
                <div class="audio-selector">
                  <select
                    v-model="selectedElements[0].element.audioAssetId"
                    class="property-select"
                  >
                    <option :value="null">-- Select audio --</option>
                    <option
                      v-for="audio in project.globalData.audioAssets.filter(a => a.type === 'music')"
                      :key="audio.id"
                      :value="audio.id"
                    >
                      {{ audio.name }} ({{ formatDuration(audio.duration) }})
                    </option>
                  </select>
                  <button
                    v-if="selectedElements[0].element.audioAssetId && getAudioAssetById(selectedElements[0].element.audioAssetId)"
                    class="audio-preview-btn"
                    @click="currentlyPlayingAudio?.id === selectedElements[0].element.audioAssetId ? stopAudioPreview() : playAudioPreview(getAudioAssetById(selectedElements[0].element.audioAssetId))"
                    :title="currentlyPlayingAudio?.id === selectedElements[0].element.audioAssetId ? 'Stop' : 'Preview'"
                  >
                    {{ currentlyPlayingAudio?.id === selectedElements[0].element.audioAssetId ? '⏹' : '▶' }}
                  </button>
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Volume ({{ selectedElements[0].element.volume }}%)</label>
                <input
                  v-model.number="selectedElements[0].element.volume"
                  type="range"
                  min="0"
                  max="100"
                  class="property-slider"
                />
              </div>
              <div class="property-group">
                <label class="property-label">Fade In (ms)</label>
                <input
                  v-model.number="selectedElements[0].element.fadeIn"
                  type="number"
                  class="property-input"
                  min="0"
                />
              </div>
              <div class="property-group">
                <label class="property-label">Fade Out (ms)</label>
                <input
                  v-model.number="selectedElements[0].element.fadeOut"
                  type="number"
                  class="property-input"
                  min="0"
                />
              </div>
              <div class="property-group">
                <label class="property-label">
                  <input type="checkbox" v-model="selectedElements[0].element.loop" />
                  Loop
                </label>
              </div>
            </template>

            <!-- Cutscene properties -->
            <template v-if="selectedElements[0].type === 'cutscene'">
              <div class="property-group">
                <label class="property-label">Trigger</label>
                <select v-model="selectedElements[0].element.trigger" class="property-select">
                  <option value="manual">Manual</option>
                  <option value="scene-enter">Scene Enter</option>
                  <option value="object-interact">Object Interact</option>
                  <option value="puzzle-solved">Puzzle Solved</option>
                </select>
              </div>
              <div class="property-group" v-if="selectedElements[0].element.trigger === 'object-interact'">
                <label class="property-label">Target Object</label>
                <select v-model="selectedElements[0].element.triggerTarget" class="property-select">
                  <option :value="null">-- Select --</option>
                  <option v-for="img in currentScene.images" :key="img.id" :value="img.id">
                    {{ img.name }} (#{{ img.id }})
                  </option>
                  <option v-for="hotspot in currentScene.hotspots" :key="'h'+hotspot.id" :value="'hotspot-'+hotspot.id">
                    {{ hotspot.name }} (#{{ hotspot.id }})
                  </option>
                </select>
              </div>
              <div class="property-group" v-if="selectedElements[0].element.trigger === 'puzzle-solved'">
                <label class="property-label">Target Puzzle</label>
                <select v-model="selectedElements[0].element.triggerTarget" class="property-select">
                  <option :value="null">-- Select --</option>
                  <option v-for="puzzle in currentScene.puzzles" :key="puzzle.id" :value="puzzle.id">
                    {{ puzzle.name }} (#{{ puzzle.id }})
                  </option>
                </select>
              </div>
              <div class="property-group">
                <label class="property-label">
                  <input type="checkbox" v-model="selectedElements[0].element.skippable" />
                  Skippable (ESC)
                </label>
              </div>

              <!-- Actions List -->
              <div class="property-divider">
                <span>ACTIONS ({{ selectedElements[0].element.actions.length }})</span>
              </div>

              <div class="actions-list">
                <div
                  v-for="(action, index) in selectedElements[0].element.actions"
                  :key="action.id"
                  class="action-item"
                >
                  <div class="action-header">
                    <span class="action-index">#{{ index + 1 }}</span>
                    <span class="action-type">{{ action.type }}</span>
                    <div class="action-controls">
                      <button
                        class="action-btn"
                        @click="moveAction(index, -1)"
                        :disabled="index === 0"
                        title="Move up"
                      >↑</button>
                      <button
                        class="action-btn"
                        @click="moveAction(index, 1)"
                        :disabled="index === selectedElements[0].element.actions.length - 1"
                        title="Move down"
                      >↓</button>
                      <button
                        class="action-btn action-btn-delete"
                        @click="removeAction(index)"
                        title="Delete"
                      >×</button>
                    </div>
                  </div>

                  <!-- Action Parameters based on type -->
                  <div class="action-params">
                    <!-- Dialog -->
                    <template v-if="action.type === 'dialog'">
                      <select v-model="action.params.actorId" class="property-select-sm">
                        <option :value="null">Narrator</option>
                        <option v-for="actor in project.globalData.actors" :key="actor.id" :value="actor.id">
                          {{ actor.name }}
                        </option>
                      </select>
                      <textarea
                        v-model="action.params.text"
                        class="property-textarea-sm"
                        placeholder="Dialog text..."
                        rows="2"
                      ></textarea>
                    </template>

                    <!-- Move Actor -->
                    <template v-if="action.type === 'move-actor'">
                      <select v-model="action.params.actorId" class="property-select-sm">
                        <option v-for="actor in project.globalData.actors" :key="actor.id" :value="actor.id">
                          {{ actor.name }}
                        </option>
                      </select>
                      <div class="action-row">
                        <input v-model.number="action.params.x" type="number" placeholder="X" class="property-input-xs" />
                        <input v-model.number="action.params.y" type="number" placeholder="Y" class="property-input-xs" />
                      </div>
                      <label class="property-label-sm">
                        <input type="checkbox" v-model="action.params.walk" /> Walk animation
                      </label>
                    </template>

                    <!-- Actor Direction -->
                    <template v-if="action.type === 'actor-direction'">
                      <select v-model="action.params.actorId" class="property-select-sm">
                        <option v-for="actor in project.globalData.actors" :key="actor.id" :value="actor.id">
                          {{ actor.name }}
                        </option>
                      </select>
                      <select v-model="action.params.direction" class="property-select-sm">
                        <option value="north">North</option>
                        <option value="south">South</option>
                        <option value="east">East</option>
                        <option value="west">West</option>
                      </select>
                    </template>

                    <!-- Actor Costume -->
                    <template v-if="action.type === 'actor-costume'">
                      <select v-model="action.params.actorId" class="property-select-sm">
                        <option v-for="actor in project.globalData.actors" :key="actor.id" :value="actor.id">
                          {{ actor.name }}
                        </option>
                      </select>
                      <input v-model="action.params.costume" type="text" placeholder="Costume name" class="property-input-sm" />
                    </template>

                    <!-- Play SFX -->
                    <template v-if="action.type === 'play-sfx'">
                      <select v-model="action.params.sfxId" class="property-select-sm">
                        <option v-for="sfx in currentScene.sfx" :key="sfx.id" :value="sfx.id">
                          {{ sfx.name }}
                        </option>
                      </select>
                    </template>

                    <!-- Play Music -->
                    <template v-if="action.type === 'play-music'">
                      <select v-model="action.params.musicId" class="property-select-sm">
                        <option v-for="track in currentScene.music" :key="track.id" :value="track.id">
                          {{ track.name }}
                        </option>
                      </select>
                      <input v-model.number="action.params.fadeIn" type="number" placeholder="Fade in (ms)" class="property-input-sm" />
                    </template>

                    <!-- Stop Music -->
                    <template v-if="action.type === 'stop-music'">
                      <input v-model.number="action.params.fadeOut" type="number" placeholder="Fade out (ms)" class="property-input-sm" />
                    </template>

                    <!-- Wait -->
                    <template v-if="action.type === 'wait'">
                      <input v-model.number="action.params.duration" type="number" placeholder="Duration (ms)" class="property-input-sm" />
                    </template>

                    <!-- Fade In/Out -->
                    <template v-if="action.type === 'fade-in' || action.type === 'fade-out'">
                      <input v-model.number="action.params.duration" type="number" placeholder="Duration (ms)" class="property-input-sm" />
                      <input v-model="action.params.color" type="color" class="property-color" title="Fade color" />
                    </template>

                    <!-- Camera Pan -->
                    <template v-if="action.type === 'camera-pan'">
                      <div class="action-row">
                        <input v-model.number="action.params.x" type="number" placeholder="X" class="property-input-xs" />
                        <input v-model.number="action.params.y" type="number" placeholder="Y" class="property-input-xs" />
                      </div>
                      <input v-model.number="action.params.duration" type="number" placeholder="Duration (ms)" class="property-input-sm" />
                    </template>

                    <!-- Camera Shake -->
                    <template v-if="action.type === 'camera-shake'">
                      <input v-model.number="action.params.intensity" type="number" placeholder="Intensity (px)" class="property-input-sm" />
                      <input v-model.number="action.params.duration" type="number" placeholder="Duration (ms)" class="property-input-sm" />
                    </template>

                    <!-- Change Scene -->
                    <template v-if="action.type === 'change-scene'">
                      <select v-model="action.params.sceneId" class="property-select-sm">
                        <option value="">-- Select scene --</option>
                        <option
                          v-for="scene in availableScenes"
                          :key="scene.id"
                          :value="scene.id"
                        >
                          {{ scene.name }}
                        </option>
                      </select>
                      <select v-model="action.params.transition" class="property-select-sm">
                        <option value="cut">Cut</option>
                        <option value="fade">Fade</option>
                        <option value="dissolve">Dissolve</option>
                      </select>
                    </template>
                  </div>
                </div>

                <p v-if="selectedElements[0].element.actions.length === 0" class="empty-actions">
                  No actions yet
                </p>
              </div>

              <!-- Add Action Dropdown -->
              <div class="property-group">
                <label class="property-label">Add Action</label>
                <select class="property-select" @change="addAction($event)">
                  <option value="">-- Select action type --</option>
                  <optgroup label="Dialog & Actors">
                    <option value="dialog">Dialog</option>
                    <option value="move-actor">Move Actor</option>
                    <option value="actor-direction">Actor Direction</option>
                    <option value="actor-costume">Actor Costume</option>
                  </optgroup>
                  <optgroup label="Audio">
                    <option value="play-sfx">Play SFX</option>
                    <option value="play-music">Play Music</option>
                    <option value="stop-music">Stop Music</option>
                  </optgroup>
                  <optgroup label="Timing">
                    <option value="wait">Wait</option>
                  </optgroup>
                  <optgroup label="Visual Effects">
                    <option value="fade-in">Fade In</option>
                    <option value="fade-out">Fade Out</option>
                    <option value="camera-pan">Camera Pan</option>
                    <option value="camera-shake">Camera Shake</option>
                  </optgroup>
                  <optgroup label="Navigation">
                    <option value="change-scene">Change Scene</option>
                  </optgroup>
                </select>
              </div>
            </template>

            <!-- Light properties -->
            <template v-if="selectedElements[0].type === 'light'">
              <div class="property-group">
                <label class="property-label">Name</label>
                <input v-model="selectedElements[0].element.name" type="text" class="property-input" />
              </div>
              <div class="property-group">
                <label class="property-label">Type</label>
                <select v-model="selectedElements[0].element.type" class="property-select">
                  <option v-for="lt in lightTypes" :key="lt.id" :value="lt.id">
                    {{ lt.icon }} {{ lt.name }}
                  </option>
                </select>
              </div>
              <div class="property-group">
                <label class="property-label">Color</label>
                <input v-model="selectedElements[0].element.color" type="color" class="property-color" />
              </div>
              <div class="property-group">
                <label class="property-label">Position</label>
                <div class="property-row">
                  <label class="property-sublabel">X</label>
                  <input v-model.number="selectedElements[0].element.x" type="number" class="property-input-sm" />
                  <label class="property-sublabel">Y</label>
                  <input v-model.number="selectedElements[0].element.y" type="number" class="property-input-sm" />
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Intensity</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  v-model.number="selectedElements[0].element.intensity"
                  class="property-range"
                />
                <span class="property-value">{{ selectedElements[0].element.intensity.toFixed(1) }}</span>
              </div>
              <div class="property-group" v-if="selectedElements[0].element.type === 'point' || selectedElements[0].element.type === 'spot'">
                <label class="property-label">Radius</label>
                <input v-model.number="selectedElements[0].element.radius" type="number" min="10" class="property-input" />
              </div>
              <div class="property-group" v-if="selectedElements[0].element.type === 'spot'">
                <label class="property-label">Cone Angle</label>
                <input v-model.number="selectedElements[0].element.angle" type="number" min="1" max="180" class="property-input" />
              </div>
              <div class="property-group" v-if="selectedElements[0].element.type === 'spot' || selectedElements[0].element.type === 'directional'">
                <label class="property-label">Direction (deg)</label>
                <input v-model.number="selectedElements[0].element.direction" type="number" min="0" max="360" class="property-input" />
              </div>
              <div class="property-group" v-if="selectedElements[0].element.type === 'area'">
                <label class="property-label">Size</label>
                <div class="property-row">
                  <label class="property-sublabel">W</label>
                  <input v-model.number="selectedElements[0].element.width" type="number" min="10" class="property-input-sm" />
                  <label class="property-sublabel">H</label>
                  <input v-model.number="selectedElements[0].element.height" type="number" min="10" class="property-input-sm" />
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Falloff</label>
                <select v-model="selectedElements[0].element.falloff" class="property-select">
                  <option value="none">None</option>
                  <option value="linear">Linear</option>
                  <option value="smooth">Smooth</option>
                </select>
              </div>
              <div class="property-group">
                <label class="property-label">
                  <input type="checkbox" v-model="selectedElements[0].element.enabled" />
                  Enabled
                </label>
              </div>
              <div class="property-group">
                <label class="property-label">
                  <input type="checkbox" v-model="selectedElements[0].element.castShadows" />
                  Cast Shadows
                </label>
              </div>
              <button class="delete-btn" @click="deleteSelectedLight">🗑 Delete Light</button>
            </template>

            <!-- Particle emitter properties -->
            <template v-if="selectedElements[0].type === 'particle'">
              <div class="property-group">
                <label class="property-label">Name</label>
                <input v-model="selectedElements[0].element.name" type="text" class="property-input" />
              </div>
              <div class="property-group">
                <label class="property-label">Preset</label>
                <select
                  :value="selectedElements[0].element.preset"
                  @change="applyParticlePreset(selectedElements[0].element, $event.target.value)"
                  class="property-select"
                >
                  <option v-for="(preset, key) in particlePresets" :key="key" :value="key">
                    {{ preset.icon }} {{ preset.name }}
                  </option>
                </select>
              </div>
              <div class="property-group">
                <label class="property-label">Position</label>
                <div class="property-row">
                  <label class="property-sublabel">X</label>
                  <input v-model.number="selectedElements[0].element.x" type="number" class="property-input-sm" />
                  <label class="property-sublabel">Y</label>
                  <input v-model.number="selectedElements[0].element.y" type="number" class="property-input-sm" />
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Emission Area</label>
                <div class="property-row">
                  <label class="property-sublabel">W</label>
                  <input v-model.number="selectedElements[0].element.width" type="number" min="1" class="property-input-sm" />
                  <label class="property-sublabel">H</label>
                  <input v-model.number="selectedElements[0].element.height" type="number" min="1" class="property-input-sm" />
                </div>
              </div>

              <div class="property-divider">
                <span>EMISSION</span>
              </div>
              <div class="property-group">
                <label class="property-label">Emit Rate (per sec)</label>
                <input v-model.number="selectedElements[0].element.emitRate" type="number" min="1" class="property-input" />
              </div>
              <div class="property-group">
                <label class="property-label">Lifetime (sec)</label>
                <div class="property-row">
                  <label class="property-sublabel">Min</label>
                  <input v-model.number="selectedElements[0].element.lifetime.min" type="number" step="0.1" min="0.1" class="property-input-sm" />
                  <label class="property-sublabel">Max</label>
                  <input v-model.number="selectedElements[0].element.lifetime.max" type="number" step="0.1" min="0.1" class="property-input-sm" />
                </div>
              </div>

              <div class="property-divider">
                <span>MOVEMENT</span>
              </div>
              <div class="property-group">
                <label class="property-label">Speed</label>
                <div class="property-row">
                  <label class="property-sublabel">Min</label>
                  <input v-model.number="selectedElements[0].element.speed.min" type="number" min="0" class="property-input-sm" />
                  <label class="property-sublabel">Max</label>
                  <input v-model.number="selectedElements[0].element.speed.max" type="number" min="0" class="property-input-sm" />
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Direction (deg)</label>
                <div class="property-row">
                  <label class="property-sublabel">Min</label>
                  <input v-model.number="selectedElements[0].element.direction.min" type="number" class="property-input-sm" />
                  <label class="property-sublabel">Max</label>
                  <input v-model.number="selectedElements[0].element.direction.max" type="number" class="property-input-sm" />
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Gravity</label>
                <input v-model.number="selectedElements[0].element.gravity" type="number" class="property-input" />
              </div>

              <div class="property-divider">
                <span>APPEARANCE</span>
              </div>
              <div class="property-group">
                <label class="property-label">Size</label>
                <div class="property-row">
                  <label class="property-sublabel">Start</label>
                  <input v-model.number="selectedElements[0].element.size.start" type="number" min="1" class="property-input-sm" />
                  <label class="property-sublabel">End</label>
                  <input v-model.number="selectedElements[0].element.size.end" type="number" min="1" class="property-input-sm" />
                </div>
              </div>
              <div class="property-group">
                <label class="property-label">Color Start</label>
                <input v-model="selectedElements[0].element.color.start" type="text" class="property-input" placeholder="#rrggbbaa" />
              </div>
              <div class="property-group">
                <label class="property-label">Color End</label>
                <input v-model="selectedElements[0].element.color.end" type="text" class="property-input" placeholder="#rrggbbaa" />
              </div>
              <div class="property-group">
                <label class="property-label">Shape</label>
                <select v-model="selectedElements[0].element.shape" class="property-select">
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                  <option value="star">Star</option>
                  <option value="line">Line</option>
                </select>
              </div>
              <div class="property-group">
                <label class="property-label">Blend Mode</label>
                <select v-model="selectedElements[0].element.blendMode" class="property-select">
                  <option value="normal">Normal</option>
                  <option value="screen">Screen (Additive)</option>
                  <option value="multiply">Multiply</option>
                  <option value="overlay">Overlay</option>
                </select>
              </div>
              <div class="property-group">
                <label class="property-label">
                  <input type="checkbox" v-model="selectedElements[0].element.enabled" />
                  Enabled
                </label>
              </div>
              <button class="delete-btn" @click="deleteSelectedParticle">🗑 Delete Emitter</button>
            </template>
          </div>
        </div>
      </aside>
    </div>

    <!-- Status bar -->
    <footer class="editor-status-bar">
      <span class="status-item">
        Scene: {{ currentScene.name }} ({{ currentScene.width }}x{{ currentScene.height }})
      </span>
      <span class="status-item" v-if="selectedElements.length > 0">
        Selected: {{ selectedElements[0].element.name || `${selectedElements[0].type} #${selectedElements[0].element.id}` }}
      </span>
      <span class="status-item" v-if="selectedElements.length > 0 && selectedElements[0].element.x !== undefined">
        Position: {{ Math.round(selectedElements[0].element.x) }}, {{ Math.round(selectedElements[0].element.y) }}
      </span>
      <span class="status-item" v-if="selectedElements.length > 0 && selectedElements[0].element.points">
        Position: {{ Math.round(selectedElements[0].element.points[0].x) }}, {{ Math.round(selectedElements[0].element.points[0].y) }}
      </span>
      <span class="status-item dragging-indicator" v-if="isDragging">
        🔄 Dragging...
      </span>
      <span class="status-item" v-if="selectedElements.length === 0">
        Click an element to select • Drag to move
      </span>
      <span class="status-item">
        History: {{ historyIndex + 1 }}/{{ historyStack.length }}
      </span>
      <span class="status-item status-right">
        Zoom: {{ Math.round(zoom * 100) }}%
      </span>
    </footer>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="context-menu pixel-border"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <div class="context-menu-header" v-if="selectedElements.length > 0">
          {{ selectedElements.length }} element{{ selectedElements.length > 1 ? 's' : '' }} selected
        </div>

        <!-- Group options -->
        <button
          v-if="canGroup && !selectionInGroup"
          class="context-menu-item"
          @click="createGroup"
        >
          <span class="menu-icon">🔗</span>
          Group Elements
        </button>

        <button
          v-if="selectionInGroup"
          class="context-menu-item"
          @click="selectGroup"
        >
          <span class="menu-icon">⬚</span>
          Select Entire Group
        </button>

        <button
          v-if="selectionInGroup"
          class="context-menu-item"
          @click="ungroupSelected"
        >
          <span class="menu-icon">🔓</span>
          Ungroup
        </button>

        <button
          v-if="currentScene.groups && currentScene.groups.length > 0"
          class="context-menu-item danger"
          @click="clearAllGroups"
        >
          <span class="menu-icon">🗑️</span>
          Clear All Groups
        </button>

        <div v-if="selectedElements.length > 0 && (canGroup || selectionInGroup)" class="context-menu-divider"></div>

        <!-- Common actions -->
        <button
          v-if="selectedElements.length > 0"
          class="context-menu-item"
          @click="duplicateSelected"
        >
          <span class="menu-icon">📋</span>
          Duplicate
        </button>

        <button
          v-if="selectedElements.length > 0"
          class="context-menu-item context-menu-item-danger"
          @click="deleteSelected"
        >
          <span class="menu-icon">🗑</span>
          Delete
        </button>

        <!-- Group info -->
        <div v-if="selectedGroup" class="context-menu-divider"></div>
        <div v-if="selectedGroup" class="context-menu-info">
          <span class="menu-icon">📁</span>
          Group: {{ selectedGroup.name }}
        </div>

        <!-- No selection -->
        <div v-if="selectedElements.length === 0" class="context-menu-info">
          No elements selected
        </div>
      </div>
    </Teleport>

    <!-- AI Assistant Panel -->
    <div v-if="aiPanelOpen" class="modal-overlay ai-panel-overlay" @click.self="closeAiPanel">
      <div class="modal-content ai-panel-modal">
        <header class="modal-header ai-header">
          <div class="ai-header-left">
            <span class="ai-icon">🤖</span>
            <h3>AI Assistant</h3>
          </div>
          <div class="ai-header-status">
            <span class="ai-connection-status" :class="{ connected: claudeIsConnected }">
              {{ claudeIsConnected ? '● Connected' : '○ Disconnected' }}
            </span>
          </div>
          <button class="modal-close-btn" @click="closeAiPanel">✕</button>
        </header>

        <div class="modal-body ai-body">
          <!-- Status Bar -->
          <div class="ai-status-bar" :class="aiStatus">
            <span class="ai-status-icon">
              <template v-if="aiStatus === 'idle'">💡</template>
              <template v-else-if="aiStatus === 'connecting'">🔄</template>
              <template v-else-if="aiStatus === 'generating'">⚙️</template>
              <template v-else-if="aiStatus === 'complete'">✅</template>
              <template v-else-if="aiStatus === 'error'">❌</template>
            </span>
            <span class="ai-status-message">{{ aiStatusMessage || 'Escribe un script y presiona Generar' }}</span>
          </div>

          <!-- Script Editor -->
          <div class="ai-script-section">
            <div class="ai-script-header">
              <label class="ai-label">Script del Juego (Markdown)</label>
              <button class="ai-sample-btn" @click="loadSampleScript" title="Load sample script">
                📝 Cargar Ejemplo
              </button>
            </div>
            <textarea
              v-model="aiScript"
              class="ai-script-textarea"
              placeholder="# MI JUEGO

## PERSONAJES
### PROTAGONISTA
- Rol: Protagonista
- Descripción: ...

## ESCENAS
### Escena Inicial
Descripción: ...
Elementos:
- Puerta (exit) → Siguiente escena

## PUZZLES
..."
              :disabled="aiStatus === 'generating'"
            ></textarea>
          </div>

          <!-- Script Tips -->
          <div class="ai-tips">
            <details>
              <summary>📖 Guía de formato del script</summary>
              <div class="ai-tips-content">
                <p><strong># TÍTULO</strong> - Nombre del juego</p>
                <p><strong>## PERSONAJES</strong> - Define actores con rol, descripción y ubicación</p>
                <p><strong>## ITEMS</strong> - Objetos recogibles con icono y descripción</p>
                <p><strong>## ESCENAS</strong> - Lugares con elementos, hotspots y exits</p>
                <p><strong>## DIÁLOGOS</strong> - Conversaciones con opciones</p>
                <p><strong>## PUZZLES</strong> - Acertijos con condiciones y resultados</p>
              </div>
            </details>
          </div>
        </div>

        <footer class="modal-footer ai-footer">
          <div class="ai-footer-left">
            <span class="ai-char-count">{{ aiScript.length }} caracteres</span>
          </div>
          <div class="ai-footer-right">
            <button class="modal-btn secondary" @click="closeAiPanel">Cancelar</button>
            <button
              class="modal-btn ai-generate-btn"
              @click="handleAiGenerate"
              :disabled="aiStatus === 'generating' || aiStatus === 'connecting' || !aiScript.trim()"
            >
              <template v-if="aiStatus === 'generating'">
                <span class="generating-spinner">⚙️</span> Generando...
              </template>
              <template v-else>
                🚀 Generar Proyecto
              </template>
            </button>
          </div>
        </footer>
      </div>
    </div>

    <!-- Rename Scene Modal -->
    <div v-if="showRenameSceneModal" class="modal-overlay" @click.self="showRenameSceneModal = false">
      <div class="modal-content small-modal">
        <header class="modal-header">
          <h3>Rename Scene</h3>
          <button class="modal-close-btn" @click="showRenameSceneModal = false">✕</button>
        </header>
        <div class="modal-body">
          <input
            v-model="renameSceneValue"
            type="text"
            class="property-input"
            placeholder="Scene name"
            @keyup.enter="confirmRenameScene"
            autofocus
          />
        </div>
        <footer class="modal-footer">
          <button class="modal-btn secondary" @click="showRenameSceneModal = false">Cancel</button>
          <button class="modal-btn" @click="confirmRenameScene">Rename</button>
        </footer>
      </div>
    </div>

    <!-- Place Actor Modal -->
    <div v-if="showPlaceActorModal" class="modal-overlay" @click.self="showPlaceActorModal = false">
      <div class="modal-content small-modal">
        <header class="modal-header">
          <h3>Place Actor in Scene</h3>
          <button class="modal-close-btn" @click="showPlaceActorModal = false">✕</button>
        </header>
        <div class="modal-body">
          <p v-if="project.globalData.actors.length === 0" class="empty-section">No characters defined. Create characters first.</p>
          <div v-else class="inventory-add-list">
            <div
              v-for="actor in project.globalData.actors"
              :key="actor.id"
              class="inventory-add-item"
              :class="{ 'in-inventory': currentScene.actorPlacements.some(p => p.actorId === actor.id) }"
              @click="placeActorInScene(actor.id); showPlaceActorModal = false"
            >
              <span class="item-icon">👤</span>
              <span class="item-name">{{ actor.name }}</span>
              <span v-if="currentScene.actorPlacements.some(p => p.actorId === actor.id)" class="item-check">✓</span>
            </div>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="modal-btn" @click="showPlaceActorModal = false">Done</button>
        </footer>
      </div>
    </div>

    <!-- Add to Inventory Modal -->
    <div v-if="showAddToInventoryModal" class="modal-overlay" @click.self="showAddToInventoryModal = false">
      <div class="modal-content small-modal">
        <header class="modal-header">
          <h3>Add Item to Inventory</h3>
          <button class="modal-close-btn" @click="showAddToInventoryModal = false">✕</button>
        </header>
        <div class="modal-body">
          <p v-if="project.globalData.items.length === 0" class="empty-section">No items defined. Create items first.</p>
          <div v-else class="inventory-add-list">
            <div
              v-for="item in project.globalData.items"
              :key="item.id"
              class="inventory-add-item"
              :class="{ 'in-inventory': project.globalData.inventory.includes(item.id) }"
              @click="toggleInventoryItem(item.id)"
            >
              <span
                v-if="itemHasAssetIcon(item)"
                class="item-icon item-icon-asset"
                :style="getItemIconStyle(item)"
              ></span>
              <span v-else class="item-icon">{{ item.icon || '📦' }}</span>
              <span class="item-name">{{ item.name }}</span>
              <span v-if="project.globalData.inventory.includes(item.id)" class="item-check">✓</span>
            </div>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="modal-btn" @click="showAddToInventoryModal = false">Done</button>
        </footer>
      </div>
    </div>

    <!-- Asset Manager Modal -->
    <div v-if="showAssetManagerModal" class="modal-overlay asset-manager-overlay" @click.self="showAssetManagerModal = false">
      <div class="modal-content asset-manager-modal asset-manager-with-folders">
        <header class="modal-header">
          <h3>🖼️ Asset Manager</h3>
          <button class="modal-close-btn" @click="showAssetManagerModal = false">✕</button>
        </header>
        <div class="modal-body asset-manager-body-with-sidebar">
          <!-- Folder Sidebar -->
          <div class="asset-folder-sidebar">
            <div class="folder-sidebar-header">
              <span class="folder-sidebar-title">Carpetas</span>
              <button
                class="folder-add-btn"
                @click="showNewFolderInput = !showNewFolderInput"
                title="Nueva carpeta"
              >+</button>
            </div>

            <!-- New Folder Input -->
            <div v-if="showNewFolderInput" class="new-folder-input-row">
              <input
                type="text"
                v-model="newFolderName"
                class="new-folder-input"
                placeholder="Nombre..."
                @keyup.enter="createAssetFolder(newFolderName, selectedAssetFolder); showNewFolderInput = false"
                @keyup.escape="showNewFolderInput = false; newFolderName = ''"
                ref="newFolderInput"
              />
              <button class="new-folder-ok-btn" @click="createAssetFolder(newFolderName, selectedAssetFolder); showNewFolderInput = false">✓</button>
              <button class="new-folder-cancel-btn" @click="showNewFolderInput = false; newFolderName = ''">✕</button>
            </div>

            <!-- Folder Tree -->
            <div class="folder-tree">
              <!-- Root Folder -->
              <div
                class="folder-item"
                :class="{ selected: selectedAssetFolder === '/' }"
                @click="selectAssetFolder('/')"
                @dragover.prevent
                @drop.prevent="handleFolderDrop($event, '/')"
              >
                <span class="folder-icon">📁</span>
                <span class="folder-name">Raíz</span>
                <span class="folder-count">({{ getFolderAssetCount('/', false) }})</span>
              </div>

              <!-- Recursive Folder Tree Component (inline) -->
              <template v-for="folder in assetFolderTree.children" :key="folder.id">
                <div
                  class="folder-item folder-child"
                  :class="{ selected: selectedAssetFolder === folder.path }"
                  :style="{ paddingLeft: '20px' }"
                  @click="selectAssetFolder(folder.path)"
                  @dragover.prevent
                  @drop.prevent="handleFolderDrop($event, folder.path)"
                >
                  <span class="folder-icon">{{ folder.icon || '📁' }}</span>
                  <template v-if="renamingFolderId === folder.id">
                    <input
                      type="text"
                      v-model="renamingFolderValue"
                      class="folder-rename-input"
                      @keyup.enter="renameAssetFolder(folder.id, renamingFolderValue)"
                      @keyup.escape="cancelRenamingFolder"
                      @blur="renameAssetFolder(folder.id, renamingFolderValue)"
                      @click.stop
                      autofocus
                    />
                  </template>
                  <template v-else>
                    <span class="folder-name" @dblclick.stop="startRenamingFolder(folder)">{{ folder.name }}</span>
                    <span class="folder-count">({{ getFolderAssetCount(folder.path, true) }})</span>
                    <div class="folder-actions">
                      <button class="folder-action-btn" @click.stop="startRenamingFolder(folder)" title="Renombrar">✏️</button>
                      <button class="folder-action-btn" @click.stop="deleteAssetFolder(folder.id)" title="Eliminar">🗑️</button>
                    </div>
                  </template>
                </div>

                <!-- Nested subfolders (one level for simplicity) -->
                <template v-for="subfolder in folder.children" :key="subfolder.id">
                  <div
                    class="folder-item folder-child"
                    :class="{ selected: selectedAssetFolder === subfolder.path }"
                    :style="{ paddingLeft: '40px' }"
                    @click="selectAssetFolder(subfolder.path)"
                    @dragover.prevent
                    @drop.prevent="handleFolderDrop($event, subfolder.path)"
                  >
                    <span class="folder-icon">{{ subfolder.icon || '📁' }}</span>
                    <template v-if="renamingFolderId === subfolder.id">
                      <input
                        type="text"
                        v-model="renamingFolderValue"
                        class="folder-rename-input"
                        @keyup.enter="renameAssetFolder(subfolder.id, renamingFolderValue)"
                        @keyup.escape="cancelRenamingFolder"
                        @blur="renameAssetFolder(subfolder.id, renamingFolderValue)"
                        @click.stop
                      />
                    </template>
                    <template v-else>
                      <span class="folder-name" @dblclick.stop="startRenamingFolder(subfolder)">{{ subfolder.name }}</span>
                      <span class="folder-count">({{ getFolderAssetCount(subfolder.path, true) }})</span>
                      <div class="folder-actions">
                        <button class="folder-action-btn" @click.stop="startRenamingFolder(subfolder)" title="Renombrar">✏️</button>
                        <button class="folder-action-btn" @click.stop="deleteAssetFolder(subfolder.id)" title="Eliminar">🗑️</button>
                      </div>
                    </template>
                  </div>
                </template>
              </template>
            </div>

            <!-- Include subfolders toggle -->
            <label class="subfolder-toggle">
              <input type="checkbox" v-model="showSubfolderContents" />
              <span>Incluir subcarpetas</span>
            </label>
          </div>

          <!-- Main Content Area -->
          <div class="asset-main-content">
            <!-- Category Selector -->
            <div class="asset-category-selector">
              <label class="category-label">Subir como:</label>
              <div class="category-buttons">
                <button
                  v-for="cat in ASSET_CATEGORIES.image"
                  :key="cat"
                  class="category-btn"
                  :class="{ active: selectedAssetCategory === cat }"
                  @click="selectedAssetCategory = cat"
                >
                  {{ categoryLabels.image[cat] }}
                </button>
              </div>
              <span class="upload-folder-hint">en {{ selectedAssetFolder === '/' ? 'Raíz' : selectedAssetFolder }}</span>
            </div>

            <!-- Upload Zone -->
            <div
              class="asset-upload-zone"
              :class="{ dragging: assetUploadDragging, uploading: isUploading }"
              @dragover="onAssetDragOver"
              @dragleave="onAssetDragLeave"
              @drop="onAssetDrop"
              @click="!isUploading && $refs.assetFileInput.click()"
            >
              <input
                ref="assetFileInput"
                type="file"
                accept="image/*"
                multiple
                style="display: none"
                @change="onAssetFileChange"
                :disabled="isUploading"
              />
              <div v-if="isUploading" class="upload-zone-content uploading">
                <span class="upload-icon">⏳</span>
                <span class="upload-text">Subiendo a S3...</span>
                <div class="upload-progress-bar">
                  <div class="upload-progress-fill" :style="{ width: uploadProgress + '%' }"></div>
                </div>
                <span class="upload-hint">{{ uploadProgress }}%</span>
              </div>
              <div v-else class="upload-zone-content">
                <span class="upload-icon">📁</span>
                <span class="upload-text">Arrastra imágenes aquí o haz clic</span>
                <span class="upload-hint">PNG, JPG, GIF soportados (max 10MB)</span>
              </div>
            </div>

            <!-- Filter & Search Bar -->
            <div class="asset-filter-bar">
              <div class="filter-tabs">
                <button
                  class="filter-tab"
                  :class="{ active: assetFilterCategory === 'all' }"
                  @click="assetFilterCategory = 'all'"
                >
                  Todas ({{ assetCountByCategory.all }})
                </button>
                <button
                  v-for="cat in ASSET_CATEGORIES.image"
                  :key="cat"
                  class="filter-tab"
                  :class="{ active: assetFilterCategory === cat }"
                  @click="assetFilterCategory = cat"
                >
                  {{ categoryLabels.image[cat] }} ({{ assetCountByCategory[cat] || 0 }})
                </button>
              </div>
              <input
                type="text"
                v-model="assetSearchQuery"
                class="asset-search-input"
                placeholder="🔍 Buscar..."
              />
            </div>

            <!-- Asset Grid -->
            <div class="asset-grid">
              <div
                v-for="asset in filteredAssets"
                :key="asset.id"
                class="asset-grid-item"
                :class="{ 's3-asset': asset.s3Key }"
                draggable="true"
                @dragstart="handleAssetDragStart($event, asset)"
              >
                <div
                  class="asset-preview"
                  :style="{ backgroundImage: getAssetDisplayUrl(asset) ? `url(${getAssetDisplayUrl(asset)})` : 'none' }"
                >
                  <span v-if="!getAssetDisplayUrl(asset)" class="asset-loading">⏳</span>
                  <span v-if="asset.s3Key" class="s3-badge" title="Almacenado en S3">☁️</span>
                </div>
                <div class="asset-info">
                  <input
                    type="text"
                    v-model="asset.name"
                    class="asset-name-input"
                    @click.stop
                    @blur="autoSaveProject"
                  />
                  <div class="asset-meta">
                    <span class="asset-size">{{ asset.width }}×{{ asset.height }}</span>
                    <span v-if="asset.category" class="asset-category-badge">{{ asset.category }}</span>
                  </div>
                  <div class="asset-folder-path" v-if="asset.folderPath && asset.folderPath !== '/'">
                    📂 {{ asset.folderPath }}
                  </div>
                </div>
                <button class="asset-delete-btn" @click.stop="deleteAsset(asset.id)" title="Eliminar asset">🗑️</button>
              </div>
              <p v-if="project.globalData.assets.length === 0" class="empty-assets">
                No hay assets subidos. Arrastra imágenes arriba para comenzar.
              </p>
              <p v-else-if="filteredAssets.length === 0" class="empty-assets">
                No hay assets que coincidan con el filtro.
              </p>
            </div>
          </div>
        </div>
        <footer class="modal-footer">
          <span class="asset-count">
            {{ filteredAssets.length }} / {{ project.globalData.assets.length }} assets
          </span>
          <button class="modal-btn" @click="showAssetManagerModal = false">Listo</button>
        </footer>
      </div>
    </div>

    <!-- Audio Manager Modal -->
    <div v-if="showAudioManagerModal" class="modal-overlay audio-manager-overlay" @click.self="showAudioManagerModal = false; stopAudioPreview()">
      <div class="modal-content audio-manager-modal">
        <header class="modal-header">
          <h3>🔊 Audio Manager</h3>
          <button class="modal-close-btn" @click="showAudioManagerModal = false; stopAudioPreview()">✕</button>
        </header>
        <div class="modal-body audio-manager-body">
          <!-- Upload Zone -->
          <div
            class="audio-upload-zone"
            :class="{ dragging: audioUploadDragging }"
            @dragover="onAudioDragOver"
            @dragleave="onAudioDragLeave"
            @drop="onAudioDrop"
            @click="$refs.audioFileInput.click()"
          >
            <input
              ref="audioFileInput"
              type="file"
              accept="audio/*"
              multiple
              style="display: none"
              @change="onAudioFileChange"
            />
            <div class="upload-zone-content">
              <span class="upload-icon">🎵</span>
              <span class="upload-text">Drop audio files here or click to browse</span>
              <span class="upload-hint">MP3, WAV, OGG supported</span>
            </div>
          </div>

          <!-- Audio List -->
          <div class="audio-list">
            <div
              v-for="audio in project.globalData.audioAssets"
              :key="audio.id"
              class="audio-list-item"
              :class="{ playing: currentlyPlayingAudio?.id === audio.id }"
            >
              <div class="audio-item-main">
                <button
                  class="audio-play-btn-large"
                  @click.stop="currentlyPlayingAudio?.id === audio.id ? stopAudioPreview() : playAudioPreview(audio)"
                >
                  {{ currentlyPlayingAudio?.id === audio.id ? '⏹' : '▶' }}
                </button>
                <div class="audio-item-info">
                  <input
                    type="text"
                    v-model="audio.name"
                    class="audio-name-input"
                    @click.stop
                  />
                  <div class="audio-meta">
                    <span class="audio-format">{{ audio.format?.toUpperCase() }}</span>
                    <span class="audio-duration-tag">{{ formatDuration(audio.duration) }}</span>
                  </div>
                </div>
                <div class="audio-type-selector">
                  <select v-model="audio.type" class="audio-type-select" @click.stop>
                    <option value="sfx">SFX</option>
                    <option value="music">Music</option>
                  </select>
                </div>
                <button class="audio-delete-btn" @click.stop="deleteAudioAsset(audio.id)" title="Delete audio">🗑️</button>
              </div>
            </div>
            <p v-if="project.globalData.audioAssets.length === 0" class="empty-audio">
              No audio files uploaded yet. Drop audio files above to get started.
            </p>
          </div>
        </div>
        <footer class="modal-footer">
          <span class="audio-count">{{ project.globalData.audioAssets.length }} audio files</span>
          <button class="modal-btn" @click="showAudioManagerModal = false; stopAudioPreview()">Done</button>
        </footer>
      </div>
    </div>

    <!-- Spritesheet Editor Modal -->
    <SpritesheetEditorModal
      v-model:show="spritesheetEditorOpen"
      :assets="project.globalData.assets"
      :animations="globalAnimations"
      :actors="globalActors"
      :get-asset-url="getAssetDisplayUrl"
      :actor-animation-states="actorAnimationStates"
      @save-animation="handleSaveAnimation"
      @update-animation="handleUpdateAnimation"
      @delete-animation="deleteAnimation"
      @assign-animation="handleAssignAnimation"
    />
  </div>

  <!-- Background Scale Modal -->
  <div v-if="showBackgroundScaleModal" class="modal-overlay" @click.self="showBackgroundScaleModal = false">
    <div class="background-scale-modal">
      <h3 class="modal-title">📐 Ajustar Background al Canvas</h3>

      <div class="scale-info">
        <div class="scale-info-row">
          <span class="info-label">Imagen actual:</span>
          <span class="info-value">{{ currentBackgroundAsset?.width }}×{{ currentBackgroundAsset?.height }}px</span>
        </div>
        <div class="scale-info-row">
          <span class="info-label">Canvas:</span>
          <span class="info-value">{{ currentScene.width }}×{{ currentScene.height }}px</span>
        </div>
      </div>

      <div class="scale-options">
        <label class="scale-option" :class="{ active: backgroundScaleMode === 'cover' }">
          <input type="radio" v-model="backgroundScaleMode" value="cover" />
          <div class="option-content">
            <span class="option-icon">🖼️</span>
            <span class="option-name">Cubrir (Cover)</span>
            <span class="option-desc">Llena todo el canvas, puede recortar bordes</span>
          </div>
        </label>

        <label class="scale-option" :class="{ active: backgroundScaleMode === 'contain' }">
          <input type="radio" v-model="backgroundScaleMode" value="contain" />
          <div class="option-content">
            <span class="option-icon">📦</span>
            <span class="option-name">Contener (Contain)</span>
            <span class="option-desc">Muestra toda la imagen, puede tener barras negras</span>
          </div>
        </label>

        <label class="scale-option" :class="{ active: backgroundScaleMode === 'stretch' }">
          <input type="radio" v-model="backgroundScaleMode" value="stretch" />
          <div class="option-content">
            <span class="option-icon">↔️</span>
            <span class="option-name">Estirar (Stretch)</span>
            <span class="option-desc">Estira para llenar, puede distorsionar</span>
          </div>
        </label>
      </div>

      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" @click="showBackgroundScaleModal = false">
          Cancelar
        </button>
        <button
          class="modal-btn modal-btn-confirm"
          @click="scaleBackgroundToCanvas"
          :disabled="isScalingBackground"
        >
          {{ isScalingBackground ? '⏳ Procesando...' : '✓ Crear imagen ajustada' }}
        </button>
      </div>

      <p class="scale-note">
        Se creará un nuevo asset con las dimensiones del canvas.
        El original no se modificará.
      </p>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark);
  overflow: hidden;
}

/* Header */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-medium);
  border-bottom: 4px solid var(--primary);
  flex-shrink: 0;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.back-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.back-btn:hover {
  color: var(--accent);
}

.project-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.project-name-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  padding: var(--space-xs);
  border-bottom: 2px solid transparent;
}

.project-name-input:focus {
  outline: none;
  border-bottom-color: var(--accent);
}

.header-btn {
  background: var(--bg-light);
  border: 2px solid var(--bg-light);
  color: var(--text-primary);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  transition: all var(--transition-fast);
}

.header-btn:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--bg-dark);
}

/* Main area */
.editor-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Panels */
.panel {
  width: 240px;
  background: var(--bg-medium);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  flex-shrink: 0;
}

/* Remove top and bottom borders from panels */
.panel.pixel-border {
  border-top: none;
  border-bottom: none;
  position: relative;
}

.panel:not(.open) {
  width: 0;
  border: none;
}

.panel:not(.open) .panel-content,
.panel:not(.open) .panel-header {
  display: none;
}

/* Panel Tabs - Rounded Style */
.panel-tab {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 8px;
  background: var(--bg-medium);
  border: 2px solid var(--primary);
  cursor: pointer;
  z-index: 10;
  transition: all var(--transition-fast);
}

/* Left tab - rounded on right side */
.left-tab {
  right: 0;
  transform: translate(100%, -50%);
  border-left: none;
  border-radius: 0 12px 12px 0;
}

/* Right tab - rounded on left side */
.right-tab {
  left: 0;
  transform: translate(-100%, -50%);
  border-right: none;
  border-radius: 12px 0 0 12px;
}

.panel-tab:hover {
  background: var(--bg-light);
  border-color: var(--accent);
}

.panel-tab:hover .tab-text,
.panel-tab:hover .tab-arrow {
  color: var(--accent);
}

.tab-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--primary);
  letter-spacing: 2px;
  transition: color var(--transition-fast);
}

.left-tab .tab-text {
  transform: rotate(180deg);
}

.tab-arrow {
  font-size: 10px;
  color: var(--text-muted);
  transition: color var(--transition-fast);
}

/* Panel closed state - show only tab */
.panel:not(.open) .panel-tab {
  background: var(--bg-dark);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 2px solid var(--bg-light);
}

.left-panel .panel-header {
  justify-content: space-between;
}

.panel-title {
  font-size: 10px;
  color: var(--primary);
  margin: 0;
  white-space: nowrap;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm);
}

/* Element sections */
.element-section {
  margin-bottom: var(--space-md);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-light);
  margin-bottom: var(--space-xs);
  cursor: pointer;
  user-select: none;
}

.section-header:hover {
  background: var(--bg-medium);
}

.collapse-icon {
  font-size: 8px;
  color: var(--text-muted);
  width: 12px;
  text-align: center;
}

.select-all-checkbox {
  width: 12px;
  height: 12px;
  cursor: pointer;
  accent-color: var(--primary);
}

.visibility-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 0 4px;
  opacity: 1;
  transition: opacity var(--transition-fast), filter var(--transition-fast);
  position: relative;
  display: inline-block;
}

.visibility-btn.hidden {
  opacity: 0.5;
  filter: grayscale(1);
}

.visibility-btn.hidden::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 2px;
  right: 2px;
  height: 2px;
  background: var(--error);
  transform: rotate(-45deg);
  pointer-events: none;
}

.visibility-btn:hover {
  transform: scale(1.1);
}

.element-section.collapsed .section-header {
  margin-bottom: 0;
}

.section-icon {
  font-size: 12px;
}

.section-name {
  flex: 1;
  font-size: 10px;
  color: var(--text-primary);
}

.section-count {
  font-size: 10px;
  color: var(--text-muted);
}

.add-btn {
  background: transparent;
  border: 1px solid var(--text-muted);
  color: var(--text-muted);
  width: 18px;
  height: 18px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.reset-btn {
  background: transparent;
  border: 1px solid var(--text-muted);
  color: var(--text-muted);
  width: 18px;
  height: 18px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 2px;
}

.reset-btn:hover {
  border-color: var(--warning);
  color: var(--warning);
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.element-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  font-size: 10px;
  transition: background var(--transition-fast);
}

.element-item:hover {
  background: var(--bg-light);
}

.element-item.selected {
  background: rgba(201, 162, 39, 0.2);
  border-left: 2px solid var(--primary);
}

.item-icon {
  font-size: 10px;
}

.item-id {
  color: var(--text-muted);
  font-size: 8px;
}

.item-name {
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-section {
  color: var(--text-muted);
  font-size: 10px;
  padding: var(--space-sm);
  text-align: center;
}

.item-badge {
  font-size: 10px;
  margin-left: auto;
}

.item-badge.interactive {
  color: var(--accent);
  title: "Interactive";
}

/* Animation item extended layout */
.animation-item-extended {
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 4px;
  padding: 6px 8px !important;
}

.animation-item-main {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.animation-item-main .item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.animation-item-usage {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-left: 20px;
}

.usage-tag {
  font-size: 9px;
  padding: 2px 6px;
  background: rgba(0, 212, 255, 0.2);
  color: var(--accent);
  border-radius: 3px;
  border: 1px solid rgba(0, 212, 255, 0.3);
}

.usage-tag.unused {
  background: rgba(100, 100, 100, 0.2);
  color: #888;
  border-color: rgba(100, 100, 100, 0.3);
  font-style: italic;
}

/* Canvas area */
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
}

.canvas-wrapper {
  position: relative;
  background: var(--bg-card);
  box-shadow: var(--shadow-pixel);
}

.canvas-background {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(
    45deg,
    var(--bg-dark) 0px,
    var(--bg-dark) 10px,
    var(--bg-medium) 10px,
    var(--bg-medium) 20px
  );
}

.background-placeholder {
  text-align: center;
  color: var(--text-muted);
  font-size: 32px;
}

/* Canvas Grid */
.canvas-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(255, 215, 0, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 215, 0, 0.1) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
}

.grid-center-h {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--center-y);
  height: 2px;
  background: rgba(255, 215, 0, 0.4);
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.3);
}

.grid-center-v {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--center-x);
  width: 2px;
  background: rgba(255, 215, 0, 0.4);
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.3);
}

.elements-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.element-rect {
  position: absolute;
  border: 2px solid;
  pointer-events: all;
  cursor: pointer;
  display: flex;
  transform-origin: center center;
  align-items: center;
  justify-content: center;
}

/* Walkbox SVG Polygon Editor */
.walkbox-svg-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 5;
}

.walkbox-polygon {
  fill: rgba(0, 255, 136, 0.15);
  stroke: var(--color-walkbox);
  stroke-width: 2;
  stroke-dasharray: 8 4;
  cursor: move;
  pointer-events: all;
  transition: fill 0.15s ease;
}

.walkbox-polygon:hover {
  fill: rgba(0, 255, 136, 0.25);
}

.walkbox-polygon.selected {
  fill: rgba(0, 255, 136, 0.3);
  stroke-width: 3;
  filter: drop-shadow(0 0 6px var(--color-walkbox));
}

.walkbox-edge {
  stroke: transparent;
  stroke-width: 16;
  cursor: crosshair;
  pointer-events: all;
}

.walkbox-edge:hover {
  stroke: rgba(0, 255, 136, 0.4);
}

/* "+" button to add vertices on edges */
.walkbox-edge-add {
  cursor: pointer;
  pointer-events: all;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.walkbox-edge-add:hover {
  opacity: 1;
}

.walkbox-edge-add-bg {
  fill: rgba(0, 0, 0, 0.7);
  stroke: var(--color-walkbox);
  stroke-width: 2;
}

.walkbox-edge-add:hover .walkbox-edge-add-bg {
  fill: var(--color-walkbox);
}

.walkbox-edge-add-icon {
  fill: var(--color-walkbox);
  font-size: 14px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  font-family: Arial, sans-serif;
}

.walkbox-edge-add:hover .walkbox-edge-add-icon {
  fill: #000;
}

.walkbox-vertex {
  fill: var(--color-walkbox);
  stroke: #fff;
  stroke-width: 2;
  cursor: grab;
  pointer-events: all;
  transition: r 0.15s ease, fill 0.15s ease;
}

.walkbox-vertex:hover {
  r: 8;
  fill: #fff;
  stroke: var(--color-walkbox);
}

.walkbox-vertex.can-delete:hover {
  fill: var(--error);
  stroke: #fff;
}

.walkbox-vertex:active {
  cursor: grabbing;
}

.walkbox-label {
  fill: var(--color-walkbox);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.8);
}

.walkbox-rotate-handle {
  fill: var(--accent);
  stroke: var(--bg-dark);
  stroke-width: 2;
  cursor: grab;
  pointer-events: all;
  transition: r 0.15s ease, fill 0.15s ease;
}

.walkbox-rotate-handle:hover {
  fill: var(--primary);
  r: 10;
}

.walkbox-rotate-handle:active {
  cursor: grabbing;
}

.walkbox-rotate-line {
  stroke: var(--accent);
  stroke-width: 2;
  pointer-events: none;
}

.exit-element {
  border-color: var(--color-exit);
  background: rgba(255, 107, 107, 0.2);
}

.exit-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px var(--color-exit);
}

.actor-element {
  border-color: var(--color-actor);
  background: rgba(168, 85, 247, 0.2);
}

.actor-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px var(--color-actor);
}

.hotspot-element {
  border-color: var(--color-hotspot);
  background: rgba(0, 212, 255, 0.15);
  border-style: dotted;
}

.hotspot-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px var(--color-hotspot);
}

.image-element {
  border-color: var(--color-image);
  background: rgba(244, 114, 182, 0.2);
}

.image-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px var(--color-image);
}

.image-element.has-parallax {
  border-style: dashed;
  border-color: #88ff88;
}

.image-element.has-parallax.selected {
  box-shadow: 0 0 10px #88ff88;
}

.parallax-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 200, 0, 0.8);
  color: white;
  font-size: 8px;
  padding: 2px 4px;
  border-radius: 3px;
  pointer-events: none;
  font-family: monospace;
}

/* Parallax depth hints in properties panel */
.parallax-depth-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.parallax-depth-control .property-range {
  flex: 1;
}

.depth-hints {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 9px;
}

.depth-hints .hint-item {
  color: var(--text-muted);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.depth-hints .hint-item.active {
  opacity: 1;
  color: #88ff88;
}

.zplane-element {
  border-color: var(--color-zplane);
  background: rgba(100, 116, 139, 0.2);
  border-style: double;
  border-width: 4px;
}

.zplane-element.selected {
  box-shadow: 0 0 10px var(--color-zplane);
}

/* Light elements */
.light-element {
  border-color: #ffcc00;
  background: rgba(255, 204, 0, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.light-element.selected {
  border-width: 3px;
  box-shadow: 0 0 15px #ffcc00;
}

.light-element.disabled {
  opacity: 0.4;
}

.light-icon {
  font-size: 20px;
  pointer-events: none;
  z-index: 2;
}

.light-preview-glow {
  position: absolute;
  border-radius: 50%;
  z-index: 1;
}

.lighting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 50;
}

/* Particle elements */
.particle-element {
  border-color: #ff88ff;
  background: rgba(255, 136, 255, 0.15);
  border-style: dashed;
  display: flex;
  align-items: center;
  justify-content: center;
}

.particle-element.selected {
  border-width: 3px;
  box-shadow: 0 0 10px #ff88ff;
}

.particle-element.disabled {
  opacity: 0.4;
}

.particles-container {
  position: absolute;
  pointer-events: none;
  z-index: 45;
}

.particle {
  position: absolute;
  pointer-events: none;
}

/* Light color preview in panel */
.light-color-preview {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-left: auto;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 5px currentColor;
}

/* Ambient light settings */
.ambient-light-settings {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  margin-bottom: 8px;
}

.ambient-light-settings label {
  font-size: 10px;
  color: var(--text-secondary);
}

.ambient-color {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.ambient-intensity {
  flex: 1;
  height: 4px;
}

.intensity-value {
  font-size: 10px;
  color: var(--text-secondary);
  min-width: 24px;
}

/* Text colors for panel */
.text-light {
  color: #ffcc00;
}

.text-particle {
  color: #ff88ff;
}

.element-rect:hover {
  filter: brightness(1.2);
}

.element-label {
  font-size: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 4px;
  white-space: nowrap;
  pointer-events: none;
}

/* Resize handles */
.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--primary);
  border: 2px solid var(--bg-dark);
  pointer-events: all;
  z-index: 10;
}

.resize-handle.nw { top: -5px; left: -5px; cursor: nwse-resize; }
.resize-handle.n { top: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.resize-handle.ne { top: -5px; right: -5px; cursor: nesw-resize; }
.resize-handle.e { top: 50%; right: -5px; transform: translateY(-50%); cursor: ew-resize; }
.resize-handle.se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.resize-handle.s { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.resize-handle.sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
.resize-handle.w { top: 50%; left: -5px; transform: translateY(-50%); cursor: ew-resize; }

.resize-handle:hover {
  background: var(--accent);
  transform: scale(1.2);
}

.resize-handle.n:hover,
.resize-handle.s:hover {
  transform: translateX(-50%) scale(1.2);
}

.resize-handle.e:hover,
.resize-handle.w:hover {
  transform: translateY(-50%) scale(1.2);
}

/* Rotate handle */
.rotate-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--accent);
  border: 2px solid var(--bg-dark);
  border-radius: 50%;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  cursor: grab;
  pointer-events: all;
  z-index: 11;
}

.rotate-handle:hover {
  background: var(--primary);
  transform: translateX(-50%) scale(1.2);
}

.rotate-handle:active {
  cursor: grabbing;
}

.rotate-line {
  position: absolute;
  width: 2px;
  height: 25px;
  background: var(--accent);
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 10;
}

/* Dragging state */
.canvas-wrapper.dragging {
  cursor: grabbing;
}

.canvas-wrapper.dragging .element-rect {
  cursor: grabbing;
}

.element-rect {
  cursor: grab;
  transition: box-shadow 0.15s ease, filter 0.15s ease;
}

.element-rect.selected {
  cursor: grab;
}

/* Zoom controls */
.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-sm);
  background: var(--bg-medium);
  border-top: 2px solid var(--bg-light);
}

.zoom-btn {
  background: var(--bg-light);
  border: none;
  color: var(--text-primary);
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 16px;
}

.zoom-btn:hover {
  background: var(--primary);
  color: var(--bg-dark);
}

.zoom-btn.fit-btn {
  width: auto;
  padding: 0 8px;
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
}

.zoom-btn.grid-btn {
  margin-left: var(--space-md);
  font-size: 14px;
}

.zoom-btn.grid-btn.active {
  background: var(--primary);
  color: var(--bg-dark);
}

.zoom-level {
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
}

/* Properties panel */
.no-selection {
  padding: var(--space-lg);
  text-align: center;
}

.properties-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.property-label {
  font-size: 10px;
  color: var(--text-secondary);
}

.property-input {
  background: var(--bg-dark);
  border: 2px solid var(--bg-light);
  color: var(--text-primary);
  padding: var(--space-sm);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.property-input:focus {
  outline: none;
  border-color: var(--accent);
}

.property-input:disabled {
  color: var(--text-muted);
}

.property-row {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.property-unit {
  color: var(--text-muted);
  font-size: 10px;
}

.property-checkboxes {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 10px;
  color: var(--text-secondary);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
}

.checkbox-label:hover {
  color: var(--text-primary);
}

.property-input.small {
  width: 50%;
}

.property-input.tiny {
  width: 60px;
  padding: var(--space-xs);
  font-size: 9px;
}

.property-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-sm);
  margin-bottom: var(--space-sm);
  border-bottom: 2px solid var(--bg-light);
}

.property-type {
  font-size: 12px;
  color: var(--primary);
}

.delete-element-btn {
  background: var(--error);
  border: none;
  color: white;
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  transition: all var(--transition-fast);
}

.delete-element-btn:hover {
  background: #ff1a1a;
  transform: scale(1.05);
}

/* Multi-selection styles */
.multi-selection-info {
  margin-top: var(--space-md);
}

.selection-list {
  list-style: none;
  padding: 0;
  margin: var(--space-sm) 0 0 0;
  max-height: 200px;
  overflow-y: auto;
}

.selection-item {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-light);
  margin-bottom: 2px;
  font-size: 9px;
}

.selection-item .item-type {
  color: var(--accent);
  text-transform: uppercase;
  min-width: 60px;
}

.selection-item .item-name {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.walkbox-points {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.point-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.point-label {
  font-size: 9px;
  color: var(--text-muted);
  width: 25px;
}

/* Status bar */
.editor-status-bar {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-xs) var(--space-md);
  background: var(--bg-medium);
  border-top: 2px solid var(--bg-light);
  font-size: 10px;
  color: var(--text-muted);
}

.status-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.status-item.status-right {
  margin-left: auto;
}

.status-item.dragging-indicator {
  color: var(--primary);
  animation: pixel-pulse 0.5s ease-in-out infinite;
}

/* Header separator and undo/redo */
.header-separator {
  color: var(--text-muted);
  font-size: 14px;
}

.undo-btn:disabled,
.redo-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.undo-btn:disabled:hover,
.redo-btn:disabled:hover {
  background: var(--bg-light);
  color: var(--text-primary);
}

/* Section divider */
.section-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md) var(--space-sm);
  margin: var(--space-sm) 0;
  border-top: 2px solid var(--bg-light);
  border-bottom: 2px solid var(--bg-light);
}

.divider-text {
  font-size: 8px;
  color: var(--text-muted);
  letter-spacing: 1px;
}

/* Data element type colors */
.text-dialog { color: #f59e0b; }
.text-puzzle { color: #8b5cf6; }
.text-verb { color: #ef4444; }
.text-sfx { color: #22c55e; }
.text-music { color: #ec4899; }
.text-cutscene { color: #06b6d4; }

/* Cutscene Actions Editor */
.actions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-height: 300px;
  overflow-y: auto;
  padding: var(--space-xs);
  background: var(--bg-dark);
  border-radius: 4px;
}

.action-item {
  background: var(--bg-medium);
  border: 1px solid var(--bg-light);
  border-radius: 4px;
  padding: var(--space-xs);
}

.action-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.action-index {
  color: var(--text-muted);
  font-size: 8px;
  min-width: 24px;
}

.action-type {
  color: #06b6d4;
  font-size: 8px;
  flex: 1;
  text-transform: uppercase;
}

.action-controls {
  display: flex;
  gap: 2px;
}

.action-btn {
  background: var(--bg-light);
  border: 1px solid var(--bg-card);
  color: var(--text-secondary);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  padding: 0;
  transition: all var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--bg-dark);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn-delete:hover:not(:disabled) {
  background: var(--error);
}

.action-params {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.action-row {
  display: flex;
  gap: var(--space-xs);
}

.property-select-sm,
.property-input-sm {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: var(--space-xs);
  background: var(--bg-dark);
  border: 1px solid var(--bg-light);
  color: var(--text-primary);
  width: 100%;
}

.property-input-xs {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: var(--space-xs);
  background: var(--bg-dark);
  border: 1px solid var(--bg-light);
  color: var(--text-primary);
  width: 60px;
}

.property-textarea-sm {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: var(--space-xs);
  background: var(--bg-dark);
  border: 1px solid var(--bg-light);
  color: var(--text-primary);
  width: 100%;
  resize: vertical;
  min-height: 40px;
}

.property-label-sm {
  font-size: 8px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.property-color {
  width: 30px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--bg-light);
  cursor: pointer;
}

.empty-actions {
  color: var(--text-muted);
  font-size: 8px;
  text-align: center;
  padding: var(--space-sm);
}

.property-divider {
  border-top: 1px solid var(--bg-light);
  margin: var(--space-sm) 0;
  padding-top: var(--space-sm);
  color: var(--text-muted);
  font-size: 8px;
  text-transform: uppercase;
}

/* Dialog editor */
.dialog-lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-height: 150px;
  overflow-y: auto;
}

.dialog-line {
  display: flex;
  gap: var(--space-xs);
}

.add-line-btn {
  background: var(--bg-light);
  border: 1px dashed var(--text-muted);
  color: var(--text-muted);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  margin-top: var(--space-xs);
  transition: all var(--transition-fast);
}

.add-line-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Dialog Actor Preview */
.dialog-actor-preview {
  display: flex;
  justify-content: center;
  padding: var(--space-sm);
  background: var(--bg-dark);
  border-radius: 4px;
}

.actor-preview-box {
  width: 64px;
  height: 64px;
  background: var(--bg-medium);
  border: 2px solid var(--actor);
  display: flex;
  align-items: center;
  justify-content: center;
  image-rendering: pixelated;
}

.actor-preview-name {
  font-size: 6px;
  color: var(--actor);
  text-align: center;
  padding: 2px;
}

/* Dialog Choices */
.dialog-choices {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-height: 120px;
  overflow-y: auto;
}

.dialog-choice {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

/* Remove line/choice button */
.remove-line-btn {
  background: transparent;
  border: 1px solid var(--error);
  color: var(--error);
  width: 20px;
  height: 20px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.remove-line-btn:hover {
  background: var(--error);
  color: white;
}

/* Property textarea */
.property-textarea {
  min-height: 60px;
  resize: vertical;
  font-family: 'Press Start 2P', monospace;
}

/* Property slider */
.property-slider {
  width: 100%;
  height: 20px;
  -webkit-appearance: none;
  background: var(--bg-dark);
  border: 2px solid var(--bg-light);
  cursor: pointer;
}

.property-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: var(--primary);
  border: none;
  cursor: pointer;
}

.property-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--primary);
  border: none;
  cursor: pointer;
}

/* Checkbox styling */
.property-label input[type="checkbox"] {
  margin-right: var(--space-sm);
  transform: scale(1.2);
}

/* ===================== */
/* INTERACTIONS PANEL    */
/* ===================== */
.property-divider {
  border-top: 2px dashed var(--bg-light);
  margin: var(--space-md) 0;
}

.interactions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.interaction-item {
  background: var(--bg-dark);
  border: 2px solid var(--bg-light);
  padding: var(--space-sm);
  border-radius: 4px;
}

.interaction-header {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  margin-bottom: var(--space-sm);
}

.interaction-header .property-select {
  flex: 1;
}

.interaction-config {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.interaction-config .property-select,
.interaction-config .property-input,
.interaction-config .property-textarea {
  font-size: 10px;
}

.interaction-condition {
  margin-top: var(--space-xs);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--bg-light);
}

.condition-row {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  margin-top: var(--space-xs);
}

.btn-add-small {
  background: var(--success);
  color: var(--bg-dark);
  border: none;
  padding: 2px 6px;
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
  cursor: pointer;
  margin-left: var(--space-sm);
}

.btn-add-small:hover {
  filter: brightness(1.2);
}

.btn-remove-small {
  background: var(--error);
  color: white;
  border: none;
  width: 20px;
  height: 20px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove-small:hover {
  filter: brightness(1.2);
}

.property-select.small {
  font-size: 10px;
  padding: 4px;
}

.property-select.tiny {
  font-size: 10px;
  padding: 2px 4px;
  width: auto;
  min-width: 50px;
}

.property-input.small {
  font-size: 10px;
  padding: 4px;
  width: 80px;
}

.property-textarea.code {
  font-family: monospace;
  font-size: 11px;
}

.checkbox-label.small {
  font-size: 9px;
}

.checkbox-label.small input[type="checkbox"] {
  transform: scale(1);
}

.hint-text {
  color: var(--text-muted);
  margin-top: var(--space-xs);
}

.pixel-font-xs {
  font-size: 8px;
}

/* ===================== */
/* SPRITESHEET EDITOR    */
/* ===================== */
.spritesheet-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spritesheet-editor-modal {
  width: 95%;
  max-width: 1600px;
  height: 90vh;
  background: var(--bg-medium);
  border: 4px solid var(--primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.spritesheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background: var(--bg-dark);
  border-bottom: 2px solid var(--primary);
}

.spritesheet-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: var(--primary);
  margin: 0;
}

.spritesheet-close-btn {
  background: transparent;
  border: 2px solid var(--error);
  color: var(--error);
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 16px;
  transition: all var(--transition-fast);
}

.spritesheet-close-btn:hover {
  background: var(--error);
  color: white;
}

.spritesheet-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.spritesheet-canvas-area {
  flex: 1;
  overflow: auto;
  background: var(--bg-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  min-width: 0; /* Allow shrinking */
}

.spritesheet-dropzone {
  width: calc(100% - 2 * var(--space-lg));
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 4px dashed var(--text-muted);
  margin: var(--space-lg);
  margin-top: 60px;
  transition: all var(--transition-fast);
}

.spritesheet-dropzone:hover {
  border-color: var(--accent);
  background: rgba(0, 212, 255, 0.05);
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.dropzone-icon {
  font-size: 48px;
}

.dropzone-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--text-primary);
}

.dropzone-subtext {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
}

.spritesheet-grid-container {
  padding: var(--space-lg);
  overflow: auto;
  max-height: 100%;
  max-width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.spritesheet-grid {
  position: relative;
  background-size: 100% 100%;  /* Exact size, no scaling */
  background-repeat: no-repeat;
  image-rendering: pixelated;
}

.frame-cell {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 2px;
}

.frame-cell:hover {
  background: rgba(0, 212, 255, 0.3);
  border-color: var(--accent);
}

.frame-cell.selected {
  background: rgba(201, 162, 39, 0.4);
  border: 2px solid var(--primary);
}

.frame-number {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 1px 3px;
}

.spritesheet-panel {
  width: 280px;
  background: var(--bg-light);
  border-left: 2px solid var(--primary);
  overflow-y: auto;
  flex-shrink: 0;
}

.spritesheet-section {
  padding: var(--space-md);
  border-bottom: 1px solid var(--bg-dark);
}

.spritesheet-section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--accent);
  margin: 0 0 var(--space-md) 0;
}

.spritesheet-form-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.spritesheet-form-row label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-secondary);
  min-width: 60px;
}

.spritesheet-input {
  flex: 1;
  background: var(--bg-dark);
  border: 2px solid var(--bg-medium);
  color: var(--text-primary);
  padding: var(--space-xs) var(--space-sm);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.spritesheet-input:focus {
  outline: none;
  border-color: var(--accent);
}

.spritesheet-info {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
}

.spritesheet-btn-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.spritesheet-btn {
  flex: 1;
  background: var(--bg-dark);
  border: 2px solid var(--bg-medium);
  color: var(--text-primary);
  padding: var(--space-sm);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.spritesheet-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.spritesheet-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spritesheet-btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--bg-dark);
  width: 100%;
}

.spritesheet-btn-primary:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
}

.spritesheet-btn-success {
  background: var(--success);
  border-color: var(--success);
  color: var(--bg-dark);
  width: 100%;
}

.spritesheet-btn-success:hover:not(:disabled) {
  filter: brightness(1.2);
}

.spritesheet-btn-mini {
  width: 24px;
  height: 24px;
  padding: 0;
  background: var(--bg-medium);
  border: 2px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.spritesheet-btn-mini:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--bg-dark);
}

.spritesheet-info-dims {
  font-size: 8px;
  color: var(--text-muted);
  margin-top: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-dark);
  border-radius: 2px;
  text-align: center;
}

.spritesheet-info-dims .size-mismatch {
  color: #ffaa00;
  font-weight: bold;
}

.spritesheet-btn-warning {
  background: linear-gradient(180deg, #ffaa00, #ff8800) !important;
  color: #000 !important;
  font-weight: bold;
}

.spritesheet-details {
  margin-top: var(--space-sm);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.spritesheet-details summary {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-secondary);
  padding: var(--space-sm);
  background: var(--bg-dark);
  cursor: pointer;
  user-select: none;
}

.spritesheet-details summary:hover {
  color: var(--accent);
}

.spritesheet-details[open] summary {
  border-bottom: 1px solid var(--border-color);
}

.spritesheet-details .spritesheet-form-row {
  padding: var(--space-xs) var(--space-sm);
}

.spritesheet-checkbox-row {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.spritesheet-checkbox-row label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
}

.spritesheet-checkbox-row input[type="checkbox"] {
  accent-color: var(--accent);
}

.spritesheet-anim-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spritesheet-anim-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-dark);
}

.spritesheet-anim-item-extended {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--bg-dark);
  border-radius: 4px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

.spritesheet-anim-item-extended:hover {
  background: var(--bg-medium);
}

.spritesheet-anim-item-extended.editing {
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid var(--accent);
}

.spritesheet-anim-main {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
}

.anim-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.anim-action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  opacity: 0.6;
  transition: opacity 0.2s, transform 0.2s;
}

.anim-action-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.anim-action-btn.delete:hover {
  opacity: 1;
}

.editing-hint {
  font-size: 9px;
  color: var(--accent);
  margin-top: 4px;
  font-style: italic;
}

.spritesheet-anim-usage {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-left: 4px;
}

.spritesheet-usage-tag {
  font-size: 8px;
  padding: 2px 6px;
  background: rgba(0, 212, 255, 0.2);
  color: var(--accent);
  border-radius: 3px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  font-family: 'Press Start 2P', monospace;
}

.spritesheet-usage-tag.unused {
  background: rgba(100, 100, 100, 0.2);
  color: #666;
  border-color: rgba(100, 100, 100, 0.3);
  font-style: italic;
}

.anim-name {
  flex: 1;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.anim-frames {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
}

.anim-delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.anim-delete-btn:hover {
  opacity: 1;
}

.spritesheet-empty {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-md);
}

.spritesheet-footer {
  background: var(--bg-dark);
  border-top: 2px solid var(--primary);
  padding: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
}

.preview-btn {
  width: 40px;
  height: 40px;
  background: var(--primary);
  border: none;
  color: var(--bg-dark);
  font-size: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preview-btn:hover {
  background: var(--accent);
}

.preview-info {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--text-primary);
  min-width: 120px;
}

.preview-progress {
  flex: 1;
  height: 8px;
  background: var(--bg-medium);
  border: 1px solid var(--bg-light);
}

.preview-progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.1s linear;
}

.preview-canvas-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  background: repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 50% / 16px 16px;
  border: 2px solid var(--bg-light);
  min-width: 128px;
  min-height: 128px;
  position: relative;
  overflow: visible;
}

.preview-frame-canvas {
  display: block;
  box-sizing: border-box;
}

/* Spritesheet Source Tabs */
.spritesheet-source-tabs {
  display: flex;
  gap: 4px;
  padding: var(--space-md);
  background: var(--bg-medium);
  border-bottom: 1px solid var(--border-color);
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.source-tab {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: 8px 16px;
  background: var(--bg-dark);
  border: 2px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.source-tab:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.source-tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg-dark);
}

/* Asset Picker in Spritesheet Editor */
.spritesheet-asset-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  padding-top: 60px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.asset-picker-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted);
  text-align: center;
}

.asset-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--space-md);
  padding: var(--space-md);
}

.asset-picker-item {
  background: var(--bg-medium);
  border: 2px solid var(--border-color);
  padding: var(--space-sm);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.asset-picker-item:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.asset-picker-item.selected {
  border-color: var(--primary);
  background: rgba(201, 162, 39, 0.1);
}

.asset-picker-preview {
  width: 80px;
  height: 80px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: var(--bg-dark);
  image-rendering: pixelated;
}

.asset-picker-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-primary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.asset-picker-size {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: var(--text-muted);
}

.asset-picker-empty {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-xl);
}

/* Assign to Actor Modal */
.assign-actor-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.assign-actor-modal {
  background: var(--bg-medium);
  border: 4px solid var(--primary);
  padding: var(--space-lg);
  max-width: 500px;
  width: 90%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.assign-actor-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--primary);
  text-align: center;
  margin: 0;
}

.assign-actor-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
  text-align: center;
}

.assign-actor-content {
  flex: 1;
  overflow-y: auto;
}

.assign-actor-actors h4 {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-secondary);
  margin: 0 0 var(--space-sm) 0;
}

.assign-actor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm);
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  margin-bottom: var(--space-xs);
}

.assign-actor-item .actor-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-primary);
}

.actor-states {
  display: flex;
  gap: 4px;
}

.state-btn {
  position: relative;
  width: 28px;
  height: 28px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-btn:hover {
  border-color: var(--accent);
  background: rgba(0, 212, 255, 0.2);
}

.state-btn.assigned {
  background: rgba(0, 255, 136, 0.2);
  border-color: var(--success);
}

.no-actors-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-lg);
}

.mirror-mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--space-sm);
  margin-bottom: var(--space-sm);
  background: var(--bg-dark);
  border: 2px solid var(--border-color);
  cursor: pointer;
}

.mirror-mode-toggle:has(input:checked) {
  border-color: var(--accent);
  background: rgba(0, 212, 255, 0.1);
}

.mirror-mode-toggle input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.mirror-label {
  font-size: 9px;
  color: var(--text-secondary);
}

.state-btn .mirror-indicator {
  font-size: 8px;
  position: absolute;
  top: -2px;
  right: -2px;
}

.state-btn.mirrored {
  border-color: var(--accent);
  background: rgba(0, 212, 255, 0.2);
}

.assign-actor-actions {
  display: flex;
  justify-content: center;
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-color);
}

.assign-skip-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  padding: 8px 16px;
  background: var(--bg-dark);
  border: 2px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.assign-skip-btn:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

/* Animation color */
.text-animation {
  color: #ff9f43;
}

/* Actor Animation Preview */
.actor-animation-preview {
  position: absolute;
  inset: 0;
  image-rendering: pixelated;
  background-repeat: no-repeat;
  pointer-events: none;
}

.actor-name-overlay {
  position: absolute;
  bottom: 2px;
  left: 2px;
  font-size: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 1px 3px;
  pointer-events: none;
}

/* Actor Animations Config in Properties Panel */
.actor-animations-config {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.animation-preview-state {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--bg-dark);
  margin-bottom: var(--space-xs);
}

.animation-label {
  font-size: 8px;
  color: var(--text-muted);
}

.animation-assignments {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.animation-assignment-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.animation-state-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-secondary);
  min-width: 70px;
  text-transform: capitalize;
}

.animation-assignment-row .property-select-sm {
  flex: 1;
  font-size: 7px;
  padding: 2px 4px;
}

/* ===================== */
/* PUZZLE SYSTEM STYLES  */
/* ===================== */

/* Property Section */
.property-section {
  background: var(--bg-dark);
  border-radius: 4px;
  padding: var(--space-sm);
  margin-top: var(--space-sm);
}

.property-section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--primary);
  margin-bottom: var(--space-sm);
  display: block;
  text-transform: uppercase;
}

/* Condition Items List */
.condition-items-list,
.remove-items-list,
.sequence-steps-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.condition-item-row,
.sequence-step-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.step-number {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--accent);
  min-width: 20px;
}

/* Hints Section */
.hints-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.hint-row {
  background: var(--bg-medium);
  padding: var(--space-xs);
  border-radius: 4px;
}

.hint-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
  font-size: 8px;
  color: var(--text-secondary);
}

.hint-header .property-input.tiny {
  width: 40px;
}

/* Choices Checklist */
.choices-checklist {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.choice-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 8px;
  color: var(--text-secondary);
  cursor: pointer;
}

.choice-checkbox input[type="checkbox"] {
  cursor: pointer;
}

.property-hint {
  font-size: 7px;
  color: var(--text-muted);
  margin-bottom: var(--space-xs);
}

/* Item Properties */
.use-with-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.use-with-checkboxes label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  color: var(--text-secondary);
  cursor: pointer;
}

.action-btn {
  background: var(--primary);
  color: var(--bg-dark);
  border: none;
  padding: var(--space-xs) var(--space-sm);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--accent);
}

/* Inventory Section */
.text-item { color: #f59e0b; }
.text-inventory { color: #8b5cf6; }

.inventory-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.remove-item-btn {
  background: transparent;
  border: 1px solid var(--error);
  color: var(--error);
  width: 16px;
  height: 16px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-left: auto;
  transition: all var(--transition-fast);
}

.remove-item-btn:hover {
  background: var(--error);
  color: white;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card);
  border: 4px solid var(--primary);
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.small-modal {
  max-width: 350px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 2px solid var(--bg-dark);
}

.modal-header h3 {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--primary);
  margin: 0;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
}

.modal-close-btn:hover {
  color: var(--error);
}

.modal-body {
  padding: var(--space-md);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: var(--space-sm) var(--space-md);
  border-top: 2px solid var(--bg-dark);
  display: flex;
  justify-content: flex-end;
}

.modal-btn {
  background: var(--primary);
  color: var(--bg-dark);
  border: none;
  padding: var(--space-xs) var(--space-md);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
}

.modal-btn:hover {
  background: var(--accent);
}

/* Inventory Add List */
.inventory-add-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.inventory-add-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-medium);
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.inventory-add-item:hover {
  background: var(--bg-light);
}

.inventory-add-item.in-inventory {
  background: var(--bg-light);
  border: 1px solid var(--success);
}

.inventory-add-item .item-icon {
  font-size: 16px;
}

.inventory-add-item .item-name {
  flex: 1;
  font-size: 9px;
}

.inventory-add-item .item-check {
  color: var(--success);
  font-size: 12px;
}

/* ===================== */
/* MULTI-SCENE STYLES    */
/* ===================== */

/* Scene Tabs */
.scene-tabs {
  display: flex;
  gap: 2px;
  align-items: center;
  max-width: 600px;
  overflow-x: auto;
}

.scene-tab {
  background: var(--bg-medium);
  border: 2px solid var(--bg-light);
  color: var(--text-secondary);
  padding: 4px 12px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.scene-tab:hover {
  background: var(--bg-light);
  color: var(--text-primary);
}

.scene-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--bg-dark);
}

.add-scene-tab {
  background: transparent;
  border-style: dashed;
  color: var(--text-muted);
  font-size: 12px;
  padding: 4px 8px;
}

.add-scene-tab:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Global Data Separator */
.section-separator {
  padding: 8px 12px;
  margin-top: 8px;
  border-top: 2px solid var(--primary);
  background: linear-gradient(to bottom, rgba(201, 162, 39, 0.1), transparent);
}

.separator-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--primary);
  text-transform: uppercase;
}

/* Global Section Styling */
.element-section.global-section .section-header {
  border-left: 3px solid var(--primary);
}

/* Place Actor Button */
.place-actor-btn {
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 2px 4px;
  font-size: 10px;
  cursor: pointer;
  margin-left: auto;
  transition: all var(--transition-fast);
}

.place-actor-btn:hover {
  background: var(--accent);
  color: var(--bg-dark);
}

.place-actor-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Modal Secondary Button */
.modal-btn.secondary {
  background: var(--bg-light);
  color: var(--text-secondary);
  margin-right: 8px;
}

.modal-btn.secondary:hover {
  background: var(--bg-medium);
}

/* Asset Management Styles */
.asset-manager-modal {
  width: 800px;
  max-width: 90vw;
  max-height: 80vh;
}

.asset-manager-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow: hidden;
}

/* Category Selector */
.asset-category-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-dark);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.category-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
  white-space: nowrap;
}

.category-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.category-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 4px 8px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 2px;
}

/* Asset Filter Bar */
.asset-filter-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: var(--bg-dark);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.filter-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-tab {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  padding: 4px 6px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 2px;
}

.filter-tab:hover {
  border-color: var(--text-secondary);
  color: var(--text-secondary);
}

.filter-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--bg-dark);
}

.asset-search-input {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: 6px 8px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 2px;
  width: 100%;
}

.asset-search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.asset-search-input::placeholder {
  color: var(--text-muted);
}

.category-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.category-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg-dark);
}

.asset-category-badge {
  font-size: 7px;
  padding: 1px 4px;
  background: var(--accent);
  color: var(--bg-dark);
  border-radius: 2px;
  text-transform: uppercase;
}

.asset-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.asset-upload-zone {
  border: 2px dashed var(--border-color);
  border-radius: 4px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-dark);
}

.asset-upload-zone:hover,
.asset-upload-zone.dragging {
  border-color: var(--accent);
  background: rgba(0, 212, 255, 0.05);
}

.asset-upload-zone.uploading {
  border-color: var(--primary);
  background: rgba(201, 162, 39, 0.05);
  cursor: wait;
  pointer-events: none;
}

.upload-zone-content.uploading .upload-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.upload-progress-bar {
  width: 100%;
  max-width: 200px;
  height: 8px;
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.2s;
}

.upload-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 32px;
}

.upload-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--text-primary);
}

.upload-hint {
  font-size: 9px;
  color: var(--text-muted);
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  overflow-y: auto;
  flex: 1;
  padding: 4px;
}

.asset-grid-item {
  background: var(--bg-dark);
  border: 2px solid var(--border-color);
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.asset-grid-item:hover {
  border-color: var(--primary);
}

.asset-preview {
  width: 100%;
  height: 80px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: var(--bg-medium);
  border-radius: 2px;
  image-rendering: pixelated;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-preview .asset-loading {
  font-size: 20px;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.asset-preview .s3-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 4px;
  border-radius: 2px;
}

.asset-grid-item.s3-asset {
  border-color: var(--accent);
}

.asset-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-name-input {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 4px;
  border-radius: 2px;
  width: 100%;
}

.asset-name-input:focus {
  outline: none;
  border-color: var(--accent);
}

.asset-size {
  font-size: 8px;
  color: var(--text-muted);
}

.asset-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--error);
  border: none;
  border-radius: 2px;
  padding: 2px 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 10px;
}

.asset-grid-item:hover .asset-delete-btn {
  opacity: 1;
}

.asset-delete-btn:hover {
  background: #ff6b6b;
}

.empty-assets {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-muted);
  font-size: 9px;
  padding: 24px;
}

.asset-count {
  font-size: 9px;
  color: var(--text-muted);
  margin-right: auto;
}

/* Asset Manager with Folders Layout */
.asset-manager-with-folders {
  width: 1000px;
  max-width: 95vw;
}

.asset-manager-body-with-sidebar {
  display: flex;
  gap: 16px;
  max-height: 65vh;
  overflow: hidden;
}

/* Folder Sidebar */
.asset-folder-sidebar {
  width: 200px;
  min-width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.folder-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: var(--bg-medium);
  border-bottom: 1px solid var(--border-color);
}

.folder-sidebar-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-secondary);
}

.folder-add-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  border: none;
  border-radius: 2px;
  color: var(--bg-dark);
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-add-btn:hover {
  background: var(--primary);
}

.folder-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 9px;
  color: var(--text-secondary);
}

.folder-item:hover {
  background: var(--bg-medium);
}

.folder-item.selected {
  background: var(--accent);
  background: rgba(0, 212, 255, 0.2);
  border-left: 2px solid var(--accent);
}

.folder-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
}

.folder-count {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.folder-actions {
  display: none;
  gap: 2px;
  flex-shrink: 0;
}

.folder-item:hover .folder-actions {
  display: flex;
}

.folder-action-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  font-size: 10px;
  opacity: 0.7;
  transition: all 0.15s;
}

.folder-action-btn:hover {
  background: var(--bg-light);
  opacity: 1;
}

.folder-rename-input {
  flex: 1;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 2px 4px;
  background: var(--bg-medium);
  border: 1px solid var(--accent);
  color: var(--text-primary);
  border-radius: 2px;
}

/* New Folder Input */
.new-folder-input-row {
  display: flex;
  gap: 4px;
  padding: 6px 10px;
  background: var(--bg-medium);
  border-bottom: 1px solid var(--border-color);
}

.new-folder-input {
  flex: 1;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 4px 6px;
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 2px;
}

.new-folder-input:focus {
  outline: none;
  border-color: var(--accent);
}

.new-folder-ok-btn,
.new-folder-cancel-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-size: 10px;
  border-radius: 2px;
}

.new-folder-ok-btn {
  background: var(--success);
  color: var(--bg-dark);
}

.new-folder-cancel-btn {
  background: var(--error);
  color: white;
}

.new-folder-ok-btn:hover,
.new-folder-cancel-btn:hover {
  filter: brightness(1.2);
}

.subfolder-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  cursor: pointer;
}

.subfolder-toggle input {
  cursor: pointer;
}

.subfolder-toggle:hover {
  color: var(--text-secondary);
}

/* Main content area when sidebar is present */
.asset-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  min-width: 0; /* Allow flex item to shrink */
}

.asset-main-content .asset-grid {
  max-height: none;
  min-height: 200px;
}

.upload-folder-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: var(--accent);
  margin-left: auto;
}

.asset-folder-path {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: var(--text-muted);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Drag over folder highlight */
.folder-item.drag-over {
  background: rgba(0, 212, 255, 0.3);
  border-left: 2px solid var(--primary);
}

/* Asset Selector in Properties */
.asset-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.asset-preview-small {
  width: 100%;
  height: 60px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: var(--bg-medium);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  image-rendering: pixelated;
}

/* Assets Section in Left Panel */
.asset-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.asset-thumbnail {
  width: 24px;
  height: 24px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: var(--bg-dark);
  border-radius: 2px;
  image-rendering: pixelated;
  flex-shrink: 0;
  position: relative;
}

.asset-thumbnail .s3-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 8px;
}

.asset-dims {
  font-size: 7px;
  color: var(--text-muted);
  margin-left: auto;
}

.manage-assets-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 6px 8px;
  border-radius: 2px;
  cursor: pointer;
  width: 100%;
  margin-top: 8px;
  transition: all 0.2s;
}

.manage-assets-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Canvas Background with Image */
.canvas-background.has-image {
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-background.has-image .background-placeholder {
  display: none;
}

.canvas-background .background-loading {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--text-muted);
  animation: pulse 1s ease-in-out infinite;
}

/* Image element with asset */
.image-element.has-asset {
  background-color: transparent;
  border-style: solid;
}

.image-element.has-asset .element-label {
  display: none;
}

/* Scene Settings */
.scene-settings {
  padding: 12px;
}

.scene-settings .property-header {
  margin-bottom: 12px;
}

.scene-settings .hint-text {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

/* Text color for assets */
.text-asset {
  color: #10b981;
}

/* Item icon as asset image */
.item-icon-asset {
  width: 16px;
  height: 16px;
  display: inline-block;
  image-rendering: pixelated;
  vertical-align: middle;
  flex-shrink: 0;
}

/* Audio Management Styles */
.audio-manager-modal {
  width: 700px;
  max-width: 90vw;
  max-height: 80vh;
}

.audio-manager-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow: hidden;
}

.audio-upload-zone {
  border: 2px dashed var(--border-color);
  border-radius: 4px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-dark);
}

.audio-upload-zone:hover,
.audio-upload-zone.dragging {
  border-color: var(--accent);
  background: rgba(0, 212, 255, 0.05);
}

.audio-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  padding: 4px;
}

.audio-list-item {
  background: var(--bg-dark);
  border: 2px solid var(--border-color);
  border-radius: 4px;
  padding: 12px;
  transition: all 0.2s;
}

.audio-list-item:hover {
  border-color: var(--primary);
}

.audio-list-item.playing {
  border-color: var(--accent);
  background: rgba(0, 212, 255, 0.05);
}

.audio-item-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.audio-play-btn-large {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-medium);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.audio-play-btn-large:hover {
  background: var(--accent);
  border-color: var(--accent);
}

.audio-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.audio-name-input {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 6px 8px;
  border-radius: 2px;
  width: 100%;
}

.audio-name-input:focus {
  outline: none;
  border-color: var(--accent);
}

.audio-meta {
  display: flex;
  gap: 8px;
  font-size: 8px;
}

.audio-format {
  color: var(--text-muted);
  background: var(--bg-medium);
  padding: 2px 6px;
  border-radius: 2px;
}

.audio-duration-tag {
  color: var(--accent);
}

.audio-type-selector {
  flex-shrink: 0;
}

.audio-type-select {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 6px 8px;
  border-radius: 2px;
  cursor: pointer;
}

.audio-type-select:focus {
  outline: none;
  border-color: var(--accent);
}

.audio-delete-btn {
  background: var(--error);
  border: none;
  border-radius: 2px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.audio-delete-btn:hover {
  opacity: 1;
}

.empty-audio {
  text-align: center;
  color: var(--text-muted);
  font-size: 9px;
  padding: 24px;
}

.audio-count {
  font-size: 9px;
  color: var(--text-muted);
  margin-right: auto;
}

/* Audio in Left Panel */
.audio-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.audio-type-icon {
  font-size: 10px;
  flex-shrink: 0;
}

.audio-duration {
  font-size: 7px;
  color: var(--accent);
  margin-left: auto;
}

.audio-play-btn {
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  padding: 2px 6px;
  font-size: 8px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s;
  flex-shrink: 0;
}

.audio-play-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
}

/* Audio Selector in Properties */
.audio-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}

.audio-selector .property-select {
  flex: 1;
}

.audio-preview-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.audio-preview-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
}

/* Text color for audio */
.text-audio {
  color: #f59e0b;
}

/* Save Status Indicator */
.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 8px;
  background: var(--bg-medium);
  border: 1px solid var(--border-color);
  margin-right: 8px;
}

.save-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.save-status.saved .save-indicator {
  background: var(--success);
}

.save-status.saving .save-indicator {
  background: var(--warning);
  animation: pulse 1s infinite;
}

.save-status.unsaved .save-indicator {
  background: var(--error);
}

.save-text {
  color: var(--text-muted);
  font-family: 'Press Start 2P', monospace;
}

.save-status.saved .save-text {
  color: var(--success);
}

.save-status.saving .save-text {
  color: var(--warning);
}

.save-status.unsaved .save-text {
  color: var(--error);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* =========================
   PLAY MODE STYLES
   ========================= */

/* Canvas in Play Mode */
.canvas-area.play-mode-active {
  background: var(--bg-dark);
}

.canvas-wrapper.play-mode {
  cursor: crosshair;
}

/* Player Character */
.play-mode-player {
  position: absolute;
  pointer-events: none;
  z-index: 1000;
}

.player-animation {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

.player-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  border: 2px solid #c084fc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.player-direction-indicator {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

/* Walk Target Indicator */
.walk-target-indicator {
  position: absolute;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  margin-top: -6px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  pointer-events: none;
  z-index: 999;
  animation: walkTargetPulse 0.8s ease-in-out infinite;
}

@keyframes walkTargetPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.5;
  }
}

/* Play Mode UI Overlay */
.play-mode-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 2000;
}

.play-mode-overlay > * {
  pointer-events: auto;
}

/* Exit Play Mode Button */
.exit-play-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  background: var(--error);
  color: white;
  border: 2px solid #ff8a8a;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
}

.exit-play-btn:hover {
  background: #ff6b6b;
  transform: scale(1.05);
}

/* Play Message (above actor) */
.play-message {
  position: absolute;
  transform: translate(-50%, -100%);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px 16px;
  border: 2px solid var(--primary);
  border-radius: 4px;
  max-width: 300px;
  text-align: center;
  line-height: 1.6;
  white-space: pre-wrap;
  pointer-events: none;
  z-index: 1000;
  animation: messageAppear 0.2s ease-out;
}

.play-message::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid var(--primary);
}

@keyframes messageAppear {
  from {
    opacity: 0;
    transform: translate(-50%, -100%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%) translateY(0);
  }
}

/* Dialog Box */
.dialog-box {
  position: absolute;
  bottom: 140px;
  left: 50%;
  transform: translateX(-50%);
  width: 70%;
  max-width: 700px;
  background: linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%);
  border: 4px solid var(--primary);
  padding: 20px 24px;
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.dialog-speaker {
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  color: var(--accent);
  margin-bottom: 12px;
  text-transform: uppercase;
}

.dialog-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--text-primary);
  line-height: 2;
  margin-bottom: 12px;
}

.dialog-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
  text-align: right;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Verb Bar */
.verb-bar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.9);
  padding: 8px 12px;
  border: 2px solid var(--border-color);
}

.verb-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  background: var(--bg-medium);
  color: var(--text-secondary);
  border: 2px solid var(--border-color);
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
}

.verb-btn:hover {
  background: var(--bg-light);
  border-color: var(--primary);
  color: var(--text-primary);
}

.verb-btn.active {
  background: var(--primary);
  color: var(--bg-dark);
  border-color: var(--primary);
}

/* Inventory Bar */
.inventory-bar {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid var(--border-color);
  padding: 8px;
  min-width: 150px;
}

.inventory-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--primary);
  margin-bottom: 8px;
  text-align: center;
}

.inventory-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.inventory-slot {
  width: 36px;
  height: 36px;
  background: var(--bg-medium);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.inventory-slot:hover {
  border-color: var(--accent);
  background: var(--bg-light);
}

.inventory-slot .item-icon {
  width: 100%;
  height: 100%;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  image-rendering: pixelated;
}

.inventory-slot .item-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
}

/* Hovered Object Name */
.hovered-object-name {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  color: var(--accent);
  background: rgba(0, 0, 0, 0.85);
  padding: 8px 16px;
  border: 2px solid var(--accent);
}

/* Fade Overlay for Transitions */
.fade-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  pointer-events: none;
  z-index: 3000;
}

/* Skip Cutscene Button */
.skip-cutscene-btn {
  position: absolute;
  bottom: 80px;
  right: 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  background: rgba(0, 0, 0, 0.8);
  color: var(--text-muted);
  border: 2px solid var(--border-color);
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.skip-cutscene-btn:hover {
  color: var(--text-primary);
  border-color: var(--primary);
}

/* Cutscene Indicator */
.cutscene-indicator {
  position: absolute;
  top: 16px;
  left: 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--warning);
  background: rgba(0, 0, 0, 0.85);
  padding: 8px 12px;
  border: 2px solid var(--warning);
  animation: cutscenePulse 2s infinite;
}

@keyframes cutscenePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Selected Item Indicator */
.selected-item-indicator {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--primary);
  background: rgba(0, 0, 0, 0.9);
  padding: 8px 16px;
  border: 2px solid var(--primary);
  display: flex;
  align-items: center;
  gap: 12px;
}

.cancel-item-btn {
  background: var(--error);
  border: none;
  color: white;
  width: 20px;
  height: 20px;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-item-btn:hover {
  background: #ff6b6b;
}

/* Inventory Improvements */
.inventory-slot.selected {
  border-color: var(--primary) !important;
  background: rgba(201, 162, 39, 0.2) !important;
  box-shadow: 0 0 10px rgba(201, 162, 39, 0.5);
}

.inventory-empty {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
  padding: 8px;
  text-align: center;
}

/* Music Indicator */
.music-indicator {
  position: absolute;
  bottom: 80px;
  left: 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.7);
  padding: 6px 10px;
  border-radius: 4px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Scene Map Button in Header */
.map-btn {
  background: var(--accent) !important;
  border-color: #00d4ff !important;
  color: var(--bg-dark) !important;
}

.map-btn:hover {
  background: #00a8cc !important;
  transform: scale(1.05);
}

/* Play Button in Header */
.play-btn {
  background: var(--success) !important;
  border-color: #00ff88 !important;
  color: var(--bg-dark) !important;
}

.play-btn:hover {
  background: #00cc6a !important;
  transform: scale(1.05);
}

/* Context Menu */
.context-menu {
  position: fixed;
  z-index: 10000;
  background: var(--bg-card);
  border: 2px solid var(--primary);
  border-radius: 4px;
  min-width: 180px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
  padding: 4px 0;
  font-size: 11px;
}

.context-menu-header {
  padding: 6px 12px;
  color: var(--text-secondary);
  font-size: 10px;
  border-bottom: 1px solid var(--bg-medium);
  margin-bottom: 4px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 11px;
  transition: background 0.1s;
}

.context-menu-item:hover {
  background: var(--bg-medium);
}

.context-menu-item-danger:hover {
  background: rgba(255, 71, 87, 0.2);
  color: var(--error);
}

.context-menu-divider {
  height: 1px;
  background: var(--bg-medium);
  margin: 4px 0;
}

.context-menu-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  color: var(--text-muted);
  font-size: 10px;
}

.menu-icon {
  width: 16px;
  text-align: center;
}

/* Group indicator on elements */
.element-rect.in-group {
  outline: 2px dashed #00d4ff;
  outline-offset: 2px;
}

.group-indicator {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  background: #00d4ff;
  color: var(--bg-dark);
  font-size: 8px;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
}

/* ========================
   AI Panel Styles
   ======================== */

.ai-btn {
  background: linear-gradient(135deg, #8b5cf6, #6366f1) !important;
  border-color: #8b5cf6 !important;
}

.ai-btn:hover {
  background: linear-gradient(135deg, #a78bfa, #818cf8) !important;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
}

.ai-panel-overlay {
  backdrop-filter: blur(4px);
}

.ai-panel-modal {
  width: 90%;
  max-width: 800px;
  height: 85vh;
  max-height: 800px;
  display: flex;
  flex-direction: column;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #1e1e3f, #2a2a4a);
  border-bottom: 2px solid #8b5cf6;
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.ai-header-left h3 {
  margin: 0;
  color: #a78bfa;
}

.ai-icon {
  font-size: 24px;
}

.ai-header-status {
  margin-right: 12px;
}

.ai-connection-status {
  font-size: 11px;
  color: var(--text-muted);
  padding: 4px 8px;
  background: var(--bg-dark);
  border-radius: 4px;
}

.ai-connection-status.connected {
  color: var(--success);
}

.ai-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  padding: 16px;
}

.ai-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-dark);
  border-radius: 6px;
  border-left: 3px solid var(--text-muted);
}

.ai-status-bar.idle {
  border-left-color: var(--text-muted);
}

.ai-status-bar.connecting {
  border-left-color: var(--warning);
  background: rgba(255, 170, 0, 0.1);
}

.ai-status-bar.generating {
  border-left-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  animation: pulse 1.5s ease-in-out infinite;
}

.ai-status-bar.complete {
  border-left-color: var(--success);
  background: rgba(0, 255, 136, 0.1);
}

.ai-status-bar.error {
  border-left-color: var(--error);
  background: rgba(255, 71, 87, 0.1);
}

.ai-status-icon {
  font-size: 16px;
}

.ai-status-message {
  font-size: 12px;
  color: var(--text-secondary);
}

.ai-script-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ai-script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ai-label {
  font-size: 12px;
  font-weight: bold;
  color: var(--text-secondary);
}

.ai-sample-btn {
  background: var(--bg-dark);
  border: 1px solid var(--bg-medium);
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-sample-btn:hover {
  background: var(--bg-medium);
  color: var(--primary);
  border-color: var(--primary);
}

.ai-script-textarea {
  flex: 1;
  width: 100%;
  min-height: 200px;
  background: var(--bg-dark);
  border: 2px solid var(--bg-medium);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 12px;
  resize: none;
  outline: none;
}

.ai-script-textarea:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

.ai-script-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-script-textarea::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

.ai-tips {
  margin-top: 4px;
}

.ai-tips summary {
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  background: var(--bg-dark);
  border-radius: 4px;
}

.ai-tips summary:hover {
  color: var(--text-secondary);
}

.ai-tips-content {
  padding: 10px;
  background: var(--bg-dark);
  border-radius: 0 0 4px 4px;
  font-size: 11px;
  line-height: 1.6;
}

.ai-tips-content p {
  margin: 4px 0;
  color: var(--text-muted);
}

.ai-tips-content strong {
  color: #8b5cf6;
}

.ai-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-dark);
  border-top: 1px solid var(--bg-medium);
}

.ai-footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-char-count {
  font-size: 11px;
  color: var(--text-muted);
}

.ai-footer-right {
  display: flex;
  gap: 8px;
}

.ai-generate-btn {
  background: linear-gradient(135deg, #8b5cf6, #6366f1) !important;
  border-color: #8b5cf6 !important;
  padding: 8px 20px !important;
  font-weight: bold;
}

.ai-generate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #a78bfa, #818cf8) !important;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
}

.ai-generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.generating-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Background Scale Feature */
.background-scale-hint {
  margin-top: var(--space-sm);
  padding: var(--space-sm);
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid var(--warning);
  border-radius: 4px;
}

.size-mismatch-text {
  display: block;
  font-size: 8px;
  color: var(--warning);
  margin-bottom: var(--space-xs);
}

.scale-background-btn {
  width: 100%;
  padding: 6px 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: linear-gradient(180deg, var(--warning), #cc8800);
  color: #000;
  border: 2px solid #ffcc00;
  cursor: pointer;
  transition: all 0.15s;
}

.scale-background-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 170, 0, 0.4);
}

/* Background Scale Modal */
.background-scale-modal {
  background: var(--bg-card);
  border: 4px solid var(--primary);
  border-radius: 8px;
  padding: var(--space-lg);
  width: 90%;
  max-width: 400px;
}

.background-scale-modal .modal-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  color: var(--primary);
  margin: 0 0 var(--space-md) 0;
  text-align: center;
}

.scale-info {
  background: var(--bg-dark);
  padding: var(--space-sm);
  margin-bottom: var(--space-md);
  border-radius: 4px;
}

.scale-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  padding: 4px 0;
}

.info-label {
  color: var(--text-muted);
}

.info-value {
  color: var(--text-primary);
  font-family: monospace;
}

.scale-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.scale-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-medium);
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: all 0.15s;
}

.scale-option:hover {
  border-color: var(--accent);
}

.scale-option.active {
  border-color: var(--primary);
  background: rgba(201, 162, 39, 0.1);
}

.scale-option input {
  margin-top: 2px;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-icon {
  font-size: 14px;
}

.option-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-primary);
}

.option-desc {
  font-size: 8px;
  color: var(--text-muted);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

.modal-btn {
  padding: 8px 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  border: 2px solid;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-btn-cancel {
  background: var(--bg-medium);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.modal-btn-cancel:hover {
  border-color: var(--text-muted);
}

.modal-btn-confirm {
  background: linear-gradient(180deg, var(--success), #00cc66);
  border-color: var(--success);
  color: #000;
}

.modal-btn-confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 255, 136, 0.4);
}

.modal-btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scale-note {
  font-size: 8px;
  color: var(--text-muted);
  text-align: center;
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-color);
}
</style>
