<script setup>
/**
 * SpritesheetEditorModal.vue
 *
 * Complete spritesheet editor with:
 * - Image upload or asset selection
 * - Grid configuration
 * - Frame selection
 * - Animation preview
 * - Actor assignment modal
 */

import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  assets: { type: Array, default: () => [] },
  animations: { type: Array, default: () => [] },
  actors: { type: Array, default: () => [] },
  getAssetUrl: { type: Function, default: () => null },
  actorAnimationStates: { type: Array, default: () => [
    { key: 'idle', label: 'Idle', icon: '🧍' },
    { key: 'walk-north', label: 'Caminar Norte', icon: '⬆️' },
    { key: 'walk-south', label: 'Caminar Sur', icon: '⬇️' },
    { key: 'walk-east', label: 'Caminar Este', icon: '➡️' },
    { key: 'walk-west', label: 'Caminar Oeste', icon: '⬅️' },
    { key: 'talk', label: 'Hablar', icon: '💬' },
    { key: 'use', label: 'Usar', icon: '🔧' },
    { key: 'pickup', label: 'Recoger', icon: '✋' }
  ]}
})

const emit = defineEmits([
  'close',
  'update:show',
  'save-animation',
  'update-animation',
  'delete-animation',
  'assign-animation'
])

// =====================
// STATE
// =====================
const spritesheetImage = ref(null)
const spritesheetImageEl = ref(null)
const previewCanvasRef = ref(null)
const spritesheetFileInput = ref(null)
const gridConfig = ref({ cols: 4, rows: 4, frameW: 64, frameH: 64, offsetX: 0, offsetY: 0, spacingX: 0, spacingY: 0 })
const selectedFrames = ref([])
const currentAnimation = ref({ name: '', frames: [], frameRate: 12, loop: true, pingPong: false })
const previewPlaying = ref(false)
const previewFrame = ref(0)
let previewInterval = null

const sourceTab = ref('upload')
const selectedAssetId = ref(null)
const showAssignModal = ref(false)
const lastSavedAnimationId = ref(null)
const assignMirrorMode = ref(false)
const editingAnimationId = ref(null)

// =====================
// COMPUTED
// =====================
const spriteAssets = computed(() => {
  return (props.assets || []).filter(a => a.category === 'sprite' || a.category === 'object')
})

const totalFrames = computed(() => gridConfig.value.cols * gridConfig.value.rows)

const suggestedFrameSize = computed(() => {
  if (!spritesheetImage.value) return null
  const cols = gridConfig.value.cols || 1
  const rows = gridConfig.value.rows || 1
  return {
    w: Math.floor(spritesheetImage.value.width / cols),
    h: Math.floor(spritesheetImage.value.height / rows)
  }
})

const frameSizeMismatch = computed(() => {
  if (!suggestedFrameSize.value) return false
  return gridConfig.value.frameW !== suggestedFrameSize.value.w ||
         gridConfig.value.frameH !== suggestedFrameSize.value.h
})

const previewFrameData = computed(() => {
  if (!spritesheetImage.value || !currentAnimation.value.frames.length) return null
  const frame = currentAnimation.value.frames[previewFrame.value]
  if (!frame) return null
  return {
    src: spritesheetImage.value.data,
    frameW: frame.w,
    frameH: frame.h,
    frameX: frame.x,
    frameY: frame.y,
    ssWidth: spritesheetImage.value.width,
    ssHeight: spritesheetImage.value.height
  }
})

// =====================
// WATCHERS
// =====================
watch(() => props.show, (newVal) => {
  if (newVal) {
    resetEditor()
  } else {
    stopPreview()
  }
})

watch(previewFrameData, async () => {
  await nextTick()
  drawPreviewFrame()
}, { immediate: true })

watch(previewFrame, async () => {
  await nextTick()
  drawPreviewFrame()
})

// =====================
// METHODS
// =====================
const resetEditor = () => {
  spritesheetImage.value = null
  spritesheetImageEl.value = null
  selectedFrames.value = []
  currentAnimation.value = { name: '', frames: [], frameRate: 12, loop: true, pingPong: false }
  previewPlaying.value = false
  previewFrame.value = 0
  sourceTab.value = 'upload'
  selectedAssetId.value = null
  showAssignModal.value = false
  lastSavedAnimationId.value = null
  editingAnimationId.value = null
  assignMirrorMode.value = false
}

const closeEditor = () => {
  stopPreview()
  emit('update:show', false)
  emit('close')
}

