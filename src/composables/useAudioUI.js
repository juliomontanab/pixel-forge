/**
 * useAudioUI.js
 *
 * Composable para la UI de gestión de audio.
 * Maneja upload, drag-drop, preview y edición de audio assets.
 *
 * @example
 * const {
 *   audioUploadDragging,
 *   currentlyPlayingAudio,
 *   handleAudioUpload,
 *   playAudioPreview,
 *   stopAudioPreview,
 *   formatDuration
 * } = useAudioUI({ project, autoSaveProject })
 */

import { ref } from 'vue'

/**
 * Creates audio UI management utilities
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.project - Reactive reference to project data
 * @param {Function} [options.autoSaveProject] - Optional function to auto-save project
 * @returns {Object} Audio UI methods and state
 */
export function useAudioUI(options = {}) {
  const { project, autoSaveProject } = options

  // =====================
  // STATE
  // =====================
  const audioUploadDragging = ref(false)
  const currentlyPlayingAudio = ref(null) // { id, audioElement }

  // =====================
  // UPLOAD FUNCTIONS
  // =====================

  /**
   * Upload audio from file
   * @param {File} file - Audio file to upload
   */
  const handleAudioUpload = (file) => {
    if (!file || !file.type.startsWith('audio/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      // Create audio element to get duration
      const audio = new Audio()
      audio.onloadedmetadata = () => {
        const audioAsset = {
          id: Date.now(),
          name: file.name.replace(/\.[^.]+$/, ''),
          data: e.target.result,
          duration: audio.duration,
          format: file.type.split('/')[1] || 'unknown',
          type: 'sfx' // Default, can be changed to 'music'
        }

        if (!project.value.globalData.audioAssets) {
          project.value.globalData.audioAssets = []
        }
        project.value.globalData.audioAssets.push(audioAsset)

        if (autoSaveProject) {
          autoSaveProject()
        }
      }
      audio.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  /**
   * Handle audio file input change
   * @param {Event} event - Input change event
   */
  const onAudioFileChange = (event) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(handleAudioUpload)
    }
    event.target.value = ''
  }

  /**
   * Handle audio drag over
   * @param {DragEvent} event - Drag event
   */
  const onAudioDragOver = (event) => {
    event.preventDefault()
    audioUploadDragging.value = true
  }

  /**
   * Handle audio drag leave
   */
  const onAudioDragLeave = () => {
    audioUploadDragging.value = false
  }

  /**
   * Handle audio drop
   * @param {DragEvent} event - Drop event
   */
  const onAudioDrop = (event) => {
    event.preventDefault()
    audioUploadDragging.value = false
    const files = event.dataTransfer.files
    if (files) {
      Array.from(files).forEach(handleAudioUpload)
    }
  }

  /**
   * Handle multiple audio files upload
   * @param {FileList|Array} files - Files to upload
   */
  const handleAudioUploadFiles = (files) => {
    Array.from(files).forEach(handleAudioUpload)
  }

  // =====================
  // EDIT FUNCTIONS
  // =====================

  /**
   * Update a field on an audio asset
   * @param {number} audioId - Audio asset ID
   * @param {string} field - Field to update
   * @param {any} value - New value
   */
  const updateAudioAssetField = (audioId, field, value) => {
    const audioAssets = project.value.globalData?.audioAssets
    if (!audioAssets) return

    const asset = audioAssets.find(a => a.id === audioId)
    if (asset) {
      asset[field] = value
    }
  }

  /**
   * Delete an audio asset
   * @param {number} audioId - Audio asset ID to delete
   */
  const deleteAudioAsset = (audioId) => {
    const audioAssets = project.value.globalData?.audioAssets
    if (!audioAssets) return

    // Stop if currently playing
    if (currentlyPlayingAudio.value?.id === audioId) {
      stopAudioPreview()
    }

    const index = audioAssets.findIndex(a => a.id === audioId)
    if (index > -1) {
      audioAssets.splice(index, 1)
    }
  }

  // =====================
  // PREVIEW FUNCTIONS
  // =====================

  /**
   * Play audio preview
   * @param {Object} audioAsset - Audio asset to play
   */
  const playAudioPreview = (audioAsset) => {
    // Stop any currently playing audio
    stopAudioPreview()

    if (!audioAsset?.data) return

    const audio = new Audio(audioAsset.data)
    audio.onended = () => {
      currentlyPlayingAudio.value = null
    }
    audio.play().catch(() => {
      // Handle autoplay restriction
      currentlyPlayingAudio.value = null
    })

    currentlyPlayingAudio.value = {
      id: audioAsset.id,
      audioElement: audio
    }
  }

  /**
   * Stop audio preview
   */
  const stopAudioPreview = () => {
    if (currentlyPlayingAudio.value?.audioElement) {
      currentlyPlayingAudio.value.audioElement.pause()
      currentlyPlayingAudio.value.audioElement.currentTime = 0
    }
    currentlyPlayingAudio.value = null
  }

  // =====================
  // HELPER FUNCTIONS
  // =====================

  /**
   * Format duration in seconds to MM:SS
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Get audio asset by ID
   * @param {number} audioId - Audio ID
   * @returns {Object|null} Audio asset or null
   */
  const getAudioAssetById = (audioId) => {
    return project.value.globalData?.audioAssets?.find(a => a.id === audioId) || null
  }

  /**
   * Check if an audio asset is currently playing
   * @param {number} audioId - Audio ID to check
   * @returns {boolean}
   */
  const isPlaying = (audioId) => {
    return currentlyPlayingAudio.value?.id === audioId
  }

  /**
   * Cleanup - call on unmount
   */
  const cleanup = () => {
    stopAudioPreview()
  }

  return {
    // State
    audioUploadDragging,
    currentlyPlayingAudio,

    // Upload
    handleAudioUpload,
    onAudioFileChange,
    onAudioDragOver,
    onAudioDragLeave,
    onAudioDrop,
    handleAudioUploadFiles,

    // Edit
    updateAudioAssetField,
    deleteAudioAsset,

    // Preview
    playAudioPreview,
    stopAudioPreview,
    isPlaying,

    // Helpers
    formatDuration,
    getAudioAssetById,
    cleanup
  }
}

export default useAudioUI
