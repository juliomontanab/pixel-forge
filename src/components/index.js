/**
 * Components Index
 *
 * Central export point for all reusable components.
 *
 * @example
 * import { PixelButton, PixelInput, EditorHeader } from '@/components'
 */

// Common Components
export { default as PixelButton } from './common/PixelButton.vue'
export { default as PixelInput } from './common/PixelInput.vue'
export { default as PixelModal } from './common/PixelModal.vue'
export { default as ConfirmModal } from './common/ConfirmModal.vue'
export { default as ListSelectModal } from './common/ListSelectModal.vue'
export { default as PromptModal } from './common/PromptModal.vue'
export { default as ContextMenu } from './common/ContextMenu.vue'
export { default as BackgroundScaleModal } from './common/BackgroundScaleModal.vue'

// Modal Components
export { default as AssetManagerModal } from './modals/AssetManagerModal.vue'
export { default as AudioManagerModal } from './modals/AudioManagerModal.vue'
export { default as SpritesheetEditorModal } from './modals/SpritesheetEditorModal.vue'
export { default as AiAssistantModal } from './modals/AiAssistantModal.vue'

// Editor Components
export { default as EditorHeader } from './editor/EditorHeader.vue'
export { default as EditorStatusBar } from './editor/EditorStatusBar.vue'
export { default as PlayModeOverlay } from './editor/PlayModeOverlay.vue'
export { default as SceneActionsBar } from './editor/SceneActionsBar.vue'

// Panel Components
export { default as LeftPanel } from './panels/LeftPanel.vue'
export { default as PropertiesPanel } from './panels/PropertiesPanel.vue'
export { default as SceneTabs } from './panels/SceneTabs.vue'
export { default as ElementList } from './panels/ElementList.vue'
export { default as ElementSection } from './panels/ElementSection.vue'
export { default as ActorPlacementsSection } from './panels/ActorPlacementsSection.vue'
export { default as AnimationsSection } from './panels/AnimationsSection.vue'
export { default as LightsSection } from './panels/LightsSection.vue'
export { default as AssetsSection } from './panels/AssetsSection.vue'
export { default as AudioAssetsSection } from './panels/AudioAssetsSection.vue'
export { default as GlobalActorsSection } from './panels/GlobalActorsSection.vue'
export { default as ItemsSection } from './panels/ItemsSection.vue'
export { default as InventorySection } from './panels/InventorySection.vue'
export { default as VerbsSection } from './panels/VerbsSection.vue'

// Property Components
export { default as PropertyField } from './properties/PropertyField.vue'
export { default as PropertyGroup } from './properties/PropertyGroup.vue'
export { default as PuzzleProperties } from './properties/PuzzleProperties.vue'
export { default as CutsceneProperties } from './properties/CutsceneProperties.vue'
export { default as LightProperties } from './properties/LightProperties.vue'
export { default as ParticleProperties } from './properties/ParticleProperties.vue'
export { default as ItemProperties } from './properties/ItemProperties.vue'
export { default as DialogProperties } from './properties/DialogProperties.vue'
export { default as AudioProperties } from './properties/AudioProperties.vue'
export { default as InteractionsPanel } from './properties/InteractionsPanel.vue'
export { default as ImageProperties } from './properties/ImageProperties.vue'

// Canvas Components
export { default as EditorCanvas } from './canvas/EditorCanvas.vue'
export { default as CanvasElement } from './canvas/CanvasElement.vue'
export { default as CanvasGrid } from './canvas/CanvasGrid.vue'
export { default as CanvasWalkbox } from './canvas/CanvasWalkbox.vue'
export { default as CanvasParticles } from './canvas/CanvasParticles.vue'
export { default as CanvasLighting } from './canvas/CanvasLighting.vue'
export { default as ZoomControls } from './canvas/ZoomControls.vue'