// Image loading
const handleDrop = (event) => {
  event.preventDefault()
  const file = event.dataTransfer?.files[0] || event.target?.files?.[0]
  if (file && file.type === 'image/png') {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        spritesheetImage.value = {
          data: e.target.result,
          width: img.width,
          height: img.height
        }
        spritesheetImageEl.value = img
        autoDetectGrid(img.width, img.height)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const loadFromAsset = async (asset) => {
  if (!asset) return
  selectedAssetId.value = asset.id

  let url = props.getAssetUrl(asset)
  if (!url) {
    alert('No se pudo obtener la URL del asset')
    return
  }

  const img = new Image()
  img.onload = () => {
    spritesheetImage.value = {
      data: url,
      width: img.width,
      height: img.height,
      assetId: asset.id
    }
    spritesheetImageEl.value = img
    autoDetectGrid(img.width, img.height)
  }
  img.onerror = () => {
    alert('Error cargando la imagen')
  }
  img.src = url
}

const autoDetectGrid = (width, height) => {
  const commonGrids = [
    [4, 4], [6, 6], [8, 8], [4, 8], [8, 4],
    [3, 4], [4, 3], [5, 5], [6, 4], [4, 6],
    [2, 4], [4, 2], [3, 3], [2, 2], [8, 1], [1, 8]
  ]

  let bestCols = 4, bestRows = 4
  for (const [cols, rows] of commonGrids) {
    if (width % cols === 0 && height % rows === 0) {
      const frameW = width / cols
      const frameH = height / rows
      if (frameW >= 32 && frameW <= 512 && frameH >= 32 && frameH <= 512) {
        bestCols = cols
        bestRows = rows
        break
      }
    }
  }

  gridConfig.value = {
    cols: bestCols,
    rows: bestRows,
    frameW: Math.floor(width / bestCols),
    frameH: Math.floor(height / bestRows),
    offsetX: 0, offsetY: 0, spacingX: 0, spacingY: 0
  }
}

const calculateFrameSize = () => {
  if (!spritesheetImage.value) return
  gridConfig.value.frameW = Math.floor(spritesheetImage.value.width / gridConfig.value.cols)
  gridConfig.value.frameH = Math.floor(spritesheetImage.value.height / gridConfig.value.rows)
}

const applyCorrectFrameSize = () => {
  if (!suggestedFrameSize.value) return
  gridConfig.value.frameW = suggestedFrameSize.value.w
  gridConfig.value.frameH = suggestedFrameSize.value.h
  if (currentAnimation.value.frames.length > 0) {
    recalculateFramePositions()
  }
}

// Frame selection
const handleFrameClick = (frameIndex, event) => {
  if (event.shiftKey && selectedFrames.value.length > 0) {
    const last = selectedFrames.value[selectedFrames.value.length - 1]
    const start = Math.min(last, frameIndex)
    const end = Math.max(last, frameIndex)
    for (let i = start; i <= end; i++) {
      if (!selectedFrames.value.includes(i)) {
        selectedFrames.value.push(i)
      }
    }
  } else if (event.ctrlKey || event.metaKey) {
    const idx = selectedFrames.value.indexOf(frameIndex)
    if (idx >= 0) {
      selectedFrames.value.splice(idx, 1)
    } else {
      selectedFrames.value.push(frameIndex)
    }
  } else {
    selectedFrames.value = [frameIndex]
  }
}

const selectAllFrames = () => {
  selectedFrames.value = Array.from({ length: totalFrames.value }, (_, i) => i)
}

const clearFrameSelection = () => {
  selectedFrames.value = []
}

const calculateFramePosition = (idx) => {
  const { cols, frameW, frameH, offsetX = 0, offsetY = 0, spacingX = 0, spacingY = 0 } = gridConfig.value
  return {
    x: offsetX + (idx % cols) * (frameW + spacingX),
    y: offsetY + Math.floor(idx / cols) * (frameH + spacingY),
    w: frameW,
    h: frameH
  }
}

const createAnimationFromSelection = () => {
  if (selectedFrames.value.length === 0) return
  const sortedFrames = [...selectedFrames.value].sort((a, b) => a - b)
  currentAnimation.value = {
    name: `anim-${Date.now()}`,
    frames: sortedFrames.map(idx => calculateFramePosition(idx)),
    frameRate: 12,
    loop: true,
    pingPong: false
  }
}

const recalculateFramePositions = () => {
  if (currentAnimation.value.frames.length === 0) return
  if (selectedFrames.value.length > 0) {
    const sortedFrames = [...selectedFrames.value].sort((a, b) => a - b)
    currentAnimation.value.frames = sortedFrames.map(idx => calculateFramePosition(idx))
  } else {
    currentAnimation.value.frames = currentAnimation.value.frames.map((_, i) => calculateFramePosition(i))
  }
}

// Animation save/edit
const saveAnimation = () => {
  if (!currentAnimation.value.name || currentAnimation.value.frames.length === 0) {
    alert('Por favor, selecciona frames y asigna un nombre')
    return
  }
  if (!spritesheetImage.value) {
    alert('No hay imagen de spritesheet cargada')
    return
  }

  const animData = {
    id: editingAnimationId.value || Date.now(),
    name: currentAnimation.value.name,
    spritesheetAssetId: spritesheetImage.value.assetId || null,
    spritesheet: spritesheetImage.value.assetId ? null : { ...spritesheetImage.value },
    spritesheetWidth: spritesheetImage.value.width,
    spritesheetHeight: spritesheetImage.value.height,
    frames: [...currentAnimation.value.frames],
    frameRate: currentAnimation.value.frameRate,
    loop: currentAnimation.value.loop,
    pingPong: currentAnimation.value.pingPong,
    gridConfig: { ...gridConfig.value }
  }

  if (editingAnimationId.value) {
    emit('update-animation', animData)
    editingAnimationId.value = null
  } else {
    emit('save-animation', animData)
    lastSavedAnimationId.value = animData.id
    showAssignModal.value = true
  }

  selectedFrames.value = []
  currentAnimation.value = { name: '', frames: [], frameRate: 12, loop: true, pingPong: false }
  stopPreview()
}

const editAnimation = async (anim) => {
  if (!anim) return
  editingAnimationId.value = anim.id

  if (anim.gridConfig) {
    gridConfig.value = { ...anim.gridConfig }
  } else if (anim.frames?.length > 0) {
    gridConfig.value.frameW = anim.frames[0].w || 32
    gridConfig.value.frameH = anim.frames[0].h || 32
  }

  // Load spritesheet
  if (anim.spritesheetAssetId) {
    const asset = props.assets.find(a => a.id === anim.spritesheetAssetId)
    if (asset) {
      const url = props.getAssetUrl(asset)
      if (url) {
        await new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            spritesheetImage.value = { data: url, width: img.width, height: img.height, assetId: asset.id }
            spritesheetImageEl.value = img
            if (anim.gridConfig) gridConfig.value = { ...anim.gridConfig }
            resolve()
          }
          img.onerror = () => resolve()
          img.src = url
        })
      }
    }
  } else if (anim.spritesheet?.data) {
    await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        spritesheetImage.value = { data: anim.spritesheet.data, width: img.width, height: img.height }
        spritesheetImageEl.value = img
        if (anim.gridConfig) gridConfig.value = { ...anim.gridConfig }
        resolve()
      }
      img.onerror = () => resolve()
      img.src = anim.spritesheet.data
    })
  }

  currentAnimation.value = {
    name: anim.name,
    frames: [...anim.frames],
    frameRate: anim.frameRate || 12,
    loop: anim.loop !== false,
    pingPong: anim.pingPong || false
  }

  if (anim.frames?.length > 0 && gridConfig.value.frameW && gridConfig.value.frameH) {
    selectedFrames.value = anim.frames.map(frame => {
      const col = Math.floor(frame.x / gridConfig.value.frameW)
      const row = Math.floor(frame.y / gridConfig.value.frameH)
      return row * gridConfig.value.cols + col
    })
  }
}

