<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

// Import styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const router = useRouter()
const route = useRoute()

// Vue Flow instance
const { onConnect, addEdges, onNodesChange, onEdgesChange, applyNodeChanges, applyEdgeChanges } = useVueFlow()

// LocalStorage keys
const STORAGE_PREFIX = 'pixel-forge-'
const getProjectStorageKey = (id) => `${STORAGE_PREFIX}project-${id}`

// Project data
const project = ref(null)
const projectId = ref(null)
const saveStatus = ref('saved')
let autoSaveTimeout = null

// Chapter colors for grouping
const chapterColors = [
  { id: 'chapter-1', name: 'Chapter 1', color: '#FFD700' },
  { id: 'chapter-2', name: 'Chapter 2', color: '#00CED1' },
  { id: 'chapter-3', name: 'Chapter 3', color: '#FF6B6B' },
  { id: 'chapter-4', name: 'Chapter 4', color: '#98D8AA' },
  { id: 'chapter-5', name: 'Chapter 5', color: '#DDA0DD' },
]

// Connection types
const connectionTypes = [
  { id: 'normal', name: 'Normal Exit', icon: '→', color: '#888' },
  { id: 'bidirectional', name: 'Bidirectional', icon: '↔', color: '#FFD700' },
  { id: 'requires-item', name: 'Requires Item', icon: '🔑', color: '#FF6B6B' },
  { id: 'requires-puzzle', name: 'Requires Puzzle', icon: '🧩', color: '#00CED1' },
  { id: 'cutscene', name: 'Triggers Cutscene', icon: '🎬', color: '#DDA0DD' },
]

// Scene nodes and edges (synced with project)
const nodes = ref([])
const edges = ref([])

// Selected node/edge for properties panel
const selectedNode = ref(null)
const selectedEdge = ref(null)

// Load project from localStorage
const loadProject = () => {
  const id = route.params.projectId
  if (!id) {
    router.push('/projects')
    return
  }

  projectId.value = id
  const key = getProjectStorageKey(id)
  const stored = localStorage.getItem(key)

  if (stored) {
    try {
      project.value = JSON.parse(stored)
      generateNodesFromScenes()
      generateEdgesFromExits()
    } catch (e) {
      console.error('Failed to load project:', e)
      router.push('/projects')
    }
  } else {
    router.push('/projects')
  }
}

// Generate Vue Flow nodes from project scenes
const generateNodesFromScenes = () => {
  if (!project.value?.scenes) return

  nodes.value = project.value.scenes.map((scene, index) => {
    // Use stored position or calculate grid position
    const storedPos = scene.mapPosition || { x: 150 + (index % 4) * 250, y: 100 + Math.floor(index / 4) * 200 }

    return {
      id: `scene-${scene.id}`,
      type: 'sceneNode',
      position: storedPos,
      data: {
        sceneId: scene.id,
        name: scene.name,
        chapter: scene.chapter || 'chapter-1',
        status: scene.status || 'draft',
        thumbnail: getSceneThumbnail(scene),
        elementCounts: {
          actors: scene.actorPlacements?.length || 0,
          exits: scene.exits?.length || 0,
          hotspots: scene.hotspots?.length || 0,
          walkboxes: scene.walkboxes?.length || 0
        }
      }
    }
  })
}

// Generate Vue Flow edges from scene exits
const generateEdgesFromExits = () => {
  if (!project.value?.scenes) return

  const newEdges = []

  project.value.scenes.forEach(scene => {
    if (!scene.exits) return

    scene.exits.forEach(exit => {
      if (exit.targetScene) {
        // Check if target scene exists
        const targetExists = project.value.scenes.some(s => s.id === exit.targetScene)
        if (targetExists) {
          newEdges.push({
            id: `edge-${scene.id}-${exit.id}`,
            source: `scene-${scene.id}`,
            target: `scene-${exit.targetScene}`,
            type: 'smoothstep',
            animated: exit.connectionType && ['requires-item', 'requires-puzzle', 'cutscene'].includes(exit.connectionType),
            label: exit.name,
            data: {
              exitId: exit.id,
              sourceSceneId: scene.id,
              connectionType: exit.connectionType || 'normal'
            }
          })
        }
      }
    })
  })

  edges.value = newEdges
}

// Get scene thumbnail (from background asset)
const getSceneThumbnail = (scene) => {
  if (!scene.background || !project.value?.globalData?.assets) return null
  const asset = project.value.globalData.assets.find(a => a.id === scene.background)
  return asset?.data || null
}

