<script setup>
/**
 * PropertyGroup.vue
 *
 * Container for grouping related property fields.
 * Optionally collapsible with a title.
 */

import { ref } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  collapsible: { type: Boolean, default: false },
  defaultCollapsed: { type: Boolean, default: false },
  noPadding: { type: Boolean, default: false }
})

const collapsed = ref(props.defaultCollapsed)

const toggleCollapse = () => {
  if (props.collapsible) {
    collapsed.value = !collapsed.value
  }
}
</script>

<template>
  <div class="property-group" :class="{ collapsed, 'no-padding': noPadding }">
    <!-- Group Header (optional) -->
    <div
      v-if="title"
      class="group-header"
      :class="{ collapsible }"
      @click="toggleCollapse"
    >
      <span v-if="collapsible" class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="group-title">{{ title }}</span>
    </div>

    <!-- Group Content -->
    <div class="group-content" v-show="!collapsed">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.property-group {
  border-bottom: 1px solid var(--border-color, #333);
  padding: 8px 12px;
}

.property-group.no-padding {
  padding: 0;
}

.property-group.collapsed {
  padding-bottom: 4px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.group-header.collapsible {
  cursor: pointer;
  user-select: none;
}

.group-header.collapsible:hover .group-title {
  color: var(--primary, #c9a227);
}

.collapse-icon {
  font-size: 8px;
  color: var(--text-muted, #888);
  width: 12px;
}

.group-title {
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
  color: var(--accent, #00d4ff);
  text-transform: uppercase;
}

.property-group.collapsed .group-content {
  display: none;
}

.group-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
