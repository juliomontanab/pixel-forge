/**
 * useClaudeSocket.js
 *
 * Composable para comunicación WebSocket con el worker de Claude.
 * Maneja conexión, registro de sesión, y generación de proyectos.
 *
 * @example
 * import { useClaudeSocket } from '@/composables/useClaudeSocket'
 *
 * const {
 *   connect,
 *   disconnect,
 *   generateProject,
 *   isConnected,
 *   isGenerating,
 *   lastError
 * } = useClaudeSocket()
 *
 * // Conectar con identificadores
 * await connect('user-123', 'session-abc')
 *
 * // Generar proyecto
 * const project = await generateProject(scriptText)
 */

import { ref, readonly } from 'vue'

// Configuración
const WS_URL = 'wss://kbcabn4wt6.execute-api.us-east-1.amazonaws.com/dev'

// Estado global (singleton)
let ws = null
let userId = null
let sessionId = null
const pendingRequests = new Map()

// Estado reactivo
const isConnected = ref(false)
const isRegistered = ref(false)
const isGenerating = ref(false)
const lastError = ref(null)
const connectionId = ref(null)

/**
 * Genera un ID único para la sesión
 */
function generateSessionId() {
  return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

/**
 * Genera un ID único para requests
 */
function generateRequestId() {
  return 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

/**
 * Conectar al WebSocket
 * @param {string} userIdParam - ID del usuario
 * @param {string} sessionIdParam - ID de sesión (opcional, se genera automáticamente)
 * @returns {Promise<void>}
 */
async function connect(userIdParam, sessionIdParam = null) {
  return new Promise((resolve, reject) => {
    if (ws && isConnected.value) {
      console.log('[ClaudeSocket] Ya conectado')
      resolve()
      return
    }

    userId = userIdParam
    sessionId = sessionIdParam || generateSessionId()
    lastError.value = null

    console.log(`[ClaudeSocket] Conectando... userId=${userId}, sessionId=${sessionId}`)

    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      isConnected.value = true
      console.log('[ClaudeSocket] WebSocket conectado')

      // Registrar sesión
      ws.send(JSON.stringify({
        action: 'registerSession',
        userId,
        sessionId
      }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('[ClaudeSocket] RAW MESSAGE:', JSON.stringify(message, null, 2))
        handleMessage(message, resolve)
      } catch (e) {
        console.error('[ClaudeSocket] Error parseando mensaje:', e)
      }
    }

    ws.onclose = () => {
      isConnected.value = false
      isRegistered.value = false
      console.log('[ClaudeSocket] WebSocket desconectado')
    }

    ws.onerror = (error) => {
      lastError.value = 'Error de conexión WebSocket'
      console.error('[ClaudeSocket] Error:', error)
      reject(error)
    }
  })
}

/**
 * Desconectar del WebSocket
 */
function disconnect() {
  if (ws) {
    ws.close()
    ws = null
  }
  isConnected.value = false
  isRegistered.value = false
  userId = null
  sessionId = null
  pendingRequests.clear()
}

/**
 * Manejar mensajes entrantes
 */
function handleMessage(rawMessage, connectResolve = null) {
  // Unwrap message if it came from sendMessageData (wrapped in { message: {...}, sender, timestamp })
  const message = rawMessage.message || rawMessage
  console.log('[ClaudeSocket] Mensaje recibido:', message.type)

  switch (message.type) {
    case 'session_registered':
      isRegistered.value = true
      connectionId.value = message.connectionId
      console.log(`[ClaudeSocket] Sesión registrada: ${message.sessionId}`)
      if (connectResolve) connectResolve()
      break

    case 'generation_started':
      isGenerating.value = true
      console.log(`[ClaudeSocket] Generación iniciada: ${message.requestId}`)
      // Notificar al request pendiente
      const startedReq = pendingRequests.get(message.requestId)
      if (startedReq && startedReq.onStarted) {
        startedReq.onStarted(message)
      }
      break

    case 'generation_complete':
      isGenerating.value = false
      console.log(`[ClaudeSocket] Generación completada: ${message.requestId}`)
      // Resolver el request pendiente
      const completedReq = pendingRequests.get(message.requestId)
      if (completedReq) {
        completedReq.resolve(message.project)
        pendingRequests.delete(message.requestId)
      }
      break

    case 'generation_error':
      isGenerating.value = false
      lastError.value = message.error
      console.error(`[ClaudeSocket] Error de generación: ${message.error}`)
      // Rechazar el request pendiente
      const errorReq = pendingRequests.get(message.requestId)
      if (errorReq) {
        errorReq.reject(new Error(message.error))
        pendingRequests.delete(message.requestId)
      }
      break

    default:
      // Ignorar otros mensajes
      break
  }
}

/**
 * Generar proyecto a partir de un script
 * @param {string} script - Script del juego en formato Markdown
 * @param {Object} options - Opciones adicionales
 * @param {string} options.projectId - ID del proyecto existente (para actualizar)
 * @param {Function} options.onStarted - Callback cuando inicia la generación
 * @returns {Promise<Object>} - Proyecto generado
 */
async function generateProject(script, options = {}) {
  return new Promise((resolve, reject) => {
    if (!ws || !isConnected.value) {
      reject(new Error('No conectado al WebSocket'))
      return
    }

    if (!isRegistered.value) {
      reject(new Error('Sesión no registrada'))
      return
    }

    const requestId = generateRequestId()
    lastError.value = null

    // Guardar request pendiente
    pendingRequests.set(requestId, {
      resolve,
      reject,
      onStarted: options.onStarted,
      timestamp: Date.now()
    })

    // Enviar solicitud de generación
    ws.send(JSON.stringify({
      action: 'sendMessage',
      message: {
        type: 'generate_project',
        script,
        userId,
        sessionId,
        projectId: options.projectId || null,
        requestId
      }
    }))

    console.log(`[ClaudeSocket] Solicitud de generación enviada: ${requestId}`)

    // Timeout de 5 minutos
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId)
        isGenerating.value = false
        reject(new Error('Timeout: La generación tomó demasiado tiempo'))
      }
    }, 5 * 60 * 1000)
  })
}

/**
 * Enviar mensaje genérico
 * @param {string} type - Tipo de mensaje
 * @param {Object} data - Datos del mensaje
 */
function sendMessage(type, data = {}) {
  if (!ws || !isConnected.value) {
    console.error('[ClaudeSocket] No conectado')
    return false
  }

  ws.send(JSON.stringify({
    action: 'sendMessage',
    message: {
      type,
      ...data,
      userId,
      sessionId,
      timestamp: Date.now()
    }
  }))

  return true
}

/**
 * Composable principal
 */
export function useClaudeSocket() {
  return {
    // Métodos
    connect,
    disconnect,
    generateProject,
    sendMessage,
    generateSessionId,

    // Estado (readonly para prevenir modificaciones externas)
    isConnected: readonly(isConnected),
    isRegistered: readonly(isRegistered),
    isGenerating: readonly(isGenerating),
    lastError: readonly(lastError),
    connectionId: readonly(connectionId),

    // Getters
    getUserId: () => userId,
    getSessionId: () => sessionId
  }
}

export default useClaudeSocket