// Get asset by ID
const getAssetById = (assetId) => {
  return project.value?.globalData?.assets?.find(a => a.id === assetId)
}

// Save project to localStorage
const saveProject = () => {
  if (!project.value || !projectId.value) return

  try {
    saveStatus.value = 'saving'
    const key = getProjectStorageKey(projectId.value)
    localStorage.setItem(key, JSON.stringify(project.value))
    saveStatus.value = 'saved'
  } catch (e) {
    console.error('Failed to save project:', e)
    saveStatus.value = 'unsaved'
  }
}

// Update scene map positions in project
const updateScenePositions = () => {
  if (!project.value?.scenes) return

  nodes.value.forEach(node => {
    const sceneId = node.data.sceneId
    const scene = project.value.scenes.find(s => s.id === sceneId)
    if (scene) {
      scene.mapPosition = { x: node.position.x, y: node.position.y }
    }
  })

  // Trigger auto-save
  saveStatus.value = 'unsaved'
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
  autoSaveTimeout = setTimeout(saveProject, 1000)
}

// Handle node selection
const onNodeClick = (event) => {
  selectedNode.value = event.node
  selectedEdge.value = null
}

// Handle edge selection
const onEdgeClick = (event) => {
  selectedEdge.value = event.edge
  selectedNode.value = null
}

// Handle pane click (deselect)
const onPaneClick = () => {
  selectedNode.value = null
  selectedEdge.value = null
}

// Handle new connections (creates exit in source scene)
onConnect((params) => {
  const sourceSceneId = parseInt(params.source.replace('scene-', ''))
  const targetSceneId = parseInt(params.target.replace('scene-', ''))

  const sourceScene = project.value.scenes.find(s => s.id === sourceSceneId)
  const targetScene = project.value.scenes.find(s => s.id === targetSceneId)

  if (sourceScene && targetScene) {
    // Create new exit in source scene
    const newExit = {
      id: Date.now(),
      name: `Exit to ${targetScene.name}`,
      x: sourceScene.width / 2 - 50,
      y: sourceScene.height - 100,
      w: 100,
      h: 50,
      rotation: 0,
      targetScene: targetSceneId,
      connectionType: 'normal'
    }

    if (!sourceScene.exits) sourceScene.exits = []
    sourceScene.exits.push(newExit)

    // Add edge to view
    addEdges([{
      id: `edge-${sourceSceneId}-${newExit.id}`,
      source: params.source,
      target: params.target,
      type: 'smoothstep',
      animated: false,
      label: newExit.name,
      data: {
        exitId: newExit.id,
        sourceSceneId: sourceSceneId,
        connectionType: 'normal'
      }
    }])

    saveStatus.value = 'unsaved'
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(saveProject, 1000)
  }
})

// Handle node changes (position updates)
onNodesChange((changes) => {
  applyNodeChanges(changes)

  // Check if any position changed
  const positionChange = changes.find(c => c.type === 'position' && c.position)
  if (positionChange) {
    updateScenePositions()
  }
})

// Handle edge changes
onEdgesChange((changes) => {
  applyEdgeChanges(changes)
})

// Add new scene
const addNewScene = () => {
  if (!project.value) return

  const newSceneId = Date.now()
  const newScene = {
    id: newSceneId,
    name: `Scene ${project.value.scenes.length + 1}`,
    width: 1920,
    height: 1080,
    background: null,
    chapter: 'chapter-1',
    status: 'draft',
    mapPosition: { x: 250, y: 250 },
    images: [],
    walkboxes: [],
    exits: [],
    actorPlacements: [],
    hotspots: [],
    zplanes: [],
    dialogs: [],
    puzzles: [],
    sfx: [],
    music: [],
    cutscenes: [],
    animations: []
  }

  project.value.scenes.push(newScene)

  // Add node to view
  nodes.value.push({
    id: `scene-${newSceneId}`,
    type: 'sceneNode',
    position: { x: 250, y: 250 },
    data: {
      sceneId: newSceneId,
      name: newScene.name,
      chapter: newScene.chapter,
      status: newScene.status,
      thumbnail: null,
      elementCounts: { actors: 0, exits: 0, hotspots: 0, walkboxes: 0 }
    }
  })

  saveStatus.value = 'unsaved'
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
  autoSaveTimeout = setTimeout(saveProject, 1000)
}

