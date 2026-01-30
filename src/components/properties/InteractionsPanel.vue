<script setup>
/**
 * InteractionsPanel.vue
 * Property editor for interactions on hotspots and interactive images.
 * Allows defining verb-based actions like dialogs, pickups, scene changes, etc.
 */

const props = defineProps({
  element: { type: Object, required: true },
  verbs: { type: Array, default: () => [] },
  actors: { type: Array, default: () => [] },
  dialogs: { type: Array, default: () => [] },
  cutscenes: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  scenes: { type: Array, default: () => [] }
})

const emit = defineEmits(['add-interaction', 'remove-interaction'])

const addInteraction = () => {
  emit('add-interaction', props.element)
}

const removeInteraction = (idx) => {
  emit('remove-interaction', props.element, idx)
}
</script>

<template>
  <div class="interactions-panel">
    <div class="property-divider"></div>
    <div class="property-group">
      <label class="property-label">🎯 Interactions</label>
      <p class="hint-text pixel-font-xs">Define what happens when player uses verbs on this element</p>
    </div>

    <!-- Default description (Look at) -->
    <div class="property-group">
      <label class="property-label">Default Description</label>
      <textarea
        v-model="element.description"
        class="property-textarea"
        placeholder="Text shown when player looks at this..."
        rows="2"
      ></textarea>
    </div>

    <!-- Interactions list -->
    <div class="property-group">
      <label class="property-label">
        Verb Actions ({{ element.interactions?.length || 0 }})
        <button class="btn-add-small" @click="addInteraction">+ Add</button>
      </label>
      <div class="interactions-list" v-if="element.interactions?.length">
        <div
          v-for="(interaction, idx) in element.interactions"
          :key="idx"
          class="interaction-item"
        >
          <div class="interaction-header">
            <select v-model="interaction.verbId" class="property-select small">
              <option :value="null">-- Verb --</option>
              <option v-for="verb in verbs" :key="verb.id" :value="verb.id">
                {{ verb.icon }} {{ verb.name }}
              </option>
            </select>
            <button class="btn-remove-small" @click="removeInteraction(idx)">✕</button>
          </div>
          <div class="interaction-config">
            <select v-model="interaction.action" class="property-select">
              <option value="dialog">💬 Show Dialog</option>
              <option value="dialogRef">📝 Play Dialog (from list)</option>
              <option value="cutscene">🎬 Play Cutscene</option>
              <option value="pickup">✋ Pick Up Item</option>
              <option value="use_item">🔧 Require Item</option>
              <option value="change_scene">🚪 Change Scene</option>
              <option value="set_variable">📊 Set Variable</option>
              <option value="custom">⚡ Custom Script</option>
            </select>

            <!-- Dialog action params -->
            <template v-if="interaction.action === 'dialog'">
              <textarea
                v-model="interaction.params.text"
                class="property-textarea"
                placeholder="Dialog text..."
                rows="2"
              ></textarea>
              <select v-model="interaction.params.actorId" class="property-select small">
                <option :value="null">Narrator</option>
                <option v-for="actor in actors" :key="actor.id" :value="actor.id">
                  {{ actor.name }}
                </option>
              </select>
            </template>

            <!-- Dialog reference params -->
            <template v-if="interaction.action === 'dialogRef'">
              <select v-model="interaction.params.dialogId" class="property-select">
                <option :value="null">-- Select Dialog --</option>
                <option v-for="dlg in dialogs" :key="dlg.id" :value="dlg.id">
                  {{ dlg.name }}
                </option>
              </select>
            </template>

            <!-- Cutscene params -->
            <template v-if="interaction.action === 'cutscene'">
              <select v-model="interaction.params.cutsceneId" class="property-select">
                <option :value="null">-- Select Cutscene --</option>
                <option v-for="cs in cutscenes" :key="cs.id" :value="cs.id">
                  {{ cs.name }}
                </option>
              </select>
            </template>

            <!-- Pickup params -->
            <template v-if="interaction.action === 'pickup'">
              <select v-model="interaction.params.itemId" class="property-select">
                <option :value="null">-- Select Item --</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
              <label class="checkbox-label small">
                <input type="checkbox" v-model="interaction.params.removeFromScene" />
                Remove from scene after pickup
              </label>
            </template>

            <!-- Use item params -->
            <template v-if="interaction.action === 'use_item'">
              <select v-model="interaction.params.requiredItemId" class="property-select">
                <option :value="null">-- Required Item --</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
              <textarea
                v-model="interaction.params.successText"
                class="property-textarea"
                placeholder="Success message..."
                rows="1"
              ></textarea>
              <textarea
                v-model="interaction.params.failText"
                class="property-textarea"
                placeholder="Fail message (no item)..."
                rows="1"
              ></textarea>
            </template>

            <!-- Change scene params -->
            <template v-if="interaction.action === 'change_scene'">
              <select v-model="interaction.params.sceneId" class="property-select">
                <option :value="null">-- Select Scene --</option>
                <option v-for="scene in scenes" :key="scene.id" :value="scene.id">
                  {{ scene.name }}
                </option>
              </select>
            </template>

            <!-- Set variable params -->
            <template v-if="interaction.action === 'set_variable'">
              <input
                v-model="interaction.params.varName"
                class="property-input"
                placeholder="Variable name"
              />
              <input
                v-model="interaction.params.varValue"
                class="property-input"
                placeholder="Value"
              />
            </template>

            <!-- Custom script -->
            <template v-if="interaction.action === 'custom'">
              <textarea
                v-model="interaction.params.script"
                class="property-textarea code"
                placeholder="// Custom script..."
                rows="3"
              ></textarea>
            </template>

            <!-- Condition (optional) -->
            <div class="interaction-condition">
              <label class="checkbox-label small">
                <input type="checkbox" v-model="interaction.hasCondition" />
                Requires condition
              </label>
              <template v-if="interaction.hasCondition">
                <div class="condition-row">
                  <input
                    v-model="interaction.condition.varName"
                    class="property-input small"
                    placeholder="Variable"
                  />
                  <select v-model="interaction.condition.operator" class="property-select tiny">
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                    <option value=">">></option>
                    <option value="<"><</option>
                    <option value=">=">>=</option>
                    <option value="<="><=</option>
                  </select>
                  <input
                    v-model="interaction.condition.value"
                    class="property-input small"
                    placeholder="Value"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="hint-text pixel-font-xs text-muted">No interactions defined. Click "+ Add" to create one.</p>
    </div>
  </div>
