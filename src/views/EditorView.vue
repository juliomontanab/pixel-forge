<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClaudeSocket } from '@/composables/useClaudeSocket'
import { useProjectApi } from '@/composables/useProjectApi'
import { useAssetApi } from '@/composables/useAssetApi'
import { useUndoRedo } from '@/composables/useUndoRedo'
import { useKeyboardShortcuts, createEditorShortcuts } from '@/composables/useKeyboardShortcuts'
import { useElementSelection } from '@/composables/useElementSelection'
import { usePanelState } from '@/composables/usePanelState'
import { useCanvasZoom } from '@/composables/useCanvasZoom'
import { useParticleSystem, particlePresets, parseColor } from '@/composables/useParticleSystem'
import { useLighting, lightTypes } from '@/composables/useLighting'
import { useAudioPlayback } from '@/composables/useAudioPlayback'
import { useElementCRUD } from '@/composables/useElementCRUD'
import { usePlayMode } from '@/composables/usePlayMode'
import { useCutsceneEngine } from '@/composables/useCutsceneEngine'
import { useContextMenu } from '@/composables/useContextMenu'
import { useWalkboxResize } from '@/composables/useWalkboxResize'
import { useSceneManagement } from '@/composables/useSceneManagement'
import { useGlobalActors } from '@/composables/useGlobalActors'
import { usePuzzleHelpers } from '@/composables/usePuzzleHelpers'
import { useInteractionSystem } from '@/composables/useInteractionSystem'

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
  ElementList,
  ElementSection,
  ActorPlacementsSection,
  AnimationsSection,
  LightsSection,
  AssetsSection,
  AudioAssetsSection,
  GlobalActorsSection,
  ItemsSection,
  InventorySection,
  VerbsSection,
  PuzzleProperties,
  CutsceneProperties,
  LightProperties,
  ParticleProperties,
  ItemProperties,
  DialogProperties,
  AudioProperties,
  InteractionsPanel,
  ImageProperties,
  AiAssistantModal,
  ActorProperties,
  ExitProperties,
  SceneSettingsPanel,
  RenameSceneModal,
  PlaceActorModal,
  AddToInventoryModal,
  EditorContextMenu,
  WalkboxProperties,
  ZPlaneProperties,
  VerbProperties
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

// Initialize keyboard shortcuts composable (shortcuts registered after handlers are defined)
const { registerShortcuts, unregisterAll: unregisterAllShortcuts } = useKeyboardShortcuts()

// Initialize panel state composable
const {
  leftPanelOpen,
  rightPanelOpen,
  collapsedSections,
  visibleTypes,
  toggleSection,
  toggleVisibility,
  showGrid,
  toggleGrid
} = usePanelState()

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

// UI state (panel state from usePanelState composable)
const canvasRef = ref(null) // Canvas DOM reference for coordinate calculations

// Initialize canvas zoom composable
const {
  zoom,
  zoomIn,
  zoomOut,
  setZoom,
  resetZoom,
  zoomPercent,
  canZoomIn,
  canZoomOut
} = useCanvasZoom({
  defaultZoom: 1.0,
  minZoom: 0.1,
  maxZoom: 2.0,
  zoomStep: 0.1
})

// Helper: Get element by type and ID (needed for selection composable)
const getElementByTypeAndId = (type, id) => {
  switch (type) {
    case 'image': return currentScene.value.images.find(e => e.id === id)
    case 'walkbox': return currentScene.value.walkboxes.find(e => e.id === id)
    case 'exit': return currentScene.value.exits.find(e => e.id === id)
    case 'actor': return currentScene.value.actorPlacements.find(e => e.id === id)
    case 'actorPlacement': return currentScene.value.actorPlacements.find(e => e.id === id)
    case 'hotspot': return currentScene.value.hotspots.find(e => e.id === id)
    case 'zplane': return currentScene.value.zplanes.find(e => e.id === id)
    case 'light': return currentScene.value.lighting?.lights.find(e => e.id === id)
    case 'particle': return currentScene.value.particles.find(e => e.id === id)
    default: return null
  }
}

