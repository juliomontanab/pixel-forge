/**
 * useParticleSystem.js
 *
 * Composable para el sistema de partículas del editor.
 * Maneja presets, emisión, actualización y renderizado de partículas.
 *
 * @example
 * const {
 *   particlePresets,
 *   activeParticles,
 *   getParticleStyle,
 *   updateParticles,
 *   startParticleLoop,
 *   stopParticleLoop,
 *   applyParticlePreset
 * } = useParticleSystem({ currentScene, zoom })
 */

import { ref } from 'vue'

/**
 * Particle presets for common effects
 */
export const particlePresets = {
  fire: {
    name: 'Fire',
    icon: '🔥',
    emitRate: 30,
    lifetime: { min: 0.5, max: 1.5 },
    speed: { min: 50, max: 150 },
    direction: { min: -30, max: 30 },
    gravity: -50,
    size: { start: 20, end: 5 },
    color: { start: '#ff6600', end: '#ff000033' },
    shape: 'circle'
  },
  smoke: {
    name: 'Smoke',
    icon: '💨',
    emitRate: 15,
    lifetime: { min: 2, max: 4 },
    speed: { min: 20, max: 50 },
    direction: { min: -20, max: 20 },
    gravity: -30,
    size: { start: 10, end: 40 },
    color: { start: '#666666aa', end: '#99999900' },
    shape: 'circle'
  },
  rain: {
    name: 'Rain',
    icon: '🌧️',
    emitRate: 100,
    lifetime: { min: 0.5, max: 1 },
    speed: { min: 400, max: 600 },
    direction: { min: 170, max: 180 },
    gravity: 200,
    size: { start: 2, end: 2 },
    color: { start: '#88bbffaa', end: '#88bbff88' },
    shape: 'line'
  },
  snow: {
    name: 'Snow',
    icon: '❄️',
    emitRate: 40,
    lifetime: { min: 3, max: 6 },
    speed: { min: 20, max: 60 },
    direction: { min: 160, max: 200 },
    gravity: 20,
    size: { start: 4, end: 4 },
    color: { start: '#ffffffcc', end: '#ffffff66' },
    shape: 'circle'
  },
  dust: {
    name: 'Dust',
    icon: '✨',
    emitRate: 10,
    lifetime: { min: 2, max: 5 },
    speed: { min: 5, max: 20 },
    direction: { min: 0, max: 360 },
    gravity: 5,
    size: { start: 3, end: 1 },
    color: { start: '#d4a57466', end: '#d4a57400' },
    shape: 'circle'
  },
  magic: {
    name: 'Magic',
    icon: '✨',
    emitRate: 25,
    lifetime: { min: 1, max: 2 },
    speed: { min: 30, max: 80 },
    direction: { min: 0, max: 360 },
    gravity: -10,
    size: { start: 8, end: 2 },
    color: { start: '#ff88ffff', end: '#8888ff00' },
    shape: 'star'
  },
  bubbles: {
    name: 'Bubbles',
    icon: '🫧',
    emitRate: 8,
    lifetime: { min: 2, max: 4 },
    speed: { min: 30, max: 60 },
    direction: { min: -30, max: 30 },
    gravity: -40,
    size: { start: 6, end: 12 },
    color: { start: '#aaddff66', end: '#aaddff00' },
    shape: 'circle'
  },
  sparks: {
    name: 'Sparks',
    icon: '⚡',
    emitRate: 50,
    lifetime: { min: 0.2, max: 0.5 },
    speed: { min: 100, max: 300 },
    direction: { min: 0, max: 360 },
    gravity: 150,
    size: { start: 3, end: 1 },
    color: { start: '#ffff00ff', end: '#ff880000' },
    shape: 'circle'
  }
}

/**
 * Parse hex color to RGBA object
 * @param {string} hex - Hex color string (#RRGGBB or #RRGGBBAA)
 * @returns {{ r: number, g: number, b: number, a: number }}
 */