</template>

<style scoped>
.interactions-panel { display: flex; flex-direction: column; gap: 4px; }
.property-divider { height: 1px; background: var(--border-color, #333); margin: 8px 0; }
.property-group { margin-bottom: 8px; }
.property-label { display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: var(--text-muted, #888); margin-bottom: 4px; font-family: 'Press Start 2P', monospace; }
.property-input, .property-select { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; }
.property-input.small { width: 80px; }
.property-select.small { width: 120px; }
.property-select.tiny { width: 60px; }
.property-textarea { width: 100%; padding: 6px 8px; background: var(--bg-dark, #0f0f23); border: 1px solid var(--border-color, #333); color: var(--text-primary, #fff); font-size: 10px; border-radius: 2px; resize: vertical; font-family: inherit; }
.property-textarea.code { font-family: monospace; }
.hint-text { font-size: 8px; color: var(--text-muted, #666); margin: 4px 0; }
.text-muted { opacity: 0.6; }
.pixel-font-xs { font-family: 'Press Start 2P', monospace; }
.btn-add-small { background: var(--primary, #c9a227); color: var(--bg-dark, #0f0f23); border: none; padding: 2px 6px; font-size: 8px; cursor: pointer; border-radius: 2px; font-family: 'Press Start 2P', monospace; }
.btn-add-small:hover { opacity: 0.9; }
.btn-remove-small { background: var(--error, #ff4757); color: white; border: none; width: 20px; height: 20px; font-size: 12px; cursor: pointer; border-radius: 2px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.interactions-list { display: flex; flex-direction: column; gap: 8px; }
.interaction-item { background: var(--bg-medium, #1a1a2e); border: 1px solid var(--border-color, #333); border-radius: 4px; padding: 8px; }
.interaction-header { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.interaction-header .property-select { flex: 1; }
.interaction-config { display: flex; flex-direction: column; gap: 6px; }
.interaction-condition { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color, #333); }
.condition-row { display: flex; gap: 4px; align-items: center; margin-top: 6px; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--text-primary, #fff); cursor: pointer; }
.checkbox-label.small { font-size: 9px; }
</style>
