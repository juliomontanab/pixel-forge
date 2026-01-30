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
import { useAnimations, ACTOR_ANIMATION_STATES } from '@/composables/useAnimations'
import { useAssetManager } from '@/composables/useAssetManager'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { useAiPanel } from '@/composables/useAiPanel'
import { useParallax } from '@/composables/useParallax'
import { useBackgroundScaling } from '@/composables/useBackgroundScaling'
import { useAudioUI } from '@/composables/useAudioUI'
import { useCutsceneActions } from '@/composables/useCutsceneActions'
import { useItemUI } from '@/composables/useItemUI'
import { useDialogEditor } from '@/composables/useDialogEditor'
import { useAssetUI, CATEGORY_LABELS } from '@/composables/useAssetUI'

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
  VerbProperties,
  CanvasElements
} from '@/components'

const { getProjectById, saveProject: saveProjectToApi } = useProjectApi()
const { uploadAsset: uploadAssetToS3, getAssetUrl, getAssetUrls, deleteAsset: deleteAssetFromS3, isUploading, uploadProgress, ASSET_CATEGORIES } = useAssetApi()

// Initialize Claude socket for AI integration
const {
  connect: claudeConnect,
  disconnect: claudeDisconnect,
  generateProject: claudeGenerateProject,
  isConnected: claudeIsConnected,
  isRegistered: claudeIsRegistered,
  isGenerating: claudeIsGenerating,
  lastError: claudeLastError
} = useClaudeSocket()

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

// Computed: Global data shortcuts (globalAssets, globalAssetFolders, globalAudioAssets come from useAssetManager)
// (globalAnimations comes from useAnimations)
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

// Auto-save project to MongoDB (defined early for composable dependencies)
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

// =====================
// ASSET MANAGER COMPOSABLE
// =====================
const {
  assetUrlCache,
  selectedAssetCategory,
  selectedAssetFolder,
  includeSubfolders: showSubfolderContents,
  showAssetManagerModal,
  showAudioManagerModal,
  globalAssets,
  globalAssetFolders,
  globalAudioAssets,
  filteredAssets,
  getAssetById,
  getAssetDisplayUrl,
  loadAssetUrls,
  handleAssetUpload,
  deleteAsset,
  buildFolderTree: assetFolderTree,
  createFolder: createAssetFolder,
  renameFolder: renameAssetFolder,
  deleteFolder: deleteAssetFolder,
  moveAssetToFolder,
  selectFolder: selectAssetFolder,
  openAssetManager,
  closeAssetManager
} = useAssetManager({
  project,
  uploadAssetToS3,
  getAssetUrl,
  getAssetUrls,
  deleteAssetFromS3,
  currentUserId,
  autoSaveProject
})

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

