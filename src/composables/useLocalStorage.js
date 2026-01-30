/**
 * useLocalStorage
 *
 * Manages project persistence in localStorage with auto-save functionality.
 */

import { ref, computed, watch } from 'vue'

const STORAGE_PREFIX = 'pixel-forge-'
const PROJECTS_LIST_KEY = 'pixel-forge-projects'

/**
 * @param {Object} options
 * @param {import('vue').Ref} options.project - The project ref
 * @param {import('vue').Ref} options.selectedElements - Selected elements ref
 * @param {Function} options.normalizeInteractiveElements - Function to normalize hotspots/images
 * @param {Function} options.ensureGlobalDataStructure - Function to ensure globalData structure
 * @param {Function} options.ensureSceneStructure - Function to ensure scene structure
 * @param {Function} options.loadAssetUrls - Function to load asset URLs from S3
 * @param {Function} options.autoSaveProject - Function to auto-save to MongoDB
 * @param {number} options.DEFAULT_WIDTH - Default canvas width
 * @param {number} options.DEFAULT_HEIGHT - Default canvas height
 * @param {import('vue').Router} options.router - Vue Router instance
 */
export function useLocalStorage(options) {
  const {
    project,
    selectedElements,
    normalizeInteractiveElements,
    ensureGlobalDataStructure,
    ensureSceneStructure,
    loadAssetUrls,
    autoSaveProject,
    DEFAULT_WIDTH,
    DEFAULT_HEIGHT,
    router
  } = options

  // State
  const lastSaved = ref(null)
  const autoSaveEnabled = ref(true)
  const saveStatus = ref('saved') // 'saved', 'saving', 'unsaved'
  let localStorageSaveTimeout = null

  /**
   * Get storage key for a project
   */
  const getProjectStorageKey = (id) => `${STORAGE_PREFIX}project-${id}`

  /**
   * Clean up invalid groups in a scene
   */
  const cleanupSceneGroups = (scene) => {
    if (!scene.groups || !Array.isArray(scene.groups)) {
      scene.groups = []
      return
    }

    // Helper to check if element exists
    const elementExists = (type, id) => {
      const arrayMap = {
        image: scene.images,
        walkbox: scene.walkboxes,
        exit: scene.exits,
        actorPlacement: scene.actorPlacements,
        hotspot: scene.hotspots,
        zplane: scene.zplanes,
        particle: scene.particles
      }
      if (type === 'light') {
        return scene.lighting?.lights?.some(e => String(e.id) === String(id))
      }
      const arr = arrayMap[type]
      return arr && arr.some(e => String(e.id) === String(id))
    }

    // Filter out groups with invalid members
    scene.groups = scene.groups.filter(group => {
      if (!group || !group.members || !Array.isArray(group.members)) return false

      // Remove members that don't exist
      group.members = group.members.filter(m => {
        if (!m || !m.type || m.id === undefined) return false
        return elementExists(m.type, m.id)
      })

      // Keep group only if it has at least 2 members
      return group.members.length >= 2
    })
  }

  /**
   * Save project to localStorage
   */
  const saveProjectToStorage = () => {
    try {
      saveStatus.value = 'saving'
      const key = getProjectStorageKey(project.value.id)
      const data = JSON.stringify(project.value)
      localStorage.setItem(key, data)

      // Update projects list
      updateProjectsList()

      lastSaved.value = new Date()
      saveStatus.value = 'saved'
      console.log('Project saved to localStorage:', project.value.name)
      return true
    } catch (err) {
      console.error('Error saving project:', err)
      saveStatus.value = 'unsaved'
      return false
    }
  }

  /**
   * Load project from localStorage
   */
  const loadProjectFromStorage = (id) => {
    try {
      const key = getProjectStorageKey(id)
      const data = localStorage.getItem(key)
      if (data) {
        const loaded = JSON.parse(data)
        // Validate basic structure
        if (loaded.scenes && loaded.globalData) {
          // Clean up groups in all scenes
          loaded.scenes.forEach(scene => cleanupSceneGroups(scene))

          // Normalize interactive elements (hotspots, images)
          loaded.scenes = normalizeInteractiveElements(loaded.scenes)

          // Apply migration for new globalData fields
          ensureGlobalDataStructure(loaded.globalData)

          // Ensure each scene has elementFolders
          loaded.scenes.forEach(scene => ensureSceneStructure(scene))

          project.value = loaded
          lastSaved.value = new Date()
          saveStatus.value = 'saved'
          console.log('Project loaded from localStorage:', loaded.name)

          // Load asset URLs from S3 (for assets that have s3Key)
          setTimeout(() => loadAssetUrls(), 100)

          return true
        }
      }
      return false
    } catch (err) {
      console.error('Error loading project:', err)
      return false
    }
  }

  /**
   * Update projects list in localStorage
   */
  const updateProjectsList = () => {
    try {
      const listData = localStorage.getItem(PROJECTS_LIST_KEY)
      const list = listData ? JSON.parse(listData) : []

      // Find or create entry for this project
      const existingIndex = list.findIndex(p => p.id === project.value.id)
      const entry = {
        id: project.value.id,
        name: project.value.name,
        updatedAt: new Date().toISOString(),
        scenesCount: project.value.scenes.length
      }

      if (existingIndex >= 0) {
        list[existingIndex] = entry
      } else {
        list.push(entry)
      }

      localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(list))
    } catch (err) {
      console.error('Error updating projects list:', err)
    }
  }

  /**
   * Get all saved projects from localStorage
   */
  const getSavedProjects = () => {
    try {
      const listData = localStorage.getItem(PROJECTS_LIST_KEY)
      return listData ? JSON.parse(listData) : []
    } catch (err) {
      console.error('Error getting projects list:', err)
      return []
    }
  }

  /**
   * Delete project from localStorage
   */
  const deleteProjectFromStorage = (id) => {
    try {
      const key = getProjectStorageKey(id)
      localStorage.removeItem(key)

      // Update projects list
      const listData = localStorage.getItem(PROJECTS_LIST_KEY)
      if (listData) {
        const list = JSON.parse(listData)
        const filtered = list.filter(p => p.id !== id)
        localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(filtered))
      }
      return true
    } catch (err) {
      console.error('Error deleting project:', err)
      return false
    }
  }

  /**
   * Create new project with unique ID
   */
  const createNewProject = () => {
    const newId = 'project-' + Date.now()
    project.value = {
      id: newId,
      name: 'Untitled Project',
      version: '1.0.0',
      globalData: {
        assets: [],
        assetFolders: [],
        audioAssets: [],
        animations: [],
        items: [],
        inventory: [],
        actors: [],
        variables: {},
        verbs: [
          { id: 1, name: 'Mirar', icon: '👁', key: 'l' },
          { id: 2, name: 'Recoger', icon: '✋', key: 'p' },
          { id: 3, name: 'Usar', icon: '🔧', key: 'u' },
          { id: 4, name: 'Abrir', icon: '📂', key: 'o' },
          { id: 5, name: 'Cerrar', icon: '📁', key: 'c' },
          { id: 6, name: 'Empujar', icon: '👉', key: 'e' },
          { id: 7, name: 'Tirar', icon: '👈', key: 'y' },
          { id: 8, name: 'Hablar', icon: '💬', key: 't' },
          { id: 9, name: 'Dar', icon: '🎁', key: 'g' }
        ]
      },
      scenes: [{
        id: 'scene-1',
        name: 'Scene 1',
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        background: null,
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
        animations: [],
        lighting: { ambient: { color: '#ffffff', intensity: 1.0 }, lights: [] },
        particles: [],
        groups: [],
        elementFolders: []
      }],
      currentSceneId: 'scene-1'
    }
    selectedElements.value = []
    saveProjectToStorage()
    // Update URL
    router.replace({ params: { projectId: newId } })
  }

  /**
   * Format last saved time for display
   */
  const formatLastSaved = computed(() => {
    if (!lastSaved.value) return 'Never'
    const now = new Date()
    const diff = Math.floor((now - lastSaved.value) / 1000)

    if (diff < 10) return 'Just now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return lastSaved.value.toLocaleTimeString()
  })

  /**
   * Handle manual save (localStorage + MongoDB)
   */
  const handleSave = async () => {
    if (saveProjectToStorage()) {
      // Also save to MongoDB if project has valid UUID
      await autoSaveProject()
    }
  }

  /**
   * Open Scene Map (saves before navigating)
   */
  const openSceneMap = () => {
    saveProjectToStorage()
    router.push(`/scene-map/${project.value.id}`)
  }

  /**
   * Export project to JSON file
   */
  const handleExport = () => {
    const data = JSON.stringify(project.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.value.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Import project from JSON file
   */
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text)
        // Validate basic structure
        if (imported.scenes && imported.globalData) {
          project.value = imported
          selectedElements.value = []
          alert('Project imported successfully!')
        } else {
          alert('Invalid project file format')
        }
      } catch (err) {
        alert('Error reading file: ' + err.message)
      }
    }
    input.click()
  }

  /**
   * Setup auto-save watcher for localStorage (debounced)
   */
  const setupAutoSaveWatcher = () => {
    watch(project, () => {
      if (!autoSaveEnabled.value) return

      saveStatus.value = 'unsaved'

      if (localStorageSaveTimeout) clearTimeout(localStorageSaveTimeout)
      localStorageSaveTimeout = setTimeout(() => {
        saveProjectToStorage()
      }, 2000) // Auto-save after 2 seconds of inactivity
    }, { deep: true })
  }

  /**
   * Clear pending timeout on cleanup
   */
  const clearLocalStorageTimeout = () => {
    if (localStorageSaveTimeout) {
      clearTimeout(localStorageSaveTimeout)
      localStorageSaveTimeout = null
    }
  }

  /**
   * Cleanup function for component unmount
   */
  const cleanupLocalStorage = () => {
    clearLocalStorageTimeout()
    // Final save before leaving
    if (saveStatus.value === 'unsaved') {
      saveProjectToStorage()
    }
  }

  return {
    // State
    lastSaved,
    autoSaveEnabled,
    saveStatus,

    // Computed
    formatLastSaved,

    // Functions
    saveProjectToStorage,
    loadProjectFromStorage,
    updateProjectsList,
    getSavedProjects,
    deleteProjectFromStorage,
    createNewProject,
    handleSave,
    openSceneMap,
    handleExport,
    handleImport,
    cleanupSceneGroups,

    // Lifecycle
    setupAutoSaveWatcher,
    clearLocalStorageTimeout,
    cleanupLocalStorage
  }
}
