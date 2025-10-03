<template>
  <div class="sound">
    <h1>Sound</h1>

    <div class="soundOverview">
      <ContentBoxLink :to="{ name: 'general-sound' }"  height=150>
        <div class="soundCardHeader">
          <Icon icon="tabler/adjustments" class="soundCardHeaderIcon" />
          <h2>General sound settings</h2>
        </div>
        <p class="soundCardDescription">
          Configure global sound options and defaults for your system
        </p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'speaker-equalizer' }"  height=150>
        <div class="soundCardHeader">
          <Icon icon="tabler/speaker" class="soundCardHeaderIcon" />
          <h2>Speaker Equalizer</h2>
        </div>
        <p class="soundCardDescription">
          Advanced parametric equalizer with individual filter control and bypass functionality
        </p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'crossover-design' }"  height=150>
        <div class="soundCardHeader">
          <Icon icon="tabler/crossover" class="soundCardHeaderIcon" />
          <h2>Crossover Design</h2>
        </div>
        <p class="soundCardDescription">Configure frequency separation and phase alignment for multi-way speaker systems</p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'room-acoustics' }" height=150>
        <div class="soundCardHeader">
          <Icon icon="tabler/armchair" class="soundCardHeaderIcon" />
          <h2>Room Acoustics Correction</h2>
        </div>
        <p class="soundCardDescription">Automatically analyze and correct room acoustics for optimal sound reproduction</p>
      </ContentBoxLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import ContentBoxLink from "@/components/ContentBoxLink.vue"
</script>

<style scoped lang="scss">
.soundOverview{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;

  .soundCardHeader{
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 10px;

    .soundCardHeaderIcon{
      margin-right: 10px;
    }
  }
}
</style>
