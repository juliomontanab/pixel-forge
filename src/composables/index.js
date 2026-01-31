/**
 * Composables de Pixel-Forge
 *
 * Exporta todos los composables disponibles para uso en la aplicación.
 *
 * @example
 * import {
 *   useUndoRedo,
 *   useKeyboardShortcuts,
 *   useElementSelection
 * } from '@/composables'
 */

// API composables
export { useClaudeSocket } from './useClaudeSocket'
export { useProjectApi } from './useProjectApi'
export { useAssetApi } from './useAssetApi'

// Editor core composables (Phase 1 refactoring)
export { useUndoRedo } from './useUndoRedo'
export { useKeyboardShortcuts, createEditorShortcuts } from './useKeyboardShortcuts'
export { useElementSelection } from './useElementSelection'
export { useElementCRUD } from './useElementCRUD'
export { useElementFactory, createDefaultElement, getElementTargetArray, ELEMENT_TARGETS } from './useElementFactory'
export { useCanvasZoom } from './useCanvasZoom'
export { usePanelState } from './usePanelState'
export {
  useSceneEditor,
  ensureSceneStructure,
  ensureGlobalDataStructure,
  createEmptyScene,
  createEmptyProject,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_VERBS
} from './useSceneEditor'

// Visual effects composables
export { useParticleSystem, particlePresets, parseColor } from './useParticleSystem'
export { useLighting, lightTypes } from './useLighting'
export { useAudioPlayback } from './useAudioPlayback'

// Play mode composables
export { usePlayMode } from './usePlayMode'
export { useCutsceneEngine } from './useCutsceneEngine'

// UI composables
export { useContextMenu } from './useContextMenu'
export { useWalkboxResize } from './useWalkboxResize'
export { useSceneManagement } from './useSceneManagement'
export { useGlobalActors, DEFAULT_ACTOR_ANIMATIONS } from './useGlobalActors'
export { usePuzzleHelpers } from './usePuzzleHelpers'
export { useInteractionSystem, INTERACTION_ACTIONS, CONDITION_OPERATORS } from './useInteractionSystem'

// Asset and Animation composables
export { useAnimations, ACTOR_ANIMATION_STATES } from './useAnimations'
export { useAssetManager } from './useAssetManager'

// Storage and persistence composables
export { useLocalStorage } from './useLocalStorage'
export { useAiPanel } from './useAiPanel'

// Visual composables
export { useParallax } from './useParallax'
export { useBackgroundScaling } from './useBackgroundScaling'

// UI Helper composables
export { useAudioUI } from './useAudioUI'
export { useCutsceneActions, ACTION_TYPES } from './useCutsceneActions'
export { useItemUI } from './useItemUI'
export { useDialogEditor } from './useDialogEditor'
export { useAssetUI, CATEGORY_LABELS } from './useAssetUI'

// Export composables
export { useExportPFG } from './useExportPFG'
