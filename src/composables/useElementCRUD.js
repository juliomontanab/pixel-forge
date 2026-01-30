/**
 * useElementCRUD.js
 *
 * Composable para operaciones CRUD (Create, Read, Update, Delete) de elementos de escena.
 * Maneja la creación, eliminación, duplicación y copia/pega de elementos.
 *
 * @example
 * const {
 *   addElement,
 *   deleteElement,
 *   deleteSelectedElements,
 *   duplicateElements,
 *   clipboard,
 *   copyToClipboard,
 *   pasteFromClipboard
 * } = useElementCRUD({
 *   currentScene,
 *   globalData,
 *   selectedElements,
 *   defaultWidth: 1920,
 *   defaultHeight: 1200
 * })
 */

import { ref, computed } from 'vue'

/**
 * Deep clone helper using JSON serialization
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

/**
 * Type to array name mapping for scene elements
 */
const sceneTypeToArray = {
  image: 'images',
  walkbox: 'walkboxes',
  exit: 'exits',
  actorPlacement: 'actorPlacements',
  actor: 'actorPlacements', // Alias
  hotspot: 'hotspots',
  zplane: 'zplanes',
  dialog: 'dialogs',
  puzzle: 'puzzles',
  sfx: 'sfx',
  music: 'music',
  cutscene: 'cutscenes',
  animation: 'animations',
  light: 'lights', // Special: in lighting.lights
  particle: 'particles'
}

/**
 * Type to array name mapping for global elements
 */
const globalTypeToArray = {
  verb: 'verbs',
  item: 'items',
  globalActor: 'actors'
}

/**
 * Creates an element CRUD system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.currentScene - Reactive reference to current scene
 * @param {Ref} options.globalData - Reactive reference to global data (project.globalData)
 * @param {Ref<Array>} options.selectedElements - Reactive reference to selected elements
 * @param {number} [options.defaultWidth] - Default scene width (default: 1920)
 * @param {number} [options.defaultHeight] - Default scene height (default: 1200)
 * @param {number} [options.pasteOffset] - Offset for pasted elements (default: 20)
 * @returns {Object} CRUD methods
 */
