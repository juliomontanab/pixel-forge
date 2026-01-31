/**
 * usePlayMode.js
 *
 * Composable para el sistema de Play Mode del editor.
 * Maneja el estado del jugador, movimiento, inventario, diálogos e interacciones.
 *
 * @example
 * const {
 *   playMode,
 *   playModeState,
 *   enterPlayMode,
 *   exitPlayMode,
 *   walkToPoint,
 *   showPlayMessage,
 *   selectVerb
 * } = usePlayMode({
 *   currentScene,
 *   project,
 *   selectedElements,
 *   getAudioAssetById,
 *   switchScene
 * })
 */

import { ref, computed, watch } from 'vue'

/**
 * Creates a play mode system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.currentScene - Reactive reference to current scene
 * @param {Ref} options.project - Reactive reference to project data
 * @param {Ref} options.selectedElements - Reactive reference to selected elements
 * @param {Function} options.getAudioAssetById - Function to get audio asset by ID
 * @param {Function} options.switchScene - Function to switch scenes
 * @param {Function} [options.getSceneCoords] - Function to convert event to scene coordinates
 * @param {Function} [options.startCutscene] - Function to start a cutscene
 * @param {Function} [options.getAnimationIdFromAssignment] - Function to get animation ID from assignment
 * @param {Function} [options.isAnimationMirrored] - Function to check if animation is mirrored
 * @param {Function} [options.getAnimationSpritesheetUrl] - Function to get spritesheet URL
 * @param {Function} [options.getAnimationSpritesheetSize] - Function to get spritesheet size
 * @param {Ref|ComputedRef} [options.globalAnimations] - Global animations array
 * @param {Ref} [options.actorPreviewFrames] - Actor preview frames ref
 * @returns {Object} Play mode methods and state
 */
