<template>
  <div class="artists">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Artists</AppBackRouter>
      <div class="search-bar">
        <AppSearch v-model="search" :debounce="1000" @change="onSearch" />
      </div>
    </div>
    <div class="card">
      <AppArtists :loading="loading" :loaded="loaded" :artists="artists" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import AppBackRouter from '@/components/app-back-router.vue'
import AppArtists from '@/components/app-artists.vue'
import AppSearch from '@/components/app-search.vue'

import { storeToRefs } from 'pinia'

import { useArtistStore } from '@/stores/artist.ts'
const artistStore = useArtistStore()
const { loading, loaded, artists } = storeToRefs(artistStore)
const { getArtists, getArtistByName } = artistStore

const search = ref<string>('')

const onSearch = async (search: string) => {
  if (search) {
    getArtistByName(search)
  } else {
    getArtists()
  }
}

onMounted(() => {
  getArtists()
})
</script>

<style scoped lang="scss">
.artists {
  .breadcrumbs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .search-bar {
      max-width: 200px;
    }
  }
}
</style>
