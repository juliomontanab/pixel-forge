<script setup>
/**
 * LeftPanel.vue
 *
 * Left sidebar panel containing:
 * - Collapsible toggle tab
 * - Panel header
 * - Scrollable content area with ElementList components
 */

import { computed } from 'vue'
import ElementList from './ElementList.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: 'Elements'
  },
  // Scene elements
  images: { type: Array, default: () => [] },
  walkboxes: { type: Array, default: () => [] },
  exits: { type: Array, default: () => [] },
  actorPlacements: { type: Array, default: () => [] },
  hotspots: { type: Array, default: () => [] },
  zplanes: { type: Array, default: () => [] },
  dialogs: { type: Array, default: () => [] },
  puzzles: { type: Array, default: () => [] },
  sfx: { type: Array, default: () => [] },
  music: { type: Array, default: () => [] },
  cutscenes: { type: Array, default: () => [] },
  lights: { type: Array, default: () => [] },
  particles: { type: Array, default: () => [] },
  // Global elements
  globalAnimations: { type: Array, default: () => [] },
  // State
  selectedIds: { type: Object, default: () => ({}) }, // { type: [ids] }
  collapsedSections: { type: Object, default: () => ({}) },
  visibleTypes: { type: Object, default: () => ({}) },
  elementCounts: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'update:open',
  'toggle-section',
  'toggle-visibility',
  'select-all',
  'add-element',
  'select-element'
])

// Helper to get selected IDs for a type
const getSelectedIds = (type) => {
  return props.selectedIds[type] || []
}

// Element sections configuration
const elementSections = computed(() => [
  {
    type: 'image',
    arrayKey: 'images',
    title: 'Images',
    icon: '&#128444;',
    iconClass: 'text-image',
    showVisibility: true,
    emptyText: 'No images'
  },
  {
    type: 'walkbox',
    arrayKey: 'walkboxes',
    title: 'Walkboxes',
    icon: '&#9634;',
    iconClass: 'text-walkbox',
    showVisibility: true,
    emptyText: 'No walkboxes'
  },
  {
    type: 'exit',
    arrayKey: 'exits',
    title: 'Exits',
    icon: '&#128682;',
    iconClass: 'text-exit',
    showVisibility: true,
    emptyText: 'No exits'
  },
  {
    type: 'actor',
    arrayKey: 'actorPlacements',
    title: 'Actors',
    icon: '&#128100;',
    iconClass: 'text-actor',
    showVisibility: true,
    emptyText: 'No actor placements'
  },
  {
    type: 'hotspot',
    arrayKey: 'hotspots',
    title: 'Hotspots',
    icon: '&#128293;',
    iconClass: 'text-hotspot',
    showVisibility: true,
    emptyText: 'No hotspots'
  },
  {
    type: 'zplane',
    arrayKey: 'zplanes',
    title: 'Z-Planes',
    icon: '&#128202;',
    iconClass: 'text-zplane',
    showVisibility: true,
    emptyText: 'No z-planes'
  },
  {
    type: 'dialog',
    arrayKey: 'dialogs',
    title: 'Dialogs',
    icon: '&#128172;',
    iconClass: 'text-dialog',
    showVisibility: false,
    emptyText: 'No dialogs'
  },
  {
    type: 'puzzle',
    arrayKey: 'puzzles',
    title: 'Puzzles',
    icon: '&#129513;',
    iconClass: 'text-puzzle',
    showVisibility: false,
    emptyText: 'No puzzles'
  },
  {
    type: 'sfx',
    arrayKey: 'sfx',
    title: 'SFX',
    icon: '&#128266;',
    iconClass: 'text-sfx',
    showVisibility: false,
    emptyText: 'No sound effects'
  },
  {
    type: 'music',
    arrayKey: 'music',
    title: 'Music',
    icon: '&#127925;',
    iconClass: 'text-music',
    showVisibility: false,
    emptyText: 'No music tracks'
  },
  {
    type: 'cutscene',
    arrayKey: 'cutscenes',
    title: 'Cutscenes',
    icon: '&#127916;',
    iconClass: 'text-cutscene',
    showVisibility: false,
    badgeKey: 'actions',
    emptyText: 'No cutscenes'
  },
  {
    type: 'light',
    arrayKey: 'lights',
    title: 'Lights',
    icon: '&#128161;',
    iconClass: 'text-light',
    showVisibility: true,
    emptyText: 'No lights'
  },
  {
    type: 'particle',
    arrayKey: 'particles',
    title: 'Particles',
    icon: '&#10024;',
    iconClass: 'text-particle',
    showVisibility: true,
    emptyText: 'No particle emitters'
  }
])

