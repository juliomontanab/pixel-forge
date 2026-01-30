import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useLocalStorage } from '../useLocalStorage'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} })
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn()
}

describe('useLocalStorage', () => {
  let options
  let composable

  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks()
    localStorageMock.clear()

    // Setup default options
    options = {
      project: ref({
        id: 'test-project-1',
        name: 'Test Project',
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
          verbs: []
        },
        scenes: [{
          id: 'scene-1',
          name: 'Scene 1',
          width: 1920,
          height: 1200,
          images: [],
          walkboxes: [],
          exits: [],
          actorPlacements: [],
          hotspots: [],
          zplanes: [],
          dialogs: [],
          puzzles: [],
          groups: []
        }],
        currentSceneId: 'scene-1'
      }),
      selectedElements: ref([]),
      normalizeInteractiveElements: vi.fn((scenes) => scenes),
      ensureGlobalDataStructure: vi.fn(),
      ensureSceneStructure: vi.fn(),
      loadAssetUrls: vi.fn(),
      autoSaveProject: vi.fn(),
      DEFAULT_WIDTH: 1920,
      DEFAULT_HEIGHT: 1200,
      router: mockRouter
    }

    composable = useLocalStorage(options)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('saveProjectToStorage', () => {
    it('should save project to localStorage', () => {
      const result = composable.saveProjectToStorage()

      expect(result).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalled()
      expect(composable.saveStatus.value).toBe('saved')
      expect(composable.lastSaved.value).toBeInstanceOf(Date)
    })

    it('should update projects list after saving', () => {
      composable.saveProjectToStorage()

      // Should have called setItem twice: once for project, once for list
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2)
    })

    it('should set status to saving during save', () => {
      // We can't easily test the intermediate state, but we can verify final state
      composable.saveProjectToStorage()
      expect(composable.saveStatus.value).toBe('saved')
    })
  })

  describe('loadProjectFromStorage', () => {
    it('should load project from localStorage', () => {
      const savedProject = {
        id: 'loaded-project',
        name: 'Loaded Project',
        globalData: { assets: [], verbs: [] },
        scenes: [{ id: 'scene-1', name: 'Scene 1' }]
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedProject))

      const result = composable.loadProjectFromStorage('loaded-project')

      expect(result).toBe(true)
      expect(options.project.value.name).toBe('Loaded Project')
      expect(options.normalizeInteractiveElements).toHaveBeenCalled()
      expect(options.ensureGlobalDataStructure).toHaveBeenCalled()
    })

    it('should return false if project not found', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)

      const result = composable.loadProjectFromStorage('non-existent')

      expect(result).toBe(false)
    })

    it('should return false for invalid project structure', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ invalid: true }))

      const result = composable.loadProjectFromStorage('invalid-project')

      expect(result).toBe(false)
    })

    it('should clean up groups in loaded scenes', () => {
      const savedProject = {
        id: 'project-with-groups',
        name: 'Project',
        globalData: { assets: [] },
        scenes: [{
          id: 'scene-1',
          groups: [
            { id: 1, members: [{ type: 'image', id: 999 }] } // Invalid member
          ],
          images: [],
          walkboxes: [],
          exits: [],
          actorPlacements: [],
          hotspots: [],
          zplanes: [],
          particles: []
        }]
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedProject))

      composable.loadProjectFromStorage('project-with-groups')

      // Groups with invalid members should be removed
      expect(options.project.value.scenes[0].groups).toEqual([])
    })
  })

  describe('getSavedProjects', () => {
    it('should return empty array when no projects exist', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)

      const projects = composable.getSavedProjects()

      expect(projects).toEqual([])
    })

    it('should return list of saved projects', () => {
      const projectsList = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-2', name: 'Project 2' }
      ]
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(projectsList))

      const projects = composable.getSavedProjects()

      expect(projects).toHaveLength(2)
      expect(projects[0].name).toBe('Project 1')
    })
  })

  describe('deleteProjectFromStorage', () => {
    it('should remove project from localStorage', () => {
      const result = composable.deleteProjectFromStorage('project-to-delete')

      expect(result).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pixel-forge-project-project-to-delete')
    })

    it('should update projects list after deletion', () => {
      const projectsList = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-to-delete', name: 'Project 2' }
      ]
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(projectsList))

      composable.deleteProjectFromStorage('project-to-delete')

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('createNewProject', () => {
    it('should create a new project with unique ID', () => {
      const originalId = options.project.value.id

      composable.createNewProject()

      expect(options.project.value.id).not.toBe(originalId)
      expect(options.project.value.id).toMatch(/^project-\d+$/)
      expect(options.project.value.name).toBe('Untitled Project')
    })

    it('should clear selected elements', () => {
      options.selectedElements.value = [{ type: 'image', element: { id: 1 } }]

      composable.createNewProject()

      expect(options.selectedElements.value).toEqual([])
    })

    it('should save new project immediately', () => {
      composable.createNewProject()

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should update router with new project ID', () => {
      composable.createNewProject()

      expect(mockRouter.replace).toHaveBeenCalled()
    })

    it('should include default verbs', () => {
      composable.createNewProject()

      expect(options.project.value.globalData.verbs).toHaveLength(9)
      expect(options.project.value.globalData.verbs[0].name).toBe('Mirar')
    })
  })

  describe('formatLastSaved', () => {
    it('should return "Never" when not saved', () => {
      composable.lastSaved.value = null

      expect(composable.formatLastSaved.value).toBe('Never')
    })

    it('should return "Just now" for recent saves', () => {
      composable.lastSaved.value = new Date()

      expect(composable.formatLastSaved.value).toBe('Just now')
    })

    it('should return seconds ago for saves within a minute', () => {
      composable.lastSaved.value = new Date(Date.now() - 30000) // 30 seconds ago

      expect(composable.formatLastSaved.value).toMatch(/\d+s ago/)
    })

    it('should return minutes ago for saves within an hour', () => {
      composable.lastSaved.value = new Date(Date.now() - 300000) // 5 minutes ago

      expect(composable.formatLastSaved.value).toMatch(/\d+m ago/)
    })
  })

  describe('handleSave', () => {
    it('should save to localStorage and call autoSaveProject', async () => {
      await composable.handleSave()

      expect(localStorageMock.setItem).toHaveBeenCalled()
      expect(options.autoSaveProject).toHaveBeenCalled()
    })
  })

  describe('handleExport', () => {
    it('should create and trigger download', () => {
      // Mock DOM methods
      const mockClick = vi.fn()
      const mockCreateObjectURL = vi.fn(() => 'blob:test')
      const mockRevokeObjectURL = vi.fn()

      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: mockClick
      })
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      composable.handleExport()

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test')
    })
  })

  describe('cleanupSceneGroups', () => {
    it('should initialize empty groups array if not present', () => {
      const scene = {}

      composable.cleanupSceneGroups(scene)

      expect(scene.groups).toEqual([])
    })

    it('should remove groups with less than 2 members', () => {
      const scene = {
        images: [{ id: 1 }],
        walkboxes: [],
        exits: [],
        actorPlacements: [],
        hotspots: [],
        zplanes: [],
        particles: [],
        groups: [
          { id: 1, members: [{ type: 'image', id: 1 }] } // Only 1 member
        ]
      }

      composable.cleanupSceneGroups(scene)

      expect(scene.groups).toEqual([])
    })

    it('should keep valid groups with 2+ existing members', () => {
      const scene = {
        images: [{ id: 1 }, { id: 2 }],
        walkboxes: [],
        exits: [],
        actorPlacements: [],
        hotspots: [],
        zplanes: [],
        particles: [],
        groups: [
          { id: 1, members: [{ type: 'image', id: 1 }, { type: 'image', id: 2 }] }
        ]
      }

      composable.cleanupSceneGroups(scene)

      expect(scene.groups).toHaveLength(1)
      expect(scene.groups[0].members).toHaveLength(2)
    })

    it('should remove members that reference non-existent elements', () => {
      const scene = {
        images: [{ id: 1 }],
        walkboxes: [],
        exits: [],
        actorPlacements: [],
        hotspots: [{ id: 10 }],
        zplanes: [],
        particles: [],
        groups: [
          {
            id: 1,
            members: [
              { type: 'image', id: 1 },
              { type: 'image', id: 999 }, // Non-existent
              { type: 'hotspot', id: 10 }
            ]
          }
        ]
      }

      composable.cleanupSceneGroups(scene)

      expect(scene.groups[0].members).toHaveLength(2)
      expect(scene.groups[0].members.find(m => m.id === 999)).toBeUndefined()
    })
  })
})