// Delete selected node (and scene)
const deleteSelectedNode = () => {
  if (!selectedNode.value || !project.value) return

  const sceneId = selectedNode.value.data.sceneId

  // Don't allow deleting if it's the only scene
  if (project.value.scenes.length <= 1) {
    alert('Cannot delete the last scene')
    return
  }

  // Remove scene from project
  project.value.scenes = project.value.scenes.filter(s => s.id !== sceneId)

  // Remove all exits pointing to this scene
  project.value.scenes.forEach(scene => {
    if (scene.exits) {
      scene.exits = scene.exits.filter(e => e.targetScene !== sceneId)
    }
  })

  // Update current scene if needed
  if (project.value.currentSceneId === sceneId) {
    project.value.currentSceneId = project.value.scenes[0].id
  }

  // Remove node and related edges
  const nodeId = selectedNode.value.id
  nodes.value = nodes.value.filter(n => n.id !== nodeId)
  edges.value = edges.value.filter(e => e.source !== nodeId && e.target !== nodeId)

  selectedNode.value = null

  saveStatus.value = 'unsaved'
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
  autoSaveTimeout = setTimeout(saveProject, 1000)
}

// Delete selected edge (and exit)
const deleteSelectedEdge = () => {
  if (!selectedEdge.value || !project.value) return

  const { sourceSceneId, exitId } = selectedEdge.value.data

  // Find and remove exit from source scene
  const sourceScene = project.value.scenes.find(s => s.id === sourceSceneId)
  if (sourceScene?.exits) {
    sourceScene.exits = sourceScene.exits.filter(e => e.id !== exitId)
  }

  // Remove edge from view
  edges.value = edges.value.filter(e => e.id !== selectedEdge.value.id)
  selectedEdge.value = null

  saveStatus.value = 'unsaved'
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
  autoSaveTimeout = setTimeout(saveProject, 1000)
}

// Update node data
const updateNodeData = (key, value) => {
  if (!selectedNode.value || !project.value) return

  const sceneId = selectedNode.value.data.sceneId
  const scene = project.value.scenes.find(s => s.id === sceneId)

  if (scene) {
    scene[key] = value

    // Update node data
    const node = nodes.value.find(n => n.id === selectedNode.value.id)
    if (node) {
      node.data[key] = value
    }

    saveStatus.value = 'unsaved'
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(saveProject, 1000)
  }
}

// Update edge/exit data
const updateEdgeData = (key, value) => {
  if (!selectedEdge.value || !project.value) return

  const { sourceSceneId, exitId } = selectedEdge.value.data
  const sourceScene = project.value.scenes.find(s => s.id === sourceSceneId)
  const exit = sourceScene?.exits?.find(e => e.id === exitId)

  if (exit) {
    if (key === 'connectionType') {
      exit.connectionType = value
      // Update edge animation
      const edge = edges.value.find(e => e.id === selectedEdge.value.id)
      if (edge) {
        edge.animated = ['requires-item', 'requires-puzzle', 'cutscene'].includes(value)
        edge.data.connectionType = value
      }
    } else if (key === 'name') {
      exit.name = value
      // Update edge label
      const edge = edges.value.find(e => e.id === selectedEdge.value.id)
      if (edge) {
        edge.label = value
      }
    }

    saveStatus.value = 'unsaved'
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(saveProject, 1000)
  }
}

// Get chapter color
const getChapterColor = (chapterId) => {
  const chapter = chapterColors.find(c => c.id === chapterId)
  return chapter ? chapter.color : '#888'
}

// Get status icon
const getStatusIcon = (status) => {
  switch (status) {
    case 'complete': return '✓'
    case 'in-progress': return '◐'
    case 'draft': return '○'
    default: return '○'
  }
}

// Open scene in editor
const openSceneEditor = (sceneId) => {
  // Set current scene before navigating
  if (project.value) {
    project.value.currentSceneId = sceneId
    saveProject()
  }
  router.push(`/editor/${projectId.value}`)
}

// Lifecycle
onMounted(() => {
  loadProject()
})

onUnmounted(() => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
    if (saveStatus.value === 'unsaved') {
      saveProject()
    }
  }
})
</script>

