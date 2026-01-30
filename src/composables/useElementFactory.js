/**
 * useElementFactory.js
 *
 * Factory pattern for creating scene elements with defaults.
 * Centralizes element creation logic from EditorView.vue.
 */

import { particlePresets } from './useParticleSystem'

/**
 * Default dimensions for new elements
 */
export const DEFAULT_ELEMENT_SIZE = {
  width: 200,
  height: 200
}

/**
 * Element type to target path mapping
 * 'scene' = currentScene.value[key]
 * 'global' = project.value.globalData[key]
 */
export const ELEMENT_TARGETS = {
  image: { scope: 'scene', key: 'images' },
  walkbox: { scope: 'scene', key: 'walkboxes' },
  exit: { scope: 'scene', key: 'exits' },
  actor: { scope: 'scene', key: 'actors' },
  hotspot: { scope: 'scene', key: 'hotspots' },
  zplane: { scope: 'scene', key: 'zplanes' },
  dialog: { scope: 'scene', key: 'dialogs' },
  puzzle: { scope: 'scene', key: 'puzzles' },
  sfx: { scope: 'scene', key: 'sfx' },
  music: { scope: 'scene', key: 'music' },
  cutscene: { scope: 'scene', key: 'cutscenes' },
  verb: { scope: 'global', key: 'verbs' },
  item: { scope: 'global', key: 'items' },
  light: { scope: 'scene', key: 'lighting.lights', nested: true },
  particle: { scope: 'scene', key: 'particles' }
}

/**
 * Create type-specific default properties
 * @param {string} type - Element type
 * @param {number} sceneWidth - Scene width for positioning
 * @param {number} sceneHeight - Scene height for positioning
 * @returns {Object} Element defaults for the type
 */
export function getTypeDefaults(type, sceneWidth, sceneHeight) {
  const centerX = sceneWidth / 2
  const centerY = sceneHeight / 2

  const typeDefaults = {
    image: {
      src: null,
      assetId: null,
      zOrder: 0,
      interactive: false,
      pickable: false,
      description: '',
      interactions: [],
      folderPath: '/',
      parallax: {
        enabled: false,
        depth: 1.0,
        repeatX: false,
        repeatY: false,
        autoScrollX: 0,
        autoScrollY: 0
      }
    },

    walkbox: {
      // Walkbox doesn't use standard x,y,w,h - uses points array
      _skipBaseProps: true,
      points: [
        { x: centerX - 200, y: sceneHeight - 300 },
        { x: centerX + 200, y: sceneHeight - 300 },
        { x: centerX + 200, y: sceneHeight - 100 },
        { x: centerX - 200, y: sceneHeight - 100 }
      ],
      rotation: 0,
      mask: 0
    },

    exit: {
      targetScene: ''
    },

    actor: {
      costume: null,
      direction: 'south',
      animations: {
        idle: null,
        'walk-north': null,
        'walk-south': null,
        'walk-east': null,
        'walk-west': null,
        talk: null
      },
      currentState: 'idle'
    },

    hotspot: {
      description: '',
      interactions: [],
      folderPath: '/'
    },

    zplane: {
      maskImage: null,
      zIndex: 1
    },

    dialog: {
      _skipBaseProps: true,
      actor: null,
      lines: [
        { id: 1, speaker: 'Player', text: 'Hello!' },
        { id: 2, speaker: 'NPC', text: 'Hi there!' }
      ],
      choices: []
    },

    puzzle: {
      _skipBaseProps: true,
      description: '',
      type: 'item-combination',
      conditions: {
        items: [],
        useItem: null,
        targetObject: null,
        targetActor: null,
        sequence: [],
        dialogId: null,
        correctChoices: []
      },
      result: {
        type: 'none',
        giveItem: null,
        removeItems: [],
        unlockExit: null,
        playCutscene: null,
        changeState: null,
        showDialog: null
      },
      solved: false,
      hints: []
    },

    verb: {
      _skipBaseProps: true,
      icon: '?',
      key: ''
    },

    sfx: {
      _skipBaseProps: true,
      file: null,
      audioAssetId: null,
      volume: 100,
      loop: false,
      trigger: 'manual'
    },

    music: {
      _skipBaseProps: true,
      file: null,
      audioAssetId: null,
      volume: 80,
      loop: true,
      fadeIn: 0,
      fadeOut: 0
    },

    cutscene: {
      _skipBaseProps: true,
      trigger: 'manual',
      triggerTarget: null,
      skippable: true,
      actions: []
    },

    item: {
      _skipBaseProps: true,
      description: 'A useful item',
      icon: '?',
      iconAssetId: null,
      image: null,
      combinable: true,
      useWith: [],
      pickupDialog: null,
      examineDialog: null
    },

    light: {
      _skipBaseProps: true,
      type: 'point',
      x: centerX,
      y: centerY,
      color: '#ffcc00',
      intensity: 1.0,
      radius: 300,
      angle: 45,
      direction: 180,
      falloff: 'smooth',
      enabled: true,
      castShadows: false,
      width: 200,
      height: 100
    },

    particle: () => {
      const preset = particlePresets.fire
      return {
        _skipBaseProps: true,
        preset: 'fire',
        x: centerX,
        y: centerY,
        width: 50,
        height: 10,
        enabled: true,
        emitRate: preset.emitRate,
        lifetime: { ...preset.lifetime },
        speed: { ...preset.speed },
        direction: { ...preset.direction },
        gravity: preset.gravity,
        size: { ...preset.size },
        color: { ...preset.color },
        shape: preset.shape,
        blendMode: 'screen'
      }
    }
  }

  const defaults = typeDefaults[type]
  return typeof defaults === 'function' ? defaults() : defaults || {}
}

