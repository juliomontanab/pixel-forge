<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectApi } from '@/composables/useProjectApi'

const router = useRouter()
const { saveProject, getProjects, isLoading: apiLoading, generateUUID } = useProjectApi()

// User data
const user = ref(null)
const loadingProjects = ref(false)

onMounted(async () => {
  const userData = localStorage.getItem('pixel-forge-user')
  if (userData) {
    user.value = JSON.parse(userData)
  }

  // Cargar proyectos del usuario
  await loadUserProjects()
})

async function loadUserProjects() {
  if (!user.value?.email) return

  loadingProjects.value = true
  try {
    const projects = await getProjects(user.value.email, {
      sort: { updatedAt: -1 }
    })

    if (projects && projects.length > 0) {
      recentProjects.value = projects.map(p => ({
        id: p.projectId,
        name: p.name,
        type: p.type || 'point-and-click',
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'N/A',
        thumbnail: null
      }))
    }
    console.log('[Dashboard] Proyectos cargados:', projects?.length || 0)
  } catch (e) {
    console.error('[Dashboard] Error cargando proyectos:', e)
  } finally {
    loadingProjects.value = false
  }
}

// Game types
const gameTypes = ref([
  {
    id: 'point-and-click',
    name: 'Point & Click',
    description: 'Classic adventure games',
    icon: '🎯',
    color: 'var(--primary)',
    available: true
  },
  {
    id: 'rpg',
    name: 'RPG',
    description: 'Role-playing games',
    icon: '⚔️',
    color: 'var(--color-actor)',
    available: false
  },
  {
    id: 'beat-em-up',
    name: 'Beat \'em Up',
    description: 'Action fighting games',
    icon: '👊',
    color: 'var(--color-exit)',
    available: false
  },
  {
    id: 'platformer',
    name: 'Platformer',
    description: 'Jump and run games',
    icon: '🏃',
    color: 'var(--color-walkbox)',
    available: false
  }
])

// Recent projects (loaded from API)
const recentProjects = ref([])

// ============================================
// New Project Modal
// ============================================
const showNewProjectModal = ref(false)
const currentStep = ref(1)
const totalSteps = 3

const newProject = reactive({
  // Step 1: Basic Info
  name: '',
  description: '',
  genre: 'mystery',
  tone: 'serious',

  // Step 2: Characters
  characters: [
    { name: '', role: 'protagonist', description: '' }
  ],

  // Step 3: Scenes
  scenes: [
    { name: '', description: '' }
  ]
})

const genres = [
  { id: 'mystery', name: 'Misterio', icon: '🔍' },
  { id: 'comedy', name: 'Comedia', icon: '😄' },
  { id: 'horror', name: 'Horror', icon: '👻' },
  { id: 'scifi', name: 'Ciencia Ficción', icon: '🚀' },
  { id: 'fantasy', name: 'Fantasía', icon: '🧙' },
  { id: 'noir', name: 'Noir', icon: '🎩' }
]

const tones = [
  { id: 'serious', name: 'Serio' },
  { id: 'lighthearted', name: 'Desenfadado' },
  { id: 'dark', name: 'Oscuro' },
  { id: 'humorous', name: 'Humorístico' }
]

const characterRoles = [
  { id: 'protagonist', name: 'Protagonista' },
  { id: 'antagonist', name: 'Antagonista' },
  { id: 'ally', name: 'Aliado' },
  { id: 'npc', name: 'NPC' }
]

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return newProject.name.trim().length > 0
  }
  if (currentStep.value === 2) {
    return newProject.characters.some(c => c.name.trim().length > 0)
  }
  if (currentStep.value === 3) {
    return newProject.scenes.some(s => s.name.trim().length > 0)
  }
  return true
})