const cancelEditAnimation = () => {
  editingAnimationId.value = null
  selectedFrames.value = []
  currentAnimation.value = { name: '', frames: [], frameRate: 12, loop: true, pingPong: false }
}

const deleteAnimation = (animId) => {
  emit('delete-animation', animId)
}

const openAssignModal = (animId) => {
  lastSavedAnimationId.value = animId
  showAssignModal.value = true
}

const skipAssign = () => {
  showAssignModal.value = false
  lastSavedAnimationId.value = null
  assignMirrorMode.value = false
}

const assignToActor = (actorId, state) => {
  if (!lastSavedAnimationId.value) return
  emit('assign-animation', {
    actorId,
    state,
    animationId: lastSavedAnimationId.value,
    mirror: assignMirrorMode.value
  })
  showAssignModal.value = false
  lastSavedAnimationId.value = null
  assignMirrorMode.value = false
}

// Preview
const togglePreview = () => {
  if (previewPlaying.value) stopPreview()
  else startPreview()
}

const startPreview = () => {
  if (currentAnimation.value.frames.length === 0) return
  previewPlaying.value = true
  previewFrame.value = 0
  const fps = currentAnimation.value.frameRate || 12
  previewInterval = setInterval(() => {
    const total = currentAnimation.value.frames.length
    if (total === 0) { stopPreview(); return }
    previewFrame.value = (previewFrame.value + 1) % total
  }, 1000 / fps)
}

const stopPreview = () => {
  previewPlaying.value = false
  if (previewInterval) {
    clearInterval(previewInterval)
    previewInterval = null
  }
}