// Helper: Get group for an element (needed for selection composable)
const getElementGroup = (type, elementId) => {
  if (!currentScene.value.groups || !Array.isArray(currentScene.value.groups)) return null
  if (!type || elementId === undefined || elementId === null) return null
  return currentScene.value.groups.find(g => {
    if (!g || !g.members || !Array.isArray(g.members)) return false
    return g.members.some(m => {
      if (!m || !m.type || m.id === undefined || m.id === null) return false
      return m.type === type && String(m.id) === String(elementId)
    })
  })
}

// Initialize element selection composable (drag, resize, rotation)
const {
  selectedElements,
  isElementSelected,
  selectElement,
  clearSelection,
  selectAllOfType: selectAllElementsOfType,
  getSceneCoords,
  isDragging,
  didDragMove,
  dragState,
  startDrag,
  isResizing,
  resizeState,
  startResize,
  isRotating,
  rotateState,
  startRotate,
  startWalkboxRotate,
  singleSelectedElement,
  cleanup: cleanupSelection
} = useElementSelection({
  canvasRef,
  zoom,
  sceneWidth: computed(() => currentScene.value?.width || 1920),
  sceneHeight: computed(() => currentScene.value?.height || 1200),
  getElementGroup,
  getElementByTypeAndId
})

// Initialize element CRUD composable (copy/paste/delete)
const {
  clipboard,
  hasClipboard,
  addElement,
  deleteElement,
  deleteSelectedElements,
  copyToClipboard,
  pasteFromClipboard,
  duplicateElements,
  duplicateElement,
  generateId,
  createDefaultElement
} = useElementCRUD({
  currentScene,
  globalData: computed(() => project.value?.globalData),
  selectedElements,
  defaultWidth: computed(() => currentScene.value?.width || 1920),
  defaultHeight: computed(() => currentScene.value?.height || 1200)
})

// Initialize scene management composable
const {
  switchScene,
  createNewScene,
  deleteCurrentScene,
  duplicateCurrentScene,
  showRenameSceneModal,
  renameSceneValue,
  openRenameSceneModal,
  confirmRenameScene,
  cancelRenameScene,
  createEmptyScene,
  getSceneById
} = useSceneManagement({
  project,
  currentScene,
  selectedElements,
  defaultWidth: DEFAULT_WIDTH,
  defaultHeight: DEFAULT_HEIGHT
})

// Initialize global actors management composable
const {
  addGlobalActor,
  removeGlobalActor,
  placeActorInScene,
  removeActorFromScene,
  getGlobalActorById
} = useGlobalActors({
  project,
  currentScene
})

// Initialize puzzle helpers composable
const {
  addPuzzleHint,
  removePuzzleHint,
  addConditionItem,
  removeConditionItem,
  addSequenceStep,
  removeSequenceStep,
  toggleCorrectChoice,
  addResultRemoveItem,
  removeResultRemoveItem,
  toggleUseWith
} = usePuzzleHelpers()

// Initialize interaction system composable
const {
  addInteraction,
  removeInteraction,
  getVerbById
} = useInteractionSystem({ project })

// Helper for audio asset lookup (needed by usePlayMode)
const getAudioAssetById = (audioId) => {
  return project.value?.globalData?.audioAssets?.find(a => a.id === audioId)
}

// Initialize play mode composable
const {
  playMode,
  playModeState,
  getPlayerActor,
  getPlayerPlacement,
  getCurrentDialogLine,
  getInventoryItems,
  enterPlayMode: enterPlayModeFromComposable,
  exitPlayMode: exitPlayModeFromComposable,
  stopPlayModeAudio,
  playSceneMusic,
  playMusic,
  stopMusic,
  playSFX,
  playAddToInventory,
  playRemoveFromInventory,
  hasItem,
  selectInventoryItem,
  setVariable,
  getVariable,
  checkVariable,
  isPointInWalkbox,
  isPointInPolygon,
  findClosestWalkablePoint,
  walkToPoint,
  updateWalk,
  startDialog,
  advanceDialog,
  showPlayMessage,
  selectVerb,
  fadeOut,
  fadeIn,
  changeSceneWithTransition: changeSceneWithTransitionFromComposable,
  findObjectAtPoint
} = usePlayMode({
  currentScene,
  project,
  selectedElements,
  getAudioAssetById,
  switchScene: (sceneId) => switchScene(sceneId),
  getSceneCoords
})

