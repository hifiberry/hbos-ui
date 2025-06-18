<template>
  <div class="now-playing">
    <!-- TODO cleanup testCover -->
    <h1 @click="testCover">Now Playing</h1>

    <div class="now-playing__player">
      <AppCover class="now-playing__cover" :src alt="Horsepower" />

      <div class="now-playing__info">
        <h2>{{ songName || 'Song Name' }}</h2>
        <p>{{ artist || 'Artist' }}</p>
      </div>

      <AppAudioControls class="now-playing__audio-controls" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import AppAudioControls from '@/components/app-audio-controls.vue'
import AppCover from '@/components/app-cover.vue'

const songName = ref('')
const artist = ref('')

// TODO cleanup testCover
const src = ref('https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr135863842.jpg') // Wrong src
const testCover = () => {
  src.value = 'https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg' // Right src

  songName.value = 'American Wheeze'
  artist.value = '16 Horsepower'
}
</script>

<style lang="scss">
.now-playing {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  height: 100%;

  &__player {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 10px;
    padding: $padding-main-content;
    background-color: var(--background-main-content);
    box-shadow: $box-shadow-main-content;
  }

  &__cover {
    margin-top: 20px;
  }

  &__info {
    text-align: center;
    margin: 53px 0 50px;
  }
}
</style>
