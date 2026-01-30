<script setup>
/**
 * LightsSection.vue
 *
 * Section for managing scene lighting.
 * Includes ambient light settings and individual light sources.
 */

import { computed } from 'vue'

const props = defineProps({
  // Data
  lighting: { type: Object, default: () => ({ ambient: null, lights: [] }) },

  // State
  collapsed: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  selectedElements: { type: Array, default: () => [] },

  // Functions
  getLightIcon: { type: Function, default: () => '💡' }
})

const emit = defineEmits([
  'toggle-collapse',
  'toggle-visibility',
  'add',
  'select',
  'update:ambient-color',
  'update:ambient-intensity'
])

// Computed
const lights = computed(() => props.lighting?.lights || [])
const ambient = computed(() => props.lighting?.ambient || null)
const itemCount = computed(() => lights.value.length)

const isItemSelected = (item) => {
  return props.selectedElements.some(s => s.type === 'light' && s.element.id === item.id)
}

// Handle ambient updates
const updateAmbientColor = (e) => {
  emit('update:ambient-color', e.target.value)
}

const updateAmbientIntensity = (e) => {
  emit('update:ambient-intensity', parseFloat(e.target.value))
}
</script>

<template>
  <div class="element-section" :class="{ collapsed }">
    <!-- Section Header -->
    <div class="section-header" @click="emit('toggle-collapse')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>

      <!-- Visibility Toggle -->
      <button
        class="visibility-toggle"
        :class="{ hidden: !visible }"
        @click.stop="emit('toggle-visibility', 'lights')"
        title="Toggle visibility"
      >{{ visible ? '👁' : '👁' }}</button>

      <span class="section-icon text-light">💡</span>
      <span class="section-name">Lights</span>
      <span class="section-count">{{ itemCount }}</span>

      <!-- Add Button -->
      <button
        class="add-btn"
        @click.stop="emit('add', 'light')"
      >+</button>
    </div>

    <!-- Section List -->
    <div class="section-list" v-show="!collapsed">
      <!-- Ambient light settings -->
      <div class="ambient-light-settings" v-if="ambient">
        <label>Ambient:</label>
        <input
          type="color"
          :value="ambient.color"
          @input="updateAmbientColor"
          class="ambient-color"
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="ambient.intensity"
          @input="updateAmbientIntensity"
          class="ambient-intensity"
        />
        <span class="intensity-value">{{ ambient.intensity?.toFixed(1) || '0.0' }}</span>
      </div>

      <!-- Light items -->
      <div
        v-for="light in lights"
        :key="light.id"
        class="element-item"
        :class="{ selected: isItemSelected(light) }"
        @click="emit('select', 'light', light)"
      >
        <span class="item-icon text-light">{{ getLightIcon(light.type) }}</span>
        <span class="item-id">#{{ light.id }}</span>
        <span class="item-name">{{ light.name }}</span>
        <span class="light-color-preview" :style="{ backgroundColor: light.color }"></span>
      </div>

      <!-- Empty state -->
      <p v-if="!lights.length" class="empty-section">No lights</p>
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

.visibility-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
  opacity: 0.7;
}

.visibility-toggle:hover {
  opacity: 1;
}

.visibility-toggle.hidden {
  opacity: 0.3;
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
  font-size: 14px;
  font-weight: bold;
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

/* Ambient light settings */
.ambient-light-settings {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-medium, #1a1a2e);
  border-bottom: 1px solid var(--border-color, #333);
}

.ambient-light-settings label {
  font-size: 8px;
  font-family: 'Press Start 2P', monospace;
  color: var(--text-muted, #888);
}

.ambient-color {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 2px solid var(--border-color, #333);
  border-radius: 2px;
  cursor: pointer;
}

.ambient-intensity {
  flex: 1;
  height: 4px;
  cursor: pointer;
}

.intensity-value {
  font-size: 8px;
  font-family: monospace;
  color: var(--text-muted, #888);
  min-width: 24px;
  text-align: right;
}

/* Light items */
.element-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 24px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color, #222);
}

.element-item:hover {
  background: var(--bg-medium, #1a1a2e);
}

.element-item.selected {
  background: var(--primary, #c9a227);
  color: var(--bg-dark, #0f0f23);
}

.element-item.selected .item-id,
.element-item.selected .item-icon {
  color: var(--bg-dark, #0f0f23);
}

.item-icon {
  font-size: 10px;
}

.item-id {
  font-size: 8px;
  color: var(--text-muted, #888);
  font-family: monospace;
}

.item-name {
  flex: 1;
  font-size: 9px;
  font-family: 'Press Start 2P', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.light-color-preview {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid var(--border-color, #333);
}

.empty-section {
  padding: 8px 24px;
  font-size: 9px;
  color: var(--text-muted, #666);
  font-style: italic;
  margin: 0;
}

/* Color class */
.text-light { color: #fef08a; }
</style>
