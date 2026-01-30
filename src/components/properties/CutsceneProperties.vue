<script setup>
/**
 * CutsceneProperties.vue
 * Property editor for SCUMM-style cutscenes with timeline actions.
 */

const props = defineProps({
  element: { type: Object, required: true },
  actors: { type: Array, default: () => [] },
  images: { type: Array, default: () => [] },
  hotspots: { type: Array, default: () => [] },
  puzzles: { type: Array, default: () => [] },
  sfx: { type: Array, default: () => [] },
  music: { type: Array, default: () => [] },
  scenes: { type: Array, default: () => [] }
})

const emit = defineEmits(['update'])

// Trigger options
const triggerOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'scene-enter', label: 'Scene Enter' },
  { value: 'object-interact', label: 'Object Interact' },
  { value: 'puzzle-solved', label: 'Puzzle Solved' }
]

// Direction options
const directions = ['north', 'south', 'east', 'west']

// Transition options
const transitions = [
  { value: 'cut', label: 'Cut' },
  { value: 'fade', label: 'Fade' },
  { value: 'dissolve', label: 'Dissolve' }
]

// Action management
const moveAction = (index, direction) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= props.element.actions.length) return
  const actions = [...props.element.actions]
  const [moved] = actions.splice(index, 1)
  actions.splice(newIndex, 0, moved)
  props.element.actions = actions
}

const removeAction = (index) => {
  props.element.actions.splice(index, 1)
}

const addAction = (event) => {
  const type = event.target.value
  if (!type) return

  const newAction = {
    id: Date.now(),
    type,
    delay: 0,
    duration: 1000,
    params: getDefaultParams(type)
  }

  props.element.actions.push(newAction)
  event.target.value = ''
}

const getDefaultParams = (type) => {
  switch (type) {
    case 'dialog': return { actorId: null, text: '' }
    case 'move-actor': return { actorId: null, x: 0, y: 0, walk: true }
    case 'actor-direction': return { actorId: null, direction: 'south' }
    case 'actor-costume': return { actorId: null, costume: '' }
    case 'play-sfx': return { sfxId: null }
    case 'play-music': return { musicId: null, fadeIn: 0 }
    case 'stop-music': return { fadeOut: 0 }
    case 'wait': return { duration: 1000 }
    case 'fade-in':
    case 'fade-out': return { duration: 500, color: '#000000' }
    case 'camera-pan': return { x: 0, y: 0, duration: 1000 }
    case 'camera-shake': return { intensity: 5, duration: 500 }
    case 'change-scene': return { sceneId: '', transition: 'cut' }
    default: return {}
  }
}
</script>