// Initialize cutscene engine composable
const {
  startCutscene,
  executeCutsceneAction,
  advanceCutscene,
  endCutscene,
  skipCutscene,
  checkSceneEnterTriggers,
  checkObjectInteractionTrigger,
  checkPuzzleSolvedTrigger,
  createCutscene,
  createCutsceneAction,
  getActionTypes,
  getTriggerTypes
} = useCutsceneEngine({
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
  changeSceneWithTransition: (sceneId) => changeSceneWithTransition(sceneId)
})

// Initialize context menu and grouping composable
const {
  contextMenu,
  isElementInGroup,
  createGroup,
  ungroupSelected,
  clearAllGroups,
  selectGroup,
  duplicateSelected,
  deleteSelected,
  showContextMenu,
  showElementContextMenu,
  closeContextMenu,
  handleGlobalClick,
  canGroup,
  selectionInGroup,
  selectedGroup
} = useContextMenu({
  currentScene,
  selectedElements,
  getElementGroup,
  getElementByTypeAndId
})

// Initialize walkbox resize composable
const {
  isDraggingVertex,
  vertexDragState,
  getWalkboxCenter,
  getWalkboxPath,
  startVertexDrag,
  addWalkboxVertex,
  removeWalkboxVertex,
  cleanup: cleanupWalkboxResize
} = useWalkboxResize({
  currentScene,
  getSceneCoords
})

// Wrapper functions for enter/exit play mode with cutscene triggers
const enterPlayMode = () => {
  return enterPlayModeFromComposable({
    checkSceneEnterTriggers
  })
}

const exitPlayMode = () => {
  exitPlayModeFromComposable()
}

// Wrapper for changeSceneWithTransition
const changeSceneWithTransition = (sceneId) => {
  changeSceneWithTransitionFromComposable(sceneId, {
    checkSceneEnterTriggers,
    onCutsceneAdvance: advanceCutscene
  })
}

// Initialize particle system composable
const {
  activeParticles,
  getParticleStyle,
  updateParticles,
  startParticleLoop: startParticleLoopFromComposable,
  stopParticleLoop,
  applyParticlePreset,
  getParticleIcon,
  clearParticles,
  startResizeParticle
} = useParticleSystem({
  currentScene,
  zoom
})

// Initialize lighting composable
const {
  getLightIcon,
  getLightPreviewStyle,
  getLightingGradient,
  createLight,
  createDefaultLighting
} = useLighting({
  currentScene,
  zoom
})

// =====================
// PLAY MODE - INTERACTION HANDLERS
// =====================
// NOTE: Core play mode logic is in usePlayMode and useCutsceneEngine composables.
// The following inline code handles complex interaction logic that uses composable functions.

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

// Particle and lighting functions from composables:
// - activeParticles, getParticleStyle, updateParticles, startResizeParticle from useParticleSystem
// - getLightPreviewStyle, getLightingGradient, getLightIcon from useLighting
// - parseColor from useParticleSystem

// Custom particle animation loop (wraps composable's updateParticles with parallax updates)
let particleAnimationFrame = null
let lastParticleTime = 0

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

// Panel state (collapsedSections, visibleTypes, toggleSection, toggleVisibility) from usePanelState composable

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

// COPY/PASTE SYSTEM provided by useElementCRUD composable
// (clipboard, copyToClipboard, pasteFromClipboard)

// Wrapper for delete that handles group cleanup
const handleDeleteElement = () => {
  if (selectedElements.value.length === 0) return

  // Remove from groups before deletion
  const removeFromGroups = (type, id) => {
    if (currentScene.value.groups) {
      currentScene.value.groups.forEach(group => {
        group.members = group.members.filter(m => !(m.type === type && m.id === id))
      })
      // Remove empty groups
      currentScene.value.groups = currentScene.value.groups.filter(g => g.members.length > 0)
    }
  }

  // Use composable's deleteSelectedElements with group removal callback
  deleteSelectedElements({
    removeFromGroup: removeFromGroups
  })
}

