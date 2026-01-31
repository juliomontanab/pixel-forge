<script setup>
/**
 * MultiSelectionPanel.vue
 *
 * Displays info when multiple elements are selected.
 * Shows count, delete button, and list of selected items.
 */

defineProps({
  selectedElements: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['delete'])
</script>

<template>
  <div class="properties-form">
    <div class="property-header multi-selection">
      <span class="property-type">{{ selectedElements.length }} SELECTED</span>
      <button class="delete-element-btn" @click="emit('delete')" title="Delete all (Del)">
        🗑 DELETE ALL
      </button>
    </div>
    <div class="multi-selection-info">
      <p class="pixel-font-sm text-muted">Multiple elements selected</p>
      <ul class="selection-list">
        <li v-for="(sel, idx) in selectedElements" :key="idx" class="selection-item">
          <span class="item-type">{{ sel.type }}</span>
          <span class="item-name">{{ sel.element.name || '#' + sel.element.id }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