const handleSelectGameType = (type) => {
  if (type.available) {
    if (type.id === 'point-and-click') {
      // Reset form
      newProject.name = ''
      newProject.description = ''
      newProject.genre = 'mystery'
      newProject.tone = 'serious'
      newProject.characters = [{ name: '', role: 'protagonist', description: '' }]
      newProject.scenes = [{ name: '', description: '' }]
      currentStep.value = 1
      showNewProjectModal.value = true
    } else {
      router.push({ name: 'editor', params: { projectId: 'new' }, query: { type: type.id } })
    }
  }
}

const addCharacter = () => {
  newProject.characters.push({ name: '', role: 'npc', description: '' })
}

const removeCharacter = (index) => {
  if (newProject.characters.length > 1) {
    newProject.characters.splice(index, 1)
  }
}

const addScene = () => {
  newProject.scenes.push({ name: '', description: '' })
}

const removeScene = (index) => {
  if (newProject.scenes.length > 1) {
    newProject.scenes.splice(index, 1)
  }
}

const nextStep = () => {
  if (currentStep.value < totalSteps && canProceed.value) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const closeModal = () => {
  showNewProjectModal.value = false
}

const createProject = async () => {
  if (!canProceed.value) return

  const projectId = generateUUID()
  const userId = user.value?.email || 'anonymous'

  // Filter out empty characters and scenes
  const validCharacters = newProject.characters.filter(c => c.name.trim())
  const validScenes = newProject.scenes.filter(s => s.name.trim())

  // Build project structure
  const project = {
    projectId,
    name: newProject.name,
    description: newProject.description,
    type: 'point-and-click',
    genre: newProject.genre,
    tone: newProject.tone,
    version: '1.0.0',
    currentSceneId: 1,

    globalData: {
      actors: validCharacters.map((char, idx) => ({
        id: idx + 1,
        name: char.name,
        role: char.role,
        description: char.description,
        costume: null,
        animations: {}
      })),
      items: [],
      inventory: [],
      verbs: [
        { id: 1, name: 'Mirar', icon: '👁', key: 'l' },
        { id: 2, name: 'Usar', icon: '✋', key: 'u' },
        { id: 3, name: 'Hablar', icon: '💬', key: 't' },
        { id: 4, name: 'Tomar', icon: '👆', key: 'p' }
      ],
      variables: {}
    },

    scenes: validScenes.map((scene, idx) => ({
      id: idx + 1,
      name: scene.name,
      description: scene.description,
      width: 1920,
      height: 1200,
      background: null,
      images: [],
      walkboxes: [{
        id: 1,
        points: [
          { x: 0, y: 800 },
          { x: 1920, y: 800 },
          { x: 1920, y: 1200 },
          { x: 0, y: 1200 }
        ],
        mask: false
      }],
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
      lighting: {
        ambient: { color: '#ffffff', intensity: 1 },
        lights: []
      },
      particles: [],
      groups: []
    }))
  }

  try {
    // Save to backend
    const savedId = await saveProject(project, userId)

    if (savedId) {
      console.log('Proyecto creado:', savedId)
      closeModal()
      // Navigate to editor with the new project
      router.push({
        name: 'editor',
        params: { projectId: savedId },
        query: { type: 'point-and-click' }
      })
    } else {
      // Fallback: navigate with local data
      console.warn('No se pudo guardar en backend, usando datos locales')
      localStorage.setItem('pixel-forge-new-project', JSON.stringify(project))
      closeModal()
      router.push({
        name: 'editor',
        params: { projectId: 'new' },
        query: { type: 'point-and-click', local: 'true' }
      })
    }
  } catch (error) {
    console.error('Error creando proyecto:', error)
    // Fallback to local
    localStorage.setItem('pixel-forge-new-project', JSON.stringify(project))
    closeModal()
    router.push({
      name: 'editor',
      params: { projectId: 'new' },
      query: { type: 'point-and-click', local: 'true' }
    })
  }
}

const handleOpenProject = (project) => {
  router.push({ name: 'editor', params: { projectId: project.id } })
}

const handleLogout = () => {
  localStorage.removeItem('pixel-forge-auth')
  localStorage.removeItem('pixel-forge-user')
  router.push('/login')
}
</script>

<template>
  <div class="dashboard-container">
    <!-- Header -->
    <header class="dashboard-header pixel-border">
      <div class="header-left">
        <h1 class="logo">
          <span class="text-gold">PIXEL</span><span class="text-accent">FORGE</span>
        </h1>
      </div>
      <div class="header-right">
        <span class="user-name pixel-font-sm">{{ user?.name || 'Player' }}</span>
        <button class="logout-btn pixel-font-sm" @click="handleLogout">LOGOUT</button>
      </div>
    </header>

    <!-- Main content -->
    <main class="dashboard-main">
      <!-- Create new section -->
      <section class="section">
        <h2 class="section-title">
          <span class="title-icon">🎮</span>
          Create New Game
        </h2>
        <div class="game-types-grid">
          <div
            v-for="type in gameTypes"
            :key="type.id"
            class="game-type-card pixel-border"
            :class="{ 'available': type.available, 'coming-soon': !type.available }"
            :style="{ '--card-color': type.color }"
            @click="handleSelectGameType(type)"
          >
            <div class="card-icon">{{ type.icon }}</div>
            <h3 class="card-title">{{ type.name }}</h3>
            <p class="card-description">{{ type.description }}</p>
            <div v-if="!type.available" class="coming-soon-badge">COMING SOON</div>
          </div>
        </div>
      </section>

      <!-- Quick Tools section -->
      <section class="section">
        <h2 class="section-title">
          <span class="title-icon">🛠️</span>
          Quick Tools
        </h2>
        <div class="tools-grid">
          <div
            class="tool-card pixel-border pixel-hover"
            @click="router.push('/scene-map')"
          >
            <div class="tool-icon">🗺️</div>
            <h3 class="tool-title">Scene Map</h3>
            <p class="tool-description">Visual scene flow editor</p>
          </div>
          <div
            class="tool-card pixel-border pixel-hover"
            @click="router.push({ name: 'editor', params: { projectId: 'new' } })"
          >
            <div class="tool-icon">🎬</div>
            <h3 class="tool-title">Scene Editor</h3>
            <p class="tool-description">Edit individual scenes</p>
          </div>
        </div>
      </section>

      <!-- Recent projects section -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">📁</span>
            Recent Projects
          </h2>
          <button class="view-all-btn pixel-font-sm" @click="router.push('/projects')">
            VIEW ALL →
          </button>
        </div>

        <!-- Loading state -->
        <div v-if="loadingProjects" class="loading-projects">
          <span class="loading-text pixel-font-sm">Cargando proyectos...</span>
        </div>

        <div v-else class="projects-grid">
          <!-- Existing projects -->
          <div
            v-for="project in recentProjects"
            :key="project.id"
            class="project-card pixel-border pixel-hover"
            @click="handleOpenProject(project)"
          >
            <div class="project-thumbnail">
              <span class="thumbnail-placeholder">🎬</span>
            </div>
            <div class="project-info">
              <h4 class="project-name">{{ project.name }}</h4>
              <p class="project-meta pixel-font-sm">{{ project.updatedAt }}</p>
            </div>
          </div>

          <!-- New project card -->
          <div
            class="project-card new-project pixel-border pixel-hover"
            @click="handleSelectGameType(gameTypes[0])"
          >
            <div class="new-project-content">
              <span class="new-icon">+</span>
              <span class="new-text">New Project</span>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <p v-if="!loadingProjects && recentProjects.length === 0" class="empty-state pixel-font-sm">
          No tienes proyectos aún. ¡Crea tu primer juego!
        </p>
      </section>
    </main>

    <!-- Footer -->
    <footer class="dashboard-footer">
      <p class="pixel-font-sm text-muted">Pixel-Forge v0.1.0 | Made with ❤️ for game creators</p>
    </footer>

    <!-- New Project Modal -->
    <div v-if="showNewProjectModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-container pixel-border">
        <!-- Modal Header -->
        <div class="modal-header">
          <h2 class="modal-title">
            <span class="modal-icon">🎯</span>
            Nuevo Proyecto Point & Click
          </h2>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>

        <!-- Progress Steps -->
        <div class="steps-indicator">
          <div
            v-for="step in totalSteps"
            :key="step"
            class="step"
            :class="{
              'active': currentStep === step,
              'completed': currentStep > step
            }"
          >
            <span class="step-number">{{ step }}</span>
            <span class="step-label">
              {{ step === 1 ? 'Info' : step === 2 ? 'Personajes' : 'Escenas' }}
            </span>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="modal-content">
          <!-- Step 1: Basic Info -->
          <div v-if="currentStep === 1" class="step-content">
            <div class="form-group">
              <label class="form-label">Nombre del Proyecto *</label>
              <input
                v-model="newProject.name"
                type="text"
                class="form-input pixel-border"
                placeholder="Ej: Misterio en la Mansión"
                autofocus
              />
            </div>

            <div class="form-group">
              <label class="form-label">Descripción</label>
              <textarea
                v-model="newProject.description"
                class="form-textarea pixel-border"
                placeholder="Breve descripción de tu juego..."
                rows="3"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Género</label>
                <div class="genre-grid">
                  <button
                    v-for="genre in genres"
                    :key="genre.id"
                    class="genre-btn pixel-border"
                    :class="{ 'selected': newProject.genre === genre.id }"
                    @click="newProject.genre = genre.id"
                  >
                    <span class="genre-icon">{{ genre.icon }}</span>
                    <span class="genre-name">{{ genre.name }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Tono</label>
              <div class="tone-options">
                <button
                  v-for="tone in tones"
                  :key="tone.id"
                  class="tone-btn"
                  :class="{ 'selected': newProject.tone === tone.id }"
                  @click="newProject.tone = tone.id"
                >
                  {{ tone.name }}
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2: Characters -->
          <div v-if="currentStep === 2" class="step-content">
            <p class="step-description">
              Define los personajes principales de tu aventura. Puedes agregar más después.
            </p>

            <div
              v-for="(char, index) in newProject.characters"
              :key="index"
              class="character-card pixel-border"
            >
              <div class="character-header">
                <span class="character-number">#{{ index + 1 }}</span>
                <button
                  v-if="newProject.characters.length > 1"
                  class="remove-btn"
                  @click="removeCharacter(index)"
                >✕</button>
              </div>

              <div class="form-row">
                <div class="form-group flex-2">
                  <label class="form-label">Nombre</label>
                  <input
                    v-model="char.name"
                    type="text"
                    class="form-input pixel-border"
                    placeholder="Ej: Detective García"
                  />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Rol</label>
                  <select v-model="char.role" class="form-select pixel-border">
                    <option
                      v-for="role in characterRoles"
                      :key="role.id"
                      :value="role.id"
                    >
                      {{ role.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Descripción</label>
                <input
                  v-model="char.description"
                  type="text"
                  class="form-input pixel-border"
                  placeholder="Breve descripción del personaje..."
                />
              </div>
            </div>

            <button class="add-btn pixel-border" @click="addCharacter">
              + Agregar Personaje
            </button>
          </div>

          <!-- Step 3: Scenes -->
          <div v-if="currentStep === 3" class="step-content">
            <p class="step-description">
              Define las escenas o locaciones de tu juego. Puedes agregar más en el editor.
            </p>

            <div
              v-for="(scene, index) in newProject.scenes"
              :key="index"
              class="scene-card pixel-border"
            >
              <div class="scene-header">
                <span class="scene-number">Escena {{ index + 1 }}</span>
                <button
                  v-if="newProject.scenes.length > 1"
                  class="remove-btn"
                  @click="removeScene(index)"
                >✕</button>
              </div>

              <div class="form-group">
                <label class="form-label">Nombre de la Escena *</label>
                <input
                  v-model="scene.name"
                  type="text"
                  class="form-input pixel-border"
                  placeholder="Ej: Vestíbulo de la Mansión"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Descripción</label>
                <input
                  v-model="scene.description"
                  type="text"
                  class="form-input pixel-border"
                  placeholder="Descripción del ambiente..."
                />
              </div>
            </div>

            <button class="add-btn pixel-border" @click="addScene">
              + Agregar Escena
            </button>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button
            v-if="currentStep > 1"
            class="btn-secondary pixel-border"
            @click="prevStep"
          >
            ← Anterior
          </button>
          <div class="footer-spacer"></div>
          <button
            v-if="currentStep < totalSteps"
            class="btn-primary pixel-border"
            :disabled="!canProceed"
            @click="nextStep"
          >
            Siguiente →
          </button>
          <button
            v-else
            class="btn-create pixel-border"
            :disabled="!canProceed || apiLoading"
            @click="createProject"
          >
            <span v-if="apiLoading">Creando...</span>
            <span v-else>🚀 Crear Proyecto</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark);
}

/* Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-medium);
  border-bottom-width: 4px;
  border-left: none;
  border-right: none;
  border-top: none;
}

.logo {
  font-size: 20px;
  letter-spacing: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.user-name {
  color: var(--text-secondary);
}

.logout-btn {
  background: transparent;
  border: 2px solid var(--error);
  color: var(--error);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.logout-btn:hover {
  background: var(--error);
  color: var(--bg-dark);
}

/* Main */
.dashboard-main {
  flex: 1;
  padding: var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.section {
  margin-bottom: var(--space-xl);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  font-size: 16px;
  margin-bottom: var(--space-lg);
}

.title-icon {
  font-size: 24px;
}

.view-all-btn {
  background: transparent;
  border: none;
  color: var(--accent);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.view-all-btn:hover {
  color: var(--accent-light);
}

/* Game types grid */
.game-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
}

.game-type-card {
  background: var(--bg-medium);
  padding: var(--space-lg);
  text-align: center;
  position: relative;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.game-type-card.available:hover {
  transform: translateY(-4px);
  border-color: var(--card-color);
  box-shadow: 0 8px 0 0 rgba(0, 0, 0, 0.5);
}

.game-type-card.coming-soon {
  opacity: 0.6;
  cursor: not-allowed;
}

.card-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
}

.card-title {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.card-description {
  font-size: 10px;
  color: var(--text-secondary);
  margin: 0;
}

.coming-soon-badge {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  background: var(--bg-light);
  color: var(--text-muted);
  padding: 2px 6px;
  font-size: 8px;
}

/* Tools grid */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 250px));
  gap: var(--space-md);
}

