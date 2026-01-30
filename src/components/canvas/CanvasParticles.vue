<script setup>
/**
 * CanvasParticles.vue
 *
 * Renders active particles for a particle emitter.
 */

import { computed } from 'vue'

const props = defineProps({
  // Emitter configuration
  emitter: {
    type: Object,
    required: true
  },
  // Active particles array
  particles: {
    type: Array,
    default: () => []
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

// Get particle style
const getParticleStyle = (particle) => {
  return {
    left: particle.x * props.zoom + 'px',
    top: particle.y * props.zoom + 'px',
    width: particle.size * props.zoom + 'px',
    height: particle.size * props.zoom + 'px',
    backgroundColor: particle.color || props.emitter.color || '#ffffff',
    opacity: particle.opacity ?? 1,
    borderRadius: props.emitter.shape === 'circle' ? '50%' : '0',
    transform: `rotate(${particle.rotation || 0}deg)`
  }
}

// Container style
const containerStyle = computed(() => ({
  left: 0,
  top: 0,
  width: props.sceneWidth * props.zoom + 'px',
  height: props.sceneHeight * props.zoom + 'px',
  mixBlendMode: props.emitter.blendMode || 'screen'
}))
</script>

<template>
  <div
    class="particles-container"
    :style="containerStyle"
  >
    <div
      v-for="(particle, idx) in particles"
      :key="idx"
      class="particle"
      :style="getParticleStyle(particle)"
    ></div>
  </div>
</template>

<style scoped>
.particles-container {
  position: absolute;
  pointer-events: none;
  z-index: 45;
}

.particle {
  position: absolute;
  pointer-events: none;
}
</style>