// Register keyboard shortcuts using the composable
// (composable auto-registers keydown listener on mount)
registerShortcuts(createEditorShortcuts({
  undo,
  redo,
  copy: () => {
    if (selectedElements.value.length > 0) {
      copyToClipboard()
    }
  },
  paste: () => {
    if (hasClipboard.value) {
      pasteFromClipboard()
    }
  },
  delete: handleDeleteElement,
  deselect: () => {
    clearSelection()
  }
}))

onMounted(() => {
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

// DRAG & DROP, RESIZE, and ROTATION systems are provided by useElementSelection composable
// (see initialization near line 700)


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

// Handle asset upload files (for AssetManagerModal)
const handleAssetUploadFiles = (files) => {
  files.forEach(handleAssetUpload)
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

// Handle audio upload files (for AudioManagerModal)
const handleAudioUploadFiles = (files) => {
  files.forEach(handleAudioUpload)
}

// Update audio asset field (for AudioManagerModal)
const updateAudioAssetField = (audioId, field, value) => {
  const audio = project.value.globalData.audioAssets.find(a => a.id === audioId)
  if (audio) {
    audio[field] = value
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

  // Cleanup selection composable (removes drag/resize/rotate event listeners)
  cleanupSelection()

  // Remove remaining event listeners (keyboard shortcuts handled by composable)
  document.removeEventListener('mousemove', onVertexDragMove)
  document.removeEventListener('mouseup', onVertexDragEnd)
  document.removeEventListener('click', handleGlobalClick)
  unregisterAllShortcuts()
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
          <!-- Images Section -->
          <ElementSection
            type="image"
            type-plural="images"
            icon="🖼"
            label="Images"
            :items="currentScene.images"
            :collapsed="collapsedSections.images"
            :visible="visibleTypes.images"
            :selected-elements="selectedElements"
            color-class="text-image"
            @toggle-collapse="toggleSection('images')"
            @toggle-visibility="toggleVisibility"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          >
            <template #item-badges="{ item }">
              <span v-if="item.interactive" class="item-badge interactive">⚡</span>
            </template>
          </ElementSection>

          <!-- Walkboxes Section -->
          <ElementSection
            type="walkbox"
            type-plural="walkboxes"
            icon="▢"
            label="Walkboxes"
            :items="currentScene.walkboxes"
            :collapsed="collapsedSections.walkboxes"
            :visible="visibleTypes.walkboxes"
            :selected-elements="selectedElements"
            color-class="text-walkbox"
            :get-item-name="(item) => `Walkbox ${item.id}`"
            @toggle-collapse="toggleSection('walkboxes')"
            @toggle-visibility="toggleVisibility"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          />

          <!-- Exits Section -->
          <ElementSection
            type="exit"
            type-plural="exits"
            icon="→"
            label="Exits"
            :items="currentScene.exits"
            :collapsed="collapsedSections.exits"
            :visible="visibleTypes.exits"
            :selected-elements="selectedElements"
            color-class="text-exit"
            @toggle-collapse="toggleSection('exits')"
            @toggle-visibility="toggleVisibility"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          />

          <!-- Actor Placements Section -->
          <ActorPlacementsSection
            :placements="currentScene.actorPlacements"
            :collapsed="collapsedSections.actorPlacements"
            :visible="visibleTypes.actors"
            :selected-elements="selectedElements"
            :get-actor-name="(actorId) => getGlobalActorById(actorId)?.name || 'Unknown'"
            @toggle-collapse="toggleSection('actorPlacements')"
            @toggle-visibility="toggleVisibility"
            @add="showPlaceActorModal = true"
            @select="handleSelectElement"
            @remove="removeActorFromScene"
          />

          <!-- Hotspots Section -->
          <ElementSection
            type="hotspot"
            type-plural="hotspots"
            icon="◎"
            label="Hotspots"
            :items="currentScene.hotspots"
            :collapsed="collapsedSections.hotspots"
            :visible="visibleTypes.hotspots"
            :selected-elements="selectedElements"
            color-class="text-hotspot"
            @toggle-collapse="toggleSection('hotspots')"
            @toggle-visibility="toggleVisibility"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          />

          <!-- Z-Planes Section -->
          <ElementSection
            type="zplane"
            type-plural="zplanes"
            icon="▤"
            label="Z-Planes"
            :items="currentScene.zplanes"
            :collapsed="collapsedSections.zplanes"
            :visible="visibleTypes.zplanes"
            :selected-elements="selectedElements"
            color-class="text-zplane"
            @toggle-collapse="toggleSection('zplanes')"
            @toggle-visibility="toggleVisibility"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          />

          <!-- Section divider for data elements -->
          <div class="section-divider">
            <span class="divider-text">DATA ELEMENTS</span>
          </div>

          <!-- Dialogs Section -->
          <ElementSection
            type="dialog"
            type-plural="dialogs"
            icon="💬"
            label="Dialogs"
            :items="currentScene.dialogs"
            :collapsed="collapsedSections.dialogs"
            :selected-elements="selectedElements"
            color-class="text-dialog"
            :show-visibility="false"
            @toggle-collapse="toggleSection('dialogs')"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          />

          <!-- Puzzles Section -->
          <ElementSection
            type="puzzle"
            type-plural="puzzles"
            icon="🧩"
            label="Puzzles"
            :items="currentScene.puzzles"
            :collapsed="collapsedSections.puzzles"
            :selected-elements="selectedElements"
            color-class="text-puzzle"
            :show-visibility="false"
            @toggle-collapse="toggleSection('puzzles')"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          />

          <!-- Verbs section moved to Global Data area -->

          <!-- SFX Section -->
          <ElementSection
            type="sfx"
            type-plural="sfx"
            icon="🔊"
            label="SFX"
            :items="currentScene.sfx"
            :collapsed="collapsedSections.sfx"
            :selected-elements="selectedElements"
            color-class="text-sfx"
            :show-visibility="false"
            @toggle-collapse="toggleSection('sfx')"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          />

          <!-- Music Section -->
          <ElementSection
            type="music"
            type-plural="music"
            icon="🎵"
            label="Music"
            :items="currentScene.music"
            :collapsed="collapsedSections.music"
            :selected-elements="selectedElements"
            color-class="text-music"
            :show-visibility="false"
            @toggle-collapse="toggleSection('music')"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          />

          <!-- Cutscenes Section -->
          <ElementSection
            type="cutscene"
            type-plural="cutscenes"
            icon="🎬"
            label="Cutscenes"
            :items="currentScene.cutscenes"
            :collapsed="collapsedSections.cutscenes"
            :selected-elements="selectedElements"
            color-class="text-cutscene"
            :show-visibility="false"
            @toggle-collapse="toggleSection('cutscenes')"
            @add="handleAddElement"
            @select="handleSelectElement"
            @select-all="selectAllOfType"
          >
            <template #item-badges="{ item }">
              <span class="item-badge" v-if="item.actions?.length > 0">{{ item.actions.length }}</span>
            </template>
          </ElementSection>

          <!-- Animations Section -->
          <AnimationsSection
            :animations="globalAnimations"
            :collapsed="collapsedSections.animations"
            :selected-elements="selectedElements"
            :get-animation-usage="getAnimationUsage"
            @toggle-collapse="toggleSection('animations')"
            @add="openSpritesheetEditor()"
            @select="handleSelectElement"
          />

          <!-- Lights Section -->
          <LightsSection
            :lighting="currentScene.lighting"
            :collapsed="collapsedSections.lights"
            :visible="visibleTypes.lights"
            :selected-elements="selectedElements"
            :get-light-icon="getLightIcon"
            @toggle-collapse="toggleSection('lights')"
            @toggle-visibility="toggleVisibility"
            @add="handleAddElement"
            @select="handleSelectElement"
            @update:ambient-color="(color) => currentScene.lighting.ambient.color = color"
            @update:ambient-intensity="(intensity) => currentScene.lighting.ambient.intensity = intensity"
          />

          <!-- Particles Section -->
          <ElementSection
            type="particle"
            type-plural="particles"
            icon="✨"
            label="Particles"
            :items="currentScene.particles"
            :collapsed="collapsedSections.particles"
            :visible="visibleTypes.particles"
            :selected-elements="selectedElements"
            color-class="text-particle"
            :show-select-all="false"
            :get-item-icon="(item) => getParticleIcon(item.preset)"
            @toggle-collapse="toggleSection('particles')"
            @toggle-visibility="toggleVisibility"
            @add="handleAddElement"
            @select="handleSelectElement"
          >
            <template #item-badges="{ item }">
              <span class="item-badge">{{ item.preset }}</span>
            </template>
          </ElementSection>

          <!-- GLOBAL DATA SEPARATOR -->
          <div class="section-separator">
            <span class="separator-label">🌍 GLOBAL DATA</span>
          </div>

          <!-- Assets Section -->
          <AssetsSection
            :assets="project.globalData.assets"
            :collapsed="collapsedSections.assets"
            :get-asset-display-url="getAssetDisplayUrl"
            @toggle-collapse="toggleSection('assets')"
            @open-manager="showAssetManagerModal = true"
          />

          <!-- Audio Assets Section (Global) -->
          <AudioAssetsSection
            :audio-assets="project.globalData.audioAssets"
            :collapsed="collapsedSections.audioAssets"
            :currently-playing-audio="currentlyPlayingAudio"
            :format-duration="formatDuration"
            @toggle-collapse="toggleSection('audioAssets')"
            @open-manager="showAudioManagerModal = true"
            @play="playAudioPreview"
            @stop="stopAudioPreview"
          />

          <!-- Global Actors Section -->
          <GlobalActorsSection
            :actors="project.globalData.actors"
            :collapsed="collapsedSections.globalActors"
            :selected-elements="selectedElements"
            :actor-placements="currentScene.actorPlacements"
            @toggle-collapse="toggleSection('globalActors')"
            @add="addGlobalActor"
            @select="handleSelectElement"
            @place="placeActorInScene"
          />

          <!-- Items Section (Global) -->
          <ItemsSection
            :items="project.globalData.items"
            :collapsed="collapsedSections.items"
            :selected-elements="selectedElements"
            :item-has-asset-icon="itemHasAssetIcon"
            :get-item-icon-style="getItemIconStyle"
            @toggle-collapse="toggleSection('items')"
            @add="handleAddElement"
            @select="handleSelectElement"
          />

          <!-- Inventory Section (Global - Player's Items) -->
          <InventorySection
            :inventory="project.globalData.inventory"
            :collapsed="collapsedSections.inventory"
            :get-item-by-id="getItemById"
            :item-has-asset-icon="itemHasAssetIcon"
            :get-item-icon-style="getItemIconStyle"
            @toggle-collapse="toggleSection('inventory')"
            @add="showAddToInventoryModal = true"
            @remove="removeFromInventory"
          />

          <!-- Verbs Section (Global) -->
          <VerbsSection
            :verbs="project.globalData.verbs"
            :collapsed="collapsedSections.verbs"
            :selected-elements="selectedElements"
            @toggle-collapse="toggleSection('verbs')"
            @add="handleAddElement"
            @select="handleSelectElement"
            @reset="resetVerbsToDefault"
          />
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

        <!-- Zoom controls (from useCanvasZoom composable) -->
        <div class="zoom-controls">
          <button class="zoom-btn" @click="zoomOut" :disabled="!canZoomOut">-</button>
          <span class="zoom-level pixel-font-sm">{{ zoomPercent }}%</span>
          <button class="zoom-btn" @click="zoomIn" :disabled="!canZoomIn">+</button>
          <button class="zoom-btn fit-btn" @click="setZoom(0.5)">FIT</button>
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
          <SceneSettingsPanel
            v-if="selectedElements.length === 0"
            :scene="currentScene"
            :assets="project.globalData.assets"
            :background-asset="currentBackgroundAsset"
            :background-needs-scaling="backgroundNeedsScaling"
            :get-asset-by-id="getAssetById"
            :get-asset-display-url="getAssetDisplayUrl"
            @auto-save="autoSaveProject"
            @show-scale-modal="showBackgroundScaleModal = true"
          />

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
            <ImageProperties
              v-if="selectedElements[0].type === 'image'"
              :element="selectedElements[0].element"
              :assets="project.globalData.assets"
              :get-asset-by-id="getAssetById"
              :get-asset-display-url="getAssetDisplayUrl"
              @ensure-parallax-defaults="ensureParallaxDefaults"
            />
            <!-- Exit-specific properties -->
            <ExitProperties
              v-if="selectedElements[0].type === 'exit'"
              :element="selectedElements[0].element"
              :scenes="availableScenes"
              :current-scene-id="currentScene.id"
            />

            <!-- Actor-specific properties -->
            <ActorProperties
              v-if="selectedElements[0].type === 'actor'"
              :element="selectedElements[0].element"
              :actor-animation-states="actorAnimationStates"
              :global-animations="globalAnimations"
            />

            <!-- Interactions Panel (for hotspots and interactive images) -->
            <InteractionsPanel
              v-if="selectedElements[0].type === 'hotspot' || (selectedElements[0].type === 'image' && selectedElements[0].element.interactive)"
              :element="selectedElements[0].element"
              :verbs="project.globalData.verbs"
              :actors="project.globalData.actors"
              :dialogs="currentScene.dialogs"
              :cutscenes="currentScene.cutscenes"
              :items="project.globalData.items"
              :scenes="project.scenes"
              @add-interaction="addInteraction"
              @remove-interaction="removeInteraction"
            />

            <!-- Z-Plane-specific properties -->
            <ZPlaneProperties
              v-if="selectedElements[0].type === 'zplane'"
              :element="selectedElements[0].element"
            />

            <!-- Walkbox properties -->
            <WalkboxProperties
              v-if="selectedElements[0].type === 'walkbox'"
              :element="selectedElements[0].element"
            />

            <!-- Dialog properties -->
            <!-- Dialog properties -->
            <DialogProperties
              v-if="selectedElements[0].type === 'dialog'"
              :element="selectedElements[0].element"
              :actors="project.globalData.actors"
              :dialogs="currentScene.dialogs"
              :get-actor-by-id="getActorById"
              :get-dialog-actor-preview-style="getDialogActorPreviewStyle"
              :has-actor-animation="hasActorAnimation"
            />

            <!-- Puzzle properties -->
            <PuzzleProperties
              v-if="selectedElements[0].type === 'puzzle'"
              :element="selectedElements[0].element"
              :items="project.globalData.items"
              :hotspots="currentScene.hotspots"
              :images="currentScene.images"
              :exits="currentScene.exits"
              :dialogs="currentScene.dialogs"
              :cutscenes="currentScene.cutscenes"
              :verbs="project.globalData.verbs"
              :actors="project.globalData.actors"
            />

            <!-- Item properties -->
            <ItemProperties
              v-if="selectedElements[0].type === 'item'"
              :element="selectedElements[0].element"
              :assets="project.globalData.assets"
              :dialogs="currentScene.dialogs"
              :get-asset-by-id="getAssetById"
              :get-asset-display-url="getAssetDisplayUrl"
              @add-to-inventory="addToInventory"
            />

            <!-- Verb properties -->
            <VerbProperties
              v-if="selectedElements[0].type === 'verb'"
              :element="selectedElements[0].element"
            />

            <!-- SFX properties -->
            <AudioProperties
              v-if="selectedElements[0].type === 'sfx'"
              :element="selectedElements[0].element"
              type="sfx"
              :audio-assets="project.globalData.audioAssets"
              :currently-playing-audio="currentlyPlayingAudio"
              :format-duration="formatDuration"
              :get-audio-asset-by-id="getAudioAssetById"
              @play="playAudioPreview"
              @stop="stopAudioPreview"
            />

            <!-- Music properties -->
            <AudioProperties
              v-if="selectedElements[0].type === 'music'"
              :element="selectedElements[0].element"
              type="music"
              :audio-assets="project.globalData.audioAssets"
              :currently-playing-audio="currentlyPlayingAudio"
              :format-duration="formatDuration"
              :get-audio-asset-by-id="getAudioAssetById"
              @play="playAudioPreview"
              @stop="stopAudioPreview"
            />

            <!-- Cutscene properties -->
            <CutsceneProperties
              v-if="selectedElements[0].type === 'cutscene'"
              :element="selectedElements[0].element"
              :actors="project.globalData.actors"
              :images="currentScene.images"
              :hotspots="currentScene.hotspots"
              :puzzles="currentScene.puzzles"
              :sfx="currentScene.sfx"
              :music="currentScene.music"
              :scenes="availableScenes"
            />

            <!-- Light properties -->
            <LightProperties
              v-if="selectedElements[0].type === 'light'"
              :element="selectedElements[0].element"
              :light-types="lightTypes"
              @delete="deleteSelectedLight"
            />

            <!-- Particle emitter properties -->
            <ParticleProperties
              v-if="selectedElements[0].type === 'particle'"
              :element="selectedElements[0].element"
              :particle-presets="particlePresets"
              @delete="deleteSelectedParticle"
              @apply-preset="(preset) => applyParticlePreset(selectedElements[0].element, preset)"
            />
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
    <EditorContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :selected-count="selectedElements.length"
      :can-group="canGroup"
      :selection-in-group="selectionInGroup"
      :has-groups="currentScene.groups && currentScene.groups.length > 0"
      :selected-group="selectedGroup"
      @create-group="createGroup"
      @select-group="selectGroup"
      @ungroup="ungroupSelected"
      @clear-all-groups="clearAllGroups"
      @duplicate="duplicateSelected"
      @delete="deleteSelected"
    />

    <!-- AI Assistant Modal -->
    <AiAssistantModal
      v-model="aiPanelOpen"
      :claude-is-connected="claudeIsConnected"
      :ai-status="aiStatus"
      :ai-status-message="aiStatusMessage"
      :ai-script="aiScript"
      @update:ai-script="aiScript = $event"
      @generate="handleAiGenerate"
      @load-sample="loadSampleScript"
    />

    <!-- Rename Scene Modal -->
    <RenameSceneModal
      v-model="showRenameSceneModal"
      :scene-name="renameSceneValue"
      @confirm="confirmRenameScene"
    />

    <!-- Place Actor Modal -->
    <PlaceActorModal
      v-model="showPlaceActorModal"
      :actors="project.globalData.actors"
      :placed-actor-ids="currentScene.actorPlacements.map(p => p.actorId)"
      @place-actor="placeActorInScene"
    />

    <!-- Add to Inventory Modal -->
    <AddToInventoryModal
      v-model="showAddToInventoryModal"
      :items="project.globalData.items"
      :inventory="project.globalData.inventory"
      :get-item-icon-style="getItemIconStyle"
      :item-has-asset-icon="itemHasAssetIcon"
      @toggle-item="toggleInventoryItem"
    />

    <!-- Asset Manager Modal -->
    <AssetManagerModal
      v-model:show="showAssetManagerModal"
      :assets="project.globalData.assets"
      :folders="project.globalData.assetFolders"
      :folder-tree="assetFolderTree"
      :selected-folder="selectedAssetFolder"
      :filter-category="assetFilterCategory"
      :search-query="assetSearchQuery"
      :upload-category="selectedAssetCategory"
      :is-uploading="isUploading"
      :upload-progress="uploadProgress"
      :categories="ASSET_CATEGORIES.image"
      :category-labels="categoryLabels.image"
      :get-asset-url="getAssetDisplayUrl"
      :show-subfolders="showSubfolderContents"
      @update:selected-folder="selectAssetFolder"
      @update:filter-category="assetFilterCategory = $event"
      @update:search-query="assetSearchQuery = $event"
      @update:upload-category="selectedAssetCategory = $event"
      @update:show-subfolders="showSubfolderContents = $event"
      @create-folder="createAssetFolder"
      @rename-folder="renameAssetFolder"
      @delete-folder="deleteAssetFolder"
      @upload-files="handleAssetUploadFiles"
      @delete-asset="deleteAsset"
      @move-asset="moveAssetToFolder"
    />

    <!-- Audio Manager Modal -->
    <AudioManagerModal
      v-model:show="showAudioManagerModal"
      :audio-assets="project.globalData.audioAssets"
      :currently-playing-id="currentlyPlayingAudio?.id"
      @upload-files="handleAudioUploadFiles"
      @delete-audio="deleteAudioAsset"
      @play-audio="playAudioPreview"
      @stop-audio="stopAudioPreview"
      @update-audio="updateAudioAssetField"
    />

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
