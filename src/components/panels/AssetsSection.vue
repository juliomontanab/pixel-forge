<script setup>
/**
 * AssetsSection.vue
 *
 * Section for displaying global assets with thumbnails.
 * Opens Asset Manager modal for full management.
 */

import { computed } from 'vue'

const props = defineProps({
  // Data
  assets: { type: Array, default: () => [] },

  // State
  collapsed: { type: Boolean, default: false },

  // Functions
  getAssetDisplayUrl: { type: Function, default: () => null }
})

const emit = defineEmits([
  'toggle-collapse',
  'open-manager'
])

// Computed
const itemCount = computed(() => props.assets?.length || 0)
</script>

<template>
  <div class="element-section global-section" :class="{ collapsed }">
    <!-- Section Header -->
    <div class="section-header" @click="emit('toggle-collapse')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="section-icon text-asset">🖼️</span>
      <span class="section-name">Assets</span>
      <span class="section-count">{{ itemCount }}</span>

      <!-- Open Manager Button -->
      <button
        class="add-btn"
        @click.stop="emit('open-manager')"
        title="Open Asset Manager"
      >📁</button>
    </div>

    <!-- Section List -->
    <div class="section-list" v-show="!collapsed">
      <div
        v-for="asset in assets"
        :key="asset.id"
        class="element-item asset-item"
      >
        <div
          class="asset-thumbnail"
          :style="{ backgroundImage: getAssetDisplayUrl(asset) ? `url(${getAssetDisplayUrl(asset)})` : 'none' }"
        >
          <span v-if="asset.s3Key" class="s3-indicator">☁️</span>
        </div>
        <span class="item-name">{{ asset.name }}</span>
        <span class="asset-dims">{{ asset.width }}×{{ asset.height }}</span>
      </div>

      <!-- Empty state -->
      <p v-if="!assets?.length" class="empty-section">No assets</p>

      <!-- Manage button -->
      <button class="manage-assets-btn" @click="emit('open-manager')">
        Manage Assets
      </button>
    </div>
  </div>
</template>

<style scoped>
.element-section {
  margin-bottom: 2px;
}

.element-section.collapsed .section-list {
  display: none;
}

.global-section .section-header {
  background: var(--bg-card, #1e1e3f);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg-medium, #1a1a2e);
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--border-color, #333);
}

.section-header:hover {
  background: var(--bg-light, #16213e);
}

.collapse-icon {
  font-size: 8px;
  width: 12px;
  color: var(--text-muted, #888);
}

.section-icon {
  font-size: 12px;
}

.section-name {
  flex: 1;
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
  color: var(--text-primary, #fff);
}

.section-count {
  font-size: 9px;
  color: var(--text-muted, #888);
  background: var(--bg-dark, #0f0f23);
  padding: 2px 6px;
  border-radius: 4px;
}

.add-btn {
  background: var(--primary, #c9a227);
  color: var(--bg-dark, #0f0f23);
  border: none;
  width: 18px;
  height: 18px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn:hover {
  background: var(--primary-light, #d4b43a);
}

.section-list {
  background: var(--bg-dark, #0f0f23);
}

/* Asset items */
.element-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 24px;
  border-bottom: 1px solid var(--border-color, #222);
}

.asset-item {
  cursor: default;
}

.asset-thumbnail {
  width: 32px;
  height: 32px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  background-color: var(--bg-medium, #1a1a2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 2px;
  position: relative;
}

.s3-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 8px;
}

.item-name {
  flex: 1;
  font-size: 9px;
  font-family: 'Press Start 2P', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary, #fff);
}

.asset-dims {
  font-size: 8px;
  font-family: monospace;
  color: var(--text-muted, #888);
}

.empty-section {
  padding: 8px 24px;
  font-size: 9px;
  color: var(--text-muted, #666);
  font-style: italic;
  margin: 0;
}

.manage-assets-btn {
  width: 100%;
  padding: 8px;
  background: var(--bg-medium, #1a1a2e);
  border: none;
  border-top: 1px solid var(--border-color, #333);
  color: var(--accent, #00d4ff);
  font-size: 8px;
  font-family: 'Press Start 2P', monospace;
  cursor: pointer;
  transition: background 0.2s;
}

.manage-assets-btn:hover {
  background: var(--bg-light, #16213e);
}

/* Color class */
.text-asset { color: #f472b6; }
</style>
