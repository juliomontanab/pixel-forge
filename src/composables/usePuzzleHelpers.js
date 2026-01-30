/**
 * usePuzzleHelpers.js
 *
 * Composable con funciones helper para edición de puzzles e items.
 * Operaciones de modificación de arrays para hints, conditions, sequences, etc.
 *
 * @example
 * const {
 *   addPuzzleHint,
 *   removePuzzleHint,
 *   addConditionItem,
 *   removeConditionItem,
 *   toggleUseWith,
 *   toggleCorrectChoice
 * } = usePuzzleHelpers()
 */

/**
 * Creates puzzle helper utilities
 * These functions operate directly on puzzle/item objects passed to them
 *
 * @returns {Object} Puzzle helper methods
 */
export function usePuzzleHelpers() {
  // =====================
  // PUZZLE HINTS
  // =====================

  /**
   * Add a new hint to a puzzle
   * @param {Object} puzzle - Puzzle object
   */
  const addPuzzleHint = (puzzle) => {
    if (!puzzle) return
    if (!puzzle.hints) puzzle.hints = []
    puzzle.hints.push({
      afterAttempts: puzzle.hints.length + 1,
      text: ''
    })
  }

  /**
   * Remove a hint from a puzzle
   * @param {Object} puzzle - Puzzle object
   * @param {number} index - Index of hint to remove
   */
  const removePuzzleHint = (puzzle, index) => {
    if (!puzzle?.hints) return
    puzzle.hints.splice(index, 1)
  }

  // =====================
  // PUZZLE CONDITIONS
  // =====================

  /**
   * Add a condition item to a puzzle
   * @param {Object} puzzle - Puzzle object
   */
  const addConditionItem = (puzzle) => {
    if (!puzzle) return
    if (!puzzle.conditions) puzzle.conditions = {}
    if (!puzzle.conditions.items) puzzle.conditions.items = []
    puzzle.conditions.items.push(null)
  }

  /**
   * Remove a condition item from a puzzle
   * @param {Object} puzzle - Puzzle object
   * @param {number} index - Index of item to remove
   */
  const removeConditionItem = (puzzle, index) => {
    if (!puzzle?.conditions?.items) return
    puzzle.conditions.items.splice(index, 1)
  }

  /**
   * Add a sequence step to a puzzle
   * @param {Object} puzzle - Puzzle object
   */
  const addSequenceStep = (puzzle) => {
    if (!puzzle) return
    if (!puzzle.conditions) puzzle.conditions = {}
    if (!puzzle.conditions.sequence) puzzle.conditions.sequence = []
    puzzle.conditions.sequence.push('')
  }

  /**
   * Remove a sequence step from a puzzle
   * @param {Object} puzzle - Puzzle object
   * @param {number} index - Index of step to remove
   */
  const removeSequenceStep = (puzzle, index) => {
    if (!puzzle?.conditions?.sequence) return
    puzzle.conditions.sequence.splice(index, 1)
  }

  /**
   * Toggle a correct choice for dialog puzzles
   * @param {Object} puzzle - Puzzle object
   * @param {number} choiceId - ID of choice to toggle
   */
  const toggleCorrectChoice = (puzzle, choiceId) => {
    if (!puzzle) return
    if (!puzzle.conditions) puzzle.conditions = {}
    if (!puzzle.conditions.correctChoices) puzzle.conditions.correctChoices = []

    const index = puzzle.conditions.correctChoices.indexOf(choiceId)
    if (index > -1) {
      puzzle.conditions.correctChoices.splice(index, 1)
    } else {
      puzzle.conditions.correctChoices.push(choiceId)
    }
  }

  // =====================
  // PUZZLE RESULTS
  // =====================

  /**
   * Add an item to be removed as a result
   * @param {Object} puzzle - Puzzle object
   */
  const addResultRemoveItem = (puzzle) => {
    if (!puzzle) return
    if (!puzzle.result) puzzle.result = {}
    if (!puzzle.result.removeItems) puzzle.result.removeItems = []
    puzzle.result.removeItems.push(null)
  }

  /**
   * Remove an item from the result remove list
   * @param {Object} puzzle - Puzzle object
   * @param {number} index - Index of item to remove
   */
  const removeResultRemoveItem = (puzzle, index) => {
    if (!puzzle?.result?.removeItems) return
    puzzle.result.removeItems.splice(index, 1)
  }

  // =====================
  // ITEM HELPERS
  // =====================

  /**
   * Toggle useWith type for an item
   * @param {Object} item - Item object
   * @param {string} type - Type to toggle ('hotspot', 'actor', 'exit', 'image')
   */
  const toggleUseWith = (item, type) => {
    if (!item) return
    if (!item.useWith) item.useWith = []

    const index = item.useWith.indexOf(type)
    if (index > -1) {
      item.useWith.splice(index, 1)
    } else {
      item.useWith.push(type)
    }
  }

  /**
   * Check if an item can be used with a specific type
   * @param {Object} item - Item object
   * @param {string} type - Type to check
   * @returns {boolean}
   */
  const canUseWith = (item, type) => {
    if (!item?.useWith) return false
    return item.useWith.includes(type)
  }

  return {
    // Puzzle hints
    addPuzzleHint,
    removePuzzleHint,

    // Puzzle conditions
    addConditionItem,
    removeConditionItem,
    addSequenceStep,
    removeSequenceStep,
    toggleCorrectChoice,

    // Puzzle results
    addResultRemoveItem,
    removeResultRemoveItem,

    // Item helpers
    toggleUseWith,
    canUseWith
  }
}

export default usePuzzleHelpers
