<script setup>
/**
 * BaseElementProperties.vue
 *
 * Common properties for all element types:
 * Header (type + delete), ID, Name, Position, Size, Rotation
 */

const props = defineProps({
  element: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['delete'])
</script>

<template>
  <div class="base-element-properties">
    <!-- Header -->
    <div class="property-header">
      <span class="property-type">{{ type.toUpperCase() }}</span>
      <button class="delete-element-btn" @click="emit('delete')" title="Delete (Del)">
        🗑 DELETE
      </button>
    </div>

    <!-- ID (readonly) -->
    <div class="property-group">
      <label class="property-label">ID</label>
      <input
        :value="element.id"
        type="text"
        class="property-input"
        disabled
      />
    </div>

    <!-- Name -->
    <div class="property-group">
      <label class="property-label">Name</label>
      <input
        v-model="element.name"
        type="text"
        class="property-input"
      />
    </div>

    <!-- Position (if element has x, y) -->
    <div class="property-group" v-if="element.x !== undefined">
      <label class="property-label">Position</label>
      <div class="property-row">
        <input
          v-model.number="element.x"
          type="number"
          class="property-input small"
          placeholder="X"
        />
        <input
          v-model.number="element.y"
          type="number"
          class="property-input small"
          placeholder="Y"
        />
      </div>
    </div>

    <!-- Size (if element has w, h) -->
    <div class="property-group" v-if="element.w !== undefined">
      <label class="property-label">Size</label>
      <div class="property-row">
        <input
          v-model.number="element.w"
          type="number"
          class="property-input small"
          placeholder="W"
        />
        <input
          v-model.number="element.h"
          type="number"
          class="property-input small"
          placeholder="H"
        />
      </div>
    </div>

    <!-- Rotation (if element has rotation) -->
    <div class="property-group" v-if="element.rotation !== undefined">
      <label class="property-label">Rotation</label>
      <div class="property-row">
        <input
          v-model.number="element.rotation"
          type="number"
          class="property-input"
          placeholder="0"
          min="0"
          max="360"
        />
        <span class="property-unit">°</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.base-element-properties {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
