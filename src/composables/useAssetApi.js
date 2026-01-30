/**
 * useAssetApi.js
 *
 * Composable para gestión de assets en S3 via WebSocket.
 * Maneja upload/download de imágenes y audio con URLs firmadas.
 *
 * @example
 * import { useAssetApi } from '@/composables/useAssetApi'
 *
 * const { uploadAsset, getAssetUrl, deleteAsset, isUploading } = useAssetApi()
 *
 * // Subir imagen
 * const result = await uploadAsset(file, userId, projectId)
 * // result = { s3Key, url }
 *
 * // Obtener URL de descarga (con cache)
 * const url = await getAssetUrl(s3Key)
 */

import { ref, readonly } from 'vue'

// Configuración
const WS_URL = 'wss://kbcabn4wt6.execute-api.us-east-1.amazonaws.com/dev'
const REQUEST_TIMEOUT = 60000 // 60 segundos (uploads pueden tardar)

// Estado
let ws = null
let isConnected = false
const pendingRequests = new Map()
const isUploading = ref(false)
const uploadProgress = ref(0)
const error = ref(null)

// Cache de URLs de descarga (evita pedir URLs repetidas)
const urlCache = new Map()
const URL_CACHE_DURATION = 50 * 60 * 1000 // 50 minutos (URLs expiran en 60)

/**
 * Genera un ID único para requests
 */
function generateRequestId() {
  return 'asset-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

/**
 * Conecta al WebSocket si no está conectado
 */
async function ensureConnection() {
  if (ws && isConnected) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    console.log('[AssetApi] Conectando a WebSocket...')
    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      isConnected = true
      console.log('[AssetApi] WebSocket conectado')
      resolve()
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (e) {
        console.error('[AssetApi] Error parseando mensaje:', e)
      }
    }

    ws.onclose = () => {
      isConnected = false
      ws = null
      console.log('[AssetApi] WebSocket desconectado')
    }

    ws.onerror = (err) => {
      console.error('[AssetApi] WebSocket error:', err)
      reject(err)
    }
  })
}

/**
 * Maneja mensajes entrantes del WebSocket
 */
function handleMessage(message) {
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
 * Envía una acción de assets y espera respuesta
 */
async function sendAction(action, params) {
  await ensureConnection()

  return new Promise((resolve, reject) => {
    const requestId = generateRequestId()

    // Timeout
    const timeout = setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId)
        reject(new Error('Timeout: La operación tardó demasiado'))
      }
    }, REQUEST_TIMEOUT)

    // Registrar request con cleanup de timeout
    pendingRequests.set(requestId, {
      resolve: (data) => {
        clearTimeout(timeout)
        resolve(data)
      },
      reject: (err) => {
        clearTimeout(timeout)
        reject(err)
      }
    })

    // Enviar mensaje
    ws.send(JSON.stringify({
      action: 'assetUpload',
      assetAction: action,
      requestId,
      ...params
    }))

    console.log(`[AssetApi] Enviado: ${action}`, requestId)
  })
}

// Categorías disponibles por tipo
const ASSET_CATEGORIES = {
  image: ['background', 'object', 'sprite', 'ui', 'other'],
  audio: ['music', 'sfx', 'ambient', 'voice', 'other']
}

/**
 * Sube un archivo a S3
 * @param {File} file - Archivo a subir
 * @param {string} userId - ID del usuario
 * @param {string} projectId - ID del proyecto
 * @param {string} category - Categoría del asset (background, object, sprite, music, sfx, etc.)
 * @returns {Promise<{s3Key: string, url: string, category: string}>}
 */
async function uploadAsset(file, userId, projectId, category = 'other') {
  isUploading.value = true
  uploadProgress.value = 0
  error.value = null

  try {
    // 1. Obtener URL firmada para upload
    const { uploadUrl, s3Key } = await sendAction('get_upload_url', {
      userId,
      projectId,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      category
    })

    console.log('[AssetApi] URL de upload obtenida:', s3Key)

    // 2. Subir archivo directamente a S3
    uploadProgress.value = 10

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    })

    if (!uploadResponse.ok) {
      throw new Error(`Error subiendo archivo: ${uploadResponse.status}`)
    }

    uploadProgress.value = 90

    // 3. Obtener URL de descarga
    const { downloadUrl } = await sendAction('get_download_url', { s3Key })

    // Guardar en cache
    urlCache.set(s3Key, {
      url: downloadUrl,
      timestamp: Date.now()
    })

    uploadProgress.value = 100
    console.log('[AssetApi] Archivo subido:', s3Key)

    return {
      s3Key,
      url: downloadUrl,
      category
    }
  } catch (e) {
    error.value = e.message
    console.error('[AssetApi] Error subiendo archivo:', e)
    throw e
  } finally {
    isUploading.value = false
  }
}