.tool-card {
  background: var(--bg-medium);
  padding: var(--space-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-sm);
}

.tool-card:hover {
  border-color: var(--accent);
}

.tool-icon {
  font-size: 36px;
}

.tool-title {
  font-size: 12px;
  color: var(--text-primary);
  margin: 0;
}

.tool-description {
  font-size: 9px;
  color: var(--text-muted);
  margin: 0;
}

/* Projects grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-md);
}

.project-card {
  background: var(--bg-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.project-thumbnail {
  aspect-ratio: 16/9;
  background: var(--bg-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 2px solid var(--bg-light);
}

.thumbnail-placeholder {
  font-size: 32px;
  opacity: 0.5;
}

.project-info {
  padding: var(--space-md);
}

.project-name {
  font-size: 10px;
  margin: 0 0 var(--space-xs) 0;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-meta {
  color: var(--text-muted);
  margin: 0;
}

.new-project {
  border-style: dashed;
  border-color: var(--text-muted);
}

.new-project-content {
  height: 100%;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  color: var(--text-muted);
}

.new-icon {
  font-size: 32px;
}

.new-text {
  font-size: 10px;
}

.new-project:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.new-project:hover .new-project-content {
  color: var(--accent);
}

/* Loading & Empty states */
.loading-projects {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
}

