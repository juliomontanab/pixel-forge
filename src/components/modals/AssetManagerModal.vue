<script setup>
/**
 * AssetManagerModal.vue
 *
 * Modal for managing project assets with:
 * - Folder tree sidebar
 * - Upload zone with drag & drop
 * - Category filter and search
 * - Asset grid with preview
 */

import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  assets: { type: Array, default: () => [] },
  folders: { type: Array, default: () => [] },
  folderTree: { type: Object, default: () => ({ children: [] }) },
  selectedFolder: { type: String, default: '/' },
  filterCategory: { type: String, default: 'all' },
  searchQuery: { type: String, default: '' },
  uploadCategory: { type: String, default: 'background' },
  isUploading: { type: Boolean, default: false },
  uploadProgress: { type: Number, default: 0 },
  categories: { type: Array, default: () => ['background', 'sprite', 'object', 'ui'] },
  categoryLabels: { type: Object, default: () => ({
    background: 'Fondo',
    sprite: 'Sprite',
    object: 'Objeto',
    ui: 'UI'
  })},
  getAssetUrl: { type: Function, default: () => null },
  showSubfolders: { type: Boolean, default: true }
})

const emit = defineEmits([
  'close',
  'update:show',
  'update:selectedFolder',
  'update:filterCategory',
  'update:searchQuery',
  'update:uploadCategory',
  'update:showSubfolders',
  'create-folder',
  'rename-folder',
  'delete-folder',
  'upload-files',
  'delete-asset',
  'rename-asset',
  'move-asset'
])

// Local state
const showNewFolderInput = ref(false)
const newFolderName = ref('')
const renamingFolderId = ref(null)
const renamingFolderValue = ref('')
const isDraggingUpload = ref(false)
const newFolderInput = ref(null)

// Watch for show to reset state
watch(() => props.show, (newVal) => {
  if (!newVal) {
    showNewFolderInput.value = false
    newFolderName.value = ''
    renamingFolderId.value = null
  }
})

// Focus new folder input when shown
watch(showNewFolderInput, async (newVal) => {
  if (newVal) {
    await nextTick()
    newFolderInput.value?.focus()
  }
})

// Computed: filtered assets based on folder, category, and search
const filteredAssets = computed(() => {
  let result = props.assets

  // Filter by folder
  if (props.selectedFolder === '/') {
    if (!props.showSubfolders) {
      result = result.filter(a => !a.folderPath || a.folderPath === '/')
    }
  } else {
    if (props.showSubfolders) {
      result = result.filter(a => a.folderPath && a.folderPath.startsWith(props.selectedFolder))
    } else {
      result = result.filter(a => a.folderPath === props.selectedFolder)
    }
  }

  // Filter by category
  if (props.filterCategory !== 'all') {
    result = result.filter(a => a.category === props.filterCategory)
  }

  // Filter by search
  if (props.searchQuery) {
    const query = props.searchQuery.toLowerCase()
    result = result.filter(a => a.name?.toLowerCase().includes(query))
  }

  return result
})

// Computed: asset counts by category
const assetCounts = computed(() => {
  const counts = { all: props.assets.length }
  for (const cat of props.categories) {
    counts[cat] = props.assets.filter(a => a.category === cat).length
  }
  return counts
})

// Get folder asset count
const getFolderCount = (path, includeSubfolders) => {
  if (path === '/') {
    if (includeSubfolders) return props.assets.length
    return props.assets.filter(a => !a.folderPath || a.folderPath === '/').length
  }
  if (includeSubfolders) {
    return props.assets.filter(a => a.folderPath?.startsWith(path)).length
  }
  return props.assets.filter(a => a.folderPath === path).length
}

// Folder actions
const handleCreateFolder = () => {
  if (newFolderName.value.trim()) {
    emit('create-folder', newFolderName.value.trim(), props.selectedFolder)
    newFolderName.value = ''
    showNewFolderInput.value = false
  }
}

const startRenaming = (folder) => {
  renamingFolderId.value = folder.id
  renamingFolderValue.value = folder.name
}

