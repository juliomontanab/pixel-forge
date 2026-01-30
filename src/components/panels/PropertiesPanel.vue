<script setup>
/**
 * PropertiesPanel.vue
 *
 * Right sidebar panel for editing selected element properties.
 * Shows different property editors based on element type.
 */

import { computed } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: 'Properties'
  },
  selectedElement: {
    type: Object,
    default: null
  },
  selectedType: {
    type: String,
    default: null
  },
  selectedCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'update:open',
  'update:element',
  'delete'
])

// Element type labels
const typeLabels = {
  image: 'Image',
  walkbox: 'Walkbox',
  exit: 'Exit',
  actor: 'Actor',
  hotspot: 'Hotspot',
  zplane: 'Z-Plane',
  dialog: 'Dialog',
  puzzle: 'Puzzle',
  sfx: 'SFX',
  music: 'Music',
  cutscene: 'Cutscene',
  animation: 'Animation',
  light: 'Light',
  particle: 'Particle',
  verb: 'Verb',
  item: 'Item'
}

// Element type icons
const typeIcons = {
  image: '&#128444;',
  walkbox: '&#9634;',
  exit: '&#128682;',
  actor: '&#128100;',
  hotspot: '&#128293;',
  zplane: '&#128202;',
  dialog: '&#128172;',
  puzzle: '&#129513;',
  sfx: '&#128266;',
  music: '&#127925;',
  cutscene: '&#127916;',
  animation: '&#127902;',
  light: '&#128161;',
  particle: '&#10024;',
  verb: '&#9881;',
  item: '&#128230;'
}

// Check if element has position (x, y)
const hasPosition = computed(() => {
  if (!props.selectedElement) return false
  return props.selectedElement.x !== undefined && props.selectedElement.y !== undefined
})

// Check if element has size (w, h)
const hasSize = computed(() => {
  if (!props.selectedElement) return false
  return props.selectedElement.w !== undefined && props.selectedElement.h !== undefined
})

// Check if element has rotation
const hasRotation = computed(() => {
  if (!props.selectedElement) return false
  return props.selectedElement.rotation !== undefined
})

// Update a property on the element
const updateProperty = (key, value) => {
  if (!props.selectedElement) return
  const updated = { ...props.selectedElement, [key]: value }
  emit('update:element', updated)
}
</script>

