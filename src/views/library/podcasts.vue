<template>
  <PageContent title="Podcasts" :backrouterLink="{ name: 'library' }">
    <div class="podcasts-content">
      <!-- Search Section -->
      <div class="search-section">
        <div class="search-container">
          <CustomSearchField v-model="searchQuery" :debounce="1000" placeholder="Search for podcasts..."
            @change="onSearch" />
        </div>

        <button v-if="!showFeedForm" class="add-feed-toggle" @click="showFeedForm = true">
          <Icon icon="plus" />
          Add by RSS feed address
        </button>

        <form v-else class="add-feed-form" @submit.prevent="addFeed">
          <label for="feed-url">RSS feed address</label>
          <div class="add-feed-row">
            <input id="feed-url" v-model="feedUrl" type="url" placeholder="https://example.com/podcast.rss"
              :disabled="addingFeed" required autofocus />
            <button type="submit" class="add-feed-btn primary" :disabled="addingFeed || !feedUrl.trim()">
              {{ addingFeed ? 'Adding...' : 'Add' }}
            </button>
            <button type="button" class="add-feed-btn" :disabled="addingFeed" @click="closeFeedForm">
              Cancel
            </button>
          </div>
          <p v-if="feedError" class="add-feed-error">{{ feedError }}</p>
        </form>
      </div>

      <!-- Subscriptions Section -->
      <div v-if="hasSubscriptions" class="subscriptions-section">
        <h2>Subscriptions</h2>
        <div class="podcasts-grid">
          <div v-for="podcast in subscriptionsList" :key="podcast.id" class="podcast-poster favorite"
            @click="openPodcast(podcast)">
            <div class="podcast-poster-img">
              <img v-if="podcast.image" :src="podcast.image" :alt="podcast.title" loading="lazy"
                @error="onImageError" />
              <Icon v-else icon="tabler/podcast" class="podcast-poster-placeholder" />
            </div>
            <div class="podcast-poster-attr">
              <div class="podcast-title">
                <CustomMarquee>{{ podcast.title }}</CustomMarquee>
              </div>
              <div class="podcast-subtitle">
                <CustomMarquee>{{ podcast.author || 'Unknown' }}</CustomMarquee>
              </div>
            </div>
            <div class="podcast-actions">
              <button class="favorite-btn active" @click.stop="podcastStore.unsubscribe(podcast.id)"
                title="Unsubscribe">
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
          <p>Searching podcasts...</p>
        </div>

        <div v-else-if="searchResults.length === 0" class="no-results">
          <h3>No results found</h3>
          <p>Try searching with different keywords</p>
        </div>

        <div v-else class="podcasts-grid">
          <div v-for="podcast in searchResults" :key="podcast.id" class="podcast-poster" @click="openPodcast(podcast)">
            <div class="podcast-poster-img">
              <img v-if="podcast.image" :src="podcast.image" :alt="podcast.title" loading="lazy"
                @error="onImageError" />
              <Icon v-else icon="tabler/podcast" class="podcast-poster-placeholder" />
            </div>
            <div class="podcast-poster-attr">
              <div class="podcast-title">
                <CustomMarquee>{{ podcast.title }}</CustomMarquee>
              </div>
              <div class="podcast-subtitle">
                <CustomMarquee>{{ podcast.author || 'Unknown' }}</CustomMarquee>
              </div>
              <div v-if="podcast.genre" class="podcast-tags">
                <span class="tag">{{ podcast.genre }}</span>
              </div>
            </div>
            <div class="podcast-actions">
              <button :class="['favorite-btn', { active: podcast.isSubscribed }]"
                @click.stop="podcastStore.toggleSubscription(podcast)"
                :title="podcast.isSubscribed ? 'Unsubscribe' : 'Subscribe'">
                <Icon :icon="podcast.isSubscribed ? 'clear' : 'plus'" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!hasSubscriptions && !hasSearched" class="empty-state">
        <Icon icon="tabler/podcast" class="empty-icon" />
        <h2>Podcasts</h2>
        <p>Search for podcasts to get started</p>
      </div>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
/* IMPORTS */
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'
import CustomSearchField from '@/components/CustomSearchField.vue'
import CustomMarquee from '@/components/CustomMarquee.vue'
import { usePodcastStore, type Podcast, type PodcastSubscription } from '@/stores/podcast'
import { FeedError } from '@/services/podcastFeed'

/* GLOBAL DEFINITIONS */
const router = useRouter()
const podcastStore = usePodcastStore()
const { searchResults, loading, subscriptionsList, hasSubscriptions } = storeToRefs(podcastStore)

