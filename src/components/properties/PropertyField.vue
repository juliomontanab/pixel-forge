<script setup>
/**
 * PropertyField.vue
 *
 * Reusable property field component for the properties panel.
 * Supports various field types: text, number, checkbox, select, color, position, size, rotation.
 */

import { computed } from 'vue'

const props = defineProps({
  // Field configuration
  label: { type: String, required: true },
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'number', 'checkbox', 'select', 'color', 'position', 'size', 'rotation', 'textarea'].includes(v)
  },

  // Value binding
  modelValue: { default: null },

  // For position/size types
  valueX: { type: Number, default: 0 },
  valueY: { type: Number, default: 0 },
  valueW: { type: Number, default: 0 },
  valueH: { type: Number, default: 0 },

  // Options for select type
  options: { type: Array, default: () => [] },

  // Field attributes
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  step: { type: Number, default: undefined },
  unit: { type: String, default: '' },
  rows: { type: Number, default: 3 }
})

const emit = defineEmits([
  'update:modelValue',
  'update:valueX',
  'update:valueY',
  'update:valueW',
  'update:valueH'
])

// Computed for v-model binding
const localValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const localX = computed({
  get: () => props.valueX,
  set: (val) => emit('update:valueX', val)
})

const localY = computed({
  get: () => props.valueY,
  set: (val) => emit('update:valueY', val)
})

const localW = computed({
  get: () => props.valueW,
  set: (val) => emit('update:valueW', val)
})

const localH = computed({
  get: () => props.valueH,
  set: (val) => emit('update:valueH', val)
})
</script>

<template>
  <div class="property-field" :class="[`type-${type}`, { disabled }]">
    <label class="property-label">{{ label }}</label>

    <!-- Text Input -->
    <input
      v-if="type === 'text'"
      v-model="localValue"
      type="text"
      class="property-input"
      :placeholder="placeholder"
      :disabled="disabled"
    />

    <!-- Number Input -->
    <div v-else-if="type === 'number'" class="property-row">
      <input
        v-model.number="localValue"
        type="number"
        class="property-input"
        :placeholder="placeholder"
        :disabled="disabled"
        :min="min"
        :max="max"
        :step="step"
      />
      <span v-if="unit" class="property-unit">{{ unit }}</span>
    </div>

    <!-- Checkbox -->
    <label v-else-if="type === 'checkbox'" class="property-checkbox">
      <input
        v-model="localValue"
        type="checkbox"
        :disabled="disabled"
      />
      <span class="checkbox-label">{{ placeholder || 'Enabled' }}</span>
    </label>

    <!-- Select -->
    <select
      v-else-if="type === 'select'"
      v-model="localValue"
      class="property-select"
      :disabled="disabled"
    >
      <option
        v-for="opt in options"
        :key="opt.value ?? opt"
        :value="opt.value ?? opt"
      >
        {{ opt.label ?? opt }}
      </option>
    </select>

    <!-- Color -->
    <div v-else-if="type === 'color'" class="property-row">
      <input
        v-model="localValue"
        type="color"
        class="property-color"
        :disabled="disabled"
      />
      <input
        v-model="localValue"
        type="text"
        class="property-input color-text"
        :disabled="disabled"
      />
    </div>

    <!-- Position (X, Y) -->
    <div v-else-if="type === 'position'" class="property-row">
      <input
        v-model.number="localX"
        type="number"
        class="property-input small"
        placeholder="X"
        :disabled="disabled"
      />
      <input
        v-model.number="localY"
        type="number"
        class="property-input small"
        placeholder="Y"
        :disabled="disabled"
      />
    </div>

    <!-- Size (W, H) -->
    <div v-else-if="type === 'size'" class="property-row">
      <input
        v-model.number="localW"
        type="number"
        class="property-input small"
        placeholder="W"
        :disabled="disabled"
        :min="min"
      />
      <input
        v-model.number="localH"
        type="number"
        class="property-input small"
        placeholder="H"
        :disabled="disabled"
        :min="min"
      />
    </div>

    <!-- Rotation -->
    <div v-else-if="type === 'rotation'" class="property-row">
      <input
        v-model.number="localValue"
        type="number"
        class="property-input"
        placeholder="0"
        :disabled="disabled"
        min="0"
        max="360"
      />
      <span class="property-unit">°</span>
    </div>

    <!-- Textarea -->
    <textarea
      v-else-if="type === 'textarea'"
      v-model="localValue"
      class="property-textarea"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
    ></textarea>
  </div>
</template>

<style scoped>
.property-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
}

.property-field.disabled {
  opacity: 0.6;
}

.property-label {
  font-size: 9px;
  font-family: 'Press Start 2P', monospace;
  color: var(--text-muted, #888);
  text-transform: uppercase;
}

.property-input {
  background: var(--bg-dark, #0f0f23);
  border: 1px solid var(--border-color, #333);
  color: var(--text-primary, #fff);
  padding: 6px 8px;
  font-size: 11px;
  font-family: monospace;
  border-radius: 2px;
  width: 100%;
}

.property-input:focus {
  outline: none;
  border-color: var(--primary, #c9a227);
}

.property-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.property-input.small {
  width: calc(50% - 2px);
}

.property-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.property-unit {
  font-size: 10px;
  color: var(--text-muted, #888);
  min-width: 16px;
}

.property-select {
  background: var(--bg-dark, #0f0f23);
  border: 1px solid var(--border-color, #333);
  color: var(--text-primary, #fff);
  padding: 6px 8px;
  font-size: 11px;
  font-family: monospace;
  border-radius: 2px;
  width: 100%;
  cursor: pointer;
}

.property-select:focus {
  outline: none;
  border-color: var(--primary, #c9a227);
}

.property-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.property-checkbox input {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 10px;
  color: var(--text-primary, #fff);
}

.property-color {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 2px solid var(--border-color, #333);
  border-radius: 2px;
  cursor: pointer;
}

.color-text {
  flex: 1;
}

.property-textarea {
  background: var(--bg-dark, #0f0f23);
  border: 1px solid var(--border-color, #333);
  color: var(--text-primary, #fff);
  padding: 6px 8px;
  font-size: 11px;
  font-family: monospace;
  border-radius: 2px;
  width: 100%;
  resize: vertical;
}

.property-textarea:focus {
  outline: none;
  border-color: var(--primary, #c9a227);
}
</style>
