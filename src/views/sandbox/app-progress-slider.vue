<template>
  <div class="sandbox-progress-slider__container">
    <AppProgressSlider
      :value="progress_1"
      :min="0"
      :max="100"
      :step="1"
      :isDraggable="false"
      :hasThumb="true"
      @click:progress="onClickProgress_1"
    />

    <h3 style="margin-top: 24px">Delay: {{ delay }}ms</h3>
    <h3 style="margin-top: 12px">isDraggable: false</h3>
    <h3 style="margin-top: 12px">hasThumb: true</h3>
    <h3 style="margin-top: 12px">Emited value: {{ emitet_value_1 }}</h3>
    <h3 style="margin-top: 12px">Progress value: {{ progress_1 }}</h3>
  </div>

  <br />
  <br />

  <div class="sandbox-progress-slider__container">
    <AppProgressSlider
      :value="progress_delay_draggable"
      :min="0"
      :max="100"
      :step="1"
      :isDraggable="true"
      :hasThumb="true"
      @click:progress="onClickProgress_delay_draggable"
    />

    <h3 style="margin-top: 24px">Delay: {{ delay }}ms</h3>
    <h3 style="margin-top: 12px">isDraggable: true</h3>
    <h3 style="margin-top: 12px">hasThumb: true</h3>
    <h3 style="margin-top: 12px">Emited value: {{ emitet_value_delay_draggable }}</h3>
    <h3 style="margin-top: 12px">Progress value: {{ progress_delay_draggable }}</h3>
  </div>

  <br />
  <br />

  <div class="sandbox-progress-slider__container">
    <AppProgressSlider
      :value="progress_2"
      :min="0"
      :max="100"
      :step="1"
      :isDraggable="true"
      :hasThumb="true"
      @click:progress="onClickProgress_2"
    />

    <h3 style="margin-top: 24px">Delay: 0ms</h3>
    <h3 style="margin-top: 12px">isDraggable: true</h3>
    <h3 style="margin-top: 12px">hasThumb: true</h3>
    <h3 style="margin-top: 12px">Emited value: {{ emitet_value_2 }}</h3>
    <h3 style="margin-top: 12px">Progress value: {{ progress_2 }}</h3>
  </div>

  <br />
  <br />

  <div class="sandbox-progress-slider__container">
    <AppProgressSlider
      :value="progress_3"
      :min="0"
      :max="100"
      :step="1"
      :isDraggable="false"
      :hasThumb="false"
      @click:progress="onClickProgress_3"
    />

    <h3 style="margin-top: 24px">Delay: 0ms</h3>
    <h3 style="margin-top: 12px">isDraggable: false</h3>
    <h3 style="margin-top: 12px">hasThumb: false</h3>
    <h3 style="margin-top: 12px">Emited value: {{ emitet_value_3 }}</h3>
    <h3 style="margin-top: 12px">Progress value: {{ progress_3 }}</h3>
  </div>

  <br />
  <br />

  <div class="sandbox-progress-slider__container">
    <AppProgressSlider
      :value="50"
      :min="0"
      :max="100"
      :step="1"
      :isDraggable="false"
      :hasThumb="true"
      :disabled="true"
    />

    <h3 style="margin-top: 24px">disabled: true</h3>
  </div>

  <br />
  <br />
  <br />
  <br />

  <div class="sandbox-progress-slider__container--small">
    <h3 style="margin-bottom: 24px; color: #e11e4a">On The Header</h3>

    <AppProgressSlider
      :value="progress_on_header"
      :isOnHeader="true"
      @click:progress="onClickProgress_on_header"
    />

    <h3 style="margin-top: 24px">Delay: 0ms</h3>
    <h3 style="margin-top: 12px">isOnHeader: true</h3>
    <h3 style="margin-top: 12px">isDraggable: false</h3>
    <h3 style="margin-top: 12px">hasThumb: false</h3>
    <h3 style="margin-top: 12px">Emited value: {{ emitet_value_on_header }}</h3>
    <h3 style="margin-top: 12px">Progress value: {{ progress_on_header }}</h3>
  </div>

  <br />
  <br />

  <div class="sandbox-progress-slider__container--small">
    <AppProgressSlider :value="50" :isOnHeader="true" :disabled="true" />

    <h3 style="margin-top: 24px">disabled: true</h3>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import AppProgressSlider from '@/components/app-progress-slider.vue'

const progress_1 = ref<number>(50)
const emitet_value_1 = ref<number>(50)

const progress_delay_draggable = ref<number>(50)
const emitet_value_delay_draggable = ref<number>(50)

const delay = 1200

const progress_2 = ref<number>(60)
const emitet_value_2 = ref<number>(60)

const progress_3 = ref<number>(70)
const emitet_value_3 = ref<number>(70)

const progress_on_header = ref<number>(30)
const emitet_value_on_header = ref<number>(30)

let intervalID: number | null = null

const setPlayingInterval = () => {
  intervalID = setInterval(() => {
    progress_1.value += 1

    if (progress_1.value >= 100) progress_1.value = 0
  }, 1000)
}

// setPlayingInterval()

function onClickProgress_1(newVal: number) {
  console.log('onClickProgress_1', newVal)

  emitet_value_1.value = newVal

  if (intervalID) {
    clearInterval(intervalID)
  }

  // Only update when you're ready
  setTimeout(() => {
    progress_1.value = newVal

    // setPlayingInterval()
  }, delay)
}

function onClickProgress_delay_draggable(newVal: number) {
  console.log('onClickProgress_delay_draggable', newVal)

  emitet_value_delay_draggable.value = newVal

  if (intervalID) {
    clearInterval(intervalID)
  }

  // Only update when you're ready
  setTimeout(() => {
    progress_delay_draggable.value = newVal

    // setPlayingInterval()
  }, delay)
}

function onClickProgress_2(newVal: number) {
  console.log('onClickProgress_2', newVal)

  emitet_value_2.value = newVal

  if (intervalID) {
    clearInterval(intervalID)
  }

  progress_2.value = newVal

  // setPlayingInterval()
}

function onClickProgress_3(newVal: number) {
  console.log('onClickProgress_3', newVal)

  emitet_value_3.value = newVal

  if (intervalID) {
    clearInterval(intervalID)
  }

  progress_3.value = newVal

  // setPlayingInterval()
}

function onClickProgress_on_header(newVal: number) {
  console.log('onClickProgress_on_header', newVal)

  emitet_value_on_header.value = newVal

  if (intervalID) {
    clearInterval(intervalID)
  }

  progress_on_header.value = newVal

  // setPlayingInterval()
}

onBeforeUnmount(() => {
  if (intervalID) {
    clearInterval(intervalID)
  }
})
</script>

<style lang="scss">
.sandbox-progress-slider__container {
  width: 500px;

  @include media-down(sm) {
    width: 350px;
  }

  &--small {
    width: 350px;
  }
}
</style>