/**
 * Obtiene la URL de descarga de un asset (con cache)
 * @param {string} s3Key - Key del archivo en S3
 * @returns {Promise<string>} URL firmada
 */
async function getAssetUrl(s3Key) {
  if (!s3Key) return null

  // Verificar cache
  const cached = urlCache.get(s3Key)
  if (cached && (Date.now() - cached.timestamp) < URL_CACHE_DURATION) {
    return cached.url
  }

  try {
    const { downloadUrl } = await sendAction('get_download_url', { s3Key })

    // Actualizar cache
    urlCache.set(s3Key, {
      url: downloadUrl,
      timestamp: Date.now()
    })

    return downloadUrl
  } catch (e) {
    console.error('[AssetApi] Error obteniendo URL:', e)
    return null
  }
}

/**
 * Obtiene múltiples URLs de descarga (con cache)
 * @param {string[]} s3Keys - Keys de los archivos en S3
 * @returns {Promise<Object>} Map de s3Key -> URL
 */
async function getAssetUrls(s3Keys) {
  if (!s3Keys || s3Keys.length === 0) return {}

  const result = {}
  const keysToFetch = []

  // Verificar cache primero
  for (const key of s3Keys) {
    const cached = urlCache.get(key)
    if (cached && (Date.now() - cached.timestamp) < URL_CACHE_DURATION) {
      result[key] = cached.url
    } else {
      keysToFetch.push(key)
    }
  }

  // Obtener URLs faltantes
  if (keysToFetch.length > 0) {
    try {
      const { urls } = await sendAction('get_download_urls', { s3Keys: keysToFetch })

      // Actualizar cache y resultado
      for (const [key, url] of Object.entries(urls)) {
        urlCache.set(key, {
          url,
          timestamp: Date.now()
        })
        result[key] = url
      }
    } catch (e) {
      console.error('[AssetApi] Error obteniendo URLs:', e)
    }
  }

  return result
}

/**
 * Elimina un asset de S3
 * @param {string} s3Key - Key del archivo en S3
 * @param {string} userId - ID del usuario
 * @param {string} projectId - ID del proyecto
 * @returns {Promise<boolean>}
 */
async function deleteAsset(s3Key, userId, projectId) {
  try {
    await sendAction('delete_asset', { s3Key, userId, projectId })

    // Limpiar cache
    urlCache.delete(s3Key)

    console.log('[AssetApi] Asset eliminado:', s3Key)
    return true
  } catch (e) {
    error.value = e.message
    console.error('[AssetApi] Error eliminando asset:', e)
    return false
  }
}

/**
 * Lista assets de un proyecto
 * @param {string} userId - ID del usuario
 * @param {string} projectId - ID del proyecto
 * @param {string} assetType - Tipo de asset (image/audio) o null para todos
 * @returns {Promise<Array>}
 */
async function listAssets(userId, projectId, assetType = null) {
  try {
    const { assets } = await sendAction('list_assets', {
      userId,
      projectId,
      assetType
    })
    return assets || []
  } catch (e) {
    console.error('[AssetApi] Error listando assets:', e)
    return []
  }
}

/**
 * Limpia el cache de URLs
 */
function clearUrlCache() {
  urlCache.clear()
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
  urlCache.clear()
}

/**
 * Composable principal
 */
export function useAssetApi() {
  return {
    // Métodos principales
    uploadAsset,
    getAssetUrl,
    getAssetUrls,
    deleteAsset,
    listAssets,

    // Utilidades
    clearUrlCache,
    disconnect,

    // Constantes
    ASSET_CATEGORIES,

    // Estado (readonly)
    isUploading: readonly(isUploading),
    uploadProgress: readonly(uploadProgress),
    error: readonly(error)
  }
}

export default useAssetApi