<template>
  <div class="scene-map-container">
    <!-- Header -->
    <header class="map-header">
      <div class="header-left">
        <button class="back-btn" @click="router.push(`/editor/${projectId}`)">← EDITOR</button>
        <h1 class="map-title">
          <span class="text-gold">SCENE</span>
          <span class="text-accent">MAP</span>
        </h1>
        <span v-if="project" class="project-name">{{ project.name }}</span>
      </div>
      <div class="header-center">
        <button class="action-btn" @click="addNewScene">+ ADD SCENE</button>
      </div>
      <div class="header-right">
        <div class="save-status" :class="saveStatus">
          <span class="save-indicator"></span>
          <span class="save-text">{{ saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved' }}</span>
        </div>
        <span class="pixel-font-sm text-muted">{{ nodes.length }} scenes</span>
      </div>
    </header>

    <!-- Main content -->
    <div class="map-content">
      <!-- Vue Flow Canvas -->
      <div class="flow-container">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :default-viewport="{ zoom: 1, x: 0, y: 0 }"
          :min-zoom="0.2"
          :max-zoom="2"
          :connect-on-click="true"
          connection-mode="loose"
          fit-view-on-init
          @node-click="onNodeClick"
          @edge-click="onEdgeClick"
          @pane-click="onPaneClick"
        >
          <!-- Custom Scene Node -->
          <template #node-sceneNode="{ data, id }">
            <div
              class="scene-node"
              :style="{ borderColor: getChapterColor(data.chapter) }"
              @dblclick="openSceneEditor(data.sceneId)"
            >
              <!-- Connection Handles -->
              <Handle id="left-target" type="target" :position="Position.Left" />
              <Handle id="left-source" type="source" :position="Position.Left" />
              <Handle id="right-target" type="target" :position="Position.Right" />
              <Handle id="right-source" type="source" :position="Position.Right" />
              <Handle id="top-target" type="target" :position="Position.Top" />
              <Handle id="top-source" type="source" :position="Position.Top" />
              <Handle id="bottom-target" type="target" :position="Position.Bottom" />
              <Handle id="bottom-source" type="source" :position="Position.Bottom" />

              <div class="node-thumbnail">
                <img v-if="data.thumbnail" :src="data.thumbnail" alt="Scene thumbnail" />
                <span v-else class="no-thumbnail">🎬</span>
              </div>
              <div class="node-info">
                <span class="node-name">{{ data.name }}</span>
                <span class="node-status" :class="data.status">
                  {{ getStatusIcon(data.status) }}
                </span>
              </div>
              <div class="node-counts">
                <span title="Actors">👤 {{ data.elementCounts?.actors || 0 }}</span>
                <span title="Exits">🚪 {{ data.elementCounts?.exits || 0 }}</span>
                <span title="Hotspots">🔍 {{ data.elementCounts?.hotspots || 0 }}</span>
              </div>
              <div
                class="node-chapter-indicator"
                :style="{ backgroundColor: getChapterColor(data.chapter) }"
              ></div>
            </div>
          </template>

          <!-- Background -->
          <Background
            :gap="20"
            :size="1"
            pattern-color="rgba(255, 215, 0, 0.1)"
          />

          <!-- Controls -->
          <Controls position="bottom-left" />

          <!-- MiniMap -->
          <MiniMap
            position="bottom-right"
            :pannable="true"
            :zoomable="true"
          />
        </VueFlow>
      </div>

      <!-- Properties Panel -->
      <aside class="properties-panel">
        <h2 class="panel-title">Properties</h2>

        <!-- No selection -->
        <div v-if="!selectedNode && !selectedEdge" class="no-selection">
          <p class="pixel-font-sm text-muted">Select a scene or connection to edit</p>
          <div class="tips">
            <p class="tip">💡 Double-click a scene to edit it</p>
            <p class="tip">💡 Drag between handles to create connections</p>
            <p class="tip">💡 Connections create exits in scenes</p>
          </div>
        </div>

        <!-- Node properties -->
        <div v-else-if="selectedNode" class="node-properties">
          <div class="property-group">
            <label>Scene Name</label>
            <input
              type="text"
              :value="selectedNode.data.name"
              @input="updateNodeData('name', $event.target.value)"
              class="property-input"
            />
          </div>

          <div class="property-group">
            <label>Chapter</label>
            <select
              :value="selectedNode.data.chapter"
              @change="updateNodeData('chapter', $event.target.value)"
              class="property-select"
            >
              <option
                v-for="chapter in chapterColors"
                :key="chapter.id"
                :value="chapter.id"
              >
                {{ chapter.name }}
              </option>
            </select>
          </div>

          <div class="property-group">
            <label>Status</label>
            <select
              :value="selectedNode.data.status"
              @change="updateNodeData('status', $event.target.value)"
              class="property-select"
            >
              <option value="draft">Draft</option>
              <option value="in-progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          <div class="scene-stats">
            <h4>Scene Contents</h4>
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-value">{{ selectedNode.data.elementCounts?.actors || 0 }}</span>
                <span class="stat-label">Actors</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ selectedNode.data.elementCounts?.exits || 0 }}</span>
                <span class="stat-label">Exits</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ selectedNode.data.elementCounts?.hotspots || 0 }}</span>
                <span class="stat-label">Hotspots</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ selectedNode.data.elementCounts?.walkboxes || 0 }}</span>
                <span class="stat-label">Walkboxes</span>
              </div>
            </div>
          </div>

          <div class="property-actions">
            <button class="edit-btn" @click="openSceneEditor(selectedNode.data.sceneId)">
              EDIT SCENE
            </button>
            <button class="delete-btn" @click="deleteSelectedNode">
              DELETE SCENE
            </button>
          </div>
        </div>

        <!-- Edge properties -->
        <div v-else-if="selectedEdge" class="edge-properties">
          <div class="property-group">
            <label>Exit Name</label>
            <input
              type="text"
              :value="selectedEdge.label || ''"
              @input="updateEdgeData('name', $event.target.value)"
              class="property-input"
              placeholder="e.g. Door to hallway"
            />
          </div>

          <div class="property-group">
            <label>Connection Type</label>
            <select
              :value="selectedEdge.data?.connectionType || 'normal'"
              @change="updateEdgeData('connectionType', $event.target.value)"
              class="property-select"
            >
              <option
                v-for="type in connectionTypes"
                :key="type.id"
                :value="type.id"
              >
                {{ type.icon }} {{ type.name }}
              </option>
            </select>
          </div>

          <div class="edge-info">
            <p class="pixel-font-sm text-muted">
              This exit links two scenes. Edit the exit's position and size in the Scene Editor.
            </p>
          </div>

          <div class="property-actions">
            <button class="delete-btn" @click="deleteSelectedEdge">
              DELETE CONNECTION
            </button>
          </div>
        </div>

        <!-- Legend -->
        <div class="legend">
          <h3 class="legend-title">Legend</h3>
          <div class="legend-section">
            <h4>Chapters</h4>
            <div
              v-for="chapter in chapterColors"
              :key="chapter.id"
              class="legend-item"
            >
              <span
                class="legend-color"
                :style="{ backgroundColor: chapter.color }"
              ></span>
              <span>{{ chapter.name }}</span>
            </div>
          </div>
          <div class="legend-section">
            <h4>Connections</h4>
            <div
              v-for="type in connectionTypes"
              :key="type.id"
              class="legend-item"
            >
              <span class="legend-icon">{{ type.icon }}</span>
              <span>{{ type.name }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.scene-map-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-dark);
  color: var(--text-primary);
}

