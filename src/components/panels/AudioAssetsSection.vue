<script setup>
/**
 * AudioAssetsSection.vue
 * Section for displaying global audio assets with play/stop controls.
 */
import { computed } from 'vue'

const props = defineProps({
  audioAssets: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false },
  currentlyPlayingAudio: { type: Object, default: null },
  formatDuration: { type: Function, default: (d) => d || '0:00' }
})

const emit = defineEmits(['toggle-collapse', 'open-manager', 'play', 'stop'])

const itemCount = computed(() => props.audioAssets?.length || 0)
</script>

<template>
  <div class="element-section global-section" :class="{ collapsed }">
    <div class="section-header" @click="emit('toggle-collapse')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="section-icon text-audio">🔊</span>
      <span class="section-name">Audio</span>
      <span class="section-count">{{ itemCount }}</span>
      <button class="add-btn" @click.stop="emit('open-manager')" title="Open Audio Manager">📁</button>
    </div>
    <div class="section-list" v-show="!collapsed">
      <div v-for="audio in audioAssets" :key="audio.id" class="element-item audio-item">
        <span class="audio-type-icon">{{ audio.type === 'music' ? '🎵' : '🔊' }}</span>
        <span class="item-name">{{ audio.name }}</span>
        <span class="audio-duration">{{ formatDuration(audio.duration) }}</span>
        <button
          class="audio-play-btn"
          @click.stop="currentlyPlayingAudio?.id === audio.id ? emit('stop') : emit('play', audio)"
          :title="currentlyPlayingAudio?.id === audio.id ? 'Stop' : 'Play'"
        >{{ currentlyPlayingAudio?.id === audio.id ? '⏹' : '▶' }}</button>
      </div>
      <p v-if="!audioAssets?.length" class="empty-section">No audio</p>
      <button class="manage-assets-btn" @click="emit('open-manager')">Manage Audio</button>
    </div>
  </div>
</template>

<style scoped>
.element-section { margin-bottom: 2px; }
.global-section .section-header { background: var(--bg-card, #1e1e3f); }
.section-header { display: flex; align-items: center; gap: 4px; padding: 6px 8px; cursor: pointer; user-select: none; border-bottom: 1px solid var(--border-color, #333); }
.section-header:hover { background: var(--bg-light, #16213e); }
.collapse-icon { font-size: 8px; width: 12px; color: var(--text-muted, #888); }
.section-icon { font-size: 12px; }
.section-name { flex: 1; font-size: 10px; font-family: 'Press Start 2P', monospace; color: var(--text-primary, #fff); }
.section-count { font-size: 9px; color: var(--text-muted, #888); background: var(--bg-dark, #0f0f23); padding: 2px 6px; border-radius: 4px; }
.add-btn { background: var(--primary, #c9a227); color: var(--bg-dark, #0f0f23); border: none; width: 18px; height: 18px; font-size: 12px; cursor: pointer; border-radius: 2px; display: flex; align-items: center; justify-content: center; }
.section-list { background: var(--bg-dark, #0f0f23); }
.element-item { display: flex; align-items: center; gap: 6px; padding: 4px 8px 4px 24px; border-bottom: 1px solid var(--border-color, #222); }
.audio-type-icon { font-size: 10px; }
.item-name { flex: 1; font-size: 9px; font-family: 'Press Start 2P', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary, #fff); }
.audio-duration { font-size: 8px; color: var(--text-muted, #888); font-family: monospace; }
.audio-play-btn { background: var(--accent, #00d4ff); color: var(--bg-dark, #0f0f23); border: none; width: 20px; height: 20px; font-size: 10px; cursor: pointer; border-radius: 2px; }
.empty-section { padding: 8px 24px; font-size: 9px; color: var(--text-muted, #666); font-style: italic; margin: 0; }
.manage-assets-btn { width: 100%; padding: 8px; background: var(--bg-medium, #1a1a2e); border: none; border-top: 1px solid var(--border-color, #333); color: var(--accent, #00d4ff); font-size: 8px; font-family: 'Press Start 2P', monospace; cursor: pointer; }
.text-audio { color: #f97316; }
</style>
