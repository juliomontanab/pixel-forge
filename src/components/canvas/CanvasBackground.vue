<script setup>
/**
 * CanvasBackground.vue
 *
 * Canvas background with image loading states:
 * - Placeholder when no background selected
 * - Loading indicator while asset loads
 * - Background image when ready
 */

import { computed } from 'vue'

const props = defineProps({
  backgroundAssetId: {
    type: [String, Number],
    default: null
  },
  getAssetById: {
    type: Function,
    required: true
  },
  getAssetDisplayUrl: {
    type: Function,
    required: true
  }
})

const backgroundAsset = computed(() =>
  props.backgroundAssetId ? props.getAssetById(props.backgroundAssetId) : null
)

const backgroundUrl = computed(() =>
  backgroundAsset.value ? props.getAssetDisplayUrl(backgroundAsset.value) : null
)

const hasImage = computed(() =>
  props.backgroundAssetId && backgroundAsset.value
)

const backgroundStyle = computed(() =>
  backgroundUrl.value ? {
    backgroundImage: `url(${backgroundUrl.value})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {}
)
</script>

<template>
  <div
    class="canvas-background"
    :class="{ 'has-image': hasImage }"
    :style="backgroundStyle"
  >
    <span v-if="!backgroundAssetId" class="background-placeholder">
      🎨<br>
      <span class="pixel-font-sm">Select background in Scene properties</span>
    </span>
    <span v-else-if="!backgroundUrl" class="background-loading">
      ⏳ Loading...
    </span>
  </div>
</template>