<template>
  <div class="cutscene-properties">
    <div class="property-group">
      <label class="property-label">Trigger</label>
      <select v-model="element.trigger" class="property-select">
        <option v-for="opt in triggerOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div class="property-group" v-if="element.trigger === 'object-interact'">
      <label class="property-label">Target Object</label>
      <select v-model="element.triggerTarget" class="property-select">
        <option :value="null">-- Select --</option>
        <option v-for="img in images" :key="img.id" :value="img.id">
          {{ img.name }} (#{{ img.id }})
        </option>
        <option v-for="hotspot in hotspots" :key="'h'+hotspot.id" :value="'hotspot-'+hotspot.id">
          {{ hotspot.name }} (#{{ hotspot.id }})
        </option>
      </select>
    </div>

    <div class="property-group" v-if="element.trigger === 'puzzle-solved'">
      <label class="property-label">Target Puzzle</label>
      <select v-model="element.triggerTarget" class="property-select">
        <option :value="null">-- Select --</option>
        <option v-for="puzzle in puzzles" :key="puzzle.id" :value="puzzle.id">
          {{ puzzle.name }} (#{{ puzzle.id }})
        </option>
      </select>
    </div>

    <div class="property-group">
      <label class="property-label">
        <input type="checkbox" v-model="element.skippable" />
        Skippable (ESC)
      </label>
    </div>

    <!-- Actions List -->
    <div class="property-divider">
      <span>ACTIONS ({{ element.actions.length }})</span>
    </div>

    <div class="actions-list">
      <div
        v-for="(action, index) in element.actions"
        :key="action.id"
        class="action-item"
      >
        <div class="action-header">
          <span class="action-index">#{{ index + 1 }}</span>
          <span class="action-type">{{ action.type }}</span>
          <div class="action-controls">
            <button class="action-btn" @click="moveAction(index, -1)" :disabled="index === 0" title="Move up">↑</button>
            <button class="action-btn" @click="moveAction(index, 1)" :disabled="index === element.actions.length - 1" title="Move down">↓</button>
            <button class="action-btn action-btn-delete" @click="removeAction(index)" title="Delete">×</button>
          </div>
        </div>

        <!-- Action Parameters based on type -->
        <div class="action-params">
          <!-- Dialog -->
          <template v-if="action.type === 'dialog'">
            <select v-model="action.params.actorId" class="property-select-sm">
              <option :value="null">Narrator</option>
              <option v-for="actor in actors" :key="actor.id" :value="actor.id">
                {{ actor.name }}
              </option>
            </select>
            <textarea v-model="action.params.text" class="property-textarea-sm" placeholder="Dialog text..." rows="2"></textarea>
          </template>

          <!-- Move Actor -->
          <template v-if="action.type === 'move-actor'">
            <select v-model="action.params.actorId" class="property-select-sm">
              <option v-for="actor in actors" :key="actor.id" :value="actor.id">
                {{ actor.name }}
              </option>
            </select>
            <div class="action-row">
              <input v-model.number="action.params.x" type="number" placeholder="X" class="property-input-xs" />
              <input v-model.number="action.params.y" type="number" placeholder="Y" class="property-input-xs" />
            </div>
            <label class="property-label-sm">
              <input type="checkbox" v-model="action.params.walk" /> Walk animation
            </label>
          </template>

          <!-- Actor Direction -->
          <template v-if="action.type === 'actor-direction'">
            <select v-model="action.params.actorId" class="property-select-sm">
              <option v-for="actor in actors" :key="actor.id" :value="actor.id">
                {{ actor.name }}
              </option>
            </select>
            <select v-model="action.params.direction" class="property-select-sm">
              <option v-for="dir in directions" :key="dir" :value="dir">{{ dir }}</option>
            </select>
          </template>

          <!-- Actor Costume -->
          <template v-if="action.type === 'actor-costume'">
            <select v-model="action.params.actorId" class="property-select-sm">
              <option v-for="actor in actors" :key="actor.id" :value="actor.id">
                {{ actor.name }}
              </option>
            </select>
            <input v-model="action.params.costume" type="text" placeholder="Costume name" class="property-input-sm" />
          </template>

          <!-- Play SFX -->
          <template v-if="action.type === 'play-sfx'">
            <select v-model="action.params.sfxId" class="property-select-sm">
              <option v-for="s in sfx" :key="s.id" :value="s.id">
                {{ s.name }}
              </option>
            </select>
          </template>

          <!-- Play Music -->
          <template v-if="action.type === 'play-music'">
            <select v-model="action.params.musicId" class="property-select-sm">
              <option v-for="track in music" :key="track.id" :value="track.id">
                {{ track.name }}
              </option>
            </select>
            <input v-model.number="action.params.fadeIn" type="number" placeholder="Fade in (ms)" class="property-input-sm" />
          </template>

          <!-- Stop Music -->
          <template v-if="action.type === 'stop-music'">
            <input v-model.number="action.params.fadeOut" type="number" placeholder="Fade out (ms)" class="property-input-sm" />
          </template>

          <!-- Wait -->
          <template v-if="action.type === 'wait'">
            <input v-model.number="action.params.duration" type="number" placeholder="Duration (ms)" class="property-input-sm" />
          </template>

          <!-- Fade In/Out -->
          <template v-if="action.type === 'fade-in' || action.type === 'fade-out'">
            <input v-model.number="action.params.duration" type="number" placeholder="Duration (ms)" class="property-input-sm" />
            <input v-model="action.params.color" type="color" class="property-color" title="Fade color" />
          </template>

          <!-- Camera Pan -->
          <template v-if="action.type === 'camera-pan'">
            <div class="action-row">
              <input v-model.number="action.params.x" type="number" placeholder="X" class="property-input-xs" />
              <input v-model.number="action.params.y" type="number" placeholder="Y" class="property-input-xs" />
            </div>
            <input v-model.number="action.params.duration" type="number" placeholder="Duration (ms)" class="property-input-sm" />
          </template>

          <!-- Camera Shake -->
          <template v-if="action.type === 'camera-shake'">
            <input v-model.number="action.params.intensity" type="number" placeholder="Intensity (px)" class="property-input-sm" />
            <input v-model.number="action.params.duration" type="number" placeholder="Duration (ms)" class="property-input-sm" />
          </template>

          <!-- Change Scene -->
          <template v-if="action.type === 'change-scene'">
            <select v-model="action.params.sceneId" class="property-select-sm">
              <option value="">-- Select scene --</option>
              <option v-for="scene in scenes" :key="scene.id" :value="scene.id">
                {{ scene.name }}
              </option>
            </select>
            <select v-model="action.params.transition" class="property-select-sm">
              <option v-for="t in transitions" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
          </template>
        </div>
      </div>

      <p v-if="element.actions.length === 0" class="empty-actions">
        No actions yet
      </p>
    </div>

    <!-- Add Action Dropdown -->
    <div class="property-group">
      <label class="property-label">Add Action</label>
      <select class="property-select" @change="addAction($event)">
        <option value="">-- Select action type --</option>
        <optgroup label="Dialog & Actors">
          <option value="dialog">Dialog</option>
          <option value="move-actor">Move Actor</option>
          <option value="actor-direction">Actor Direction</option>
          <option value="actor-costume">Actor Costume</option>
        </optgroup>
        <optgroup label="Audio">
          <option value="play-sfx">Play SFX</option>
          <option value="play-music">Play Music</option>
          <option value="stop-music">Stop Music</option>
        </optgroup>
        <optgroup label="Timing">
          <option value="wait">Wait</option>
        </optgroup>
        <optgroup label="Visual Effects">
          <option value="fade-in">Fade In</option>
          <option value="fade-out">Fade Out</option>
          <option value="camera-pan">Camera Pan</option>
          <option value="camera-shake">Camera Shake</option>
        </optgroup>
        <optgroup label="Navigation">
          <option value="change-scene">Change Scene</option>
        </optgroup>
      </select>
    </div>
  </div>
</template>

<style scoped>
.cutscene-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-label-sm { font-size: 8px; color: var(--text-muted, #888); display: flex; align-items: center; gap: 4px; }
.property-select, .property-input { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-select-sm, .property-input-sm { padding: 4px 6px; font-size: 9px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); border-radius: 2px; width: 100%; }
.property-input-xs { width: 60px; padding: 4px; font-size: 9px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); border-radius: 2px; text-align: center; }
.property-textarea-sm { width: 100%; padding: 4px 6px; font-size: 9px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); border-radius: 2px; resize: vertical; font-family: inherit; }
.property-color { width: 40px; height: 24px; padding: 0; border: 1px solid var(--border-color, #333); cursor: pointer; }
.property-divider { margin: 12px 0 8px; padding: 4px 0; border-bottom: 1px solid var(--border-color, #333); }
.property-divider span { font-size: 9px; font-family: 'Press Start 2P', monospace; color: var(--accent, #00d4ff); }
.actions-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.action-item { background: var(--bg-medium, #1a1a2e); border: 1px solid var(--border-color, #333); border-radius: 4px; overflow: hidden; }
.action-header { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--bg-card, #1e1e3f); border-bottom: 1px solid var(--border-color, #333); }
.action-index { font-size: 9px; color: var(--accent, #00d4ff); font-family: monospace; }
.action-type { flex: 1; font-size: 9px; font-family: 'Press Start 2P', monospace; color: var(--text-primary, #fff); }
.action-controls { display: flex; gap: 2px; }
.action-btn { background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-muted, #888); width: 20px; height: 20px; font-size: 10px; cursor: pointer; border-radius: 2px; display: flex; align-items: center; justify-content: center; }
.action-btn:hover:not(:disabled) { color: var(--text-primary, #fff); border-color: var(--primary, #c9a227); }
.action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.action-btn-delete { color: var(--error, #ff4757); }
.action-btn-delete:hover { background: var(--error, #ff4757); color: white; }
.action-params { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.action-row { display: flex; gap: 4px; align-items: center; }
.empty-actions { padding: 12px; text-align: center; font-size: 9px; color: var(--text-muted, #666); font-style: italic; margin: 0; }
</style>