const searchQuery = ref('')
const hasSearched = ref(false)

const showFeedForm = ref(false)
const feedUrl = ref('')
const feedError = ref('')
const addingFeed = ref(false)

/* FUNCTIONS */

/**
 * Runs a search, or clears the results when the query is empty.
 *
 * @param query - The search query string.
 */
const onSearch = async (query: string) => {
  if (query.trim()) {
    hasSearched.value = true
    await podcastStore.search(query)
  } else {
    hasSearched.value = false
    podcastStore.clearSearchResults()
  }
}

/**
 * Subscribes to the podcast at the entered feed address and opens it.
 */
const addFeed = async () => {
  feedError.value = ''
  addingFeed.value = true
  try {
    const id = await podcastStore.addFeed(feedUrl.value)
    closeFeedForm()
    router.push({ name: 'podcast', params: { podcastId: id } })
  } catch (error) {
    console.error('podcasts: adding feed failed:', error)
    feedError.value = error instanceof FeedError ? error.message : 'The feed could not be added.'
  } finally {
    addingFeed.value = false
  }
}

/**
 * Hides the feed form and clears it.
 */
const closeFeedForm = () => {
  showFeedForm.value = false
  feedUrl.value = ''
  feedError.value = ''
}

/**
 * Opens the episode list of a podcast.
 *
 * @param podcast - The podcast to open.
 */
const openPodcast = (podcast: Podcast | PodcastSubscription) => {
  router.push({ name: 'podcast', params: { podcastId: podcast.id } })
}

/**
 * Hides a cover that failed to load, so the placeholder background shows.
 *
 * @param event - The image error event.
 */
const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

onMounted(async () => {
  await podcastStore.initialize()
})
</script>

<style scoped lang="scss">
.podcasts-content {
  .search-section {
    margin-bottom: 40px;

    .search-container {
      margin-bottom: 20px;
    }

    .add-feed-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0;
      border: none;
      background: none;
      color: var(--primary);
      cursor: pointer;
      font-size: 14px;

      :deep(svg) {
        width: 18px;
        height: 18px;
        color: var(--primary);
      }
    }

    .add-feed-form {
      label {
        display: block;
        margin-bottom: 8px;
        color: var(--color-body-secondary);
        font-size: 14px;
      }

      .add-feed-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      input {
        flex: 1;
        min-width: 220px;
        padding: 8px 12px;
        border: 1px solid var(--color-button-border);
        border-radius: 6px;
        background: var(--background-card);
        color: var(--color-text);
        font-size: 14px;

        &:focus {
          outline: none;
          border-color: var(--primary);
        }
      }

      .add-feed-btn {
        padding: 8px 16px;
        border: 1px solid var(--color-button-border);
        border-radius: 6px;
        background: var(--background-card);
        color: var(--color-text);
        cursor: pointer;

        &.primary {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        &:disabled {
          opacity: 0.5;
          cursor: default;
        }
      }

      .add-feed-error {
        margin: 10px 0 0;
        color: var(--color-error, #d9534f);
        font-size: 14px;
      }
    }
  }

  .subscriptions-section,
  .search-results-section {
    margin-bottom: 40px;

    h2 {
      margin-bottom: 20px;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-head);
    }
  }

  .podcasts-grid {
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

  .podcast-poster {
    color: var(--color-body-secondary);
    cursor: pointer;
    transition: all 0.2s linear;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 14px;
    position: relative;

    &:hover {
      color: var(--primary);

      .podcast-title,
      .podcast-subtitle {
        color: var(--primary);
      }

      .podcast-poster-img img {
        transform: scale(1.2);
      }
    }

    &.favorite {
      .podcast-actions .favorite-btn {
        color: var(--primary);
      }
    }

    .podcast-poster-img {
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

      .podcast-poster-placeholder {
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

    .podcast-poster-attr {
      width: 100%;
      text-align: center;
      font-size: 12px;
      margin-bottom: 8px;

      .podcast-title,
      .podcast-subtitle {
        transition: all 0.2s linear;
        margin-bottom: 3px;
      }

      .podcast-title {
        @include poster-title;
      }

      .podcast-subtitle {
        @include poster-subtitle;
      }

      .podcast-tags {
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

    .podcast-actions {
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

    &:hover .podcast-actions {
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
      color: var(--color-body);
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
      color: var(--color-body);
    }

    p {
      color: var(--color-body-secondary);
      line-height: 1.5;
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
