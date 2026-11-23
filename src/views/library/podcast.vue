<template>
  <PageContent :title="podcast?.title || 'Podcast'" :backrouterLink="{ name: 'podcasts' }">
    <div class="podcast-content">
      <div v-if="loading" class="loading-state">
        <Icon icon="loading" />
        <p>Loading episodes...</p>
      </div>

      <div v-else-if="error" class="no-results">
        <h3>Could not load this podcast</h3>
        <p>{{ error }}</p>
      </div>

      <template v-else-if="podcast">
        <div class="podcast-header">
          <div class="podcast-cover">
            <img v-if="podcast.image" :src="podcast.image" :alt="podcast.title" @error="onImageError" />
            <Icon v-else icon="tabler/podcast" class="podcast-cover-placeholder" />
          </div>
          <div class="podcast-info">
            <h2>{{ podcast.title }}</h2>
            <p v-if="podcast.author" class="podcast-author">{{ podcast.author }}</p>
            <p v-if="podcast.genre" class="podcast-genre">{{ podcast.genre }}</p>
            <button :class="['subscribe-btn', { active: isSubscribed }]"
              @click="podcastStore.toggleSubscription(podcast)">
              <Icon :icon="isSubscribed ? 'checkmark' : 'plus'" />
              {{ isSubscribed ? 'Subscribed' : 'Subscribe' }}
            </button>
          </div>
        </div>

        <div v-if="episodes.length === 0" class="no-results">
          <h3>No episodes found</h3>
        </div>

        <ul v-else class="episode-list">
          <li v-for="episode in episodes" :key="episode.id"
            :class="['episode', { playing: episode.id === playingEpisodeId }]" @click="playEpisode(episode)">
            <button class="play-btn" :title="`Play ${episode.title}`" @click.stop="playEpisode(episode)">
              <Icon icon="play" />
            </button>
            <div class="episode-body">
              <div class="episode-title">{{ episode.title }}</div>
              <div class="episode-meta">
                <span v-if="episode.releaseDate">{{ formatDate(episode.releaseDate) }}</span>
                <span v-if="episode.duration">{{ formatDuration(episode.duration) }}</span>
              </div>
              <div v-if="episode.description" class="episode-description">{{ episode.description }}</div>
            </div>
          </li>
        </ul>
      </template>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
/* IMPORTS */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'
import {
  usePodcastStore,
  type Podcast,
  type PodcastEpisode,
} from '@/stores/podcast'
import { FeedError } from '@/services/podcastFeed'

/* GLOBAL DEFINITIONS */
const route = useRoute()
const podcastStore = usePodcastStore()

const podcast = ref<Podcast | null>(null)
const episodes = ref<PodcastEpisode[]>([])
const loading = ref(false)
const error = ref('')
const playingEpisodeId = ref<string | null>(null)

const podcastId = computed(() => route.params.podcastId as string)
const isSubscribed = computed(() => !!podcast.value && !!podcastStore.subscriptions[podcast.value.id])

/* FUNCTIONS */

/**
 * Loads the podcast and its episodes. A podcast the directory no longer
 * knows still shows with the data stored with its subscription.
 */
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await podcastStore.getEpisodes(podcastId.value)
    podcast.value = result.podcast || podcastStore.subscriptions[podcastId.value] || null
    episodes.value = result.episodes
    if (!podcast.value) {
      error.value = podcastId.value.startsWith('rss-')
        ? 'This podcast is no longer in your subscriptions.'
        : 'This podcast is not in the directory.'
    }
  } catch (e) {
    console.error('podcast: failed to load episodes:', e)
    podcast.value = null
    episodes.value = []
    error.value = e instanceof FeedError ? e.message : 'The podcast directory could not be reached.'
  } finally {
    loading.value = false
  }
}

/**
 * Plays an episode.
 *
 * @param episode - The episode to play.
 */
const playEpisode = async (episode: PodcastEpisode) => {
  if (!podcast.value) return
  playingEpisodeId.value = episode.id
  try {
    await podcastStore.playEpisode(episode, podcast.value)
  } catch (e) {
    console.error('podcast: failed to play episode:', e)
    playingEpisodeId.value = null
  }
}

/**
 * Formats an ISO date as a short local date.
 *
 * @param iso - The ISO date string.
 * @returns The formatted date.
 */
const formatDate = (iso: string): string => {
  const date = new Date(iso)
  return isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Formats a duration in seconds as `1 h 05 min` or `42 min`.
 *
 * @param seconds - The duration in seconds.
 * @returns The formatted duration.
 */
const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

/**
 * Hides a cover that failed to load.
 *
 * @param event - The image error event.
 */
const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

onMounted(async () => {
  await podcastStore.initialize()
  await load()
})

watch(podcastId, (id) => {
  if (id) load()
})
</script>

<style scoped lang="scss">
.podcast-content {
  .podcast-header {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    margin-bottom: 32px;

    @include media-down(md) {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
  }

  .podcast-cover {
    flex: 0 0 auto;
    width: 180px;
    height: 180px;
    border-radius: 8px;
    overflow: hidden;
    background-color: var(--cover-placeholder-bg);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .podcast-cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .podcast-info {
    h2 {
      margin: 0 0 8px;
      color: var(--color-head);
    }

    p {
      margin: 0 0 6px;
      color: var(--color-body-secondary);
    }
  }

  .subscribe-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding: 8px 16px;
    border: 1px solid var(--color-button-border);
    border-radius: 6px;
    background: var(--background-card);
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.2s ease;

    :deep(svg) {
      width: 18px;
      height: 18px;
    }

    &:hover {
      background: var(--color-background-hover);
      border-color: var(--primary);
    }

    &.active {
      background: var(--primary);
      border-color: var(--primary);
      color: white;

      :deep(svg) {
        color: white;
      }
    }
  }

  .episode-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .episode {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 14px 8px;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
      background: var(--color-background-hover);

      .episode-title {
        color: var(--primary);
      }
    }

    &.playing .episode-title {
      color: var(--primary);
    }
  }

  .play-btn {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--color-button-border);
    border-radius: 50%;
    background: transparent;
    cursor: pointer;

    :deep(svg) {
      width: 18px;
      height: 18px;
    }

    &:hover {
      border-color: var(--primary);
    }
  }

  .episode-body {
    min-width: 0;
    flex: 1;
  }

  .episode-title {
    color: var(--color-head);
    font-weight: 600;
    margin-bottom: 4px;
    transition: color 0.2s ease;
  }

  .episode-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--color-body-secondary);
    margin-bottom: 6px;
  }

  .episode-description {
    font-size: 13px;
    color: var(--color-body-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: pre-line;
  }

  .loading-state,
  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 60px 20px;
    text-align: center;
    color: var(--color-body-secondary);

    h3 {
      margin: 0;
      color: var(--color-body);
    }
  }

  .loading-state .app-icon {
    animation: spin 1s linear infinite;
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