export const parseColor = (hex) => {
  const result = { r: 255, g: 255, b: 255, a: 1 }
  if (!hex) return result

  // Remove # if present
  hex = hex.replace('#', '')

  if (hex.length === 6) {
    result.r = parseInt(hex.slice(0, 2), 16)
    result.g = parseInt(hex.slice(2, 4), 16)
    result.b = parseInt(hex.slice(4, 6), 16)
    result.a = 1
  } else if (hex.length === 8) {
    result.r = parseInt(hex.slice(0, 2), 16)
    result.g = parseInt(hex.slice(2, 4), 16)
    result.b = parseInt(hex.slice(4, 6), 16)
    result.a = parseInt(hex.slice(6, 8), 16) / 255
  }

  return result
}

/**
 * Creates a particle system
 *
 * @param {Object} options - Configuration options
 * @param {Ref} options.currentScene - Reactive reference to current scene
 * @param {Ref} options.zoom - Reactive reference to zoom level
 * @param {Function} [options.onFrame] - Optional callback called each animation frame
 * @returns {Object} Particle system methods and state
 */
export function useParticleSystem(options = {}) {
  const { currentScene, zoom, onFrame } = options

  // Particle system state for preview
  const activeParticles = ref({}) // { emitterId: [{ x, y, vx, vy, life, maxLife, size, color }] }
  let particleAnimationFrame = null
  let lastParticleTime = 0

  /**
   * Get particle style for rendering
   * @param {Object} particle - Particle data
   * @param {Object} emitter - Emitter configuration
   * @returns {Object} CSS style object
   */
  const getParticleStyle = (particle, emitter) => {
    const progress = 1 - (particle.life / particle.maxLife)
    const currentSize = particle.size.start + (particle.size.end - particle.size.start) * progress

    // Interpolate color
    const startColor = parseColor(particle.color.start)
    const endColor = parseColor(particle.color.end)
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * progress)
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * progress)
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * progress)
    const a = startColor.a + (endColor.a - startColor.a) * progress

    const zoomValue = zoom?.value || 1

    return {
      position: 'absolute',
      left: particle.x * zoomValue + 'px',
      top: particle.y * zoomValue + 'px',
      width: currentSize * zoomValue + 'px',
      height: emitter.shape === 'line' ? (currentSize * 4) * zoomValue + 'px' : currentSize * zoomValue + 'px',
      backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
      borderRadius: emitter.shape === 'circle' ? '50%' : emitter.shape === 'star' ? '0' : '0',
      transform: emitter.shape === 'star' ? 'rotate(45deg)' : 'none',
      pointerEvents: 'none'
    }
  }

  /**
   * Update all particle emitters
   * @param {number} deltaTime - Time since last update in seconds
   */
  const updateParticles = (deltaTime) => {
    if (!currentScene?.value?.particles) return

    currentScene.value.particles.forEach(emitter => {
      if (!emitter.enabled) {
        activeParticles.value[emitter.id] = []
        return
      }

      // Initialize particle array if needed
      if (!activeParticles.value[emitter.id]) {
        activeParticles.value[emitter.id] = []
      }

      const particles = activeParticles.value[emitter.id]

      // Emit new particles
      const emitCount = emitter.emitRate * deltaTime
      for (let i = 0; i < emitCount; i++) {
        if (Math.random() < emitCount - Math.floor(emitCount) || i < Math.floor(emitCount)) {
          // Random position within emission area
          const px = emitter.x + (Math.random() - 0.5) * emitter.width
          const py = emitter.y + (Math.random() - 0.5) * emitter.height

          // Random direction and speed
          const dir = (emitter.direction.min + Math.random() * (emitter.direction.max - emitter.direction.min)) * Math.PI / 180
          const speed = emitter.speed.min + Math.random() * (emitter.speed.max - emitter.speed.min)
          const vx = Math.sin(dir) * speed
          const vy = -Math.cos(dir) * speed

          // Random lifetime
          const lifetime = emitter.lifetime.min + Math.random() * (emitter.lifetime.max - emitter.lifetime.min)

          particles.push({
            x: px,
            y: py,
            vx,
            vy,
            life: lifetime,
            maxLife: lifetime,
            size: { start: emitter.size.start, end: emitter.size.end },
            color: { start: emitter.color.start, end: emitter.color.end }
          })
        }
      }

      // Update existing particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]

        // Apply velocity
        p.x += p.vx * deltaTime
        p.y += p.vy * deltaTime

        // Apply gravity
        p.vy += emitter.gravity * deltaTime

        // Decrease lifetime
        p.life -= deltaTime

        // Remove dead particles
        if (p.life <= 0) {
          particles.splice(i, 1)
        }
      }

      // Limit max particles
      if (particles.length > 500) {
        particles.splice(0, particles.length - 500)
      }
    })
  }

  /**
   * Start the particle animation loop
   */
  const startParticleLoop = () => {
    lastParticleTime = performance.now()

    const loop = (currentTime) => {
      const deltaTime = (currentTime - lastParticleTime) / 1000
      lastParticleTime = currentTime

      updateParticles(deltaTime)

      // Call optional frame callback
      if (onFrame) {
        onFrame(currentTime)
      }

      particleAnimationFrame = requestAnimationFrame(loop)
    }

    particleAnimationFrame = requestAnimationFrame(loop)
  }

  /**
   * Stop the particle animation loop
   */
  const stopParticleLoop = () => {
    if (particleAnimationFrame) {
      cancelAnimationFrame(particleAnimationFrame)
      particleAnimationFrame = null
    }
  }

  /**
   * Apply a preset to an emitter
   * @param {Object} emitter - Emitter to modify
   * @param {string} presetName - Name of the preset
   */
  const applyParticlePreset = (emitter, presetName) => {
    const preset = particlePresets[presetName]
    if (!preset) return

    emitter.preset = presetName
    emitter.emitRate = preset.emitRate
    emitter.lifetime = { ...preset.lifetime }
    emitter.speed = { ...preset.speed }
    emitter.direction = { ...preset.direction }
    emitter.gravity = preset.gravity
    emitter.size = { ...preset.size }
    emitter.color = { ...preset.color }
    emitter.shape = preset.shape
  }

  /**
   * Get particle icon by preset name
   * @param {string} preset - Preset name
   * @returns {string} Emoji icon
   */
  const getParticleIcon = (preset) => {
    return particlePresets[preset]?.icon || '✨'
  }

  /**
   * Clear all particles for an emitter
   * @param {number} emitterId - Emitter ID
   */
  const clearParticles = (emitterId) => {
    if (emitterId) {
      delete activeParticles.value[emitterId]
    } else {
      activeParticles.value = {}
    }
  }

  /**
   * Start resizing a particle emitter
   * @param {MouseEvent} event
   * @param {Object} emitter
   * @param {string} direction - Resize direction (n, s, e, w, ne, nw, se, sw)
   */
  const startResizeParticle = (event, emitter, direction) => {
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const startWidth = emitter.width
    const startHeight = emitter.height

    const zoomValue = zoom?.value || 1

    const onMouseMove = (e) => {
      const dx = (e.clientX - startX) / zoomValue
      const dy = (e.clientY - startY) / zoomValue

      if (direction.includes('e')) emitter.width = Math.max(10, startWidth + dx * 2)
      if (direction.includes('w')) emitter.width = Math.max(10, startWidth - dx * 2)
      if (direction.includes('s')) emitter.height = Math.max(10, startHeight + dy * 2)
      if (direction.includes('n')) emitter.height = Math.max(10, startHeight - dy * 2)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return {
    // State
    activeParticles,
    particlePresets,

    // Methods
    getParticleStyle,
    updateParticles,
    startParticleLoop,
    stopParticleLoop,
    applyParticlePreset,
    getParticleIcon,
    clearParticles,
    startResizeParticle,

    // Utilities
    parseColor
  }
}

export default useParticleSystem
