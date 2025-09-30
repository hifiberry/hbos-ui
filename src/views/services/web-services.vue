<template>
  <div class="web-services">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">Web Services</AppBackRouter>
    </div>

    <div class="web-services-content">
      <div class="services-header">
        <h2>Web Services</h2>
        <p>Connect and manage web-based music streaming services</p>
      </div>

      <!-- Last.FM Integration -->
      <LastFMIntegration />

      <!-- Spotify Integration -->
      <SpotifyIntegration />

      <!-- MusicBrainz Integration -->
      <MusicBrainzIntegration />

      <!-- TheAudioDB Integration -->
      <TheAudioDBIntegration />

      <!-- Fanart.tv Integration -->
      <FanartTvIntegration />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppBackRouter from '@/components/AppBackRouter.vue'
import LastFMIntegration from '@/components/AppLastfm.vue'
import SpotifyIntegration from '@/components/AppSpotify.vue'
import MusicBrainzIntegration from '@/components/AppMusicbrainz.vue'
import TheAudioDBIntegration from '@/components/AppTheaudiodb.vue'
import FanartTvIntegration from '@/components/AppFanarttv.vue'
</script>

<style scoped lang="scss">
.web-services {
  .breadcrumbs {
    margin-bottom: 32px;
  }

  .services-header {
    margin-bottom: 32px;

    h2 {
      margin: 0 0 8px 0;
      color: var(--color-head);
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
    }
  }
}
</style>