/**
 * Create a new element with defaults
 * @param {string} type - Element type
 * @param {number} sceneWidth - Scene width
 * @param {number} sceneHeight - Scene height
 * @returns {Object} New element with all defaults
 */
export function createDefaultElement(type, sceneWidth, sceneHeight) {
  const typeDefaults = getTypeDefaults(type, sceneWidth, sceneHeight)
  const skipBase = typeDefaults._skipBaseProps

  // Base properties for spatial elements
  const baseProps = skipBase ? {} : {
    x: sceneWidth / 2 - DEFAULT_ELEMENT_SIZE.width / 2,
    y: sceneHeight / 2 - DEFAULT_ELEMENT_SIZE.height / 2,
    w: DEFAULT_ELEMENT_SIZE.width,
    h: DEFAULT_ELEMENT_SIZE.height,
    rotation: 0
  }

  // Remove internal flag
  const { _skipBaseProps, ...cleanDefaults } = typeDefaults

  return {
    id: Date.now(),
    name: `New ${type}`,
    ...baseProps,
    ...cleanDefaults
  }
}

/**
 * Get the target array for an element type
 * @param {string} type - Element type
 * @param {Object} currentScene - Current scene ref value
 * @param {Object} project - Project ref value
 * @returns {Array} Target array to push to
 */
export function getElementTargetArray(type, currentScene, project) {
  const target = ELEMENT_TARGETS[type]
  if (!target) {
    console.warn(`[ElementFactory] Unknown element type: ${type}`)
    return null
  }

  if (target.scope === 'global') {
    return project.globalData[target.key]
  }

  // Handle nested paths like 'lighting.lights'
  if (target.nested) {
    const parts = target.key.split('.')
    let obj = currentScene
    for (const part of parts) {
      obj = obj[part]
    }
    return obj
  }

  return currentScene[target.key]
}

/**
 * Composable for element factory utilities
 */
export function useElementFactory() {
  return {
    ELEMENT_TARGETS,
    DEFAULT_ELEMENT_SIZE,
    createDefaultElement,
    getTypeDefaults,
    getElementTargetArray
  }
}

export default useElementFactory
