import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/default.vue'),
      redirect: { name: 'now-playing' },
      children: [
        {
          path: '/library',
          component: () => import('@/views/router-view.vue'),
          children: [
            {
              path: '',
              name: 'library',
              component: () => import('@/views/library/index.vue'),
            },
            {
              path: 'albums',
              component: () => import('@/views/router-view.vue'),
              children: [
                {
                  path: '',
                  name: 'albums',
                  component: () => import('@/views/library/albums/albums.vue'),
                },
                {
                  path: '/artist/:artistId',
                  name: 'artist-album',
                  component: () => import('@/views/library/albums/artist-album.vue'),
                },
                {
                  path: ':albumId',
                  name: 'album',
                  component: () => import('@/views/library/albums/album.vue'),
                },
              ],
            },
            {
              path: 'artists',
              name: 'artists',
              component: () => import('@/views/library/artists.vue'),
            },
            {
              path: 'radio',
              name: 'radio',
              component: () => import('@/views/library/radio.vue'),
            },
          ],
        },
        {
          path: '/services',
          component: () => import('@/views/router-view.vue'),
          children: [
            {
              path: '',
              name: 'services',
              component: () => import('@/views/services/index.vue'),
            },
            {
              path: 'players',
              name: 'players',
              component: () => import('@/views/services/players.vue'),
            },
            {
              path: 'web-services',
              name: 'web-services',
              component: () => import('@/views/services/web-services.vue'),
            },
            {
              path: 'music-files',
              name: 'music-files',
              component: () => import('@/views/services/music-files.vue'),
            },
            {
              path: 'dsp-programs',
              name: 'dsp-programs',
              component: () => import('@/views/services/dsp-programs.vue'),
            },
            {
              path: 'system-info',
              name: 'system-info',
              component: () => import('@/views/services/system-info.vue'),
            },
            {
              path: 'system-tools',
              name: 'system-tools',
              component: () => import('@/views/services/system-tools.vue'),
            },
          ],
        },
        {
          path: '/now-playing',
          name: 'now-playing',
          component: () => import('@/views/now-playing.vue'),
        },
        {
          path: '/playlist',
          name: 'playlist',
          component: () => import('@/views/queue.vue'),
        },
        {
          path: '/sound',
          name: 'sound',
          component: () => import('@/views/sound.vue'),
        },
      ],
    },
    {
      path: '/now-playing-minimal',
      name: 'now-playing-minimal',
      component: () => import('@/views/now-playing-minimal.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { path: '/' },
    },
  ],
})

export default router
