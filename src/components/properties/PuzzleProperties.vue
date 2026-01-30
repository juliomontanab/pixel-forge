<script setup>
/**
 * PuzzleProperties.vue
 * Property editor for SCUMM-style puzzles with conditions, results, and hints.
 */

const props = defineProps({
  element: { type: Object, required: true },
  items: { type: Array, default: () => [] },
  hotspots: { type: Array, default: () => [] },
  images: { type: Array, default: () => [] },
  exits: { type: Array, default: () => [] },
  dialogs: { type: Array, default: () => [] },
  cutscenes: { type: Array, default: () => [] },
  verbs: { type: Array, default: () => [] },
  actors: { type: Array, default: () => [] }
})

const emit = defineEmits(['update'])

// Puzzle type options
const puzzleTypes = [
  { value: 'item-combination', label: 'Item Combination' },
  { value: 'use-on-object', label: 'Use on Object' },
  { value: 'use-on-actor', label: 'Use on Actor' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'dialog-choice', label: 'Dialog Choice' },
  { value: 'environmental', label: 'Environmental' }
]

// Result type options
const resultTypes = [
  { value: 'none', label: 'None' },
  { value: 'give-item', label: 'Give Item' },
  { value: 'remove-item', label: 'Remove/Consume Items' },
  { value: 'unlock-exit', label: 'Unlock Exit' },
  { value: 'play-cutscene', label: 'Play Cutscene' },
  { value: 'change-state', label: 'Change Object State' },
  { value: 'show-dialog', label: 'Show Dialog' }
]

// Condition handlers
const addConditionItem = () => {
  if (!props.element.conditions) props.element.conditions = {}
  if (!props.element.conditions.items) props.element.conditions.items = []
  props.element.conditions.items.push(null)
}

const removeConditionItem = (idx) => {
  props.element.conditions.items.splice(idx, 1)
}

const addSequenceStep = () => {
  if (!props.element.conditions) props.element.conditions = {}
  if (!props.element.conditions.sequence) props.element.conditions.sequence = []
  props.element.conditions.sequence.push('')
}

const removeSequenceStep = (idx) => {
  props.element.conditions.sequence.splice(idx, 1)
}

const toggleCorrectChoice = (choiceId) => {
  if (!props.element.conditions.correctChoices) {
    props.element.conditions.correctChoices = []
  }
  const idx = props.element.conditions.correctChoices.indexOf(choiceId)
  if (idx === -1) {
    props.element.conditions.correctChoices.push(choiceId)
  } else {
    props.element.conditions.correctChoices.splice(idx, 1)
  }
}

// Result handlers
const addResultRemoveItem = () => {
  if (!props.element.result.removeItems) props.element.result.removeItems = []
  props.element.result.removeItems.push(null)
}

const removeResultRemoveItem = (idx) => {
  props.element.result.removeItems.splice(idx, 1)
}

// Hint handlers
const addPuzzleHint = () => {
  if (!props.element.hints) props.element.hints = []
  props.element.hints.push({ afterAttempts: 3, text: '' })
}

const removePuzzleHint = (idx) => {
  props.element.hints.splice(idx, 1)
}

// Get dialog for choices
const getSelectedDialog = () => {
  if (!props.element.conditions?.dialogId) return null
  return props.dialogs.find(d => d.id === props.element.conditions.dialogId)
}
</script>

