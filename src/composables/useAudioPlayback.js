/**
 * useAudioPlayback.js
 *
 * Composable para reproducción de audio en el editor.
 * Maneja música y efectos de sonido para el modo de juego.
 *
 * @example
 * const {
 *   currentMusic,
 *   musicAudio,
 *   playMusic,
 *   stopMusic,
 *   playSFX,
 *   stopAllAudio
 * } = useAudioPlayback({ getAudioAssetById })
 */

import { ref } from 'vue'

/**
 * Creates an audio playback system
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.getAudioAssetById - Function to get audio asset by ID
 * @param {Ref} [options.currentScene] - Optional current scene for scene-based audio
 * @returns {Object} Audio playback methods and state
 */
export function useAudioPlayback(options = {}) {
  const { getAudioAssetById, currentScene } = options

  // Music state
  const musicAudio = ref(null)
  const currentMusic = ref(null)

  // Preview audio state (for Asset Manager)
  const previewAudio = ref(null)
  const currentlyPlayingId = ref(null)

  /**
   * Play a music track
   * @param {Object} musicEntry - Music entry with audioAssetId, volume, loop
   */
  const playMusic = (musicEntry) => {
    if (!getAudioAssetById) return

    const audioAsset = getAudioAssetById(musicEntry.audioAssetId)
    if (!audioAsset) return

    // Stop current music
    if (musicAudio.value) {
      musicAudio.value.pause()
    }

    const audio = new Audio(audioAsset.data)
    audio.volume = (musicEntry.volume || 100) / 100
    audio.loop = musicEntry.loop !== false
    audio.play().catch(() => {}) // Ignore autoplay restrictions

    musicAudio.value = audio
    currentMusic.value = musicEntry
  }

  /**
   * Stop music with optional fade out
   * @param {number} [fadeOut=0] - Fade out duration in ms
   */
  const stopMusic = (fadeOut = 0) => {
    if (!musicAudio.value) return

    if (fadeOut > 0) {
      const audio = musicAudio.value
      const startVolume = audio.volume
      const fadeStep = startVolume / (fadeOut / 50)
      const fadeInterval = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - fadeStep)
        if (audio.volume <= 0) {
          clearInterval(fadeInterval)
          audio.pause()
          musicAudio.value = null
          currentMusic.value = null
        }
      }, 50)
    } else {
      musicAudio.value.pause()
      musicAudio.value = null
      currentMusic.value = null
    }
  }

  /**
   * Play a sound effect
   * @param {Object|number} sfxIdOrEntry - SFX entry or ID
   */
  const playSFX = (sfxIdOrEntry) => {
    if (!getAudioAssetById) return

    let audioAssetId
    let volume = 100

    if (typeof sfxIdOrEntry === 'object') {
      audioAssetId = sfxIdOrEntry.audioAssetId
      volume = sfxIdOrEntry.volume || 100
    } else if (currentScene?.value) {
      const sfxEntry = currentScene.value.sfx?.find(s => s.id === sfxIdOrEntry)
      audioAssetId = sfxEntry?.audioAssetId
      volume = sfxEntry?.volume || 100
    }

    const audioAsset = getAudioAssetById(audioAssetId)
    if (!audioAsset) return

    const audio = new Audio(audioAsset.data)
    audio.volume = volume / 100
    audio.play().catch(() => {})
  }

  /**
   * Play scene music (first music entry)
   */
  const playSceneMusic = () => {
    if (!currentScene?.value) return

    const musicEntry = currentScene.value.music?.[0]
    if (musicEntry?.audioAssetId) {
      playMusic(musicEntry)
    }
  }

  /**
   * Stop all play mode audio
   */
  const stopAllAudio = () => {
    if (musicAudio.value) {
      musicAudio.value.pause()
      musicAudio.value = null
    }
    currentMusic.value = null
  }

  /**
   * Play audio preview (for Asset Manager)
   * @param {Object} audioAsset - Audio asset to preview
   */
  const playPreview = (audioAsset) => {
    // Stop current preview
    if (previewAudio.value) {
      previewAudio.value.pause()
      previewAudio.value = null
    }

    if (!audioAsset?.data) return

    const audio = new Audio(audioAsset.data)
    audio.volume = 0.7
    audio.play().catch(() => {})

    audio.onended = () => {
      currentlyPlayingId.value = null
      previewAudio.value = null
    }

    previewAudio.value = audio
    currentlyPlayingId.value = audioAsset.id
  }

  /**
   * Stop audio preview
   */
  const stopPreview = () => {
    if (previewAudio.value) {
      previewAudio.value.pause()
      previewAudio.value = null
    }
    currentlyPlayingId.value = null
  }

  return {
    // State
    musicAudio,
    currentMusic,
    previewAudio,
    currentlyPlayingId,

    // Methods
    playMusic,
    stopMusic,
    playSFX,
    playSceneMusic,
    stopAllAudio,
    playPreview,
    stopPreview
  }
}

export default useAudioPlayback