// Initialize animations composable
const {
  spritesheetEditorOpen,
  actorPreviewFrames,
  globalAnimations,
  actorAnimationStates,
  openSpritesheetEditor,
  closeSpritesheetEditor,
  deleteAnimation,
  saveAnimation: handleSaveAnimation,
  updateAnimation: handleUpdateAnimation,
  assignAnimationToActor: handleAssignAnimation,
  getAnimationById,
  getAnimationSpritesheetUrl,
  getAnimationSpritesheetSize,
  getAnimationIdFromAssignment,
  isAnimationMirrored,
  getAnimationUsage,
  getActorCurrentAnimation,
  getActorAnimationStyle,
  getActorPlacementAnimation,
  getActorPlacementAnimationStyle,
  advancePreviewFrame,
  resetPreviewFrame
} = useAnimations({
  project,
  currentScene,
  globalActors,
  getAssetById,
  getAssetDisplayUrl,
  getGlobalActorById,
  autoSaveProject
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

// Initialize localStorage composable
const {
  lastSaved,
  autoSaveEnabled,
  saveStatus,
  formatLastSaved,
  saveProjectToStorage,
  loadProjectFromStorage,
  getSavedProjects,
  deleteProjectFromStorage,
  createNewProject,
  handleSave,
  openSceneMap,
  handleExport,
  handleImport,
  cleanupSceneGroups,
  setupAutoSaveWatcher,
  clearLocalStorageTimeout,
  cleanupLocalStorage
} = useLocalStorage({
  project,
  selectedElements,
  normalizeInteractiveElements,
  ensureGlobalDataStructure,
  ensureSceneStructure,
  loadAssetUrls,
  autoSaveProject,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  router
})

// Initialize parallax composable
const {
  cameraPosition,
  parallaxScrollOffsets,
  ensureParallaxDefaults,
  getParallaxOffset,
  getParallaxImageStyle,
  updateParallaxAutoScroll,
  updateCameraForPlayer,
  updateParallaxInLoop,
  resetParallax
} = useParallax({
  currentScene,
  playMode,
  playModeState,
  zoom,
  getAssetById,
  getAssetDisplayUrl
})

// Initialize background scaling composable
const {
  showBackgroundScaleModal,
  backgroundScaleMode,
  isScalingBackground,
  backgroundNeedsScaling,
  currentBackgroundAsset,
  scaleBackgroundToCanvas,
  openBackgroundScaleModal,
  closeBackgroundScaleModal
} = useBackgroundScaling({
  project,
  currentScene,
  projectId,
  currentUserId,
  assetUrlCache,
  getAssetById,
  getAssetDisplayUrl,
  getAssetUrl,
  uploadAssetToS3,
  autoSaveProject
})

// Initialize AI panel composable
const {
  aiPanelOpen,
  aiScript,
  aiStatus,
  aiStatusMessage,
  sampleScript,
  openAiPanel,
  closeAiPanel,
  loadSampleScript,
  handleAiGenerate,
  loadGeneratedProject,
  cleanupAiPanel
} = useAiPanel({
  project,
  currentScene,
  selectedElements,
  projectId,
  claudeConnect,
  claudeDisconnect,
  claudeGenerateProject,
  claudeIsConnected,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  deepClone,
  history: historyStack,
  historyIndex,
  saveStatus
})

// Initialize audio UI composable
const {
  audioUploadDragging,
  currentlyPlayingAudio,
  handleAudioUpload,
  onAudioFileChange,
  onAudioDragOver,
  onAudioDragLeave,
  onAudioDrop,
  handleAudioUploadFiles,
  updateAudioAssetField,
  deleteAudioAsset,
  playAudioPreview,
  stopAudioPreview,
  formatDuration,
  cleanup: cleanupAudio
} = useAudioUI({
  project,
  autoSaveProject
})

// Initialize cutscene actions composable
const {
  getDefaultParams,
  addAction,
  removeAction,
  moveAction
} = useCutsceneActions({
  selectedElements
})

// Initialize item UI composable
const {
  showAddToInventoryModal,
  getItemById,
  getItemIconStyle,
  itemHasAssetIcon,
  addToInventory,
  removeFromInventory,
  toggleInventoryItem
} = useItemUI({
  project,
  getAssetById,
  getAssetDisplayUrl
})

// Initialize dialog editor composable
const {
  getActorById,
  hasActorAnimation,
  getDialogActorPreviewStyle,
  addDialogLine,
  removeDialogLine,
  addDialogChoice,
  removeDialogChoice
} = useDialogEditor({
  project,
  getActorCurrentAnimation,
  getAnimationSpritesheetUrl,
  getAnimationSpritesheetSize,
  actorPreviewFrames
})

// Initialize asset UI composable
const {
  assetUploadDragging,
  assetFilterCategory,
  assetSearchQuery,
  showNewFolderInput,
  newFolderName,
  renamingFolderId,
  renamingFolderValue,
  assetCountByCategory,
  getSubfolders,
  getFolderAssetCount,
  startRenamingFolder,
  cancelRenamingFolder,
  onAssetFileChange,
  onAssetDragOver,
  onAssetDragLeave,
  onAssetDrop,
  handleAssetUploadFiles,
  handleAssetDragStart,
  handleFolderDrop,
  categoryLabels
} = useAssetUI({
  globalAssets,
  globalAssetFolders,
  handleAssetUpload,
  moveAssetToFolder
})

// Modal for placing actors
const showPlaceActorModal = ref(false)

// Setup auto-save watcher for localStorage
setupAutoSaveWatcher()

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

// DRAG & DROP, RESIZE, and ROTATION systems are provided by useElementSelection composable
// (see initialization near line 700)

// =====================
// LIGHT & PARTICLE MANAGEMENT
// =====================
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

  // Cleanup localStorage composable (clears timeout and final save)
  cleanupLocalStorage()

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

  // Disconnect Claude WebSocket (AI Panel cleanup)
  cleanupAiPanel()
})
</script>

<template>
  <div class="editor-view">
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

              <!-- Canvas Elements (Exits, Actors, Hotspots, Images, Z-Planes, Particles, Lights) -->
              <CanvasElements
                :scene="currentScene"
                :zoom="zoom"
                :play-mode="playMode"
                :visible-types="visibleTypes"
                :selected-elements="selectedElements"
                :is-dragging="isDragging"
                :drag-state="dragState"
                :active-particles="activeParticles"
                :get-asset-by-id="getAssetById"
                :get-asset-display-url="getAssetDisplayUrl"
                :get-global-actor-by-id="getGlobalActorById"
                :get-actor-placement-animation="getActorPlacementAnimation"
                :get-actor-placement-animation-style="getActorPlacementAnimationStyle"
                :get-parallax-image-style="getParallaxImageStyle"
                :is-element-in-group="isElementInGroup"
                :get-element-group="getElementGroup"
                :get-particle-icon="getParticleIcon"
                :get-particle-style="getParticleStyle"
                :get-light-icon="getLightIcon"
                :get-light-preview-style="getLightPreviewStyle"
                @select-element="({ type, element, event }) => handleSelectElement(type, element, event)"
                @context-menu="({ event, type, element }) => showElementContextMenu(event, type, element)"
                @start-resize="({ event, element, handle }) => startResize(event, element, handle)"
                @start-rotate="({ event, element }) => startRotate(event, element)"
                @start-resize-particle="({ event, emitter, handle }) => startResizeParticle(event, emitter, handle)"
              />



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

<style>
@import '@/assets/styles/editor-view.css';
</style>
