import { createRouter, createWebHistory } from 'vue-router'

// Views
import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import EditorView from '@/views/EditorView.vue'
import SceneMapView from '@/views/SceneMapView.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/editor/:projectId?',
    name: 'editor',
    component: EditorView,
    meta: { requiresAuth: true }
  },
  {
    path: '/scene-map/:projectId?',
    name: 'scene-map',
    component: SceneMapView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard for auth
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('pixel-forge-auth') === 'true'

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