/* Header */
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-medium);
  border-bottom: 2px solid var(--primary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.back-btn {
  background: transparent;
  border: 2px solid var(--primary);
  color: var(--primary);
  padding: var(--space-xs) var(--space-md);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: var(--primary);
  color: var(--bg-dark);
}

.map-title {
  font-size: 16px;
  margin: 0;
}

.project-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--text-muted);
  padding: 4px 8px;
  background: var(--bg-dark);
  border-radius: 4px;
}

.header-center {
  display: flex;
  gap: var(--space-md);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.action-btn {
  background: var(--accent);
  border: none;
  color: var(--bg-dark);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--accent-light);
  transform: scale(1.05);
}

/* Save Status */
.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 8px;
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
}

.save-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.save-status.saved .save-indicator { background: var(--success); }
.save-status.saving .save-indicator { background: var(--warning); animation: pulse 1s infinite; }
.save-status.unsaved .save-indicator { background: var(--error); }

.save-text {
  font-family: 'Press Start 2P', monospace;
  color: var(--text-muted);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Main content */
.map-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Flow container */
.flow-container {
  flex: 1;
  background: var(--bg-dark);
}

/* Custom Scene Node */
.scene-node {
  background: var(--bg-medium);
  border: 3px solid var(--primary);
  border-radius: 8px;
  padding: 0;
  min-width: 160px;
  cursor: pointer;
  transition: all var(--transition-fast);
  overflow: hidden;
}

.scene-node:hover {
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
  border-color: var(--accent);
}

.node-thumbnail {
  width: 100%;
  height: 90px;
  background: var(--bg-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  overflow: hidden;
}

.node-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.no-thumbnail {
  opacity: 0.3;
}

.node-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm);
  background: var(--bg-medium);
}

.node-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 110px;
}

.node-status {
  font-size: 12px;
}

.node-status.complete { color: var(--success); }
.node-status.in-progress { color: var(--warning); }
.node-status.draft { color: var(--text-muted); }

