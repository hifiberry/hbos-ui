<template>
  <div class="artists">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Artists</AppBackRouter>
    </div>
    <div class="card">
      <div class="artists-list">
        <AppPosterSkeleton v-if="artistStore.loading" poster-form="circle" />

        <template v-else>
          <AppPoster
            v-for="artist in artistStore.artist"
            :key="artist.id"
            :title="artist.name"
            :subtitle="`${artist.album_count} album${artist.album_count !== 1 ? 's' : ''}`"
            :src="artist.thumb_url[0]"
            poster-form="circle"
            @click="router.push({ name: 'album', params: { id: artist.id } })"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppBackRouter from '@/components/app-back-router.vue'
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'
import AppPoster from '@/components/app-poster.vue'

import { useRouter } from 'vue-router'
const router = useRouter()

import { onMounted } from 'vue'

import { useArtistStore } from '@/stores/artist'
const artistStore = useArtistStore()

onMounted(() => {
  artistStore.getArtists()
})
</script>

<style scoped lang="scss">
.artists {
  &-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 60px 80px;
    @include media-down(xl) {
      gap: 30px;
    }
    @include media-down(md) {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
  }
}
</style>