const handleRename = (folderId) => {
  if (renamingFolderValue.value.trim()) {
    emit('rename-folder', folderId, renamingFolderValue.value.trim())
  }
  renamingFolderId.value = null
  renamingFolderValue.value = ''
}

const cancelRenaming = () => {
  renamingFolderId.value = null
  renamingFolderValue.value = ''
}

// Upload handlers
const fileInput = ref(null)

const onDragOver = (e) => {
  e.preventDefault()
  isDraggingUpload.value = true
}

const onDragLeave = () => {
  isDraggingUpload.value = false
}

const onDrop = (e) => {
  e.preventDefault()
  isDraggingUpload.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length > 0) {
    emit('upload-files', files)
  }
}

const onFileChange = (e) => {
  const files = Array.from(e.target?.files || [])
  if (files.length > 0) {
    emit('upload-files', files)
  }
  // Reset input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Asset drag & drop
const onAssetDragStart = (e, asset) => {
  e.dataTransfer.setData('assetId', asset.id.toString())
  e.dataTransfer.effectAllowed = 'move'
}

const onFolderDrop = (e, targetPath) => {
  e.preventDefault()
  const assetId = e.dataTransfer.getData('assetId')
  if (assetId) {
    emit('move-asset', parseInt(assetId), targetPath)
  }
}

// Close handler
const handleClose = () => {
  emit('close')
  emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay asset-manager-overlay" @click.self="handleClose">
      <div class="modal-content asset-manager-modal">
        <header class="modal-header">
          <h3>Asset Manager</h3>
          <button class="modal-close-btn" @click="handleClose">&#10005;</button>
        </header>

        <div class="modal-body asset-manager-body">
          <!-- Folder Sidebar -->
          <div class="folder-sidebar">
            <div class="folder-header">
              <span class="folder-title">Carpetas</span>
              <button
                class="folder-add-btn"
                @click="showNewFolderInput = !showNewFolderInput"
                title="Nueva carpeta"
              >+</button>
            </div>

            <!-- New Folder Input -->
            <div v-if="showNewFolderInput" class="new-folder-row">
              <input
                ref="newFolderInput"
                type="text"
                v-model="newFolderName"
                class="new-folder-input"
                placeholder="Nombre..."
                @keyup.enter="handleCreateFolder"
                @keyup.escape="showNewFolderInput = false; newFolderName = ''"
              />
              <button class="new-folder-ok" @click="handleCreateFolder">&#10003;</button>
              <button class="new-folder-cancel" @click="showNewFolderInput = false; newFolderName = ''">&#10005;</button>
            </div>

            <!-- Folder Tree -->
            <div class="folder-tree">
              <!-- Root -->
              <div
                class="folder-item"
                :class="{ selected: selectedFolder === '/' }"
                @click="$emit('update:selectedFolder', '/')"
                @dragover.prevent
                @drop.prevent="onFolderDrop($event, '/')"
              >
                <span class="folder-icon">&#128193;</span>
                <span class="folder-name">Raiz</span>
                <span class="folder-count">({{ getFolderCount('/', false) }})</span>
              </div>

              <!-- Folder children -->
              <template v-for="folder in folderTree.children" :key="folder.id">
                <div
                  class="folder-item folder-child"
                  :class="{ selected: selectedFolder === folder.path }"
                  @click="$emit('update:selectedFolder', folder.path)"
                  @dragover.prevent
                  @drop.prevent="onFolderDrop($event, folder.path)"
                >
                  <span class="folder-icon">{{ folder.icon || '&#128193;' }}</span>
                  <template v-if="renamingFolderId === folder.id">
                    <input
                      type="text"
                      v-model="renamingFolderValue"
                      class="folder-rename-input"
                      @keyup.enter="handleRename(folder.id)"
                      @keyup.escape="cancelRenaming"
                      @blur="handleRename(folder.id)"
                      @click.stop
                      autofocus
                    />
                  </template>
                  <template v-else>
                    <span class="folder-name" @dblclick.stop="startRenaming(folder)">{{ folder.name }}</span>
                    <span class="folder-count">({{ getFolderCount(folder.path, true) }})</span>
                    <div class="folder-actions">
                      <button class="folder-action-btn" @click.stop="startRenaming(folder)" title="Renombrar">&#9998;</button>
                      <button class="folder-action-btn" @click.stop="$emit('delete-folder', folder.id)" title="Eliminar">&#128465;</button>
                    </div>
                  </template>
                </div>

                <!-- Subfolders -->
                <template v-for="sub in folder.children" :key="sub.id">
                  <div
                    class="folder-item folder-subchild"
                    :class="{ selected: selectedFolder === sub.path }"
                    @click="$emit('update:selectedFolder', sub.path)"
                    @dragover.prevent
                    @drop.prevent="onFolderDrop($event, sub.path)"
                  >
                    <span class="folder-icon">{{ sub.icon || '&#128193;' }}</span>
                    <template v-if="renamingFolderId === sub.id">
                      <input
                        type="text"
                        v-model="renamingFolderValue"
                        class="folder-rename-input"
                        @keyup.enter="handleRename(sub.id)"
                        @keyup.escape="cancelRenaming"
                        @blur="handleRename(sub.id)"
                        @click.stop
                      />
                    </template>
                    <template v-else>
                      <span class="folder-name" @dblclick.stop="startRenaming(sub)">{{ sub.name }}</span>
                      <span class="folder-count">({{ getFolderCount(sub.path, true) }})</span>
                      <div class="folder-actions">
                        <button class="folder-action-btn" @click.stop="startRenaming(sub)" title="Renombrar">&#9998;</button>
                        <button class="folder-action-btn" @click.stop="$emit('delete-folder', sub.id)" title="Eliminar">&#128465;</button>
                      </div>
                    </template>
                  </div>
                </template>
              </template>
            </div>

            <!-- Subfolder toggle -->
            <label class="subfolder-toggle">
              <input
                type="checkbox"
                :checked="showSubfolders"
                @change="$emit('update:showSubfolders', $event.target.checked)"
              />
              <span>Incluir subcarpetas</span>
            </label>
          </div>

          <!-- Main Content -->
          <div class="asset-main">
            <!-- Category Selector -->
            <div class="category-selector">
              <label class="category-label">Subir como:</label>
              <div class="category-buttons">
                <button
                  v-for="cat in categories"
                  :key="cat"
                  class="category-btn"
                  :class="{ active: uploadCategory === cat }"
                  @click="$emit('update:uploadCategory', cat)"
                >
                  {{ categoryLabels[cat] || cat }}
                </button>
              </div>
              <span class="upload-hint">en {{ selectedFolder === '/' ? 'Raiz' : selectedFolder }}</span>
            </div>

            <!-- Upload Zone -->
            <div
              class="upload-zone"
              :class="{ dragging: isDraggingUpload, uploading: isUploading }"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
              @click="!isUploading && fileInput?.click()"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                style="display: none"
                @change="onFileChange"
                :disabled="isUploading"
              />
              <div v-if="isUploading" class="upload-content uploading">
                <span class="upload-icon">&#8987;</span>
                <span class="upload-text">Subiendo a S3...</span>
                <div class="upload-progress-bar">
                  <div class="upload-progress-fill" :style="{ width: uploadProgress + '%' }"></div>
                </div>
                <span class="upload-percent">{{ uploadProgress }}%</span>
              </div>
              <div v-else class="upload-content">
                <span class="upload-icon">&#128193;</span>
                <span class="upload-text">Arrastra imagenes aqui o haz clic</span>
                <span class="upload-hint-text">PNG, JPG, GIF soportados (max 10MB)</span>
              </div>
            </div>

            <!-- Filter Bar -->
            <div class="filter-bar">
              <div class="filter-tabs">
                <button
                  class="filter-tab"
                  :class="{ active: filterCategory === 'all' }"
                  @click="$emit('update:filterCategory', 'all')"
                >
                  Todas ({{ assetCounts.all }})
                </button>
                <button
                  v-for="cat in categories"
                  :key="cat"
                  class="filter-tab"
                  :class="{ active: filterCategory === cat }"
                  @click="$emit('update:filterCategory', cat)"
                >
                  {{ categoryLabels[cat] || cat }} ({{ assetCounts[cat] || 0 }})
                </button>
              </div>
              <input
                type="text"
                :value="searchQuery"
                @input="$emit('update:searchQuery', $event.target.value)"
                class="search-input"
                placeholder="Buscar..."
              />
            </div>

            <!-- Asset Grid -->
            <div class="asset-grid">
              <div
                v-for="asset in filteredAssets"
                :key="asset.id"
                class="asset-item"
                :class="{ 's3-asset': asset.s3Key }"
                draggable="true"
                @dragstart="onAssetDragStart($event, asset)"
              >
                <div
                  class="asset-preview"
                  :style="{ backgroundImage: getAssetUrl(asset) ? `url(${getAssetUrl(asset)})` : 'none' }"
                >
                  <span v-if="!getAssetUrl(asset)" class="asset-loading">&#8987;</span>
                  <span v-if="asset.s3Key" class="s3-badge" title="Almacenado en S3">&#9729;</span>
                </div>
                <div class="asset-info">
                  <input
                    type="text"
                    :value="asset.name"
                    class="asset-name-input"
                    @click.stop
                    @blur="$emit('rename-asset', asset.id, $event.target.value)"
                  />
                  <div class="asset-meta">
                    <span class="asset-size">{{ asset.width }}x{{ asset.height }}</span>
                    <span v-if="asset.category" class="asset-category">{{ asset.category }}</span>
                  </div>
                  <div v-if="asset.folderPath && asset.folderPath !== '/'" class="asset-folder">
                    &#128194; {{ asset.folderPath }}
                  </div>
                </div>
                <button class="asset-delete-btn" @click.stop="$emit('delete-asset', asset.id)" title="Eliminar">&#128465;</button>
              </div>

              <p v-if="assets.length === 0" class="empty-message">
                No hay assets subidos. Arrastra imagenes arriba para comenzar.
              </p>
              <p v-else-if="filteredAssets.length === 0" class="empty-message">
                No hay assets que coincidan con el filtro.
              </p>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <span class="asset-count">{{ filteredAssets.length }} / {{ assets.length }} assets</span>
          <button class="modal-btn" @click="handleClose">Listo</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.asset-manager-modal {
  width: 90vw;
  max-width: 1200px;
  height: 85vh;
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 2px solid var(--border-color, #333355);
}

.modal-header h3 {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--text-primary, #e0e0e0);
  margin: 0;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #888);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.modal-close-btn:hover {
  color: var(--error, #ff4757);
}

.modal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.asset-manager-body {
  display: flex;
  gap: 0;
}

/* Folder Sidebar */
.folder-sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--bg-dark, #0f0f23);
  border-right: 2px solid var(--border-color, #333355);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color, #333355);
}

.folder-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #888);
}

.folder-add-btn {
  background: var(--success, #00ff88);
  color: var(--bg-dark, #0f0f23);
  border: none;
  width: 20px;
  height: 20px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 2px;
}

.new-folder-row {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: var(--bg-medium, #1a1a2e);
}

.new-folder-input {
  flex: 1;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: var(--bg-dark, #0f0f23);
  color: var(--text-primary, #e0e0e0);
  border: 1px solid var(--border-color, #333355);
  padding: 4px 6px;
}

.new-folder-ok, .new-folder-cancel {
  background: transparent;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
}

.new-folder-ok { color: var(--success, #00ff88); }
.new-folder-cancel { color: var(--error, #ff4757); }

.folder-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.folder-item:hover {
  background: var(--bg-medium, #1a1a2e);
}

.folder-item.selected {
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
}

.folder-child { padding-left: 24px; }
.folder-subchild { padding-left: 40px; }

.folder-icon {
  font-size: 14px;
}

.folder-name {
  flex: 1;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-count {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  opacity: 0.6;
}

.folder-actions {
  display: none;
  gap: 2px;
}

.folder-item:hover .folder-actions {
  display: flex;
}

.folder-action-btn {
  background: transparent;
  border: none;
  font-size: 10px;
  cursor: pointer;
  padding: 2px;
  opacity: 0.6;
}

.folder-action-btn:hover {
  opacity: 1;
}

.folder-rename-input {
  flex: 1;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: var(--bg-dark, #0f0f23);
  color: var(--text-primary, #e0e0e0);
  border: 1px solid var(--accent, #00d4ff);
  padding: 2px 4px;
}

.subfolder-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #888);
  border-top: 1px solid var(--border-color, #333355);
  cursor: pointer;
}

/* Main Content */
.asset-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
  gap: 12px;
}

.category-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.category-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
}

.category-buttons {
  display: flex;
  gap: 4px;
}

.category-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: var(--bg-dark, #0f0f23);
  color: var(--text-muted, #888);
  border: 2px solid var(--border-color, #333355);
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.category-btn:hover {
  border-color: var(--accent, #00d4ff);
  color: var(--text-primary, #e0e0e0);
}

.category-btn.active {
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
  border-color: var(--accent, #00d4ff);
}

.upload-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #666);
}

/* Upload Zone */
.upload-zone {
  background: var(--bg-dark, #0f0f23);
  border: 2px dashed var(--border-color, #333355);
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}

.upload-zone:hover,
.upload-zone.dragging {
  border-color: var(--accent, #00d4ff);
  background: var(--bg-medium, #1a1a2e);
}

.upload-zone.uploading {
  cursor: not-allowed;
  border-color: var(--warning, #ffaa00);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 32px;
}

.upload-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-primary, #e0e0e0);
}

.upload-hint-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #666);
}

.upload-progress-bar {
  width: 200px;
  height: 8px;
  background: var(--bg-dark, #0f0f23);
  border: 1px solid var(--border-color, #333355);
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  background: var(--warning, #ffaa00);
  transition: width 0.3s;
}

.upload-percent {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--warning, #ffaa00);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-tab {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  background: transparent;
  color: var(--text-muted, #888);
  border: none;
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-tab:hover {
  color: var(--text-primary, #e0e0e0);
}

.filter-tab.active {
  color: var(--accent, #00d4ff);
  border-bottom: 2px solid var(--accent, #00d4ff);
}

.search-input {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: var(--bg-dark, #0f0f23);
  color: var(--text-primary, #e0e0e0);
  border: 2px solid var(--border-color, #333355);
  padding: 6px 10px;
  min-width: 150px;
}

.search-input:focus {
  border-color: var(--accent, #00d4ff);
  outline: none;
}

/* Asset Grid */
.asset-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding: 4px;
}

.asset-item {
  background: var(--bg-dark, #0f0f23);
  border: 2px solid var(--border-color, #333355);
  padding: 8px;
  position: relative;
  transition: all 0.15s;
  cursor: grab;
}

.asset-item:hover {
  border-color: var(--accent, #00d4ff);
}

.asset-item.s3-asset {
  border-color: var(--success, #00ff88);
}

.asset-preview {
  width: 100%;
  aspect-ratio: 1;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: var(--bg-medium, #1a1a2e);
  position: relative;
  margin-bottom: 8px;
}

.asset-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.s3-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 12px;
}

.asset-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-name-input {
  width: 100%;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  background: transparent;
  color: var(--text-primary, #e0e0e0);
  border: none;
  border-bottom: 1px solid transparent;
  padding: 2px 0;
}

.asset-name-input:focus {
  border-bottom-color: var(--accent, #00d4ff);
  outline: none;
}

.asset-meta {
  display: flex;
  justify-content: space-between;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: var(--text-muted, #666);
}

.asset-category {
  background: var(--bg-medium, #1a1a2e);
  padding: 1px 4px;
  border-radius: 2px;
}

.asset-folder {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: var(--text-muted, #666);
  margin-top: 2px;
}

.asset-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--error, #ff4757);
  border: none;
  color: white;
  font-size: 10px;
  cursor: pointer;
  padding: 2px 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.asset-item:hover .asset-delete-btn {
  opacity: 1;
}

.empty-message {
  grid-column: 1 / -1;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #666);
  text-align: center;
  padding: 40px 20px;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 2px solid var(--border-color, #333355);
}

.asset-count {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
}

.modal-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  background: var(--accent, #00d4ff);
  color: var(--bg-dark, #0f0f23);
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-btn:hover {
  background: var(--success, #00ff88);
}
</style>
