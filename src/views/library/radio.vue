<template>
  <div class="radio">
    <div class="breadcrumbs">
      <BackRouter :to="{ name: 'library' }">Radio</BackRouter>
    </div>

    <div class="radio-content">
      <!-- Search Section -->
      <div class="search-section">
        <div class="search-container">
          <CustomSearchField v-model="searchQuery" :debounce="1000" placeholder="Search for radio stations..."
            @change="onSearch" />
        </div>
      </div>

      <!-- Favorites Section -->
      <div v-if="hasFavorites" class="favorites-section">
        <h2>Favorites</h2>
        <div class="stations-grid">
          <div v-for="favorite in favoritesList" :key="favorite.id" class="station-poster favorite"
            @click="playStation(favorite)" @mousedown="startLongPress(favorite)" @mouseup="cancelLongPress"
            @mouseleave="cancelLongPress" @touchstart="startLongPress(favorite)" @touchend="cancelLongPress"
            @touchcancel="cancelLongPress">
            <div class="station-poster-img">
              <img
                v-if="(typeof favorite.metadata?.logo_url === 'string' && favorite.metadata.logo_url) ||
                      favorite.img"
                :src="(typeof favorite.metadata?.logo_url === 'string' ? favorite.metadata.logo_url : '') ||
                      favorite.img || ''"
                :alt="favorite.title"
                loading="lazy"
                @error="onImageError"
              />
              <Icon v-else icon="radio" class="station-poster-placeholder" />
            </div>
            <div class="station-poster-attr">
              <div class="station-title">
                <CustomMarquee>{{ favorite.title }}</CustomMarquee>
              </div>
              <div class="station-subtitle">
                <CustomMarquee>{{ favorite.metadata?.country || favorite.country || 'Unknown'
                }}</CustomMarquee>
              </div>
              <div v-if="favorite.metadata?.tags || favorite.tags" class="station-tags">
                <span v-for="tag in getStationTags(favorite.metadata?.tags || favorite.tags)" :key="tag" class="tag">
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="station-actions">
              <button class="favorite-btn active" @click.stop="removeFromFavorites(favorite.id)"
                title="Remove from favorites">
                <Icon icon="clear" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Results Section -->
      <div v-if="hasSearched" class="search-results-section">
        <h2>Search Results</h2>

        <div v-if="loading" class="loading-state">
          <Icon icon="loading" />
          <p>Searching stations...</p>
        </div>

        <div v-else-if="searchResults.length === 0" class="no-results">
          <h3>No results found</h3>
          <p>Try searching with different keywords</p>
        </div>

        <div v-else class="stations-grid">
          <div v-for="station in searchResults" :key="station.id" class="station-poster" @click="playStation(station)">
            <div class="station-poster-img">
              <img v-if="station.image" :src="station.image" :alt="station.name" loading="lazy" @error="onImageError" />
              <Icon v-else icon="radio" class="station-poster-placeholder" />
            </div>
            <div class="station-poster-attr">
              <div class="station-title">
                <CustomMarquee>{{ station.name }}</CustomMarquee>
              </div>
              <div class="station-subtitle">
                <CustomMarquee>{{ station.country || 'Unknown' }}</CustomMarquee>
              </div>
              <div v-if="station.tags" class="station-tags">
                <span v-for="tag in getStationTags(station.tags)" :key="tag" class="tag">
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="station-actions">
              <button :class="['favorite-btn', { active: station.isFavorite }]" @click.stop="toggleFavorite(station)"
                :title="station.isFavorite ? 'Remove from favorites' : 'Add to favorites'">
                <Icon :icon="station.isFavorite ? 'clear' : 'plus'" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!hasFavorites && !hasSearched" class="empty-state">
        <Icon icon="radio" class="empty-icon" />
        <h2>Radio Stations</h2>
        <p>Search for radio stations to get started</p>
      </div>
    </div>

    <!-- Edit Popup -->
    <RadioEditPopup :is-visible="showEditPopup" :station="editingStation" @close="closeEditPopup"
      @save="saveEditedStation" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import Icon from '@/components/Icon.vue'
import BackRouter from '@/components/BackRouter.vue'
import CustomSearchField from '@/components/CustomSearchField.vue'
import CustomMarquee from '@/components/CustomMarquee.vue'
import RadioEditPopup from '@/components/RadioEditPopup.vue'
import { useRadioStore, type RadioStation, type RadioFavorite } from '@/stores/radio'

const radioStore = useRadioStore()
const {
  searchResults,
  loading,
  favoritesList,
  hasFavorites
} = storeToRefs(radioStore)

const searchQuery = ref('')
const hasSearched = ref(false)

// Edit popup state
const showEditPopup = ref(false)
const editingStation = ref<RadioFavorite | null>(null)

// Long press handling
const longPressTimer = ref<number | null>(null)
const longPressDelay = 500 // milliseconds
const isLongPressing = ref(false)