<template>
  <div class="puzzle-properties">
    <div class="property-group">
      <label class="property-label">Description</label>
      <textarea
        v-model="element.description"
        class="property-input property-textarea"
        placeholder="Puzzle description for designers..."
      ></textarea>
    </div>

    <div class="property-group">
      <label class="property-label">Type</label>
      <select v-model="element.type" class="property-input">
        <option v-for="pt in puzzleTypes" :key="pt.value" :value="pt.value">
          {{ pt.label }}
        </option>
      </select>
    </div>

    <!-- CONDITIONS SECTION -->
    <div class="property-section">
      <label class="property-section-title">Conditions</label>

      <!-- Item Combination: Select 2+ items -->
      <template v-if="element.type === 'item-combination'">
        <div class="property-group">
          <label class="property-label">Items to Combine</label>
          <div class="condition-items-list">
            <div v-for="(itemId, idx) in (element.conditions?.items || [])" :key="idx" class="condition-item-row">
              <select v-model="element.conditions.items[idx]" class="property-input">
                <option :value="null">-- Select Item --</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.icon }} {{ item.name }}
                </option>
              </select>
              <button class="remove-line-btn" @click="removeConditionItem(idx)">×</button>
            </div>
          </div>
          <button class="add-line-btn" @click="addConditionItem">+ Add Item</button>
        </div>
      </template>

      <!-- Use on Object: Item + Target Object -->
      <template v-if="element.type === 'use-on-object'">
        <div class="property-group">
          <label class="property-label">Item to Use</label>
          <select v-model="element.conditions.useItem" class="property-input">
            <option :value="null">-- Select Item --</option>
            <option v-for="item in items" :key="item.id" :value="item.id">
              {{ item.icon }} {{ item.name }}
            </option>
          </select>
        </div>
        <div class="property-group">
          <label class="property-label">Target Object</label>
          <select v-model="element.conditions.targetObject" class="property-input">
            <option :value="null">-- Select Object --</option>
            <optgroup label="Hotspots">
              <option v-for="h in hotspots" :key="'h-'+h.id" :value="{ type: 'hotspot', id: h.id }">
                {{ h.name }}
              </option>
            </optgroup>
            <optgroup label="Images">
              <option v-for="i in images" :key="'i-'+i.id" :value="{ type: 'image', id: i.id }">
                {{ i.name }}
              </option>
            </optgroup>
            <optgroup label="Exits">
              <option v-for="e in exits" :key="'e-'+e.id" :value="{ type: 'exit', id: e.id }">
                {{ e.name }}
              </option>
            </optgroup>
          </select>
        </div>
      </template>

      <!-- Use on Actor: Item + Target Actor -->
      <template v-if="element.type === 'use-on-actor'">
        <div class="property-group">
          <label class="property-label">Item to Use/Give</label>
          <select v-model="element.conditions.useItem" class="property-input">
            <option :value="null">-- Select Item --</option>
            <option v-for="item in items" :key="item.id" :value="item.id">
              {{ item.icon }} {{ item.name }}
            </option>
          </select>
        </div>
        <div class="property-group">
          <label class="property-label">Target Actor</label>
          <select v-model="element.conditions.targetActor" class="property-input">
            <option :value="null">-- Select Actor --</option>
            <option v-for="actor in actors" :key="actor.id" :value="actor.id">
              {{ actor.name }}
            </option>
          </select>
        </div>
      </template>

      <!-- Sequence: List of actions in order -->
      <template v-if="element.type === 'sequence'">
        <div class="property-group">
          <label class="property-label">Sequence Steps</label>
          <div class="sequence-steps-list">
            <div v-for="(step, idx) in (element.conditions?.sequence || [])" :key="idx" class="sequence-step-row">
              <span class="step-number">{{ idx + 1 }}.</span>
              <input v-model="element.conditions.sequence[idx]" type="text" class="property-input" placeholder="Action description" />
              <button class="remove-line-btn" @click="removeSequenceStep(idx)">×</button>
            </div>
          </div>
          <button class="add-line-btn" @click="addSequenceStep">+ Add Step</button>
        </div>
      </template>

      <!-- Dialog Choice: Dialog + Correct choices -->
      <template v-if="element.type === 'dialog-choice'">
        <div class="property-group">
          <label class="property-label">Dialog</label>
          <select v-model="element.conditions.dialogId" class="property-input">
            <option :value="null">-- Select Dialog --</option>
            <option v-for="dialog in dialogs" :key="dialog.id" :value="dialog.id">
              {{ dialog.name }}
            </option>
          </select>
        </div>
        <div class="property-group" v-if="element.conditions.dialogId">
          <label class="property-label">Required Choices</label>
          <p class="property-hint">Select which choices must be picked to solve</p>
          <div class="choices-checklist">
            <label
              v-for="choice in (getSelectedDialog()?.choices || [])"
              :key="choice.id"
              class="choice-checkbox"
            >
              <input
                type="checkbox"
                :checked="(element.conditions.correctChoices || []).includes(choice.id)"
                @change="toggleCorrectChoice(choice.id)"
              />
              {{ choice.text || '(empty choice)' }}
            </label>
          </div>
        </div>
      </template>

      <!-- Environmental: Just trigger object -->
      <template v-if="element.type === 'environmental'">
        <div class="property-group">
          <label class="property-label">Trigger Object</label>
          <select v-model="element.conditions.targetObject" class="property-input">
            <option :value="null">-- Select Object --</option>
            <optgroup label="Hotspots">
              <option v-for="h in hotspots" :key="'h-'+h.id" :value="{ type: 'hotspot', id: h.id }">
                {{ h.name }}
              </option>
            </optgroup>
            <optgroup label="Images">
              <option v-for="i in images" :key="'i-'+i.id" :value="{ type: 'image', id: i.id }">
                {{ i.name }}
              </option>
            </optgroup>
          </select>
        </div>
        <div class="property-group">
          <label class="property-label">Required Verb</label>
          <select v-model="element.conditions.requiredVerb" class="property-input">
            <option :value="null">-- Any Verb --</option>
            <option v-for="verb in verbs" :key="verb.id" :value="verb.id">
              {{ verb.icon }} {{ verb.name }}
            </option>
          </select>
        </div>
      </template>
    </div>

    <!-- RESULT SECTION -->
    <div class="property-section">
      <label class="property-section-title">Result</label>

      <div class="property-group">
        <label class="property-label">Result Type</label>
        <select v-model="element.result.type" class="property-input">
          <option v-for="rt in resultTypes" :key="rt.value" :value="rt.value">
            {{ rt.label }}
          </option>
        </select>
      </div>

      <!-- Give Item -->
      <template v-if="element.result.type === 'give-item'">
        <div class="property-group">
          <label class="property-label">Item to Give</label>
          <select v-model="element.result.giveItem" class="property-input">
            <option :value="null">-- Select Item --</option>
            <option v-for="item in items" :key="item.id" :value="item.id">
              {{ item.icon }} {{ item.name }}
            </option>
          </select>
        </div>
      </template>

      <!-- Remove Items -->
      <template v-if="element.result.type === 'remove-item' || element.result.type === 'give-item'">
        <div class="property-group">
          <label class="property-label">Items to Remove/Consume</label>
          <div class="remove-items-list">
            <div v-for="(itemId, idx) in (element.result?.removeItems || [])" :key="idx" class="condition-item-row">
              <select v-model="element.result.removeItems[idx]" class="property-input">
                <option :value="null">-- Select Item --</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.icon }} {{ item.name }}
                </option>
              </select>
              <button class="remove-line-btn" @click="removeResultRemoveItem(idx)">×</button>
            </div>
          </div>
          <button class="add-line-btn" @click="addResultRemoveItem">+ Add Item to Remove</button>
        </div>
      </template>

      <!-- Unlock Exit -->
      <template v-if="element.result.type === 'unlock-exit'">
        <div class="property-group">
          <label class="property-label">Exit to Unlock</label>
          <select v-model="element.result.unlockExit" class="property-input">
            <option :value="null">-- Select Exit --</option>
            <option v-for="exit in exits" :key="exit.id" :value="exit.id">
              {{ exit.name }}
            </option>
          </select>
        </div>
      </template>

      <!-- Play Cutscene -->
      <template v-if="element.result.type === 'play-cutscene'">
        <div class="property-group">
          <label class="property-label">Cutscene to Play</label>
          <select v-model="element.result.playCutscene" class="property-input">
            <option :value="null">-- Select Cutscene --</option>
            <option v-for="cs in cutscenes" :key="cs.id" :value="cs.id">
              {{ cs.name }}
            </option>
          </select>
        </div>
      </template>

      <!-- Change State -->
      <template v-if="element.result.type === 'change-state'">
        <div class="property-group">
          <label class="property-label">Object to Change</label>
          <select v-model="element.result.changeState" class="property-input">
            <option :value="null">-- Select Object --</option>
            <optgroup label="Hotspots">
              <option v-for="h in hotspots" :key="'h-'+h.id" :value="{ type: 'hotspot', id: h.id, newState: '' }">
                {{ h.name }}
              </option>
            </optgroup>
            <optgroup label="Images">
              <option v-for="i in images" :key="'i-'+i.id" :value="{ type: 'image', id: i.id, newState: '' }">
                {{ i.name }}
              </option>
            </optgroup>
            <optgroup label="Exits">
              <option v-for="e in exits" :key="'e-'+e.id" :value="{ type: 'exit', id: e.id, newState: '' }">
                {{ e.name }}
              </option>
            </optgroup>
          </select>
        </div>
        <div class="property-group" v-if="element.result.changeState">
          <label class="property-label">New State</label>
          <input
            v-model="element.result.changeState.newState"
            type="text"
            class="property-input"
            placeholder="e.g., open, closed, broken"
          />
        </div>
      </template>

      <!-- Show Dialog -->
      <template v-if="element.result.type === 'show-dialog'">
        <div class="property-group">
          <label class="property-label">Dialog to Show</label>
          <select v-model="element.result.showDialog" class="property-input">
            <option :value="null">-- Select Dialog --</option>
            <option v-for="dialog in dialogs" :key="dialog.id" :value="dialog.id">
              {{ dialog.name }}
            </option>
          </select>
        </div>
      </template>
    </div>

    <!-- HINTS SECTION -->
    <div class="property-section">
      <label class="property-section-title">Hints</label>
      <div class="hints-list">
        <div v-for="(hint, idx) in (element.hints || [])" :key="idx" class="hint-row">
          <div class="hint-header">
            <label>After</label>
            <input v-model.number="hint.afterAttempts" type="number" min="1" class="property-input tiny" />
            <label>attempts:</label>
            <button class="remove-line-btn" @click="removePuzzleHint(idx)">×</button>
          </div>
          <textarea v-model="hint.text" class="property-input property-textarea" placeholder="Hint text..."></textarea>
        </div>
      </div>
      <button class="add-line-btn" @click="addPuzzleHint">+ Add Hint</button>
    </div>

    <!-- STATE -->
    <div class="property-group">
      <label class="property-label">
        <input type="checkbox" v-model="element.solved" />
        Solved (for testing)
      </label>
    </div>
  </div>
