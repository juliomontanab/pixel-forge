<script setup>
/**
 * CanvasLighting.vue
 *
 * Renders the lighting overlay for ambient and point lights.
 */

import { computed } from 'vue'

const props = defineProps({
  // Lighting configuration
  lighting: {
    type: Object,
    required: true
  },
  // Scene dimensions
  sceneWidth: {
    type: Number,
    required: true
  },
  sceneHeight: {
    type: Number,
    required: true
  },
  // Zoom level
  zoom: {
    type: Number,
    default: 1
  }
})

// Get lighting gradient
const getLightingGradient = () => {
  const lights = props.lighting.lights?.filter(l => l.enabled) || []

  if (lights.length === 0) {
    return props.lighting.ambient?.color || '#ffffff'
  }

  // Build radial gradients for each light
  const gradients = lights.map(light => {
    const x = (light.x / props.sceneWidth) * 100
    const y = (light.y / props.sceneHeight) * 100
    const radius = ((light.radius || 100) / Math.max(props.sceneWidth, props.sceneHeight)) * 100
    const color = light.color || '#ffffff'
    const intensity = light.intensity || 1

    // Convert hex to rgba with intensity
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    const lightColor = `rgba(${r}, ${g}, ${b}, ${intensity})`

    return `radial-gradient(circle at ${x}% ${y}%, ${lightColor} 0%, transparent ${radius}%)`
  })

  return gradients.join(', ')
}

// Container style
const overlayStyle = computed(() => ({
  width: props.sceneWidth * props.zoom + 'px',
  height: props.sceneHeight * props.zoom + 'px',
  background: getLightingGradient(),
  mixBlendMode: 'multiply',
  opacity: 1 - (props.lighting.ambient?.intensity || 1)
}))
</script>

<template>
  <div
    v-if="lighting"
    class="lighting-overlay"
    :style="overlayStyle"
  ></div>
</template>

<style scoped>
.lighting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 50;
}
</style>