// Get elements for a section
const getElements = (arrayKey) => {
  return props[arrayKey] || []
}
</script>

<template>
  <aside class="left-panel pixel-border" :class="{ open }">
    <!-- Toggle Tab -->
    <div class="panel-tab" @click="$emit('update:open', !open)">
      <span class="tab-text">{{ title }}</span>
      <span class="tab-arrow">{{ open ? '&#9664;' : '&#9654;' }}</span>
    </div>

    <!-- Panel Header -->
    <div class="panel-header">
      <h3 class="panel-title">{{ title }}</h3>
    </div>

    <!-- Panel Content -->
    <div class="panel-content pixel-scrollbar">
      <!-- Scene Elements -->
      <ElementList
        v-for="section in elementSections"
        :key="section.type"
        :type="section.type"
        :title="section.title"
        :icon="section.icon"
        :icon-class="section.iconClass"
        :elements="getElements(section.arrayKey)"
        :selected-ids="getSelectedIds(section.type)"
        :collapsed="collapsedSections[section.arrayKey] ?? true"
        :visible="visibleTypes[section.type] ?? true"
        :show-visibility="section.showVisibility"
        :empty-text="section.emptyText"
        :badge-key="section.badgeKey"
        @toggle-collapse="$emit('toggle-section', section.arrayKey)"
        @toggle-visibility="$emit('toggle-visibility', section.type)"
        @select-all="$emit('select-all', section.type, section.arrayKey)"
        @add="$emit('add-element', section.type)"
        @select="(element, event) => $emit('select-element', section.type, element, event)"
      />

      <!-- Global Animations Section -->
      <ElementList
        type="animation"
        title="Animations"
        icon="&#127902;"
        icon-class="text-animation"
        :elements="globalAnimations"
        :selected-ids="getSelectedIds('animation')"
        :collapsed="collapsedSections.animations ?? true"
        :visible="true"
        :show-visibility="false"
        :show-select-all="false"
        empty-text="No animations"
        badge-key="frames"
        badge-icon="f"
        @toggle-collapse="$emit('toggle-section', 'animations')"
        @add="$emit('add-element', 'animation')"
        @select="(element, event) => $emit('select-element', 'animation', element, event)"
      />
    </div>
  </aside>
</template>

<style scoped>
.left-panel {
  position: relative;
  width: 280px;
  min-width: 280px;
  background: var(--bg-card, #1e1e3f);
  display: flex;
  flex-direction: column;
  transition: margin-left 0.2s ease, width 0.2s ease;
  z-index: 10;
}

.left-panel:not(.open) {
  margin-left: -250px;
  width: 30px;
  min-width: 30px;
}

/* Panel Tab */
.panel-tab {
  position: absolute;
  right: -24px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  padding: 40px 4px;
  background: var(--bg-card, #1e1e3f);
  border: 2px solid var(--border-color, #333355);
  border-left: none;
  border-radius: 0 8px 8px 0;
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

.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted, #666);
}

/* Pixel border effect */
.pixel-border {
  border: 2px solid var(--border-color, #333355);
  box-shadow:
    inset -2px -2px 0 rgba(0, 0, 0, 0.2),
    inset 2px 2px 0 rgba(255, 255, 255, 0.05);
}
</style>
