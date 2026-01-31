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
import { useParticleSystem, particlePresets } from '@/composables/useParticleSystem'
import { useLighting, lightTypes } from '@/composables/useLighting'
import { useAudioPlayback } from '@/composables/useAudioPlayback'
import { useElementCRUD } from '@/composables/useElementCRUD'
import { createDefaultElement as createElementWithDefaults, getElementTargetArray } from '@/composables/useElementFactory'
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
import { DEFAULT_VERBS, ensureSceneStructure, ensureGlobalDataStructure } from '@/composables/useSceneEditor'

// Refactored components
import {
  BackgroundScaleModal,
  AssetManagerModal,
  AudioManagerModal,
  SpritesheetEditorModal,
  CanvasGrid,
  CanvasWalkbox,
  CanvasElement,
  EditorStatusBar,
  PlayModeOverlay,
  SceneTabs,
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
  BaseElementProperties,
  MultiSelectionPanel,
  CanvasElements,
  CanvasPlayModePlayer,
  CanvasBackground
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
    verbs: JSON.parse(JSON.stringify(DEFAULT_VERBS))
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

// Computed: Global actors (used by useAnimations and GlobalActorsSection)
const globalActors = computed(() => project.value.globalData?.actors || [])

// =====================
// UNDO/REDO SYSTEM (via useUndoRedo composable)
// =====================
const {
  saveToHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  initHistory,
  cleanup: cleanupUndoRedo,
  isUndoRedoAction,
  historyStack,
  historyIndex
} = useUndoRedo(currentScene, {
  maxHistory: 50,
  debounceMs: 500,
  onUndo: () => { selectedElements.value = [] },
  onRedo: () => { selectedElements.value = [] }
})

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
  initHistory()
})

// Mounted state for cleanup
let isMounted = true
let autoSaveTimeout = null
let historyTimeout = null
const AUTO_SAVE_DEBOUNCE = 3000 // 3 seconds
const HISTORY_DEBOUNCE = 500 // 500ms for history save

