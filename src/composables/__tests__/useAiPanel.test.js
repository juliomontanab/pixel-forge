import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { useAiPanel } from '../useAiPanel'

describe('useAiPanel', () => {
  let options
  let composable

  beforeEach(() => {
    vi.useFakeTimers()

    options = {
      project: ref({
        id: 'test-project',
        name: 'Test Project',
        version: '1.0.0',
        globalData: {
          actors: [],
          items: [],
          verbs: [],
          inventory: [],
          variables: {}
        },
        scenes: [{
          id: 'scene-1',
          name: 'Scene 1',
          width: 1920,
          height: 1200
        }],
        currentSceneId: 'scene-1'
      }),
      currentScene: computed(() => options.project.value.scenes[0]),
      selectedElements: ref([]),
      projectId: computed(() => 'test-project'),
      claudeConnect: vi.fn(() => Promise.resolve()),
      claudeDisconnect: vi.fn(),
      claudeGenerateProject: vi.fn(() => Promise.resolve({
        name: 'Generated Project',
        version: '1.0.0',
        globalData: {
          actors: [{ id: 1, name: 'Hero' }],
          items: [{ id: 1, name: 'Key' }],
          verbs: [],
          inventory: [],
          variables: {}
        },
        scenes: [{
          id: 'gen-scene-1',
          name: 'Generated Scene',
          width: 1920,
          height: 1200
        }]
      })),
      claudeIsConnected: ref(false),
      DEFAULT_WIDTH: 1920,
      DEFAULT_HEIGHT: 1200,
      deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
      history: ref([]),
      historyIndex: ref(-1),
      saveStatus: ref('saved')
    }

    composable = useAiPanel(options)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have panel closed by default', () => {
      expect(composable.aiPanelOpen.value).toBe(false)
    })

    it('should have empty script by default', () => {
      expect(composable.aiScript.value).toBe('')
    })

    it('should have idle status by default', () => {
      expect(composable.aiStatus.value).toBe('idle')
    })

    it('should have empty status message by default', () => {
      expect(composable.aiStatusMessage.value).toBe('')
    })

    it('should have sample script available', () => {
      expect(composable.sampleScript).toBeDefined()
      expect(composable.sampleScript).toContain('MI JUEGO DE AVENTURAS')
    })
  })

  describe('openAiPanel', () => {
    it('should open the panel', async () => {
      await composable.openAiPanel()

      expect(composable.aiPanelOpen.value).toBe(true)
    })

    it('should connect to WebSocket if not connected', async () => {
      options.claudeIsConnected.value = false

      await composable.openAiPanel()

      expect(options.claudeConnect).toHaveBeenCalledWith('test-project')
    })

    it('should set connecting status during connection', async () => {
      options.claudeIsConnected.value = false
      options.claudeConnect = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))

      const promise = composable.openAiPanel()

      expect(composable.aiStatus.value).toBe('connecting')
      expect(composable.aiStatusMessage.value).toContain('Conectando')

      vi.advanceTimersByTime(100)
      await promise
    })

    it('should set idle status after successful connection', async () => {
      options.claudeIsConnected.value = false

      await composable.openAiPanel()

      expect(composable.aiStatus.value).toBe('idle')
      expect(composable.aiStatusMessage.value).toContain('Conectado')
    })

    it('should handle connection errors', async () => {
      // Need to create a new composable with the error-throwing connect
      const errorOptions = {
        ...options,
        claudeIsConnected: ref(false),
        claudeConnect: vi.fn(() => Promise.reject(new Error('Connection failed')))
      }
      const errorComposable = useAiPanel(errorOptions)

      await errorComposable.openAiPanel()

      expect(errorComposable.aiStatus.value).toBe('error')
      expect(errorComposable.aiStatusMessage.value).toContain('Connection failed')
    })

    it('should not reconnect if already connected', async () => {
      options.claudeIsConnected.value = true

      await composable.openAiPanel()

      expect(options.claudeConnect).not.toHaveBeenCalled()
    })
  })

  describe('closeAiPanel', () => {
    it('should close the panel', () => {
      composable.aiPanelOpen.value = true

      composable.closeAiPanel()

      expect(composable.aiPanelOpen.value).toBe(false)
    })
  })

  describe('loadSampleScript', () => {
    it('should load the sample script into aiScript', () => {
      expect(composable.aiScript.value).toBe('')

      composable.loadSampleScript()

      expect(composable.aiScript.value).toBe(composable.sampleScript)
      expect(composable.aiScript.value).toContain('DETECTIVE')
      expect(composable.aiScript.value).toContain('ESCENAS')
    })
  })

  describe('handleAiGenerate', () => {
    it('should set error status if script is empty', async () => {
      composable.aiScript.value = ''

      await composable.handleAiGenerate()

      expect(composable.aiStatus.value).toBe('error')
      expect(composable.aiStatusMessage.value).toContain('Escribe un script primero')
    })

    it('should set error status if script is only whitespace', async () => {
      composable.aiScript.value = '   \n\t  '

      await composable.handleAiGenerate()

      expect(composable.aiStatus.value).toBe('error')
    })

    it('should call claudeGenerateProject with script', async () => {
      composable.aiScript.value = '# My Game\n## Scenes\n...'

      await composable.handleAiGenerate()

      expect(options.claudeGenerateProject).toHaveBeenCalledWith(
        '# My Game\n## Scenes\n...',
        expect.objectContaining({
          projectId: 'test-project'
        })
      )
    })

    it('should pass null projectId for new projects', async () => {
      options.projectId = computed(() => 'new')
      composable = useAiPanel(options)
      composable.aiScript.value = '# My Game'

      await composable.handleAiGenerate()

      expect(options.claudeGenerateProject).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          projectId: null
        })
      )
    })

    it('should set generating status during generation', async () => {
      composable.aiScript.value = '# My Game'
      options.claudeGenerateProject = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))

      const promise = composable.handleAiGenerate()

      expect(composable.aiStatus.value).toBe('generating')
      expect(composable.aiStatusMessage.value).toContain('Generando')

      vi.advanceTimersByTime(100)
      await promise
    })

    it('should set complete status after successful generation', async () => {
      composable.aiScript.value = '# My Game'

      await composable.handleAiGenerate()

      expect(composable.aiStatus.value).toBe('complete')
      expect(composable.aiStatusMessage.value).toContain('exitosamente')
    })

    it('should close panel after delay on success', async () => {
      composable.aiScript.value = '# My Game'
      composable.aiPanelOpen.value = true

      await composable.handleAiGenerate()

      expect(composable.aiPanelOpen.value).toBe(true)

      vi.advanceTimersByTime(2000)

      expect(composable.aiPanelOpen.value).toBe(false)
      expect(composable.aiStatus.value).toBe('idle')
    })

    it('should handle generation errors', async () => {
      // Need to create a new composable with the error-throwing generate
      const errorOptions = {
        ...options,
        claudeGenerateProject: vi.fn(() => Promise.reject(new Error('Generation failed')))
      }
      const errorComposable = useAiPanel(errorOptions)
      errorComposable.aiScript.value = '# My Game'

      await errorComposable.handleAiGenerate()

      expect(errorComposable.aiStatus.value).toBe('error')
      expect(errorComposable.aiStatusMessage.value).toContain('Generation failed')
    })
  })

  describe('loadGeneratedProject', () => {
    it('should do nothing if project is null', () => {
      const originalName = options.project.value.name

      composable.loadGeneratedProject(null)

      expect(options.project.value.name).toBe(originalName)
    })

    it('should update project name and version', () => {
      composable.loadGeneratedProject({
        name: 'New Project Name',
        version: '2.0.0',
        globalData: {},
        scenes: []
      })

      expect(options.project.value.name).toBe('New Project Name')
      expect(options.project.value.version).toBe('2.0.0')
    })

    it('should update global actors', () => {
      composable.loadGeneratedProject({
        globalData: {
          actors: [{ id: 1, name: 'Hero' }, { id: 2, name: 'Villain' }]
        },
        scenes: []
      })

      expect(options.project.value.globalData.actors).toHaveLength(2)
      expect(options.project.value.globalData.actors[0].name).toBe('Hero')
    })

    it('should update global items', () => {
      composable.loadGeneratedProject({
        globalData: {
          items: [{ id: 1, name: 'Key' }]
        },
        scenes: []
      })

      expect(options.project.value.globalData.items).toHaveLength(1)
      expect(options.project.value.globalData.items[0].name).toBe('Key')
    })

    it('should update scenes with proper structure', () => {
      composable.loadGeneratedProject({
        globalData: {},
        scenes: [{
          name: 'Generated Scene',
          images: [{ id: 1, name: 'Image' }]
        }]
      })

      const scene = options.project.value.scenes[0]
      expect(scene.name).toBe('Generated Scene')
      expect(scene.id).toBeDefined()
      expect(scene.width).toBe(1920)
      expect(scene.height).toBe(1200)
      expect(scene.images).toHaveLength(1)
      // Should have default arrays for missing properties
      expect(scene.walkboxes).toEqual([])
      expect(scene.exits).toEqual([])
      expect(scene.hotspots).toEqual([])
    })

    it('should set currentSceneId to first scene', () => {
      composable.loadGeneratedProject({
        globalData: {},
        scenes: [
          { id: 'scene-a', name: 'Scene A' },
          { id: 'scene-b', name: 'Scene B' }
        ]
      })

      expect(options.project.value.currentSceneId).toBe('scene-a')
    })

    it('should clear selected elements', () => {
      options.selectedElements.value = [{ type: 'image', element: { id: 1 } }]

      composable.loadGeneratedProject({
        globalData: {},
        scenes: [{ name: 'Scene' }]
      })

      expect(options.selectedElements.value).toEqual([])
    })

    it('should reset history', () => {
      options.history.value = [{ old: 'state' }]
      options.historyIndex.value = 5

      composable.loadGeneratedProject({
        globalData: {},
        scenes: [{ name: 'Scene' }]
      })

      expect(options.history.value).toHaveLength(1)
      expect(options.historyIndex.value).toBe(0)
    })

    it('should set save status to unsaved', () => {
      options.saveStatus.value = 'saved'

      composable.loadGeneratedProject({
        globalData: {},
        scenes: [{ name: 'Scene' }]
      })

      expect(options.saveStatus.value).toBe('unsaved')
    })

    it('should preserve existing project name if not provided', () => {
      options.project.value.name = 'Original Name'

      composable.loadGeneratedProject({
        globalData: {},
        scenes: []
      })

      expect(options.project.value.name).toBe('Original Name')
    })
  })

  describe('cleanupAiPanel', () => {
    it('should disconnect from Claude WebSocket', () => {
      composable.cleanupAiPanel()

      expect(options.claudeDisconnect).toHaveBeenCalled()
    })
  })

  describe('sampleScript content', () => {
    it('should contain required sections', () => {
      expect(composable.sampleScript).toContain('PERSONAJES')
      expect(composable.sampleScript).toContain('ITEMS')
      expect(composable.sampleScript).toContain('ESCENAS')
      expect(composable.sampleScript).toContain('DIÁLOGOS')
      expect(composable.sampleScript).toContain('PUZZLES')
    })

    it('should contain example characters', () => {
      expect(composable.sampleScript).toContain('DETECTIVE')
      expect(composable.sampleScript).toContain('SECRETARIA')
    })

    it('should contain example items', () => {
      expect(composable.sampleScript).toContain('LLAVE')
      expect(composable.sampleScript).toContain('CARTA')
    })

    it('should be a valid markdown-like format', () => {
      expect(composable.sampleScript).toMatch(/^#\s/)  // Starts with heading
      expect(composable.sampleScript).toContain('##')  // Has subheadings
      expect(composable.sampleScript).toContain('---') // Has separators
    })
  })
})
