<script setup>
/**
 * DialogProperties.vue
 * Property editor for SCUMM-style dialogs with lines and choices.
 */

const props = defineProps({
  element: { type: Object, required: true },
  actors: { type: Array, default: () => [] },
  dialogs: { type: Array, default: () => [] },
  getActorById: { type: Function, default: () => null },
  getDialogActorPreviewStyle: { type: Function, default: () => ({}) },
  hasActorAnimation: { type: Function, default: () => false }
})

const emit = defineEmits(['update'])

const addLine = () => {
  if (!props.element.lines) props.element.lines = []
  props.element.lines.push({ id: Date.now(), speaker: '', text: '' })
}

const removeLine = (idx) => {
  props.element.lines.splice(idx, 1)
}

const addChoice = () => {
  if (!props.element.choices) props.element.choices = []
  props.element.choices.push({ id: Date.now(), text: '', targetDialog: null })
}

const removeChoice = (idx) => {
  props.element.choices.splice(idx, 1)
}
</script>

<template>
  <div class="dialog-properties">
    <div class="property-group">
      <label class="property-label">Actor</label>
      <select v-model="element.actor" class="property-input">
        <option :value="null">-- No Actor (Narrator) --</option>
        <option v-for="actor in actors" :key="actor.id" :value="actor.id">
          {{ actor.name }}
        </option>
      </select>
    </div>

    <div class="property-group" v-if="element.actor">
      <label class="property-label">Actor Preview</label>
      <div class="dialog-actor-preview">
        <div
          v-if="getActorById(element.actor)"
          class="actor-preview-box"
          :style="getDialogActorPreviewStyle(element.actor)"
        >
          <span v-if="!hasActorAnimation(element.actor)" class="actor-preview-name">
            {{ getActorById(element.actor)?.name }}
          </span>
        </div>
      </div>
    </div>

    <div class="property-group">
      <label class="property-label">Lines ({{ element.lines?.length || 0 }})</label>
      <div class="dialog-lines">
        <div v-for="(line, idx) in element.lines" :key="line.id || idx" class="dialog-line">
          <select v-model="line.speaker" class="property-input tiny">
            <option value="">-- Speaker --</option>
            <option value="Narrator">Narrator</option>
            <option v-for="actor in actors" :key="actor.id" :value="actor.name">
              {{ actor.name }}
            </option>
          </select>
          <input v-model="line.text" type="text" class="property-input" placeholder="Text" />
          <button class="remove-line-btn" @click="removeLine(idx)" title="Remove line">×</button>
        </div>
      </div>
      <button class="add-line-btn" @click="addLine">+ Add Line</button>
    </div>

    <div class="property-group">
      <label class="property-label">Choices</label>
      <div class="dialog-choices">
        <div v-for="(choice, idx) in element.choices" :key="choice.id || idx" class="dialog-choice">
          <input v-model="choice.text" type="text" class="property-input" placeholder="Choice text" />
          <select v-model="choice.targetDialog" class="property-input tiny">
            <option :value="null">-- Target --</option>
            <option v-for="dialog in dialogs" :key="dialog.id" :value="dialog.id">
              {{ dialog.name }}
            </option>
          </select>
          <button class="remove-line-btn" @click="removeChoice(idx)" title="Remove choice">×</button>
        </div>
      </div>
      <button class="add-line-btn" @click="addChoice">+ Add Choice</button>
    </div>
  </div>
</template>

<style scoped>
.dialog-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-input.tiny { width: 100px; flex-shrink: 0; }
.dialog-actor-preview { padding: 8px; background: var(--bg-medium, #1a1a2e); border-radius: 4px; }
.actor-preview-box { width: 64px; height: 64px; background: var(--bg-dark, #0f0f23); border-radius: 4px; display: flex; align-items: center; justify-content: center; background-size: contain; background-repeat: no-repeat; background-position: center; }
.actor-preview-name { font-size: 8px; color: var(--text-muted, #888); text-align: center; }
.dialog-lines, .dialog-choices { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.dialog-line, .dialog-choice { display: flex; gap: 4px; align-items: center; }
.remove-line-btn { background: var(--error, #ff4757); color: white; border: none; width: 20px; height: 20px; font-size: 14px; cursor: pointer; border-radius: 2px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.add-line-btn { background: var(--bg-card, #1e1e3f); border: 1px dashed var(--border-color, #333); color: var(--text-muted, #888); padding: 6px; font-size: 9px; cursor: pointer; width: 100%; text-align: center; }
.add-line-btn:hover { border-color: var(--primary, #c9a227); color: var(--primary, #c9a227); }
</style>