// Watch for scene changes - debounced history save and auto-save to MongoDB
watch(currentScene, () => {
  if (isUndoRedoAction.value || !isMounted) return

  // Debounce history save (500ms)
  clearTimeout(historyTimeout)
  historyTimeout = setTimeout(() => {
    if (isMounted) {
      saveToHistory()
    }
  }, HISTORY_DEBOUNCE)

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
// Late-binding reference for startCutscene (initialized after useCutsceneEngine)
let startCutsceneRef = null

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
  findObjectAtPoint,
  // New interaction handlers
  useItemWith,
  executeItemUsage,
  checkPuzzleConditions,
  attemptPuzzle,
  solvePuzzle,
  onPlayModeClick,
  handleObjectInteraction,
  executeInteractionAction,
  getPlayerCurrentAnimation,
  getPlayerAnimationStyle
} = usePlayMode({
  currentScene,
  project,
  selectedElements,
  getAudioAssetById,
  switchScene: (sceneId) => switchScene(sceneId),
  getSceneCoords,
  // Late-binding wrapper for startCutscene
  startCutscene: (cutscene) => startCutsceneRef?.(cutscene),
  // Animation helpers
  getAnimationIdFromAssignment,
  isAnimationMirrored,
  getAnimationSpritesheetUrl,
  getAnimationSpritesheetSize,
  globalAnimations,
  actorPreviewFrames
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

// Assign late-binding reference for usePlayMode interaction handlers
startCutsceneRef = startCutscene

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

// Computed properties for PlayModeOverlay component
const inventoryItemsWithUrls = computed(() => {
  return getInventoryItems.value.map(item => ({
    ...item,
    iconUrl: item.iconAssetId && getAssetById(item.iconAssetId)
      ? getAssetDisplayUrl(getAssetById(item.iconAssetId))
      : null
  }))
})

const currentMusicName = computed(() => {
  if (!playModeState.value.currentMusic?.audioAssetId) return null
  return getAudioAssetById(playModeState.value.currentMusic.audioAssetId)?.name || 'Playing'
})

// Handler functions for PlayModeOverlay events
const handleCancelItem = () => {
  playModeState.value.selectedItem = null
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

// Handler for BackgroundScaleModal confirm
const handleBackgroundScaleConfirm = (mode) => {
  backgroundScaleMode.value = mode
  scaleBackgroundToCanvas()
}

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
// NOTE: Play mode interaction logic is now in usePlayMode composable.
// Functions available: useItemWith, executeItemUsage, checkPuzzleConditions,
// attemptPuzzle, solvePuzzle, onPlayModeClick, handleObjectInteraction,
// executeInteractionAction, getPlayerCurrentAnimation, getPlayerAnimationStyle

// Particle and lighting functions from composables:
// - activeParticles, getParticleStyle, updateParticles, startResizeParticle from useParticleSystem
// - getLightPreviewStyle, getLightingGradient, getLightIcon from useLighting

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

// Element sections configuration for data-driven rendering (grouped by position in panel)
// Group 1: Spatial elements before ActorPlacements
const SPATIAL_SECTIONS_1 = [
  { type: 'image', typePlural: 'images', icon: '🖼', label: 'Images', colorClass: 'text-image', showVisibility: true, badgeField: 'interactive', badgeIcon: '⚡' },
  { type: 'walkbox', typePlural: 'walkboxes', icon: '▢', label: 'Walkboxes', colorClass: 'text-walkbox', showVisibility: true, getItemName: (item) => `Walkbox ${item.id}` },
  { type: 'exit', typePlural: 'exits', icon: '→', label: 'Exits', colorClass: 'text-exit', showVisibility: true }
]
// Group 2: Spatial elements after ActorPlacements
const SPATIAL_SECTIONS_2 = [
  { type: 'hotspot', typePlural: 'hotspots', icon: '◎', label: 'Hotspots', colorClass: 'text-hotspot', showVisibility: true },
  { type: 'zplane', typePlural: 'zplanes', icon: '▤', label: 'Z-Planes', colorClass: 'text-zplane', showVisibility: true }
]
// Group 3: Data elements (no visibility toggle)
const DATA_SECTIONS = [
  { type: 'dialog', typePlural: 'dialogs', icon: '💬', label: 'Dialogs', colorClass: 'text-dialog', showVisibility: false },
  { type: 'puzzle', typePlural: 'puzzles', icon: '🧩', label: 'Puzzles', colorClass: 'text-puzzle', showVisibility: false },
  { type: 'sfx', typePlural: 'sfx', icon: '🔊', label: 'SFX', colorClass: 'text-sfx', showVisibility: false },
  { type: 'music', typePlural: 'music', icon: '🎵', label: 'Music', colorClass: 'text-music', showVisibility: false },
  { type: 'cutscene', typePlural: 'cutscenes', icon: '🎬', label: 'Cutscenes', colorClass: 'text-cutscene', showVisibility: false, badgeField: 'actions', badgeCount: true }
]
// Group 4: Particle section (after Lights)
const PARTICLE_SECTION = { type: 'particle', typePlural: 'particles', icon: '✨', label: 'Particles', colorClass: 'text-particle', showVisibility: true, showSelectAll: false, badgeField: 'preset' }

// Get items array for element type
const getElementItems = (typePlural) => {
  return currentScene.value[typePlural] || []
}

// Get item badge for element
const getElementBadge = (config, item) => {
  if (!config.badgeField) return null
  if (config.badgeCount && item[config.badgeField]?.length > 0) {
    return item[config.badgeField].length
  }
  if (config.badgeIcon && item[config.badgeField]) {
    return config.badgeIcon
  }
  if (item[config.badgeField]) {
    return item[config.badgeField]
  }
  return null
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
    // Deep clone to avoid mutating the constant
    project.value.globalData.verbs = JSON.parse(JSON.stringify(DEFAULT_VERBS))
    console.log('[Editor] Verbos reseteados a valores por defecto')
  }
}

const handleAddElement = (type) => {
  // Create element with factory defaults
  const newElement = createElementWithDefaults(type, DEFAULT_WIDTH, DEFAULT_HEIGHT)

  // Get target array and push element
  const targetArray = getElementTargetArray(type, currentScene.value, project.value)
  if (targetArray) {
    targetArray.push(newElement)
  } else {
    console.warn(`[Editor] Unknown element type: ${type}`)
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
// Generic delete handler for special element types (lights, particles)
const deleteSelectedOfType = (type, getArray, onDelete) => {
  if (selectedElements.value.length === 0 || selectedElements.value[0].type !== type) return
  const id = selectedElements.value[0].element.id
  const array = getArray()
  const idx = array.findIndex(el => el.id === id)
  if (idx > -1) {
    array.splice(idx, 1)
    onDelete?.(id)
    selectedElements.value = []
  }
}

const deleteSelectedLight = () => deleteSelectedOfType(
  'light',
  () => currentScene.value.lighting.lights
)

const deleteSelectedParticle = () => deleteSelectedOfType(
  'particle',
  () => currentScene.value.particles,
  (id) => delete activeParticles.value[id]
)

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

  // Cleanup useUndoRedo composable
  cleanupUndoRedo()

  // Clear history save timeout
  if (historyTimeout) {
    clearTimeout(historyTimeout)
    historyTimeout = null
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

  // Remove remaining event listeners
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
          <!-- Spatial Sections Group 1: Images, Walkboxes, Exits -->
          <template v-for="config in SPATIAL_SECTIONS_1" :key="config.type">
            <ElementSection
              :type="config.type"
              :type-plural="config.typePlural"
              :icon="config.icon"
              :label="config.label"
              :items="getElementItems(config.typePlural)"
              :collapsed="collapsedSections[config.typePlural]"
              :visible="visibleTypes[config.typePlural]"
              :selected-elements="selectedElements"
              :color-class="config.colorClass"
              :get-item-name="config.getItemName || null"
              @toggle-collapse="toggleSection(config.typePlural)"
              @toggle-visibility="toggleVisibility"
              @add="handleAddElement"
              @select="handleSelectElement"
              @select-all="selectAllOfType"
            >
              <template #item-badges="{ item }">
                <span v-if="getElementBadge(config, item)" class="item-badge" :class="{ interactive: config.badgeIcon === '⚡' }">
                  {{ getElementBadge(config, item) }}
                </span>
              </template>
            </ElementSection>
          </template>

          <!-- Actor Placements Section (special) -->
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

          <!-- Spatial Sections Group 2: Hotspots, Z-Planes -->
          <template v-for="config in SPATIAL_SECTIONS_2" :key="config.type">
            <ElementSection
              :type="config.type"
              :type-plural="config.typePlural"
              :icon="config.icon"
              :label="config.label"
              :items="getElementItems(config.typePlural)"
              :collapsed="collapsedSections[config.typePlural]"
              :visible="visibleTypes[config.typePlural]"
              :selected-elements="selectedElements"
              :color-class="config.colorClass"
              @toggle-collapse="toggleSection(config.typePlural)"
              @toggle-visibility="toggleVisibility"
              @add="handleAddElement"
              @select="handleSelectElement"
              @select-all="selectAllOfType"
            />
          </template>

          <!-- Data Elements Divider -->
          <div class="section-divider">
            <span class="divider-text">DATA ELEMENTS</span>
          </div>

          <!-- Data Sections: Dialogs, Puzzles, SFX, Music, Cutscenes -->
          <template v-for="config in DATA_SECTIONS" :key="config.type">
            <ElementSection
              :type="config.type"
              :type-plural="config.typePlural"
              :icon="config.icon"
              :label="config.label"
              :items="getElementItems(config.typePlural)"
              :collapsed="collapsedSections[config.typePlural]"
              :selected-elements="selectedElements"
              :color-class="config.colorClass"
              :show-visibility="false"
              @toggle-collapse="toggleSection(config.typePlural)"
              @add="handleAddElement"
              @select="handleSelectElement"
              @select-all="selectAllOfType"
            >
              <template #item-badges="{ item }">
                <span v-if="getElementBadge(config, item)" class="item-badge">
                  {{ getElementBadge(config, item) }}
                </span>
              </template>
            </ElementSection>
          </template>

          <!-- Animations Section (special) -->
          <AnimationsSection
            :animations="globalAnimations"
            :collapsed="collapsedSections.animations"
            :selected-elements="selectedElements"
            :get-animation-usage="getAnimationUsage"
            @toggle-collapse="toggleSection('animations')"
            @add="openSpritesheetEditor()"
            @select="handleSelectElement"
          />

          <!-- Lights Section (special) -->
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
            :type="PARTICLE_SECTION.type"
            :type-plural="PARTICLE_SECTION.typePlural"
            :icon="PARTICLE_SECTION.icon"
            :label="PARTICLE_SECTION.label"
            :items="getElementItems(PARTICLE_SECTION.typePlural)"
            :collapsed="collapsedSections[PARTICLE_SECTION.typePlural]"
            :visible="visibleTypes[PARTICLE_SECTION.typePlural]"
            :selected-elements="selectedElements"
            :color-class="PARTICLE_SECTION.colorClass"
            :show-select-all="false"
            :get-item-icon="(item) => getParticleIcon(item.preset)"
            @toggle-collapse="toggleSection(PARTICLE_SECTION.typePlural)"
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
            <CanvasBackground
              :background-asset-id="currentScene.background"
              :get-asset-by-id="getAssetById"
              :get-asset-display-url="getAssetDisplayUrl"
            />

            <!-- Grid overlay -->
            <CanvasGrid
              v-if="showGrid"
              :width="currentScene.width"
              :height="currentScene.height"
              :zoom="zoom"
            />

            <!-- Elements overlay -->
            <div class="elements-overlay">
              <!-- Walkboxes (SVG component) -->
              <CanvasWalkbox
                v-if="visibleTypes.walkboxes && !playMode"
                :walkboxes="currentScene.walkboxes"
                :zoom="zoom"
                :selected-elements="selectedElements"
                :scene-width="currentScene.width"
                :scene-height="currentScene.height"
                @select="(wb, event) => handleSelectElement('walkbox', wb, event)"
                @add-vertex="(wb, idx, event) => addWalkboxVertex(wb, idx, event)"
                @start-vertex-drag="(event, wb, idx) => startVertexDrag(event, wb, idx)"
                @remove-vertex="(wb, idx) => removeWalkboxVertex(wb, idx)"
                @start-rotate="(event, wb) => startWalkboxRotate(event, wb)"
              />

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

              <!-- Play Mode Player Elements -->
              <CanvasPlayModePlayer
                v-if="playMode"
                :play-mode-state="playModeState"
                :zoom="zoom"
                :player-animation="getPlayerCurrentAnimation()"
                :player-animation-style="getPlayerAnimationStyle()"
              />
            </div>
          </div>
        </div>

        <!-- Play Mode UI Overlay -->
        <PlayModeOverlay
          v-if="playMode"
          :play-mode-state="playModeState"
          :verbs="project.globalData.verbs"
          :inventory-items="inventoryItemsWithUrls"
          :current-music-name="currentMusicName"
          @exit="exitPlayMode"
          @skip-cutscene="skipCutscene"
          @advance-dialog="advanceDialog"
          @select-verb="selectVerb"
          @select-item="selectInventoryItem"
          @cancel-item="handleCancelItem"
        />

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
          <MultiSelectionPanel
            v-else-if="selectedElements.length > 1"
            :selected-elements="selectedElements"
            @delete="handleDeleteElement"
          />

          <!-- Single element selected -->
          <div v-else class="properties-form">
            <!-- Base properties: header, ID, name, position, size, rotation -->
            <BaseElementProperties
              :element="selectedElements[0].element"
              :type="selectedElements[0].type"
              @delete="handleDeleteElement"
            />

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
    <EditorStatusBar
      :scene-name="currentScene.name"
      :scene-width="currentScene.width"
      :scene-height="currentScene.height"
      :selected-element="selectedElements.length > 0 ? selectedElements[0].element : null"
      :selected-type="selectedElements.length > 0 ? selectedElements[0].type : null"
      :selected-count="selectedElements.length"
      :is-dragging="isDragging"
      :is-resizing="isResizing"
      :is-rotating="isRotating"
      :history-index="historyIndex"
      :history-length="historyStack.length"
      :zoom="zoom"
    />

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
  <BackgroundScaleModal
    v-model:show="showBackgroundScaleModal"
    :image-width="currentBackgroundAsset?.width || 0"
    :image-height="currentBackgroundAsset?.height || 0"
    :canvas-width="currentScene.width"
    :canvas-height="currentScene.height"
    :is-processing="isScalingBackground"
    @close="showBackgroundScaleModal = false"
    @confirm="handleBackgroundScaleConfirm"
  />
</template>

<style>
@import '@/assets/styles/editor-view.css';
</style>