.node-counts {
  display: flex;
  justify-content: space-around;
  padding: 4px 8px;
  background: var(--bg-dark);
  font-size: 8px;
  color: var(--text-muted);
}

.node-counts span {
  display: flex;
  align-items: center;
  gap: 2px;
}

.node-chapter-indicator {
  height: 4px;
  width: 100%;
}

/* Properties Panel */
.properties-panel {
  width: 300px;
  background: var(--bg-medium);
  border-left: 2px solid var(--primary);
  padding: var(--space-md);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.panel-title {
  font-size: 12px;
  color: var(--primary);
  margin: 0;
  padding-bottom: var(--space-sm);
  border-bottom: 2px solid var(--bg-light);
}

.no-selection {
  padding: var(--space-md);
  text-align: center;
}

.tips {
  margin-top: var(--space-md);
  text-align: left;
}

.tip {
  font-size: 9px;
  color: var(--text-muted);
  margin: var(--space-xs) 0;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.property-group label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted);
}

.property-input,
.property-select {
  background: var(--bg-dark);
  border: 2px solid var(--bg-light);
  color: var(--text-primary);
  padding: var(--space-sm);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.property-input:focus,
.property-select:focus {
  outline: none;
  border-color: var(--accent);
}

.scene-stats {
  margin-top: var(--space-md);
  padding: var(--space-sm);
  background: var(--bg-dark);
  border-radius: 4px;
}

.scene-stats h4 {
  font-size: 8px;
  color: var(--text-muted);
  margin: 0 0 var(--space-sm) 0;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xs);
}

.stat-value {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: var(--accent);
}

.stat-label {
  font-size: 7px;
  color: var(--text-muted);
}

.edge-info {
  padding: var(--space-sm);
  background: var(--bg-dark);
  border-radius: 4px;
  margin-top: var(--space-sm);
}

.property-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.edit-btn {
  background: var(--accent);
  border: none;
  color: var(--bg-dark);
  padding: var(--space-sm);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  transition: all var(--transition-fast);
}

.edit-btn:hover {
  background: var(--accent-light);
}

.delete-btn {
  background: var(--error);
  border: none;
  color: white;
  padding: var(--space-sm);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  transition: all var(--transition-fast);
}

.delete-btn:hover {
  background: #ff1a1a;
}

/* Legend */
.legend {
  margin-top: auto;
  padding-top: var(--space-md);
  border-top: 2px solid var(--bg-light);
}

.legend-title {
  font-size: 10px;
  color: var(--primary);
  margin: 0 0 var(--space-sm) 0;
}

.legend-section {
  margin-bottom: var(--space-md);
}

.legend-section h4 {
  font-size: 8px;
  color: var(--text-muted);
  margin: 0 0 var(--space-xs) 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 9px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-icon {
  width: 16px;
  text-align: center;
}

/* Vue Flow overrides */
:deep(.vue-flow__node) {
  padding: 0;
  border-radius: 8px;
}

:deep(.vue-flow__node.selected) {
  box-shadow: 0 0 0 3px var(--accent);
}

:deep(.vue-flow__edge-path) {
  stroke: var(--primary);
  stroke-width: 2;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: var(--accent);
  stroke-width: 3;
}

:deep(.vue-flow__edge-text) {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  fill: var(--text-primary);
}

:deep(.vue-flow__edge-textbg) {
  fill: var(--bg-medium);
}

:deep(.vue-flow__handle) {
  width: 12px;
  height: 12px;
  background: var(--accent);
  border: 2px solid var(--bg-dark);
  opacity: 0.7;
  transition: opacity 0.15s, transform 0.15s;
}

:deep(.vue-flow__handle:hover) {
  opacity: 1;
  transform: scale(1.3);
}

:deep(.vue-flow__node:hover .vue-flow__handle) {
  opacity: 1;
}

:deep(.vue-flow__controls) {
  background: var(--bg-medium);
  border: 2px solid var(--primary);
  border-radius: 4px;
}

:deep(.vue-flow__controls-button) {
  background: var(--bg-medium);
  border-bottom: 1px solid var(--bg-light);
  color: var(--text-primary);
}

:deep(.vue-flow__controls-button:hover) {
  background: var(--bg-light);
}

:deep(.vue-flow__minimap) {
  background: var(--bg-medium);
  border: 2px solid var(--primary);
  border-radius: 4px;
}

:deep(.vue-flow__background) {
  background: var(--bg-dark);
}
</style>
