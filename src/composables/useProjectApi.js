/**
 * useProjectApi.js
 *
 * Composable para operaciones CRUD de proyectos via WebSocket.
 * Usa el WebSocket existente para invocar las funciones Lambda de pf-project.
 *
 * @example
 * import { useProjectApi } from '@/composables/useProjectApi'
 *
 * const {
 *   getProjects,
 *   getProjectById,
 *   createProject,
 *   updateProject,
 *   deleteProject,
 *   saveProject,
 *   isLoading,
 *   error
 * } = useProjectApi()
 *
 * // Listar proyectos del usuario
 * const projects = await getProjects(userId)
 *
 * // Obtener proyecto específico
 * const project = await getProjectById(projectId)
 */

import { ref, readonly } from 'vue'

// Configuración
const WS_URL = 'wss://kbcabn4wt6.execute-api.us-east-1.amazonaws.com/dev'
const REQUEST_TIMEOUT = 30000 // 30 segundos

// Estado
let ws = null
let isConnected = false
const pendingRequests = new Map()
const isLoading = ref(false)
const error = ref(null)

/**
 * Genera un ID único para requests
 */
function generateRequestId() {
  return 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

/**
 * Genera un UUID v4
 */
function generateUUID() {
  return crypto.randomUUID()
}

/**
 * Conecta al WebSocket si no está conectado
 */
async function ensureConnection() {
  if (ws && isConnected) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    console.log('[ProjectApi] Conectando a WebSocket...')
    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      isConnected = true
      console.log('[ProjectApi] WebSocket conectado')
      resolve()
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (e) {
        console.error('[ProjectApi] Error parseando mensaje:', e)
      }
    }

    ws.onclose = () => {
      isConnected = false
      ws = null
      console.log('[ProjectApi] WebSocket desconectado')
    }

    ws.onerror = (err) => {
      console.error('[ProjectApi] WebSocket error:', err)
      reject(err)
    }
  })
}

/**
 * Maneja mensajes entrantes del WebSocket
 */
function handleMessage(message) {
  // Buscar request pendiente por requestId
  const requestId = message.requestId
  if (requestId && pendingRequests.has(requestId)) {
    const pending = pendingRequests.get(requestId)
    pendingRequests.delete(requestId)

    if (message.success) {
      pending.resolve(message.data)
    } else {
      pending.reject(new Error(message.error || 'Error desconocido'))
    }
  }
}

/**
 * Envía una acción CRUD y espera respuesta
 */
async function sendAction(action, params) {
  await ensureConnection()

  return new Promise((resolve, reject) => {
    const requestId = generateRequestId()

    // Registrar request pendiente
    pendingRequests.set(requestId, { resolve, reject })

    // Timeout
    const timeout = setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId)
        reject(new Error('Timeout: La operación tardó demasiado'))
      }
    }, REQUEST_TIMEOUT)

    // Modificar resolve/reject para limpiar timeout
    const originalResolve = resolve
    const originalReject = reject
    pendingRequests.set(requestId, {
      resolve: (data) => {
        clearTimeout(timeout)
        originalResolve(data)
      },
      reject: (err) => {
        clearTimeout(timeout)
        originalReject(err)
      }
    })

    // Enviar mensaje
    ws.send(JSON.stringify({
      action: 'projectCrud',
      crudAction: action,
      requestId,
      ...params
    }))

    console.log(`[ProjectApi] Enviado: ${action}`, requestId)
  })
}

/**
 * Obtiene la lista de proyectos del usuario
 */
async function getProjects(userId, options = {}) {
  isLoading.value = true
  error.value = null

  try {
    const result = await sendAction('project_list', {
      userId,
      filter: options.filter,
      project: options.project,
      sort: options.sort
    })
    return result || []
  } catch (e) {
    error.value = e.message
    console.error('[ProjectApi] Error obteniendo proyectos:', e)
    return []
  } finally {
    isLoading.value = false
  }
}

/**
 * Obtiene un proyecto por su ID
 */
async function getProjectById(projectId) {
  isLoading.value = true
  error.value = null

  try {
    const result = await sendAction('project_get', { projectId })
    return result
  } catch (e) {
    error.value = e.message
    console.error('[ProjectApi] Error obteniendo proyecto:', e)
    return null
  } finally {
    isLoading.value = false
  }
}

/**
 * Crea un nuevo proyecto
 */
async function createProject(projectData, userId) {
  isLoading.value = true
  error.value = null

  try {
    const project = {
      ...projectData,
      projectId: projectData.projectId || generateUUID()
    }

    const result = await sendAction('project_create', {
      project,
      userId
    })

    return result?.projectId || null
  } catch (e) {
    error.value = e.message
    console.error('[ProjectApi] Error creando proyecto:', e)
    return null
  } finally {
    isLoading.value = false
  }
}

/**
 * Actualiza un proyecto existente
 */
async function updateProject(projectId, updates, userEmail = null) {
  isLoading.value = true
  error.value = null

  try {
    const result = await sendAction('project_update', {
      projectId,
      updates,
      userEmail
    })
    return result?.success || false
  } catch (e) {
    error.value = e.message
    console.error('[ProjectApi] Error actualizando proyecto:', e)
    return false
  } finally {
    isLoading.value = false
  }
}

/**
 * Elimina un proyecto (soft delete)
 */
async function deleteProject(projectId, userEmail = null) {
  isLoading.value = true
  error.value = null

  try {
    const result = await sendAction('project_delete', {
      projectId,
      userEmail
    })
    return result?.success || false
  } catch (e) {
    error.value = e.message
    console.error('[ProjectApi] Error eliminando proyecto:', e)
    return false
  } finally {
    isLoading.value = false
  }
}

/**
 * Guarda un proyecto (crear o actualizar automáticamente)
 */
async function saveProject(project, userId, userEmail = null) {
  isLoading.value = true
  error.value = null

  try {
    const result = await sendAction('project_save', {
      project,
      userId,
      userEmail
    })
    return result?.projectId || null
  } catch (e) {
    error.value = e.message
    console.error('[ProjectApi] Error guardando proyecto:', e)
    return null
  } finally {
    isLoading.value = false
  }
}

/**
 * Desconecta el WebSocket
 */
function disconnect() {
  if (ws) {
    ws.close()
    ws = null
  }
  isConnected = false
  pendingRequests.clear()
}

/**
 * Composable principal
 */
export function useProjectApi() {
  return {
    // Métodos CRUD
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    saveProject,

    // Utilidades
    generateUUID,
    disconnect,

    // Estado (readonly)
    isLoading: readonly(isLoading),
    error: readonly(error)
  }
}

export default useProjectApi