const drawPreviewFrame = () => {
  const data = previewFrameData.value
  const canvas = previewCanvasRef.value
  const imgEl = spritesheetImageEl.value
  if (!data || !canvas || !imgEl) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(imgEl, data.frameX, data.frameY, data.frameW, data.frameH, 0, 0, data.frameW, data.frameH)
}

// Helpers
const getAnimationIdFromAssignment = (assignment) => {
  if (!assignment) return null
  if (typeof assignment === 'number') return assignment
  if (typeof assignment === 'object' && assignment.id) return assignment.id
  return null
}

const isAnimationMirrored = (assignment) => {
  if (!assignment) return false
  return typeof assignment === 'object' && assignment.mirror
}

const getStateButtonTitle = (actor, state) => {
  const assignment = actor.animations?.[state.key]
  if (!assignment) return state.label
  const animId = getAnimationIdFromAssignment(assignment)
  const anim = props.animations.find(a => a.id === animId)
  const animName = anim?.name || 'Anim'
  const mirrorText = isAnimationMirrored(assignment) ? ' (espejo)' : ''
  return `${state.label}: ${animName}${mirrorText}`
}

const getAnimationUsage = (animId) => {
  if (!animId) return []
  const usage = []
  for (const actor of props.actors) {
    if (actor.animations) {
      for (const [state, assignment] of Object.entries(actor.animations)) {
        if (getAnimationIdFromAssignment(assignment) === animId) {
          const stateInfo = props.actorAnimationStates.find(s => s.key === state)
          usage.push({
            actorId: actor.id,
            actorName: actor.name,
            state,
            stateLabel: stateInfo?.label || state,
            stateIcon: stateInfo?.icon || '🎬',
            mirror: isAnimationMirrored(assignment)
          })
        }
      }
    }
  }
  return usage
}

onUnmounted(() => {
  stopPreview()
})
</script>