</template>

<style scoped>
.puzzle-properties { display: flex; flex-direction: column; gap: 4px; }
.property-group { margin-bottom: 8px; }
.property-label { display: block; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-input:focus { border-color: var(--primary, #c9a227); outline: none; }
.property-textarea { min-height: 60px; resize: vertical; font-family: inherit; }
.property-section { margin: 12px 0; padding: 8px; background: var(--bg-medium, #1a1a2e); border-radius: 4px; }
.property-section-title { display: block; font-size: 10px; font-family: 'Press Start 2P', monospace; color: var(--accent, #00d4ff); margin-bottom: 8px; text-transform: uppercase; }
.property-hint { font-size: 8px; color: var(--text-muted, #666); margin: 4px 0; font-style: italic; }
.condition-items-list, .sequence-steps-list, .remove-items-list, .hints-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.condition-item-row, .sequence-step-row, .hint-row { display: flex; gap: 4px; align-items: center; }
.step-number { font-size: 10px; color: var(--accent, #00d4ff); min-width: 20px; }
.remove-line-btn { background: var(--error, #ff4757); color: white; border: none; width: 20px; height: 20px; font-size: 14px; cursor: pointer; border-radius: 2px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.add-line-btn { background: var(--bg-card, #1e1e3f); border: 1px dashed var(--border-color, #333); color: var(--text-muted, #888); padding: 6px; font-size: 9px; cursor: pointer; width: 100%; text-align: center; }
.add-line-btn:hover { border-color: var(--primary, #c9a227); color: var(--primary, #c9a227); }
.choices-checklist { display: flex; flex-direction: column; gap: 4px; }
.choice-checkbox { display: flex; align-items: center; gap: 6px; font-size: 9px; color: var(--text-primary, #fff); cursor: pointer; }
.hint-header { display: flex; align-items: center; gap: 4px; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; }
.hint-header label { color: var(--text-muted, #888); }
.property-input.tiny { width: 50px; padding: 4px; text-align: center; }
</style>