const onSearch = async (query: string) => {
  if (query.trim()) {
    hasSearched.value = true
    await radioStore.search(query)
  } else {
    hasSearched.value = false
    radioStore.clearSearchResults()
  }
}

const playStation = async (station: RadioStation | RadioFavorite) => {
  // Don't play if this was a long press
  if (isLongPressing.value) {
    isLongPressing.value = false
    return
  }
  await radioStore.playStation(station)
}

const toggleFavorite = (station: RadioStation) => {
  radioStore.toggleFavorite(station)
}

const removeFromFavorites = (stationId: string) => {
  radioStore.removeFromFavorites(stationId)
}

const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

const getStationTags = (tags?: string): string[] => {
  if (!tags) return []
  return tags.split(',').map(tag => tag.trim()).slice(0, 3)
}

// Long press handling functions
const startLongPress = (station: RadioFavorite) => {
  isLongPressing.value = false
  longPressTimer.value = window.setTimeout(() => {
    isLongPressing.value = true
    openEditPopup(station)
  }, longPressDelay)
}

const cancelLongPress = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

// Edit popup functions
const openEditPopup = (station: RadioFavorite) => {
  editingStation.value = station
  showEditPopup.value = true
}

const closeEditPopup = () => {
  showEditPopup.value = false
  editingStation.value = null
}

const saveEditedStation = (editedStation: RadioFavorite) => {
  radioStore.editFavorite(editedStation)
  closeEditPopup()
}

onMounted(async () => {
  await radioStore.initialize()
})
</script>

<style scoped lang="scss">
.radio {
  .breadcrumbs {
    margin-bottom: 32px;

    h1 {
      margin: 0;
      color: var(--color-head);
    }
  }

  .radio-content {
    .search-section {
      margin-bottom: 40px;

      .search-container {
        margin-bottom: 20px;
      }
    }

    .favorites-section,
    .search-results-section {
      margin-bottom: 40px;

      h2 {
        margin-bottom: 20px;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-head);
      }
    }

    .stations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 20px;

      @include media-down(lg) {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 15px;
      }

      @include media-down(md) {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      }
    }

    .station-poster {
      color: var(--color-body-secondary);
      cursor: pointer;
      transition: all 0.2s linear;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 14px;
      position: relative;

      &:hover {
        color: var(--color-primary);

        .station-title,
        .station-subtitle {
          color: var(--color-primary);
        }

        .station-poster-img img {
          transform: scale(1.2);
        }
      }

      &.favorite {
        .station-actions .favorite-btn {
          color: var(--color-primary);
        }
      }

      .station-poster-img {
        width: 140px;
        height: 140px;
        margin-bottom: 10px;
        overflow: hidden;
        border-radius: 8px;

        @include media-down(lg) {
          width: 100px;
          height: 100px;
        }

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: all 0.2s linear;
        }

        .station-poster-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--cover-placeholder-bg);

          svg {
            width: 50px;
            height: 50px;
            color: var(--color-icon-primary);
          }
        }
      }

      .station-poster-attr {
        width: 100%;
        text-align: center;
        font-size: 12px;
        margin-bottom: 8px;

        .station-title,
        .station-subtitle {
          transition: all 0.2s linear;
          margin-bottom: 3px;
        }

        .station-title {
          @include poster-title;
        }

        .station-subtitle {
          @include poster-subtitle;
        }

        .station-tags {
          @include poster-note;
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 4px;

          .tag {
            padding: 1px 4px;
            background: var(--color-background-tag);
            color: var(--color-text-tag);
            border-radius: 3px;
            font-size: inherit;
            border: 1px solid var(--color-border-tag);
          }
        }
      }

      .station-actions {
        position: absolute;
        top: 4px;
        right: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;

        .favorite-btn {
          @include edit-overlay-background;
          border: none;
          padding: 6px;
          cursor: pointer;
          border-radius: 50%;
          color: white;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;

          &:hover {
            background: rgba(0, 0, 0, 0.3);
            transform: scale(1.1);
          }

          &.active {
            color: white;
          }

          svg {
            width: 16px;
            height: 16px;
            color: white !important;
          }
        }
      }

      &:hover .station-actions {
        opacity: 1;
      }
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 60px 20px;
      color: var(--color-body-secondary);

      .app-icon {
        animation: spin 1s linear infinite;
      }
    }

    .no-results {
      text-align: center;
      padding: 60px 20px;
      color: var(--color-body-secondary);

      h3 {
        margin: 0 0 8px 0;
        font-size: 1.25rem;
        color: var(--color-body-primary);
      }

      p {
        margin: 0;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      text-align: center;
      max-width: 400px;
      margin: 0 auto;

      .empty-icon {
        width: 80px;
        height: 80px;
        margin-bottom: 24px;
        color: var(--color-body-secondary);
        opacity: 0.5;
      }

      h2 {
        margin-bottom: 12px;
        color: var(--color-body-primary);
      }

      p {
        color: var(--color-body-secondary);
        line-height: 1.5;
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
