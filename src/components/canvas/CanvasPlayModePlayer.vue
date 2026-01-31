<script setup>
/**
 * CanvasPlayModePlayer.vue
 *
 * Displays play mode elements on the canvas:
 * - Player character with animation or placeholder
 * - Walk target indicator
 * - Message display above actor
 */

defineProps({
  playModeState: {
    type: Object,
    required: true
  },
  zoom: {
    type: Number,
    default: 1
  },
  playerAnimation: {
    type: Object,
    default: null
  },
  playerAnimationStyle: {
    type: Object,
    default: () => ({})
  }
})
</script>

<template>
  <!-- Play Mode: Player Character -->
  <div
    v-if="playModeState.playerActorId"
    class="play-mode-player"
    :style="{
      left: (playModeState.playerPosition.x - playModeState.playerSize.w / 2) * zoom + 'px',
      top: (playModeState.playerPosition.y - playModeState.playerSize.h) * zoom + 'px',
      width: playModeState.playerSize.w * zoom + 'px',
      height: playModeState.playerSize.h * zoom + 'px'
    }"
  >
    <!-- Player animation if available -->
    <div
      v-if="playerAnimation"
      class="player-animation"
      :style="playerAnimationStyle"
    ></div>
    <div v-else class="player-placeholder">
      <span class="player-direction-indicator">{{ playModeState.playerDirection.charAt(0).toUpperCase() }}</span>
    </div>
  </div>

  <!-- Play Mode: Walk Target Indicator -->
  <div
    v-if="playModeState.walkTarget"
    class="walk-target-indicator"
    :style="{
      left: playModeState.walkTarget.x * zoom + 'px',
      top: playModeState.walkTarget.y * zoom + 'px'
    }"
  ></div>

  <!-- Play Mode: Message Display (above actor) -->
  <div
    v-if="playModeState.messageText"
    class="play-message"
    :style="{
      left: (playModeState.playerPosition.x) * zoom + 'px',
      top: (playModeState.playerPosition.y - playModeState.playerSize.h - 20) * zoom + 'px'
    }"
  >
    {{ playModeState.messageText }}
  </div>
</template>
