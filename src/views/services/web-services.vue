<template>
  <PageContent title="Web Services" :backrouterLink="{ name: 'services' }">
      <div class="services-header">
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
  </PageContent>
</template>

<script setup lang="ts">
import PageContent from '@/components/PageContent.vue'
import LastFMIntegration from '@/components/Lastfm.vue'
import SpotifyIntegration from '@/components/Spotify.vue'
import MusicBrainzIntegration from '@/components/Musicbrainz.vue'
import TheAudioDBIntegration from '@/components/Theaudiodb.vue'
import FanartTvIntegration from '@/components/Fanarttv.vue'
</script>

<style scoped lang="scss">
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
</style>