.loading-text {
  color: var(--text-muted);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-lg);
  margin: 0;
}

/* Footer */
.dashboard-footer {
  padding: var(--space-md);
  text-align: center;
  border-top: 2px solid var(--bg-light);
}

/* ============================================
   Modal Styles
   ============================================ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-lg);
}

.modal-container {
  background: var(--bg-medium);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 2px solid var(--bg-light);
  background: var(--bg-dark);
}

.modal-title {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
}

.modal-icon {
  font-size: 20px;
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: var(--space-xs);
  transition: color var(--transition-fast);
}

.modal-close:hover {
  color: var(--error);
}

/* Steps Indicator */
.steps-indicator {
  display: flex;
  justify-content: center;
  gap: var(--space-xl);
  padding: var(--space-md);
  background: var(--bg-dark);
  border-bottom: 2px solid var(--bg-light);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  opacity: 0.5;
  transition: opacity var(--transition-fast);
}

.step.active {
  opacity: 1;
}

.step.completed {
  opacity: 0.8;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.step.active .step-number {
  background: var(--primary);
  color: var(--bg-dark);
}

.step.completed .step-number {
  background: var(--success);
  color: var(--bg-dark);
}

.step-label {
  font-size: 8px;
  color: var(--text-secondary);
}

/* Modal Content */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.step-description {
  font-size: 10px;
  color: var(--text-secondary);
  margin: 0 0 var(--space-sm) 0;
}

/* Form Elements */
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.form-row {
  display: flex;
  gap: var(--space-md);
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

.form-label {
  font-size: 9px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.form-input,
.form-textarea,
.form-select {
  background: var(--bg-dark);
  border-color: var(--bg-light);
  color: var(--text-primary);
  padding: var(--space-sm) var(--space-md);
  font-family: inherit;
  font-size: 11px;
  width: 100%;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-select {
  cursor: pointer;
}

/* Genre Grid */
.genre-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.genre-btn {
  background: var(--bg-dark);
  border-color: var(--bg-light);
  color: var(--text-secondary);
  padding: var(--space-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.genre-btn:hover {
  border-color: var(--text-muted);
}

.genre-btn.selected {
  border-color: var(--primary);
  background: rgba(201, 162, 39, 0.1);
  color: var(--primary);
}

.genre-icon {
  font-size: 20px;
}

.genre-name {
  font-size: 8px;
}

/* Tone Options */
.tone-options {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.tone-btn {
  background: var(--bg-dark);
  border: 2px solid var(--bg-light);
  color: var(--text-secondary);
  padding: var(--space-xs) var(--space-md);
  font-size: 9px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tone-btn:hover {
  border-color: var(--text-muted);
}

.tone-btn.selected {
  border-color: var(--primary);
  background: rgba(201, 162, 39, 0.1);
  color: var(--primary);
}

/* Character & Scene Cards */
.character-card,
.scene-card {
  background: var(--bg-dark);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.character-header,
.scene-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.character-number,
.scene-number {
  font-size: 10px;
  color: var(--primary);
}

.remove-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  transition: color var(--transition-fast);
}

.remove-btn:hover {
  color: var(--error);
}

.add-btn {
  background: transparent;
  border-color: var(--text-muted);
  border-style: dashed;
  color: var(--text-muted);
  padding: var(--space-sm) var(--space-md);
  font-size: 10px;
  cursor: pointer;
  transition: all var(--transition-fast);
  width: 100%;
}

.add-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Modal Footer */
.modal-footer {
  display: flex;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  border-top: 2px solid var(--bg-light);
  background: var(--bg-dark);
}

.footer-spacer {
  flex: 1;
}

.btn-secondary,
.btn-primary,
.btn-create {
  padding: var(--space-sm) var(--space-lg);
  font-size: 10px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-secondary {
  background: transparent;
  border-color: var(--text-muted);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--bg-light);
  border-color: var(--accent);
  color: var(--accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent);
  color: var(--bg-dark);
}

.btn-create {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--bg-dark);
}

.btn-create:hover:not(:disabled) {
  background: var(--primary-light, #d4af37);
  box-shadow: 0 0 10px var(--primary);
}

.btn-primary:disabled,
.btn-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