<template>
  <aside class="properties-panel pixel-border" :class="{ open }">
    <!-- Toggle Tab -->
    <div class="panel-tab" @click="$emit('update:open', !open)">
      <span class="tab-arrow">{{ open ? '&#9654;' : '&#9664;' }}</span>
      <span class="tab-text">{{ title }}</span>
    </div>

    <!-- Panel Header -->
    <div class="panel-header">
      <h3 class="panel-title">{{ title }}</h3>
    </div>

    <!-- Panel Content -->
    <div class="panel-content pixel-scrollbar">
      <!-- No Selection State -->
      <div v-if="!selectedElement" class="no-selection">
        <span class="no-selection-icon">&#128065;</span>
        <p class="no-selection-text">Select an element to edit its properties</p>
      </div>

      <!-- Multi-Selection State -->
      <div v-else-if="selectedCount > 1" class="multi-selection">
        <span class="multi-icon">&#128101;</span>
        <p class="multi-text">{{ selectedCount }} elements selected</p>
        <p class="multi-hint">Select a single element to edit properties</p>
      </div>

      <!-- Single Element Properties -->
      <template v-else>
        <!-- Element Type Header -->
        <div class="element-type-header">
          <span class="type-icon" v-html="typeIcons[selectedType] || '&#63;'"></span>
          <span class="type-label">{{ typeLabels[selectedType] || selectedType }}</span>
          <span class="element-id">#{{ selectedElement.id }}</span>
        </div>

        <!-- Common: Name -->
        <div v-if="selectedElement.name !== undefined" class="property-group">
          <label class="property-label">Name</label>
          <input
            :value="selectedElement.name"
            @input="updateProperty('name', $event.target.value)"
            type="text"
            class="property-input"
            placeholder="Element name"
          />
        </div>

        <!-- Common: Position (x, y) -->
        <div v-if="hasPosition" class="property-group">
          <label class="property-label">Position</label>
          <div class="property-row">
            <label class="property-sublabel">X</label>
            <input
              :value="selectedElement.x"
              @input="updateProperty('x', Number($event.target.value))"
              type="number"
              class="property-input-sm"
            />
            <label class="property-sublabel">Y</label>
            <input
              :value="selectedElement.y"
              @input="updateProperty('y', Number($event.target.value))"
              type="number"
              class="property-input-sm"
            />
          </div>
        </div>

        <!-- Common: Size (w, h) -->
        <div v-if="hasSize" class="property-group">
          <label class="property-label">Size</label>
          <div class="property-row">
            <label class="property-sublabel">W</label>
            <input
              :value="selectedElement.w"
              @input="updateProperty('w', Number($event.target.value))"
              type="number"
              min="1"
              class="property-input-sm"
            />
            <label class="property-sublabel">H</label>
            <input
              :value="selectedElement.h"
              @input="updateProperty('h', Number($event.target.value))"
              type="number"
              min="1"
              class="property-input-sm"
            />
          </div>
        </div>

        <!-- Common: Rotation -->
        <div v-if="hasRotation" class="property-group">
          <label class="property-label">Rotation</label>
          <div class="property-row">
            <input
              :value="selectedElement.rotation"
              @input="updateProperty('rotation', Number($event.target.value))"
              type="number"
              min="0"
              max="360"
              class="property-input-sm"
            />
            <span class="property-unit">deg</span>
          </div>
        </div>

        <!-- Type-Specific Properties Slot -->
        <div class="type-specific-properties">
          <slot
            name="type-properties"
            :element="selectedElement"
            :type="selectedType"
            :update="updateProperty"
          />
        </div>

        <!-- Delete Button -->
        <div class="property-actions">
          <button class="delete-btn" @click="$emit('delete')">
            <span class="btn-icon">&#128465;</span>
            Delete {{ typeLabels[selectedType] || 'Element' }}
          </button>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.properties-panel {
  position: relative;
  width: 300px;
  min-width: 300px;
  background: var(--bg-card, #1e1e3f);
  display: flex;
  flex-direction: column;
  transition: margin-right 0.2s ease, width 0.2s ease;
  z-index: 10;
}

.properties-panel:not(.open) {
  margin-right: -270px;
  width: 30px;
  min-width: 30px;
}

/* Panel Tab */
.panel-tab {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  padding: 40px 4px;
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  border-right: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #888);
  transition: all 0.15s;
  z-index: 11;
}

.panel-tab:hover {
  background: var(--bg-medium, #1a1a2e);
  color: var(--text-primary, #e0e0e0);
}

.tab-arrow {
  font-size: 10px;
}

/* Panel Header */
.panel-header {
  padding: 12px 16px;
  border-bottom: 2px solid var(--border-color, #333355);
}

.panel-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--text-primary, #e0e0e0);
  margin: 0;
  text-transform: uppercase;
}

/* Panel Content */
.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
}

.panel-content::-webkit-scrollbar {
  width: 8px;
}

.panel-content::-webkit-scrollbar-track {
  background: var(--bg-dark, #0f0f23);
}

.panel-content::-webkit-scrollbar-thumb {
  background: var(--border-color, #333355);
  border-radius: 4px;
}

/* No Selection */
.no-selection,
.multi-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.no-selection-icon,
.multi-icon {
  font-size: 32px;
  opacity: 0.3;
  margin-bottom: 12px;
}

.no-selection-text,
.multi-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--text-muted, #666);
  margin: 0;
}

.multi-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #555);
  margin-top: 8px;
}

/* Element Type Header */
.element-type-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-dark, #0f0f23);
  border-radius: 4px;
  margin-bottom: 16px;
}

.type-icon {
  font-size: 16px;
}

.type-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--text-primary, #e0e0e0);
  flex: 1;
}

.element-id {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #666);
}

/* Property Groups */
.property-group {
  margin-bottom: 12px;
}

.property-label {
  display: block;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #888);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.property-input {
  width: 100%;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  background: var(--bg-dark, #0f0f23);
  color: var(--text-primary, #e0e0e0);
  border: 2px solid var(--border-color, #333355);
  padding: 6px 8px;
  outline: none;
  transition: border-color 0.15s;
}

.property-input:focus {
  border-color: var(--accent, #00d4ff);
}

.property-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.property-sublabel {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #666);
}

.property-input-sm {
  width: 70px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  background: var(--bg-dark, #0f0f23);
  color: var(--text-primary, #e0e0e0);
  border: 2px solid var(--border-color, #333355);
  padding: 4px 6px;
  outline: none;
}

.property-input-sm:focus {
  border-color: var(--accent, #00d4ff);
}

.property-unit {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--text-muted, #666);
}

/* Type Specific Properties */
.type-specific-properties {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #333355);
}

/* Property Actions */
.property-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid var(--border-color, #333355);
}

.delete-btn {
  width: 100%;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  background: transparent;
  color: var(--error, #ff4757);
  border: 2px solid var(--error, #ff4757);
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s;
  border-radius: 4px;
}

.delete-btn:hover {
  background: var(--error, #ff4757);
  color: white;
}

.btn-icon {
  font-size: 12px;
}

/* Pixel border effect */
.pixel-border {
  border: 2px solid var(--border-color, #333355);
  box-shadow:
    inset -2px -2px 0 rgba(0, 0, 0, 0.2),
    inset 2px 2px 0 rgba(255, 255, 255, 0.05);
}
</style>