<template>
  <div v-if="show" class="spritesheet-editor-overlay" @click.self="closeEditor">
    <div class="spritesheet-editor-modal">
      <header class="spritesheet-header">
        <h2 class="spritesheet-title">SPRITESHEET EDITOR</h2>
        <button class="spritesheet-close-btn" @click="closeEditor">✕</button>
      </header>

      <div class="spritesheet-main">
        <!-- Canvas Area -->
        <div class="spritesheet-canvas-area">
          <!-- Source Tabs -->
          <div v-if="!spritesheetImage" class="spritesheet-source-tabs">
            <button class="source-tab" :class="{ active: sourceTab === 'upload' }" @click="sourceTab = 'upload'">
              📁 Subir Archivo
            </button>
            <button class="source-tab" :class="{ active: sourceTab === 'assets' }" @click="sourceTab = 'assets'">
              🖼️ Desde Assets
            </button>
          </div>

          <!-- Upload Tab -->
          <div
            v-if="!spritesheetImage && sourceTab === 'upload'"
            class="spritesheet-dropzone"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @click="spritesheetFileInput?.click()"
          >
            <input ref="spritesheetFileInput" type="file" accept="image/png" style="display: none" @change="handleDrop" />
            <div class="dropzone-content">
              <span class="dropzone-icon">📁</span>
              <span class="dropzone-text">Arrastra un PNG aquí</span>
              <span class="dropzone-subtext">o haz clic para buscar</span>
            </div>
          </div>

          <!-- Assets Tab -->
          <div v-if="!spritesheetImage && sourceTab === 'assets'" class="spritesheet-asset-picker">
            <p class="asset-picker-hint">Selecciona un asset de tipo Sprite u Object:</p>
            <div class="asset-picker-grid">
              <div
                v-for="asset in spriteAssets"
                :key="asset.id"
                class="asset-picker-item"
                :class="{ selected: selectedAssetId === asset.id }"
                @click="loadFromAsset(asset)"
              >
                <div
                  class="asset-picker-preview"
                  :style="{ backgroundImage: getAssetUrl(asset) ? `url(${getAssetUrl(asset)})` : 'none' }"
                >
                  <span v-if="!getAssetUrl(asset)" class="asset-loading">⏳</span>
                </div>
                <span class="asset-picker-name">{{ asset.name }}</span>
                <span class="asset-picker-size">{{ asset.width }}×{{ asset.height }}</span>
              </div>
            </div>
            <p v-if="spriteAssets.length === 0" class="asset-picker-empty">
              No hay assets de tipo Sprite u Object.
            </p>
          </div>

          <!-- Spritesheet Grid -->
          <div v-if="spritesheetImage" class="spritesheet-grid-container">
            <div
              class="spritesheet-grid"
              :style="{
                width: spritesheetImage.width + 'px',
                height: spritesheetImage.height + 'px',
                backgroundImage: `url(${spritesheetImage.data})`,
                backgroundSize: spritesheetImage.width + 'px ' + spritesheetImage.height + 'px'
              }"
            >
              <div
                v-for="i in totalFrames"
                :key="i - 1"
                class="frame-cell"
                :class="{ selected: selectedFrames.includes(i - 1) }"
                :style="{
                  width: gridConfig.frameW + 'px',
                  height: gridConfig.frameH + 'px',
                  left: (gridConfig.offsetX || 0) + ((i - 1) % gridConfig.cols) * (gridConfig.frameW + (gridConfig.spacingX || 0)) + 'px',
                  top: (gridConfig.offsetY || 0) + Math.floor((i - 1) / gridConfig.cols) * (gridConfig.frameH + (gridConfig.spacingY || 0)) + 'px'
                }"
                @click="handleFrameClick(i - 1, $event)"
              >
                <span class="frame-number">{{ i - 1 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Side Panel -->
        <aside class="spritesheet-panel">
          <!-- Grid Config -->
          <div class="spritesheet-section">
            <h3 class="spritesheet-section-title">GRID CONFIG</h3>
            <div class="spritesheet-form-row">
              <label>Cols:</label>
              <input type="number" v-model.number="gridConfig.cols" min="1" class="spritesheet-input" />
              <button class="spritesheet-btn-mini" @click="calculateFrameSize" title="Auto-calcular">⟳</button>
            </div>
            <div class="spritesheet-form-row">
              <label>Rows:</label>
              <input type="number" v-model.number="gridConfig.rows" min="1" class="spritesheet-input" />
              <button class="spritesheet-btn-mini" @click="calculateFrameSize" title="Auto-calcular">⟳</button>
            </div>
            <div class="spritesheet-form-row">
              <label>Frame W:</label>
              <input type="number" v-model.number="gridConfig.frameW" min="1" class="spritesheet-input" />
            </div>
            <div class="spritesheet-form-row">
              <label>Frame H:</label>
              <input type="number" v-model.number="gridConfig.frameH" min="1" class="spritesheet-input" />
            </div>
            <details class="spritesheet-details">
              <summary>Offset & Spacing</summary>
              <div class="spritesheet-form-row">
                <label>Offset X:</label>
                <input type="number" v-model.number="gridConfig.offsetX" min="0" class="spritesheet-input" />
              </div>
              <div class="spritesheet-form-row">
                <label>Offset Y:</label>
                <input type="number" v-model.number="gridConfig.offsetY" min="0" class="spritesheet-input" />
              </div>
              <div class="spritesheet-form-row">
                <label>Spacing X:</label>
                <input type="number" v-model.number="gridConfig.spacingX" min="0" class="spritesheet-input" />
              </div>
              <div class="spritesheet-form-row">
                <label>Spacing Y:</label>
                <input type="number" v-model.number="gridConfig.spacingY" min="0" class="spritesheet-input" />
              </div>
            </details>
            <div v-if="spritesheetImage" class="spritesheet-info-dims">
              Imagen: {{ spritesheetImage.width }}×{{ spritesheetImage.height }}px
              <br/>
              <span v-if="suggestedFrameSize" :class="{ 'size-mismatch': frameSizeMismatch }">
                Sugerido: {{ suggestedFrameSize.w }}×{{ suggestedFrameSize.h }}px
                <span v-if="frameSizeMismatch" style="color: #ff4757;"> ⚠️</span>
              </span>
            </div>
            <button
              v-if="spritesheetImage"
              class="spritesheet-btn spritesheet-btn-warning"
              @click="applyCorrectFrameSize"
              style="width: 100%; margin-top: 8px;"
            >
              ⚡ Aplicar Tamaño Correcto
            </button>
          </div>

          <!-- Selection -->
          <div class="spritesheet-section">
            <h3 class="spritesheet-section-title">SELECTION</h3>
            <p class="spritesheet-info">{{ selectedFrames.length }} frames selected</p>
            <div class="spritesheet-btn-row">
              <button class="spritesheet-btn" @click="selectAllFrames">Select All</button>
              <button class="spritesheet-btn" @click="clearFrameSelection">Clear</button>
            </div>
            <button
              class="spritesheet-btn spritesheet-btn-primary"
              @click="createAnimationFromSelection"
              :disabled="selectedFrames.length === 0"
            >
              Create Animation
            </button>
          </div>

          <!-- Current Animation -->
          <div class="spritesheet-section" v-if="currentAnimation.frames.length > 0">
            <h3 class="spritesheet-section-title">CURRENT ANIMATION</h3>
            <div class="spritesheet-form-row">
              <label>Name:</label>
              <input type="text" v-model="currentAnimation.name" class="spritesheet-input" placeholder="animation-name" />
            </div>
            <div class="spritesheet-form-row">
              <label>FPS:</label>
              <input type="number" v-model.number="currentAnimation.frameRate" min="1" max="60" class="spritesheet-input" />
            </div>
            <div class="spritesheet-checkbox-row">
              <label><input type="checkbox" v-model="currentAnimation.loop" /> Loop</label>
              <label><input type="checkbox" v-model="currentAnimation.pingPong" /> Ping-pong</label>
            </div>
            <button class="spritesheet-btn" @click="recalculateFramePositions" style="width: 100%; margin-bottom: 8px;">
              ⟳ Recalcular Frames
            </button>
            <div class="spritesheet-btn-row">
              <button class="spritesheet-btn spritesheet-btn-success" @click="saveAnimation">
                {{ editingAnimationId ? 'Actualizar' : 'Guardar' }}
              </button>
              <button v-if="editingAnimationId" class="spritesheet-btn" @click="cancelEditAnimation">
                Cancelar
              </button>
            </div>
            <p v-if="editingAnimationId" class="editing-hint">Editando: {{ animations.find(a => a.id === editingAnimationId)?.name }}</p>
          </div>

          <!-- Saved Animations -->
          <div class="spritesheet-section">
            <h3 class="spritesheet-section-title">ANIMACIONES ({{ animations.length }})</h3>
            <div class="spritesheet-anim-list">
              <div
                v-for="anim in animations"
                :key="anim.id"
                class="spritesheet-anim-item-extended"
                :class="{ editing: editingAnimationId === anim.id }"
              >
                <div class="spritesheet-anim-main">
                  <span class="anim-name">{{ anim.name }}</span>
                  <span class="anim-frames">{{ anim.frames?.length || 0 }}f</span>
                  <div class="anim-actions">
                    <button class="anim-action-btn" @click="editAnimation(anim)" title="Editar">✏️</button>
                    <button class="anim-action-btn" @click="openAssignModal(anim.id)" title="Asignar">👤</button>
                    <button class="anim-action-btn delete" @click="deleteAnimation(anim.id)" title="Eliminar">🗑</button>
                  </div>
                </div>
                <div class="spritesheet-anim-usage" v-if="getAnimationUsage(anim.id).length > 0">
                  <span
                    v-for="usage in getAnimationUsage(anim.id)"
                    :key="`${usage.actorId}-${usage.state}`"
                    class="spritesheet-usage-tag"
                  >
                    {{ usage.stateIcon }} {{ usage.actorName }}
                  </span>
                </div>
                <div class="spritesheet-anim-usage" v-else>
                  <span class="spritesheet-usage-tag unused">Sin asignar</span>
                </div>
              </div>
              <p v-if="animations.length === 0" class="spritesheet-empty">Sin animaciones</p>
            </div>
          </div>
        </aside>
      </div>

      <!-- Assign to Actor Modal -->
      <div v-if="showAssignModal" class="assign-actor-modal-overlay" @click.self="skipAssign">
        <div class="assign-actor-modal">
          <h3 class="assign-actor-title">Asignar a Actor</h3>
          <p class="assign-actor-hint">Selecciona un actor y estado:</p>
          <label class="mirror-mode-toggle">
            <input type="checkbox" v-model="assignMirrorMode" />
            <span class="mirror-label">🪞 Modo Espejo</span>
          </label>
          <div class="assign-actor-content">
            <div class="assign-actor-actors">
              <h4>Actores</h4>
              <div v-for="actor in actors" :key="actor.id" class="assign-actor-item">
                <span class="actor-name">{{ actor.name }}</span>
                <div class="actor-states">
                  <button
                    v-for="state in actorAnimationStates"
                    :key="state.key"
                    class="state-btn"
                    :class="{
                      assigned: getAnimationIdFromAssignment(actor.animations?.[state.key]),
                      mirrored: isAnimationMirrored(actor.animations?.[state.key])
                    }"
                    :title="getStateButtonTitle(actor, state)"
                    @click="assignToActor(actor.id, state.key)"
                  >
                    {{ state.icon }}
                    <span v-if="isAnimationMirrored(actor.animations?.[state.key])" class="mirror-indicator">🪞</span>
                  </button>
                </div>
              </div>
            </div>
            <p v-if="actors.length === 0" class="no-actors-hint">No hay actores definidos.</p>
          </div>
          <div class="assign-actor-actions">
            <button class="assign-skip-btn" @click="skipAssign">Omitir</button>
          </div>
        </div>
      </div>

      <!-- Preview Footer -->
      <footer class="spritesheet-footer" v-if="currentAnimation.frames.length > 0">
        <div class="preview-controls">
          <button class="preview-btn" @click="togglePreview">{{ previewPlaying ? '⏹' : '▶' }}</button>
          <span class="preview-info">Frame: {{ previewFrame + 1 }}/{{ currentAnimation.frames.length }}</span>
          <div class="preview-progress">
            <div class="preview-progress-bar" :style="{ width: ((previewFrame + 1) / currentAnimation.frames.length * 100) + '%' }"></div>
          </div>
        </div>
        <div class="preview-canvas-container" v-if="previewFrameData">
          <canvas
            ref="previewCanvasRef"
            class="preview-frame-canvas"
            :width="previewFrameData.frameW"
            :height="previewFrameData.frameH"
            :style="{ width: previewFrameData.frameW + 'px', height: previewFrameData.frameH + 'px', imageRendering: 'pixelated' }"
          ></canvas>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.spritesheet-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spritesheet-editor-modal {
  background: var(--bg-dark, #0f0f23);
  border: 4px solid var(--primary, #c9a227);
  width: 95%;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 40px rgba(201, 162, 39, 0.3);
}

.spritesheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-medium, #1a1a2e);
  border-bottom: 4px solid var(--primary, #c9a227);
}

.spritesheet-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: var(--primary, #c9a227);
  margin: 0;
}

.spritesheet-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #888);
  font-size: 20px;
  cursor: pointer;
}

.spritesheet-close-btn:hover {
  color: var(--error, #ff4757);
}

.spritesheet-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.spritesheet-canvas-area {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spritesheet-source-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.source-tab {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  padding: 10px 16px;
  background: var(--bg-medium, #1a1a2e);
  border: 2px solid var(--border-color, #333355);
  color: var(--text-muted, #888);
  cursor: pointer;
  transition: all 0.15s;
}

.source-tab:hover,
.source-tab.active {
  border-color: var(--accent, #00d4ff);
  color: var(--accent, #00d4ff);
}

.spritesheet-dropzone {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  border: 3px dashed var(--border-color, #333355);
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.spritesheet-dropzone:hover {
  border-color: var(--accent, #00d4ff);
  background: rgba(0, 212, 255, 0.05);
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dropzone-icon {
  font-size: 40px;
}

.dropzone-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--text-primary, #e0e0e0);
}

.dropzone-subtext {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
}

.spritesheet-asset-picker {
  width: 100%;
  max-width: 600px;
}

.asset-picker-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #888);
  margin-bottom: 12px;
}

.asset-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.asset-picker-item {
  background: var(--bg-medium, #1a1a2e);
  border: 2px solid var(--border-color, #333355);
  padding: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}

.asset-picker-item:hover,
.asset-picker-item.selected {
  border-color: var(--accent, #00d4ff);
}

.asset-picker-preview {
  width: 80px;
  height: 80px;
  margin: 0 auto 8px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: var(--bg-card, #1e1e3f);
}

.asset-picker-name {
  display: block;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-primary, #e0e0e0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-picker-size {
  display: block;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #888);
}

.asset-picker-empty {
  text-align: center;
  color: var(--text-muted, #888);
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  padding: 20px;
}

.asset-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.spritesheet-grid-container {
  overflow: auto;
  max-width: 100%;
  max-height: 100%;
  border: 2px solid var(--border-color, #333355);
}

.spritesheet-grid {
  position: relative;
  image-rendering: pixelated;
  background-color: #222;
}

.frame-cell {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  transition: all 0.1s;
  box-sizing: border-box;
}

.frame-cell:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: var(--accent, #00d4ff);
}

.frame-cell.selected {
  background: rgba(0, 255, 136, 0.3);
  border: 2px solid var(--success, #00ff88);
}

.frame-number {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 4px;
}

.spritesheet-panel {
  width: 280px;
  background: var(--bg-medium, #1a1a2e);
  border-left: 4px solid var(--border-color, #333355);
  overflow-y: auto;
  flex-shrink: 0;
}

.spritesheet-section {
  padding: 12px;
  border-bottom: 2px solid var(--border-color, #333355);
}

.spritesheet-section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--accent, #00d4ff);
  margin: 0 0 12px 0;
}

.spritesheet-form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.spritesheet-form-row label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  width: 60px;
  flex-shrink: 0;
}

.spritesheet-input {
  flex: 1;
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  color: var(--text-primary, #e0e0e0);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  padding: 6px 8px;
  outline: none;
}

.spritesheet-input:focus {
  border-color: var(--accent, #00d4ff);
}

.spritesheet-btn-mini {
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  color: var(--text-primary, #e0e0e0);
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
}

.spritesheet-btn-mini:hover {
  border-color: var(--accent, #00d4ff);
}

.spritesheet-details {
  margin-top: 8px;
}

.spritesheet-details summary {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 4px;
}

.spritesheet-info-dims {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  margin-top: 8px;
}

.size-mismatch {
  color: var(--warning, #ffaa00);
}

.spritesheet-info {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #888);
  margin-bottom: 8px;
}

.spritesheet-btn-row {
  display: flex;
  gap: 8px;
}

.spritesheet-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  padding: 8px 12px;
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  color: var(--text-primary, #e0e0e0);
  cursor: pointer;
  transition: all 0.15s;
}

.spritesheet-btn:hover:not(:disabled) {
  border-color: var(--accent, #00d4ff);
}

.spritesheet-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spritesheet-btn-primary {
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--accent, #00d4ff);
  width: 100%;
  margin-top: 8px;
}

.spritesheet-btn-success {
  background: var(--success, #00ff88);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--success, #00ff88);
}

.spritesheet-btn-warning {
  background: var(--warning, #ffaa00);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--warning, #ffaa00);
}

.spritesheet-checkbox-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.spritesheet-checkbox-row label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  display: flex;
  align-items: center;
  gap: 4px;
}

.editing-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--warning, #ffaa00);
  margin-top: 8px;
}

.spritesheet-anim-list {
  max-height: 200px;
  overflow-y: auto;
}

.spritesheet-anim-item-extended {
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  margin-bottom: 8px;
  padding: 8px;
}

.spritesheet-anim-item-extended.editing {
  border-color: var(--warning, #ffaa00);
}

.spritesheet-anim-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.anim-name {
  flex: 1;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-primary, #e0e0e0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.anim-frames {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
}

.anim-actions {
  display: flex;
  gap: 4px;
}

.anim-action-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
  opacity: 0.7;
}

.anim-action-btn:hover {
  opacity: 1;
}

.anim-action-btn.delete:hover {
  color: var(--error, #ff4757);
}

.spritesheet-anim-usage {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.spritesheet-usage-tag {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  background: var(--bg-medium, #1a1a2e);
  color: var(--text-muted, #888);
  padding: 2px 6px;
  border-radius: 2px;
}

.spritesheet-usage-tag.unused {
  color: var(--warning, #ffaa00);
}

.spritesheet-empty {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #888);
  text-align: center;
  padding: 16px;
}

/* Assign Actor Modal */
.assign-actor-modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.assign-actor-modal {
  background: var(--bg-dark, #0f0f23);
  border: 4px solid var(--accent, #00d4ff);
  padding: 20px;
  max-width: 500px;
  max-height: 80%;
  overflow-y: auto;
}

.assign-actor-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--accent, #00d4ff);
  margin: 0 0 12px 0;
}

.assign-actor-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #888);
  margin-bottom: 12px;
}

.mirror-mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  cursor: pointer;
}

.mirror-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-primary, #e0e0e0);
}

.assign-actor-content {
  max-height: 300px;
  overflow-y: auto;
}

.assign-actor-actors h4 {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--primary, #c9a227);
  margin: 0 0 12px 0;
}

.assign-actor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: var(--bg-medium, #1a1a2e);
  margin-bottom: 8px;
  border: 2px solid var(--border-color, #333355);
}

.actor-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-primary, #e0e0e0);
}

.actor-states {
  display: flex;
  gap: 4px;
}

.state-btn {
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  font-size: 14px;
  padding: 4px 6px;
  cursor: pointer;
  position: relative;
}

.state-btn:hover {
  border-color: var(--accent, #00d4ff);
}

.state-btn.assigned {
  border-color: var(--success, #00ff88);
  background: rgba(0, 255, 136, 0.1);
}

.state-btn.mirrored::after {
  content: '';
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: var(--warning, #ffaa00);
  border-radius: 50%;
}

.mirror-indicator {
  font-size: 8px;
  position: absolute;
  top: -4px;
  right: -4px;
}

.no-actors-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #888);
  text-align: center;
  padding: 20px;
}

.assign-actor-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.assign-skip-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  padding: 10px 20px;
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  color: var(--text-primary, #e0e0e0);
  cursor: pointer;
}

.assign-skip-btn:hover {
  border-color: var(--accent, #00d4ff);
}

/* Preview Footer */
.spritesheet-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--bg-medium, #1a1a2e);
  border-top: 4px solid var(--border-color, #333355);
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
  border: none;
  font-size: 14px;
  cursor: pointer;
}

.preview-info {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #888);
}

.preview-progress {
  width: 100px;
  height: 8px;
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
}

.preview-progress-bar {
  height: 100%;
  background: var(--accent, #00d4ff);
  transition: width 0.1s;
}

.preview-canvas-container {
  position: relative;
  border: 2px solid var(--border-color, #333355);
  background: var(--bg-card, #1e1e3f);
}

.preview-frame-canvas {
  display: block;
}
</style>
