<script setup>
/**
 * AudioProperties.vue
 * Property editor for SFX and Music elements with audio selection and playback controls.
 */

const props = defineProps({
  element: { type: Object, required: true },
  type: { type: String, required: true }, // 'sfx' or 'music'
  audioAssets: { type: Array, default: () => [] },
  currentlyPlayingAudio: { type: Object, default: null },
  formatDuration: { type: Function, default: (d) => d || '0:00' },
  getAudioAssetById: { type: Function, default: () => null }
})

const emit = defineEmits(['play', 'stop'])

const filteredAudioAssets = computed(() => {
  return props.audioAssets.filter(a => a.type === props.type)
})

const isPlaying = computed(() => {
  return props.currentlyPlayingAudio?.id === props.element.audioAssetId
})

const togglePlayback = () => {
  if (isPlaying.value) {
    emit('stop')
  } else {
    const asset = props.getAudioAssetById(props.element.audioAssetId)
    if (asset) emit('play', asset)
  }
}

const triggerOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'enter', label: 'On Room Enter' },
  { value: 'action', label: 'On Action' },
  { value: 'dialog', label: 'On Dialog' }
]

import { computed } from 'vue'
</script>

<template>
  <div class="audio-properties">
    <div class="property-group">
      <label class="property-label">Audio File</label>
      <div class="audio-selector">
        <select v-model="element.audioAssetId" class="property-select">
          <option :value="null">-- Select audio --</option>
          <option v-for="audio in filteredAudioAssets" :key="audio.id" :value="audio.id">
            {{ audio.name }} ({{ formatDuration(audio.duration) }})
          </option>
        </select>
        <button
          v-if="element.audioAssetId && getAudioAssetById(element.audioAssetId)"
          class="audio-preview-btn"
          @click="togglePlayback"
          :title="isPlaying ? 'Stop' : 'Preview'"
        >
          {{ isPlaying ? '⏹' : '▶' }}
        </button>
      </div>
    </div>

    <div class="property-group">
      <label class="property-label">Volume ({{ element.volume }}%)</label>
      <input
        v-model.number="element.volume"
        type="range"
        min="0"
        max="100"
        class="property-slider"
      />
    </div>

    <!-- SFX-specific: Trigger -->
    <div class="property-group" v-if="type === 'sfx'">
      <label class="property-label">Trigger</label>
      <select v-model="element.trigger" class="property-input">
        <option v-for="opt in triggerOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Music-specific: Fade In/Out -->
    <template v-if="type === 'music'">
      <div class="property-group">
        <label class="property-label">Fade In (ms)</label>
        <input v-model.number="element.fadeIn" type="number" class="property-input" min="0" />
      </div>
      <div class="property-group">
        <label class="property-label">Fade Out (ms)</label>
        <input v-model.number="element.fadeOut" type="number" class="property-input" min="0" />
      </div>
    </template>

    <div class="property-group">
      <label class="property-label">
        <input type="checkbox" v-model="element.loop" />
        Loop
      </label>
    </div>
  </div>
</template>

<style scoped>
.audio-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input, .property-select { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.audio-selector { display: flex; gap: 8px; align-items: center; }
.audio-selector .property-select { flex: 1; }
.audio-preview-btn { background: var(--accent, #00d4ff); color: var(--bg-dark, #0f0f23); border: none; width: 28px; height: 28px; font-size: 12px; cursor: pointer; border-radius: 2px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.audio-preview-btn:hover { opacity: 0.9; }
.property-slider { width: 100%; height: 6px; -webkit-appearance: none; background: var(--bg-dark, #0f0f23); border-radius: 3px; outline: none; }
.property-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: var(--primary, #c9a227); border-radius: 50%; cursor: pointer; }
</style>
