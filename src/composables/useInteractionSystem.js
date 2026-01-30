/**
 * useInteractionSystem.js
 *
 * Composable para el sistema de interacciones de elementos.
 * Maneja las interacciones verbo-objeto de elementos como hotspots e imágenes.
 *
 * @example
 * const {
 *   addInteraction,
 *   removeInteraction,
 *   getVerbById,
 *   createDefaultInteraction
 * } = useInteractionSystem({ project })
 */

/**
 * Default interaction structure
 */
export const DEFAULT_INTERACTION = {
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
}

/**
 * Available interaction action types
 */
export const INTERACTION_ACTIONS = [
  { id: 'dialog', name: 'Show Dialog', icon: '💬' },
  { id: 'pickup', name: 'Pick Up Item', icon: '✋' },
  { id: 'use', name: 'Use Object', icon: '🔧' },
  { id: 'walkto', name: 'Walk To', icon: '🚶' },
  { id: 'exit', name: 'Exit Scene', icon: '🚪' },
  { id: 'cutscene', name: 'Trigger Cutscene', icon: '🎬' },
  { id: 'variable', name: 'Set Variable', icon: '📝' }
]

/**
 * Condition operators
 */
export const CONDITION_OPERATORS = [
  { id: '==', name: 'equals' },
  { id: '!=', name: 'not equals' },
  { id: '>', name: 'greater than' },
  { id: '<', name: 'less than' },
  { id: '>=', name: 'greater or equal' },
  { id: '<=', name: 'less or equal' }
]

/**
 * Creates an interaction system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.project - Reactive reference to project data
 * @returns {Object} Interaction system methods
 */
export function useInteractionSystem(options = {}) {
  const { project } = options

  // =====================
  // INTERACTION CRUD
  // =====================

  /**
   * Create a default interaction object
   * @param {Object} [overrides] - Optional overrides
   * @returns {Object} New interaction object
   */
  const createDefaultInteraction = (overrides = {}) => {
    return {
      ...JSON.parse(JSON.stringify(DEFAULT_INTERACTION)),
      ...overrides
    }
  }

  /**
   * Add a new interaction to an element
   * @param {Object} element - Element to add interaction to (hotspot, image, etc.)
   * @param {Object} [interactionData] - Optional initial interaction data
   */
  const addInteraction = (element, interactionData = null) => {
    if (!element) return

    if (!element.interactions) {
      element.interactions = []
    }

    element.interactions.push(interactionData || createDefaultInteraction())
  }

  /**
   * Remove an interaction from an element
   * @param {Object} element - Element to remove interaction from
   * @param {number} index - Index of interaction to remove
   */
  const removeInteraction = (element, index) => {
    if (!element?.interactions || element.interactions.length <= index) return
    element.interactions.splice(index, 1)
  }

  /**
   * Update an interaction
   * @param {Object} element - Element containing the interaction
   * @param {number} index - Index of interaction to update
   * @param {Object} updates - Properties to update
   */
  const updateInteraction = (element, index, updates) => {
    if (!element?.interactions || !element.interactions[index]) return
    Object.assign(element.interactions[index], updates)
  }

  // =====================
  // VERB HELPERS
  // =====================

  /**
   * Get a verb by ID
   * @param {number} verbId - Verb ID
   * @returns {Object|null} Verb object or null
   */
  const getVerbById = (verbId) => {
    if (!project?.value?.globalData?.verbs) return null
    return project.value.globalData.verbs.find(v => v.id === verbId)
  }

  /**
   * Get all verbs
   * @returns {Array} Array of verbs
   */
  const getAllVerbs = () => {
    if (!project?.value?.globalData?.verbs) return []
    return project.value.globalData.verbs
  }

  /**
   * Get verb icon
   * @param {number} verbId - Verb ID
   * @returns {string} Verb icon or default
   */
  const getVerbIcon = (verbId) => {
    const verb = getVerbById(verbId)
    return verb?.icon || '❓'
  }

  /**
   * Get verb name
   * @param {number} verbId - Verb ID
   * @returns {string} Verb name or default
   */
  const getVerbName = (verbId) => {
    const verb = getVerbById(verbId)
    return verb?.name || 'Unknown'
  }

  // =====================
  // CONDITION HELPERS
  // =====================

  /**
   * Evaluate an interaction condition
   * @param {Object} condition - Condition object { varName, operator, value }
   * @param {Object} variables - Variables object to check against
   * @returns {boolean} Whether condition is met
   */
  const evaluateCondition = (condition, variables = {}) => {
    if (!condition?.varName) return true // No condition = always true

    const varValue = variables[condition.varName]
    const checkValue = condition.value

    switch (condition.operator) {
      case '==': return varValue == checkValue
      case '!=': return varValue != checkValue
      case '>': return Number(varValue) > Number(checkValue)
      case '<': return Number(varValue) < Number(checkValue)
      case '>=': return Number(varValue) >= Number(checkValue)
      case '<=': return Number(varValue) <= Number(checkValue)
      default: return true
    }
  }

  /**
   * Get interactions that match a verb for an element
   * @param {Object} element - Element with interactions
   * @param {number} verbId - Verb ID to match
   * @param {Object} [variables] - Optional variables for condition checking
   * @returns {Array} Matching interactions
   */
  const getMatchingInteractions = (element, verbId, variables = {}) => {
    if (!element?.interactions) return []

    return element.interactions.filter(interaction => {
      // Match verb
      if (interaction.verbId !== verbId) return false

      // Check condition if enabled
      if (interaction.hasCondition) {
        return evaluateCondition(interaction.condition, variables)
      }

      return true
    })
  }

  return {
    // Interaction CRUD
    createDefaultInteraction,
    addInteraction,
    removeInteraction,
    updateInteraction,

    // Verb helpers
    getVerbById,
    getAllVerbs,
    getVerbIcon,
    getVerbName,

    // Condition helpers
    evaluateCondition,
    getMatchingInteractions,

    // Constants
    INTERACTION_ACTIONS,
    CONDITION_OPERATORS
  }
}

export default useInteractionSystem
