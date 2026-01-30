/**
 * useAiPanel
 *
 * Manages the AI Panel for Claude integration - script-to-project generation.
 */

import { ref, computed } from 'vue'

/**
 * Sample script template for AI generation
 */
const sampleScript = `# MI JUEGO DE AVENTURAS
Género: Mystery
Tono: Noir, misterioso

---

## PERSONAJES

### DETECTIVE
- Rol: Protagonista
- Descripción: Hombre de 40 años, gabardina gris, cínico
- Ubicación inicial: Oficina

### SECRETARIA
- Rol: NPC
- Descripción: Mujer joven, eficiente, sabe más de lo que dice
- Ubicación inicial: Recepción

---

## ITEMS

### LLAVE_CAJÓN
- Descripción: Una pequeña llave de latón
- Icono: 🔑
- Usar en: hotspot

### CARTA_MISTERIOSA
- Descripción: Una carta con amenazas
- Icono: ✉️
- Examinar: "Dice: Te estoy vigilando..."

---

## ESCENAS

### Oficina del Detective
Descripción: Oficina desordenada, humo de cigarro, luz tenue
Música: jazz_noir
Iluminación: Tenue, lámpara de escritorio

#### Elementos:
- Escritorio (hotspot) → Examinar papeles
- Cajón cerrado (hotspot) → Necesita LLAVE_CAJÓN
- Puerta (exit) → Recepción
- Ventana (decorativo) + luz ambiental

### Recepción
Descripción: Recepción elegante pero deteriorada
Música: jazz_suave

#### Elementos:
- Escritorio de secretaria (hotspot) → Hablar con secretaria
- Puerta oficina (exit) → Oficina del Detective
- Maceta (hotspot) → Esconde LLAVE_CAJÓN

---

## DIÁLOGOS

### Hablar con Secretaria
Actor: SECRETARIA

[DETECTIVE] "Buenos días. ¿Algún mensaje?"
[SECRETARIA] "Nada importante, jefe. Solo... tenga cuidado."

Opciones:
  → "¿Cuidado con qué?" → Revela pista
  → "Gracias" → Termina

---

## PUZZLES

### Abrir el cajón
Tipo: use-on-object
Requiere: LLAVE_CAJÓN en cajón cerrado
Resultado: Obtener CARTA_MISTERIOSA
Pista: "Este cajón está cerrado con llave..."`

/**
 * @param {Object} options
 * @param {import('vue').Ref} options.project - The project ref
 * @param {import('vue').Ref} options.currentScene - Current scene computed
 * @param {import('vue').Ref} options.selectedElements - Selected elements ref
 * @param {import('vue').ComputedRef} options.projectId - Project ID computed
 * @param {Function} options.claudeConnect - Connect function from useClaudeSocket
 * @param {Function} options.claudeDisconnect - Disconnect function
 * @param {Function} options.claudeGenerateProject - Generate project function
 * @param {import('vue').Ref} options.claudeIsConnected - Is connected ref
 * @param {number} options.DEFAULT_WIDTH - Default canvas width
 * @param {number} options.DEFAULT_HEIGHT - Default canvas height
 * @param {Function} options.deepClone - Deep clone function
 * @param {import('vue').Ref} options.history - History ref (for undo/redo)
 * @param {import('vue').Ref} options.historyIndex - History index ref
 * @param {import('vue').Ref} options.saveStatus - Save status ref
 */
