<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Mock projects data
const projects = ref([
  {
    id: 'demo-1',
    name: 'Mi Primera Aventura',
    type: 'point-and-click',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    scenes: 5
  },
  {
    id: 'demo-2',
    name: 'Misterio en la Mansion',
    type: 'point-and-click',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-18',
    scenes: 3
  },
  {
    id: 'demo-3',
    name: 'Escape del Laboratorio',
    type: 'point-and-click',
    createdAt: '2024-01-05',
    updatedAt: '2024-01-12',
    scenes: 8
  }
])

const handleOpenProject = (project) => {
  router.push({ name: 'editor', params: { projectId: project.id } })
}

const handleDeleteProject = (project) => {
  if (confirm(`Delete "${project.name}"?`)) {
    projects.value = projects.value.filter(p => p.id !== project.id)
  }
}
</script>

<template>
  <div class="projects-container">
    <!-- Header -->
    <header class="projects-header pixel-border">
      <button class="back-btn" @click="router.push('/dashboard')">← BACK</button>
      <h1 class="page-title">MY PROJECTS</h1>
      <button class="new-btn pixel-border" @click="router.push({ name: 'editor', params: { projectId: 'new' } })">
        + NEW
      </button>
    </header>

    <!-- Projects list -->
    <main class="projects-main">
      <div class="projects-list">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-item pixel-border"
        >
          <div class="project-thumbnail">
            <span class="thumbnail-icon">🎬</span>
          </div>
          <div class="project-details">
            <h3 class="project-name">{{ project.name }}</h3>
            <div class="project-meta pixel-font-sm">
              <span class="meta-item">📅 {{ project.updatedAt }}</span>
              <span class="meta-item">🎬 {{ project.scenes }} scenes</span>
            </div>
          </div>
          <div class="project-actions">
            <button class="action-btn edit-btn" @click="handleOpenProject(project)">EDIT</button>
            <button class="action-btn delete-btn" @click="handleDeleteProject(project)">🗑</button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="projects.length === 0" class="empty-state">
        <span class="empty-icon">📁</span>
        <p class="empty-text">No projects yet</p>
        <button class="create-btn pixel-border" @click="router.push({ name: 'editor', params: { projectId: 'new' } })">
          CREATE YOUR FIRST GAME
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.projects-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark);
}

.projects-header {
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

.back-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  transition: color var(--transition-fast);
}

.back-btn:hover {
  color: var(--accent);
}

.page-title {
  font-size: 16px;
  color: var(--primary);
}

.new-btn {
  background: var(--primary);
  color: var(--bg-dark);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  transition: all var(--transition-fast);
}

.new-btn:hover {
  background: var(--primary-light);
}

.projects-main {
  flex: 1;
  padding: var(--space-xl);
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.project-item {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  background: var(--bg-medium);
  padding: var(--space-md);
}

.project-thumbnail {
  width: 80px;
  height: 60px;
  background: var(--bg-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.thumbnail-icon {
  font-size: 24px;
  opacity: 0.5;
}

.project-details {
  flex: 1;
}

.project-name {
  font-size: 12px;
  margin: 0 0 var(--space-sm) 0;
  color: var(--text-primary);
}

.project-meta {
  display: flex;
  gap: var(--space-lg);
  color: var(--text-muted);
}

.project-actions {
  display: flex;
  gap: var(--space-sm);
}

.action-btn {
  background: var(--bg-light);
  border: 2px solid var(--bg-light);
  color: var(--text-primary);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  transition: all var(--transition-fast);
}

.edit-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg-dark);
}

.delete-btn:hover {
  background: var(--error);
  border-color: var(--error);
  color: white;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.5;
  margin-bottom: var(--space-lg);
}

.empty-text {
  color: var(--text-muted);
  margin-bottom: var(--space-lg);
}

.create-btn {
  background: var(--primary);
  color: var(--bg-dark);
  padding: var(--space-md) var(--space-lg);
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
}

.create-btn:hover {
  background: var(--primary-light);
}
</style>
