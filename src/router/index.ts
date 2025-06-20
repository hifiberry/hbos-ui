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
                  path: ':id',
                  name: 'album',
                  component: () => import('@/views/library/albums/[id].vue'),
                },
              ],
            },
            {
              path: 'artists',
              name: 'artists',
              component: () => import('@/views/library/artists.vue'),
            },
          ],
        },
        {
          path: '/now-playing',
          name: 'now-playing',
          component: () => import('@/views/now-playing.vue'),
        },
        {
          path: '/sound',
          name: 'sound',
          component: () => import('@/views/sound.vue'),
        },
      ],
    },
    {
      path: '/sandbox',
      component: () => import('@/layouts/sandbox.vue'),
      children: [
        { path: '', name: 'sandbox', component: () => import('@/views/sandbox/index.vue') },
        {
          path: 'bundle/:bundle?',
          name: 'sandbox-bundle',
          component: () => import('@/views/sandbox/bundle.vue'),
        },
        ...(await import('@/views/sandbox/routes')).default,
      ],
      beforeEnter: () => {
        if (import.meta.env.MODE === 'development') {
          return true
        } else {
          return { path: '/' }
        }
      },
    },
  ],
})

export default router