export function useAiPanel(options) {
  const {
    project,
    currentScene,
    selectedElements,
    projectId,
    claudeConnect,
    claudeDisconnect,
    claudeGenerateProject,
    claudeIsConnected,
    DEFAULT_WIDTH,
    DEFAULT_HEIGHT,
    deepClone,
    history,
    historyIndex,
    saveStatus
  } = options

  // AI Panel state
  const aiPanelOpen = ref(false)
  const aiScript = ref('')
  const aiStatus = ref('idle') // idle, connecting, generating, complete, error
  const aiStatusMessage = ref('')

  /**
   * Open AI Panel and connect to WebSocket if needed
   */
  const openAiPanel = async () => {
    aiPanelOpen.value = true

    // Connect to WebSocket if not connected
    if (!claudeIsConnected.value) {
      aiStatus.value = 'connecting'
      aiStatusMessage.value = 'Conectando al servidor de IA...'

      try {
        // Use project ID as user ID for now (can be replaced with real auth)
        await claudeConnect(projectId.value || 'anonymous')
        aiStatus.value = 'idle'
        aiStatusMessage.value = 'Conectado. Escribe tu script y presiona Generar.'
      } catch (error) {
        aiStatus.value = 'error'
        aiStatusMessage.value = 'Error de conexión: ' + error.message
      }
    }
  }

  /**
   * Close AI Panel
   */
  const closeAiPanel = () => {
    aiPanelOpen.value = false
  }

  /**
   * Load sample script template
   */
  const loadSampleScript = () => {
    aiScript.value = sampleScript
  }

  /**
   * Load generated project into the editor
   */
  const loadGeneratedProject = (generatedProject) => {
    if (!generatedProject) return

    // Update project data
    project.value.name = generatedProject.name || project.value.name
    project.value.version = generatedProject.version || '1.0.0'

    // Update global data
    if (generatedProject.globalData) {
      if (generatedProject.globalData.actors) {
        project.value.globalData.actors = generatedProject.globalData.actors
      }
      if (generatedProject.globalData.items) {
        project.value.globalData.items = generatedProject.globalData.items
      }
      if (generatedProject.globalData.verbs) {
        project.value.globalData.verbs = generatedProject.globalData.verbs
      }
      if (generatedProject.globalData.inventory) {
        project.value.globalData.inventory = generatedProject.globalData.inventory
      }
      if (generatedProject.globalData.variables) {
        project.value.globalData.variables = generatedProject.globalData.variables
      }
    }

    // Update scenes
    if (generatedProject.scenes && generatedProject.scenes.length > 0) {
      project.value.scenes = generatedProject.scenes.map((scene, index) => ({
        ...scene,
        id: scene.id || `scene-${Date.now()}-${index}`,
        width: scene.width || DEFAULT_WIDTH,
        height: scene.height || DEFAULT_HEIGHT,
        // Ensure all required arrays exist
        images: scene.images || [],
        walkboxes: scene.walkboxes || [],
        exits: scene.exits || [],
        actorPlacements: scene.actorPlacements || [],
        hotspots: scene.hotspots || [],
        zplanes: scene.zplanes || [],
        dialogs: scene.dialogs || [],
        puzzles: scene.puzzles || [],
        sfx: scene.sfx || [],
        music: scene.music || [],
        cutscenes: scene.cutscenes || [],
        animations: scene.animations || [],
        lighting: scene.lighting || { ambient: { color: '#ffffff', intensity: 1.0 }, lights: [] },
        particles: scene.particles || [],
        groups: scene.groups || []
      }))

      // Set current scene to first scene
      project.value.currentSceneId = project.value.scenes[0].id
    }

    // Clear selection and reset history
    selectedElements.value = []
    history.value = [deepClone(currentScene.value)]
    historyIndex.value = 0

    // Trigger save
    saveStatus.value = 'unsaved'
  }

  /**
   * Generate project from AI script
   */
  const handleAiGenerate = async () => {
    if (!aiScript.value.trim()) {
      aiStatus.value = 'error'
      aiStatusMessage.value = 'Escribe un script primero'
      return
    }

    aiStatus.value = 'generating'
    aiStatusMessage.value = 'Generando proyecto con Claude...'

    try {
      const generatedProject = await claudeGenerateProject(aiScript.value, {
        projectId: projectId.value !== 'new' ? projectId.value : null,
        onStarted: () => {
          aiStatusMessage.value = 'Claude está procesando tu script...'
        }
      })

      // Load generated project
      loadGeneratedProject(generatedProject)

      aiStatus.value = 'complete'
      aiStatusMessage.value = 'Proyecto generado exitosamente!'

      // Close panel after 2 seconds
      setTimeout(() => {
        aiPanelOpen.value = false
        aiStatus.value = 'idle'
      }, 2000)

    } catch (error) {
      aiStatus.value = 'error'
      aiStatusMessage.value = 'Error: ' + error.message
    }
  }

  /**
   * Cleanup function for component unmount
   */
  const cleanupAiPanel = () => {
    claudeDisconnect()
  }

  return {
    // State
    aiPanelOpen,
    aiScript,
    aiStatus,
    aiStatusMessage,

    // Constants
    sampleScript,

    // Functions
    openAiPanel,
    closeAiPanel,
    loadSampleScript,
    handleAiGenerate,
    loadGeneratedProject,
    cleanupAiPanel
  }
}
