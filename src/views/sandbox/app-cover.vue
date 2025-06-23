<template>
  <div class="sandbox-app-cover">
    <button class="sandbox-app-cover__button" @click="loadWrongImageSrc">
      <h1>load Wrong Image Src</h1>
    </button>

    <AppCover :src alt="Horsepower" />

    <button class="sandbox-app-cover__button" @click="loadRightImageSrc">
      <h1>load Right Image Src</h1>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import AppCover from '@/components/app-cover.vue'

const src = ref('') // No src

const loadWrongImageSrc = () => {
  src.value = 'https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr135863842.jpg' // Wrong src
}

const loadRightImageSrc = () => {
  src.value = 'https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg' // Right src
}
</script>

<style scoped lang="scss">
.sandbox-app-cover {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 30px;

  &__button {
    margin-top: 32px;
    width: fit-content;
    :hover {
      color: #e11e4a;
    }
  }
}
</style>