export function usePlayMode(options = {}) {
  const {
    currentScene,
    project,
    selectedElements,
    getAudioAssetById,
    switchScene,
    getSceneCoords,
    startCutscene,
    getAnimationIdFromAssignment,
    isAnimationMirrored,
    getAnimationSpritesheetUrl,
    getAnimationSpritesheetSize,
    globalAnimations,
    actorPreviewFrames
  } = options

  // =====================
  // STATE
  // =====================
  const playMode = ref(false)
  const playModeState = ref({
    // Player state
    playerActorId: null,
    playerPlacementId: null,
    playerPosition: { x: 400, y: 600 },
    playerSize: { w: 64, h: 64 },
    playerDirection: 'south',
    playerState: 'idle',

    // Interaction
    selectedVerb: null,
    hoveredObject: null,
    selectedItem: null,

    // Dialog
    currentDialog: null,
    dialogLineIndex: 0,
    dialogChoices: null,

    // Movement
    isWalking: false,
    walkTarget: null,
    walkCallback: null,

    // Messages
    messageText: '',
    messageTimeout: null,

    // Cutscene (managed by useCutsceneEngine, but state lives here)
    currentCutscene: null,
    cutsceneActionIndex: 0,
    cutsceneTimeout: null,
    isCutscenePlaying: false,

    // Transitions
    fadeOverlay: 0,
    isFading: false,

    // Audio
    currentMusic: null,
    musicAudio: null,

    // Game state (runtime)
    inventory: [],
    variables: {}
  })

  // Walk animation frame
  let walkAnimationFrame = null

  // =====================
  // COMPUTED
  // =====================

  // Get player actor data
  const getPlayerActor = computed(() => {
    if (!playModeState.value.playerActorId) return null
    return project.value?.globalData?.actors?.find(a => a.id === playModeState.value.playerActorId)
  })

  // Get player actor placement in current scene
  const getPlayerPlacement = computed(() => {
    if (!playModeState.value.playerActorId) return null
    return currentScene.value?.actorPlacements?.find(p => p.actorId === playModeState.value.playerActorId)
  })

  // Get current dialog line
  const getCurrentDialogLine = computed(() => {
    if (!playModeState.value.currentDialog) return null
    return playModeState.value.currentDialog.lines?.[playModeState.value.dialogLineIndex]
  })

  // Get inventory items (full data)
  const getInventoryItems = computed(() => {
    return playModeState.value.inventory
      .map(id => project.value?.globalData?.items?.find(i => i.id === id))
      .filter(Boolean)
  })

  // =====================
  // AUDIO SYSTEM
  // =====================

  const stopPlayModeAudio = () => {
    if (playModeState.value.musicAudio) {
      playModeState.value.musicAudio.pause()
      playModeState.value.musicAudio = null
    }
    playModeState.value.currentMusic = null
  }

  const playSceneMusic = () => {
    const musicEntry = currentScene.value?.music?.[0]
    if (musicEntry?.audioAssetId) {
      playMusic(musicEntry)
    }
  }

  const playMusic = (musicEntry) => {
    if (!getAudioAssetById) return

    const audioAsset = getAudioAssetById(musicEntry.audioAssetId)
    if (!audioAsset) return

    if (playModeState.value.musicAudio) {
      playModeState.value.musicAudio.pause()
    }

    const audio = new Audio(audioAsset.data)
    audio.volume = (musicEntry.volume || 100) / 100
    audio.loop = musicEntry.loop !== false
    audio.play().catch(() => {})

    playModeState.value.musicAudio = audio
    playModeState.value.currentMusic = musicEntry
  }

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

  const playSFX = (sfxIdOrEntry) => {
    if (!getAudioAssetById) return

    let audioAssetId
    let volume = 100

    if (typeof sfxIdOrEntry === 'object') {
      audioAssetId = sfxIdOrEntry.audioAssetId
      volume = sfxIdOrEntry.volume || 100
    } else {
      const sfxEntry = currentScene.value?.sfx?.find(s => s.id === sfxIdOrEntry)
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
  // INVENTORY SYSTEM
  // =====================

  const playAddToInventory = (itemId) => {
    if (!playModeState.value.inventory.includes(itemId)) {
      playModeState.value.inventory.push(itemId)
      const item = project.value?.globalData?.items?.find(i => i.id === itemId)
      if (item) {
        showPlayMessage(`Picked up: ${item.name}`)
      }
    }
  }

  const playRemoveFromInventory = (itemId) => {
    const index = playModeState.value.inventory.indexOf(itemId)
    if (index > -1) {
      playModeState.value.inventory.splice(index, 1)
    }
  }

  const hasItem = (itemId) => {
    return playModeState.value.inventory.includes(itemId)
  }

  const selectInventoryItem = (itemId) => {
    if (playModeState.value.selectedItem === itemId) {
      playModeState.value.selectedItem = null
    } else {
      playModeState.value.selectedItem = itemId
      const item = project.value?.globalData?.items?.find(i => i.id === itemId)
      showPlayMessage(`Using ${item?.name}...`)
    }
  }

  // =====================
  // VARIABLES SYSTEM
  // =====================

  const setVariable = (name, value) => {
    playModeState.value.variables[name] = value
  }

  const getVariable = (name) => {
    return playModeState.value.variables[name]
  }

  const checkVariable = (name, expectedValue) => {
    return playModeState.value.variables[name] === expectedValue
  }

  // =====================
  // WALKBOX SYSTEM
  // =====================

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

  const isPointInWalkbox = (x, y) => {
    for (const wb of currentScene.value?.walkboxes || []) {
      if (isPointInPolygon(x, y, wb.points)) {
        return true
      }
    }
    return false
  }

  const closestPointOnSegment = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy

    if (len2 === 0) return { x: x1, y: y1 }

    let t = ((px - x1) * dx + (py - y1) * dy) / len2
    t = Math.max(0, Math.min(1, t))

    return { x: x1 + t * dx, y: y1 + t * dy }
  }

  const findClosestWalkablePoint = (targetX, targetY) => {
    if (isPointInWalkbox(targetX, targetY)) {
      return { x: targetX, y: targetY }
    }

    let closestPoint = null
    let closestDist = Infinity

    for (const wb of currentScene.value?.walkboxes || []) {
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

  // =====================
  // MOVEMENT SYSTEM
  // =====================

  const walkToPoint = (targetX, targetY) => {
    const walkableTarget = findClosestWalkablePoint(targetX, targetY)

    playModeState.value.walkTarget = walkableTarget
    playModeState.value.isWalking = true

    const dx = walkableTarget.x - playModeState.value.playerPosition.x
    const dy = walkableTarget.y - playModeState.value.playerPosition.y

    if (Math.abs(dx) > Math.abs(dy)) {
      playModeState.value.playerDirection = dx > 0 ? 'east' : 'west'
    } else {
      playModeState.value.playerDirection = dy > 0 ? 'south' : 'north'
    }

    playModeState.value.playerState = `walk-${playModeState.value.playerDirection}`
  }

  // Check if player is near an exit area (proximity-based, not strict bounds)
  const checkExitCollision = () => {
    const pos = playModeState.value.playerPosition
    const exits = currentScene.value?.exits || []

    for (const exit of exits) {
      // Calculate distance from player to exit center
      const exitCenterX = exit.x + (exit.w || 0) / 2
      const exitCenterY = exit.y + (exit.h || 0) / 2
      const distance = Math.hypot(pos.x - exitCenterX, pos.y - exitCenterY)

      // Trigger if player is within exit radius (half of exit size + threshold)
      const exitRadius = Math.max(exit.w || 50, exit.h || 50) / 2 + 30
      const isNearExit = distance < exitRadius

      if (isNearExit && exit.targetScene) {
        console.log('[PlayMode] Exit triggered:', exit.name, '-> scene', exit.targetScene)
        playModeState.value.isWalking = false
        playModeState.value.walkTarget = null
        playModeState.value.walkCallback = null
        changeSceneWithTransition(exit.targetScene)
        return true
      }
    }
    return false
  }

  const updateWalk = () => {
    if (!playModeState.value.isWalking || !playModeState.value.walkTarget) return

    const speed = 4
    const target = playModeState.value.walkTarget
    const pos = playModeState.value.playerPosition

    const dx = target.x - pos.x
    const dy = target.y - pos.y
    const dist = Math.hypot(dx, dy)

    if (dist < speed) {
      playModeState.value.playerPosition = { ...target }
      playModeState.value.isWalking = false
      playModeState.value.playerState = 'idle'
      playModeState.value.walkTarget = null

      // Check for exit collision at destination
      if (checkExitCollision()) return

      if (playModeState.value.walkCallback) {
        const callback = playModeState.value.walkCallback
        playModeState.value.walkCallback = null
        callback()
      }
    } else {
      const moveX = (dx / dist) * speed
      const moveY = (dy / dist) * speed
      playModeState.value.playerPosition.x += moveX
      playModeState.value.playerPosition.y += moveY

      // Check for exit collision while walking
      if (checkExitCollision()) return

      if (Math.abs(dx) > Math.abs(dy)) {
        playModeState.value.playerDirection = dx > 0 ? 'east' : 'west'
      } else {
        playModeState.value.playerDirection = dy > 0 ? 'south' : 'north'
      }
      playModeState.value.playerState = `walk-${playModeState.value.playerDirection}`
    }
  }

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

  // =====================
  // DIALOG SYSTEM
  // =====================

  const startDialog = (dialog) => {
    playModeState.value.currentDialog = dialog
    playModeState.value.dialogLineIndex = 0
    playModeState.value.playerState = 'talk'
  }

  const advanceDialog = () => {
    if (!playModeState.value.currentDialog) return

    const dialog = playModeState.value.currentDialog
    playModeState.value.dialogLineIndex++

    if (playModeState.value.dialogLineIndex >= (dialog.lines?.length || 0)) {
      playModeState.value.currentDialog = null
      playModeState.value.dialogLineIndex = 0
      playModeState.value.playerState = 'idle'
    }
  }

  // =====================
  // MESSAGE SYSTEM
  // =====================

  const showPlayMessage = (text) => {
    playModeState.value.messageText = text
    if (playModeState.value.messageTimeout) {
      clearTimeout(playModeState.value.messageTimeout)
    }
    playModeState.value.messageTimeout = setTimeout(() => {
      playModeState.value.messageText = ''
    }, 3000)
  }

  // =====================
  // VERB SELECTION
  // =====================

  const selectVerb = (verbId) => {
    playModeState.value.selectedVerb = verbId
  }

  // =====================
  // TRANSITIONS
  // =====================

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

  // =====================
  // FIND OBJECT AT POINT
  // =====================

  const findObjectAtPoint = (x, y) => {
    // Check exits
    for (const exit of currentScene.value?.exits || []) {
      if (x >= exit.x && x <= exit.x + exit.w && y >= exit.y && y <= exit.y + exit.h) {
        return { type: 'exit', element: exit }
      }
    }

    // Check hotspots
    for (const hotspot of currentScene.value?.hotspots || []) {
      if (x >= hotspot.x && x <= hotspot.x + hotspot.w && y >= hotspot.y && y <= hotspot.y + hotspot.h) {
        return { type: 'hotspot', element: hotspot }
      }
    }

    // Check interactive images
    for (const img of currentScene.value?.images || []) {
      if (img.interactive && x >= img.x && x <= img.x + img.w && y >= img.y && y <= img.y + img.h) {
        return { type: 'image', element: img }
      }
    }

    // Check actor placements (not the player)
    for (const placement of currentScene.value?.actorPlacements || []) {
      if (placement.actorId !== playModeState.value.playerActorId) {
        if (x >= placement.x && x <= placement.x + placement.w && y >= placement.y && y <= placement.y + placement.h) {
          return { type: 'actor', element: placement }
        }
      }
    }

    return null
  }

  // =====================
  // ENTER / EXIT PLAY MODE
  // =====================

  const enterPlayMode = (callbacks = {}) => {
    const { onEnter, checkSceneEnterTriggers } = callbacks

    const hasActorPlacement = currentScene.value?.actorPlacements?.length > 0
    const hasGlobalActor = project.value?.globalData?.actors?.length > 0

    if (!hasActorPlacement && !hasGlobalActor) {
      alert('¡No hay ningún actor en la escena!\n\nPara jugar, primero debes:\n1. Crear un Actor en "Global Actors"\n2. Agregar un "Actor Placement" en la escena')
      return false
    }

    const firstPlacement = currentScene.value.actorPlacements[0]
    if (firstPlacement) {
      playModeState.value.playerActorId = firstPlacement.actorId
      playModeState.value.playerPlacementId = firstPlacement.id
      playModeState.value.playerPosition = {
        x: firstPlacement.x + firstPlacement.w / 2,
        y: firstPlacement.y + firstPlacement.h
      }
      playModeState.value.playerSize = { w: firstPlacement.w, h: firstPlacement.h }
      playModeState.value.playerDirection = firstPlacement.direction || 'south'
    } else if (project.value.globalData.actors.length > 0) {
      playModeState.value.playerActorId = project.value.globalData.actors[0].id
      playModeState.value.playerPlacementId = null
      playModeState.value.playerPosition = {
        x: currentScene.value.width / 2,
        y: currentScene.value.height / 2
      }
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

    // Initialize runtime game state
    playModeState.value.inventory = [...(project.value.globalData.inventory || [])]
    playModeState.value.variables = { ...(project.value.globalData.variables || {}) }

    // Stop any playing audio
    stopPlayModeAudio()

    playMode.value = true

    // Clear selection
    if (selectedElements?.value) {
      selectedElements.value = []
    }

    // Callback for scene enter triggers
    if (checkSceneEnterTriggers) {
      checkSceneEnterTriggers()
    }

    // Start scene music
    playSceneMusic()

    // Custom callback
    if (onEnter) {
      onEnter()
    }

    return true
  }

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

    stopPlayModeAudio()
  }

  // =====================
  // SCENE CHANGE WITH TRANSITION
  // =====================

  const changeSceneWithTransition = (sceneId, callbacks = {}) => {
    const { checkSceneEnterTriggers, onCutsceneAdvance } = callbacks

    fadeOut(500)
    setTimeout(() => {
      if (switchScene) {
        switchScene(sceneId)
      }

      // Reinitialize player position for new scene
      const firstPlacement = currentScene.value?.actorPlacements?.[0]
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
      if (checkSceneEnterTriggers) {
        checkSceneEnterTriggers()
      }

      fadeIn(500)

      // Continue cutscene if active
      if (playModeState.value.isCutscenePlaying && onCutsceneAdvance) {
        setTimeout(() => onCutsceneAdvance(), 600)
      }
    }, 500)
  }

  // Watch play mode to start/stop walk loop
  watch(playMode, (isPlaying) => {
    if (isPlaying) {
      startWalkLoop()
    } else {
      stopWalkLoop()
    }
  })

  // =====================
  // ITEM INTERACTION SYSTEM
  // =====================

  /**
   * Use item with object
   * @param {Object} item - Item to use
   * @param {Object} targetObj - Target object { type, element }
   * @returns {boolean} Whether the usage was successful
   */
  const useItemWith = (item, targetObj) => {
    const useWith = item.useWith || []
    const targetName = targetObj.element?.name || targetObj.type

    for (const usage of useWith) {
      if (usage.target === targetName || usage.targetId === targetObj.element?.id) {
        executeItemUsage(item, usage)
        playModeState.value.selectedItem = null
        return true
      }
    }

    showPlayMessage(`I can't use ${item.name} with that.`)
    playModeState.value.selectedItem = null
    return false
  }

  /**
   * Execute item usage result
   * @param {Object} item - Item being used
   * @param {Object} usage - Usage configuration
   */
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
    if (usage.triggerCutscene && startCutscene) {
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

  /**
   * Check puzzle conditions
   * @param {Object} puzzle - Puzzle to check
   * @returns {boolean} Whether conditions are met
   */
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

  /**
   * Attempt to solve a puzzle
   * @param {Object} puzzle - Puzzle to attempt
   */
  const attemptPuzzle = (puzzle) => {
    if (puzzle.solved) {
      showPlayMessage("Already solved.")
      return
    }

    if (!checkPuzzleConditions(puzzle)) {
      const hint = puzzle.hints?.[0]
      showPlayMessage(hint || "Something is missing...")
      return
    }

    solvePuzzle(puzzle.id)
  }

  /**
   * Mark puzzle as solved and execute results
   * @param {number} puzzleId - Puzzle ID to solve
   */
  const solvePuzzle = (puzzleId) => {
    const puzzle = currentScene.value.puzzles?.find(p => p.id === puzzleId)
    if (!puzzle || puzzle.solved) return

    puzzle.solved = true
    showPlayMessage(puzzle.result?.message || "Puzzle solved!")

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
      if (puzzle.result.triggerCutscene && startCutscene) {
        const cutscene = currentScene.value.cutscenes?.find(c => c.id === puzzle.result.triggerCutscene)
        if (cutscene) startCutscene(cutscene)
      }
      if (puzzle.result.playSFX) {
        playSFX(puzzle.result.playSFX)
      }
    }
  }

  // =====================
  // CLICK & INTERACTION HANDLERS
  // =====================

  /**
   * Handle click in play mode
   * @param {Event} event - Click event
   */
  const onPlayModeClick = (event) => {
    if (!playMode.value) return
    if (!getSceneCoords) return

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

  /**
   * Handle interaction with an object
   * @param {Object} obj - Object to interact with { type, element }
   */
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

    // SPECIAL HANDLING FOR EXITS: Always walk to them
    // Collision detection in updateWalk() will trigger the scene change
    if (obj.type === 'exit') {
      const exitCenterX = obj.element.x + (obj.element.w || 0) / 2
      const exitCenterY = obj.element.y + (obj.element.h || 0) / 2
      walkToPoint(exitCenterX, exitCenterY)
      return
    }

    // CHECK CUSTOM INTERACTIONS FIRST
    if ((obj.type === 'hotspot' || obj.type === 'image') && obj.element.interactions?.length > 0) {
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
            showPlayMessage("Nothing happens.")
            return
          }
        }

        executeInteractionAction(interaction, obj)
        return
      }
    }

    // Check for description (default "look at" response)
    const isLookVerb = verbName === 'look at' || verbName === 'look' || verbName === 'examine' ||
                       verbName === 'mirar' || verbName === 'examinar' || verbName === 'ver' ||
                       verbId === 1
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
    if ((obj.type === 'hotspot' || obj.type === 'image' || obj.type === 'actor') && startCutscene) {
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
        const item = project.value.globalData.items.find(i =>
          i.name === obj.element.name || i.linkedImageId === obj.element.id
        )
        if (item) {
          playAddToInventory(item.id)
          obj.element.visible = false
          if (item.pickupDialog) {
            showPlayMessage(item.pickupDialog)
          }
        } else {
          playAddToInventory(obj.element.id)
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
      showPlayMessage(`No puedo hacer eso.`)
    }
  }

  /**
   * Execute an interaction action
   * @param {Object} interaction - Interaction configuration
   * @param {Object} obj - Object being interacted with
   */
  const executeInteractionAction = (interaction, obj) => {
    const params = interaction.params || {}

    switch (interaction.action) {
      case 'dialog':
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
        if (params.dialogId) {
          const dialog = currentScene.value.dialogs.find(d => d.id === params.dialogId)
          if (dialog) {
            startDialog(dialog)
          }
        }
        break

      case 'cutscene':
        if (params.cutsceneId && startCutscene) {
          const cutscene = currentScene.value.cutscenes.find(c => c.id === params.cutsceneId)
          if (cutscene) {
            startCutscene(cutscene)
          }
        }
        break

      case 'pickup':
        if (params.itemId) {
          playAddToInventory(params.itemId)
          const item = project.value.globalData.items.find(i => i.id === params.itemId)
          showPlayMessage(`Picked up: ${item?.name || 'item'}`)

          if (params.removeFromScene && obj.element) {
            obj.element.visible = false
          }
        }
        break

      case 'use_item':
        if (params.requiredItemId) {
          const hasRequiredItem = playModeState.value.inventory.includes(params.requiredItemId)
          if (hasRequiredItem) {
            showPlayMessage(params.successText || "It worked!")
          } else {
            showPlayMessage(params.failText || "I need something to use with this.")
          }
        }
        break

      case 'change_scene':
        if (params.sceneId) {
          changeSceneWithTransition(params.sceneId)
        }
        break

      case 'set_variable':
        if (params.varName) {
          if (!playModeState.value.variables) {
            playModeState.value.variables = {}
          }
          playModeState.value.variables[params.varName] = params.varValue
          console.log(`[PlayMode] Variable set: ${params.varName} = ${params.varValue}`)
        }
        break

      case 'custom':
        if (params.script) {
          try {
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

  // =====================
  // PLAYER ANIMATION HELPERS
  // =====================

  /**
   * Get current animation for player based on state
   * @returns {Object|null} Animation object with _mirror flag, or null
   */
  const getPlayerCurrentAnimation = () => {
    const playerActor = getPlayerActor.value
    if (!playerActor || !playerActor.animations) return null

    const state = playModeState.value.playerState || 'idle'
    const assignment = playerActor.animations[state]

    if (!assignment) return null

    // Handle both old format (just ID) and new format ({ id, mirror })
    const animId = getAnimationIdFromAssignment ? getAnimationIdFromAssignment(assignment) : assignment
    if (!animId) return null

    const mirror = isAnimationMirrored ? isAnimationMirrored(assignment) : false

    // Search in global animations first, then scene animations for backward compatibility
    const anim = (globalAnimations?.value || []).find(a => a.id === animId) ||
                 currentScene.value.animations?.find(a => a.id === animId)

    if (!anim) return null

    return { ...anim, _mirror: mirror }
  }

  /**
   * Get style for player animation frame
   * @returns {Object} CSS style object
   */
  const getPlayerAnimationStyle = () => {
    const anim = getPlayerCurrentAnimation()
    if (!anim || !anim.frames || anim.frames.length === 0) return {}

    const spritesheetUrl = getAnimationSpritesheetUrl ? getAnimationSpritesheetUrl(anim) : null
    if (!spritesheetUrl) return {}

    const playerActor = getPlayerActor.value
    const frameIndex = actorPreviewFrames?.value?.[playerActor?.id] || 0
    const frame = anim.frames[frameIndex % anim.frames.length]
    const size = getAnimationSpritesheetSize ? getAnimationSpritesheetSize(anim) : { width: 0, height: 0 }

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

  return {
    // State
    playMode,
    playModeState,

    // Computed
    getPlayerActor,
    getPlayerPlacement,
    getCurrentDialogLine,
    getInventoryItems,

    // Entry/Exit
    enterPlayMode,
    exitPlayMode,

    // Audio
    stopPlayModeAudio,
    playSceneMusic,
    playMusic,
    stopMusic,
    playSFX,

    // Inventory
    playAddToInventory,
    playRemoveFromInventory,
    hasItem,
    selectInventoryItem,

    // Variables
    setVariable,
    getVariable,
    checkVariable,

    // Walkbox
    isPointInWalkbox,
    isPointInPolygon,
    findClosestWalkablePoint,

    // Movement
    walkToPoint,
    updateWalk,
    startWalkLoop,
    stopWalkLoop,

    // Dialog
    startDialog,
    advanceDialog,

    // Messages
    showPlayMessage,

    // Verb
    selectVerb,

    // Transitions
    fadeOut,
    fadeIn,
    changeSceneWithTransition,

    // Object detection
    findObjectAtPoint,

    // Item interaction
    useItemWith,
    executeItemUsage,

    // Puzzle system
    checkPuzzleConditions,
    attemptPuzzle,
    solvePuzzle,

    // Click handlers
    onPlayModeClick,
    handleObjectInteraction,
    executeInteractionAction,

    // Player animation
    getPlayerCurrentAnimation,
    getPlayerAnimationStyle
  }
}

export default usePlayMode