export function useElementCRUD(options = {}) {
  const {
    currentScene,
    globalData,
    selectedElements,
    defaultWidth = 1920,
    defaultHeight = 1200,
    pasteOffset = 20
  } = options

  // Clipboard for copy/paste
  const clipboard = ref([])

  /**
   * Get array name for an element type
   * @param {string} type
   * @returns {{arrayName: string, isGlobal: boolean}}
   */
  const getArrayInfo = (type) => {
    if (globalTypeToArray[type]) {
      return { arrayName: globalTypeToArray[type], isGlobal: true }
    }
    return { arrayName: sceneTypeToArray[type], isGlobal: false }
  }

  /**
   * Get the target array for an element type
   * @param {string} type
   * @returns {Array|null}
   */
  const getTargetArray = (type) => {
    const { arrayName, isGlobal } = getArrayInfo(type)
    if (!arrayName) return null

    if (isGlobal) {
      return globalData?.value?.[arrayName]
    }

    // Special case for lights
    if (type === 'light') {
      return currentScene?.value?.lighting?.lights
    }

    return currentScene?.value?.[arrayName]
  }

  /**
   * Generate unique ID
   * @returns {number}
   */
  const generateId = () => Date.now() + Math.floor(Math.random() * 1000)

  /**
   * Generate unique name for an element
   * @param {string} baseName - Base name
   * @param {string} type - Element type
   * @returns {string}
   */
  const generateUniqueName = (baseName, type) => {
    const targetArray = getTargetArray(type)
    if (!targetArray) return baseName

    const existingNames = targetArray.map(el => el.name)

    // Check if baseName has a sub-index pattern (name-N)
    const baseMatch = baseName.match(/^(.+)-(\d+)$/)
    let coreName = baseMatch ? baseMatch[1] : baseName

    // Find max index
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

    if (!existingNames.includes(baseName)) {
      return baseName
    }

    return `${coreName}-${maxIndex}`
  }

  /**
   * Create default element data for a type
   * @param {string} type
   * @returns {Object}
   */
  const createDefaultElement = (type) => {
    const baseElement = {
      id: generateId(),
      name: `New ${type}`,
      x: defaultWidth / 2 - 100,
      y: defaultHeight / 2 - 100,
      w: 200,
      h: 200,
      rotation: 0
    }

    switch (type) {
      case 'image':
        return {
          ...baseElement,
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
        }

      case 'walkbox':
        return {
          id: generateId(),
          name: 'New walkbox',
          points: [
            { x: defaultWidth / 2 - 200, y: defaultHeight - 300 },
            { x: defaultWidth / 2 + 200, y: defaultHeight - 300 },
            { x: defaultWidth / 2 + 200, y: defaultHeight - 100 },
            { x: defaultWidth / 2 - 200, y: defaultHeight - 100 }
          ],
          rotation: 0,
          mask: 0
        }

      case 'exit':
        return { ...baseElement, targetScene: '' }

      case 'actor':
      case 'actorPlacement':
        return {
          ...baseElement,
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
        }

      case 'hotspot':
        return {
          ...baseElement,
          description: '',
          interactions: [],
          folderPath: '/'
        }

      case 'zplane':
        return { ...baseElement, maskImage: null, zIndex: 1 }

      case 'dialog':
        return {
          id: generateId(),
          name: 'New Dialog',
          actor: null,
          lines: [
            { id: 1, speaker: 'Player', text: 'Hello!' },
            { id: 2, speaker: 'NPC', text: 'Hi there!' }
          ],
          choices: []
        }

      case 'puzzle':
        return {
          id: generateId(),
          name: 'New Puzzle',
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
        }

      case 'verb':
        return {
          id: generateId(),
          name: 'New Verb',
          icon: '?',
          key: ''
        }

      case 'sfx':
        return {
          id: generateId(),
          name: 'New SFX',
          file: null,
          audioAssetId: null,
          volume: 100,
          loop: false,
          trigger: 'manual'
        }

      case 'music':
        return {
          id: generateId(),
          name: 'New Music',
          file: null,
          audioAssetId: null,
          volume: 80,
          loop: true,
          fadeIn: 0,
          fadeOut: 0
        }

      case 'cutscene':
        return {
          id: generateId(),
          name: 'New Cutscene',
          trigger: 'manual',
          triggerTarget: null,
          skippable: true,
          actions: []
        }

      case 'item':
        return {
          id: generateId(),
          name: 'New Item',
          description: 'A useful item',
          icon: '?',
          iconAssetId: null,
          image: null,
          combinable: true,
          useWith: [],
          pickupDialog: null,
          examineDialog: null
        }

      case 'light':
        return {
          id: generateId(),
          name: 'New Light',
          type: 'point',
          x: defaultWidth / 2,
          y: defaultHeight / 2,
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
        }

      case 'particle':
        return {
          id: generateId(),
          name: 'New Emitter',
          preset: 'fire',
          x: defaultWidth / 2,
          y: defaultHeight / 2,
          width: 50,
          height: 10,
          enabled: true,
          emitRate: 20,
          lifetime: { min: 0.5, max: 1.5 },
          speed: { min: 50, max: 100 },
          direction: { min: -30, max: 30 },
          gravity: -50,
          size: { start: 20, end: 5 },
          color: { start: '#ff6600', end: '#ff0000' },
          shape: 'circle',
          blendMode: 'screen'
        }

      case 'globalActor':
        return {
          id: generateId(),
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
        }

      default:
        return baseElement
    }
  }

  /**
   * Add a new element of the specified type
   * @param {string} type - Element type
   * @param {Object} [overrides] - Optional property overrides
   * @returns {Object|null} The created element
   */
  const addElement = (type, overrides = {}) => {
    const targetArray = getTargetArray(type)
    if (!targetArray) {
      console.warn(`[useElementCRUD] Unknown element type: ${type}`)
      return null
    }

    const element = { ...createDefaultElement(type), ...overrides }
    targetArray.push(element)

    return element
  }

  /**
   * Delete an element by type and ID
   * @param {string} type
   * @param {number|string} id
   * @returns {boolean} Whether the element was deleted
   */
  const deleteElement = (type, id) => {
    const targetArray = getTargetArray(type)
    if (!targetArray) return false

    const index = targetArray.findIndex(el => el.id === id)
    if (index > -1) {
      targetArray.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Delete all currently selected elements
   * @param {Object} [options]
   * @param {Function} [options.onDelete] - Callback after each deletion
   * @param {Function} [options.removeFromGroup] - Function to remove from groups
   */
  const deleteSelectedElements = (options = {}) => {
    const { onDelete, removeFromGroup } = options

    selectedElements?.value?.forEach(sel => {
      const deleted = deleteElement(sel.type, sel.element.id)

      if (deleted) {
        // Remove from groups if provided
        if (removeFromGroup) {
          removeFromGroup(sel.type, sel.element.id)
        }

        // Callback
        if (onDelete) {
          onDelete(sel.type, sel.element)
        }
      }
    })

    // Clear selection
    if (selectedElements?.value) {
      selectedElements.value = []
    }
  }

  /**
   * Copy selected elements to clipboard
   */
  const copyToClipboard = () => {
    if (!selectedElements?.value?.length) return

    clipboard.value = selectedElements.value.map(({ type, element }) => ({
      type,
      element: deepClone(element)
    }))
  }

  /**
   * Paste elements from clipboard
   * @returns {Array} Array of pasted elements { type, element }
   */
  const pasteFromClipboard = () => {
    if (clipboard.value.length === 0) return []

    const sceneWidth = currentScene?.value?.width || defaultWidth
    const sceneHeight = currentScene?.value?.height || defaultHeight

    const pastedElements = []

    clipboard.value.forEach(({ type, element }) => {
      const targetArray = getTargetArray(type)
      if (!targetArray) return

      // Create new element with unique ID
      const newElement = deepClone(element)
      newElement.id = generateId()

      // Generate unique name
      newElement.name = generateUniqueName(element.name, type)

      // Offset position for spatial elements
      if (newElement.x !== undefined && newElement.y !== undefined) {
        newElement.x = Math.min(newElement.x + pasteOffset, sceneWidth - (newElement.w || 0))
        newElement.y = Math.min(newElement.y + pasteOffset, sceneHeight - (newElement.h || 0))
      }

      // Handle walkbox points offset
      if (type === 'walkbox' && newElement.points) {
        newElement.points = newElement.points.map(p => ({
          x: Math.min(p.x + pasteOffset, sceneWidth),
          y: Math.min(p.y + pasteOffset, sceneHeight)
        }))
      }

      targetArray.push(newElement)
      pastedElements.push({ type, element: newElement })
    })

    // Select pasted elements
    if (selectedElements?.value) {
      selectedElements.value = pastedElements
    }

    return pastedElements
  }

  /**
   * Duplicate selected elements
   * @returns {Array} Array of duplicated elements
   */
  const duplicateElements = () => {
    // Copy and immediately paste
    copyToClipboard()
    return pasteFromClipboard()
  }

  /**
   * Duplicate a single element
   * @param {string} type
   * @param {Object} element
   * @returns {Object|null} The duplicated element
   */
  const duplicateElement = (type, element) => {
    const targetArray = getTargetArray(type)
    if (!targetArray) return null

    const sceneWidth = currentScene?.value?.width || defaultWidth
    const sceneHeight = currentScene?.value?.height || defaultHeight

    const newElement = deepClone(element)
    newElement.id = generateId()
    newElement.name = generateUniqueName(element.name, type)

    // Offset position
    if (newElement.x !== undefined && newElement.y !== undefined) {
      newElement.x = Math.min(newElement.x + pasteOffset, sceneWidth - (newElement.w || 0))
      newElement.y = Math.min(newElement.y + pasteOffset, sceneHeight - (newElement.h || 0))
    }

    // Handle walkbox points
    if (type === 'walkbox' && newElement.points) {
      newElement.points = newElement.points.map(p => ({
        x: Math.min(p.x + pasteOffset, sceneWidth),
        y: Math.min(p.y + pasteOffset, sceneHeight)
      }))
    }

    targetArray.push(newElement)
    return newElement
  }

  /**
   * Get element by type and ID
   * @param {string} type
   * @param {number|string} id
   * @returns {Object|null}
   */
  const getElementByTypeAndId = (type, id) => {
    const targetArray = getTargetArray(type)
    if (!targetArray) return null

    return targetArray.find(el => String(el.id) === String(id)) || null
  }

  /**
   * Update element properties
   * @param {string} type
   * @param {number|string} id
   * @param {Object} updates
   * @returns {boolean} Whether the update was successful
   */
  const updateElement = (type, id, updates) => {
    const element = getElementByTypeAndId(type, id)
    if (!element) return false

    Object.assign(element, updates)
    return true
  }

  // Computed: clipboard has content
  const hasClipboard = computed(() => clipboard.value.length > 0)

  return {
    // State
    clipboard,
    hasClipboard,

    // CRUD operations
    addElement,
    deleteElement,
    deleteSelectedElements,
    getElementByTypeAndId,
    updateElement,

    // Copy/Paste
    copyToClipboard,
    pasteFromClipboard,
    duplicateElements,
    duplicateElement,

    // Helpers
    generateId,
    generateUniqueName,
    createDefaultElement,
    getTargetArray,
    getArrayInfo,

    // Type mappings (readonly)
    sceneTypeToArray,
    globalTypeToArray
  }
}

export default useElementCRUD
