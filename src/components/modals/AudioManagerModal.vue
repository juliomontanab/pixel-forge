<script setup>
/**
 * AudioManagerModal.vue
 *
 * Modal for managing project audio assets with:
 * - Upload zone with drag & drop
 * - Audio list with preview playback
 * - Type selector (SFX/Music)
 */

import { ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  audioAssets: { type: Array, default: () => [] },
  currentlyPlayingId: { type: [Number, null], default: null }
})

const emit = defineEmits([
  'close',
  'update:show',
  'upload-files',
  'delete-audio',
  'play-audio',
  'stop-audio',
  'update-audio'
])

// Local state
const isDragging = ref(false)
const fileInput = ref(null)

// Close modal and stop audio
const closeModal = () => {
  emit('stop-audio')
  emit('update:show', false)
  emit('close')
}

// Watch for show changes to stop audio when closing
watch(() => props.show, (newVal) => {
  if (!newVal) {
    emit('stop-audio')
  }
})

// Upload handlers
const onDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const onDragLeave = () => {
  isDragging.value = false
}

const onDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length > 0) {
    emit('upload-files', files)
  }
}

const onFileChange = (e) => {
  const files = Array.from(e.target?.files || [])
  if (files.length > 0) {
    emit('upload-files', files)
  }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Format duration as mm:ss
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Toggle play/stop
const togglePlay = (audio) => {
  if (props.currentlyPlayingId === audio.id) {
    emit('stop-audio')
  } else {
    emit('play-audio', audio)
  }
}

// Update audio field
const updateAudioField = (audioId, field, value) => {
  emit('update-audio', audioId, field, value)
}
</script>

<template>
  <div
    v-if="show"
    class="modal-overlay audio-manager-overlay"
    @click.self="closeModal"
  >
    <div class="modal-content audio-manager-modal">
      <header class="modal-header">
        <h3>🔊 Audio Manager</h3>
        <button class="modal-close-btn" @click="closeModal">✕</button>
      </header>

      <div class="modal-body audio-manager-body">
        <!-- Upload Zone -->
        <div
          class="audio-upload-zone"
          :class="{ dragging: isDragging }"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept="audio/*"
            multiple
            style="display: none"
            @change="onFileChange"
          />
          <div class="upload-zone-content">
            <span class="upload-icon">🎵</span>
            <span class="upload-text">Arrastra archivos de audio aquí o haz clic</span>
            <span class="upload-hint">MP3, WAV, OGG soportados</span>
          </div>
        </div>

        <!-- Audio List -->
        <div class="audio-list">
          <div
            v-for="audio in audioAssets"
            :key="audio.id"
            class="audio-list-item"
            :class="{ playing: currentlyPlayingId === audio.id }"
          >
            <div class="audio-item-main">
              <button
                class="audio-play-btn-large"
                @click.stop="togglePlay(audio)"
              >
                {{ currentlyPlayingId === audio.id ? '⏹' : '▶' }}
              </button>
              <div class="audio-item-info">
                <input
                  type="text"
                  :value="audio.name"
                  class="audio-name-input"
                  @click.stop
                  @input="updateAudioField(audio.id, 'name', $event.target.value)"
                />
                <div class="audio-meta">
                  <span class="audio-format">{{ audio.format?.toUpperCase() }}</span>
                  <span class="audio-duration-tag">{{ formatDuration(audio.duration) }}</span>
                </div>
              </div>
              <div class="audio-type-selector">
                <select
                  :value="audio.type"
                  class="audio-type-select"
                  @click.stop
                  @change="updateAudioField(audio.id, 'type', $event.target.value)"
                >
                  <option value="sfx">SFX</option>
                  <option value="music">Music</option>
                </select>
              </div>
              <button
                class="audio-delete-btn"
                @click.stop="$emit('delete-audio', audio.id)"
                title="Eliminar audio"
              >
                🗑️
              </button>
            </div>
          </div>
          <p v-if="audioAssets.length === 0" class="empty-audio">
            No hay archivos de audio. Arrastra archivos arriba para comenzar.
          </p>
        </div>
      </div>

      <footer class="modal-footer">
        <span class="audio-count">{{ audioAssets.length }} archivos de audio</span>
        <button class="modal-btn" @click="closeModal">Listo</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.audio-manager-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.audio-manager-modal {
  background: var(--bg-dark, #0f0f23);
  border: 4px solid var(--border-color, #333355);
  border-radius: 0;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-medium, #1a1a2e);
  border-bottom: 4px solid var(--border-color, #333355);
}

.modal-header h3 {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: var(--accent, #00d4ff);
  margin: 0;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #888);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.15s;
}

.modal-close-btn:hover {
  color: var(--error, #ff4757);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.audio-manager-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Upload Zone */
.audio-upload-zone {
  border: 3px dashed var(--border-color, #333355);
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-medium, #1a1a2e);
}

.audio-upload-zone:hover,
.audio-upload-zone.dragging {
  border-color: var(--accent, #00d4ff);
  background: rgba(0, 212, 255, 0.05);
}

.upload-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.upload-icon {
  font-size: 32px;
}

.upload-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--text-primary, #e0e0e0);
}

.upload-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
}

/* Audio List */
.audio-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.audio-list-item {
  background: var(--bg-medium, #1a1a2e);
  border: 2px solid var(--border-color, #333355);
  border-radius: 4px;
  padding: 12px;
  transition: all 0.15s;
}

.audio-list-item:hover {
  border-color: var(--accent, #00d4ff);
}

.audio-list-item.playing {
  border-color: var(--success, #00ff88);
  background: rgba(0, 255, 136, 0.05);
}

.audio-item-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.audio-play-btn-large {
  width: 40px;
  height: 40px;
  border: 2px solid var(--border-color, #333355);
  border-radius: 50%;
  background: var(--bg-card, #1e1e3f);
  color: var(--text-primary, #e0e0e0);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.audio-play-btn-large:hover {
  border-color: var(--accent, #00d4ff);
  color: var(--accent, #00d4ff);
}

.audio-list-item.playing .audio-play-btn-large {
  border-color: var(--success, #00ff88);
  color: var(--success, #00ff88);
}

.audio-item-info {
  flex: 1;
  min-width: 0;
}

.audio-name-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  color: var(--text-primary, #e0e0e0);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  padding: 4px 0;
  outline: none;
  transition: border-color 0.15s;
}

.audio-name-input:hover,
.audio-name-input:focus {
  border-bottom-color: var(--accent, #00d4ff);
}

.audio-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.audio-format,
.audio-duration-tag {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  background: var(--bg-card, #1e1e3f);
  padding: 2px 6px;
  border-radius: 2px;
}

.audio-type-selector {
  flex-shrink: 0;
}

.audio-type-select {
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  color: var(--text-primary, #e0e0e0);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  outline: none;
}

.audio-type-select:hover,
.audio-type-select:focus {
  border-color: var(--accent, #00d4ff);
}

.audio-delete-btn {
  background: transparent;
  border: 2px solid transparent;
  color: var(--text-muted, #888);
  font-size: 16px;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.15s;
  flex-shrink: 0;
}

.audio-delete-btn:hover {
  background: var(--error, #ff4757);
  border-color: var(--error, #ff4757);
  color: white;
}

.empty-audio {
  text-align: center;
  color: var(--text-muted, #888);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  padding: 32px;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-medium, #1a1a2e);
  border-top: 4px solid var(--border-color, #333355);
}

.audio-count {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-muted, #888);
}

.modal-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  padding: 10px 20px;
  background: var(--primary, #c9a227);
  color: var(--bg-dark, #0f0f23);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-btn:hover {
  background: var(--accent, #00d4ff);
}
</style>
