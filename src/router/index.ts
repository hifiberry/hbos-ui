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
          redirect: { name: 'albums' },
          children: [
            {
              path: 'albums',
              name: 'albums',
              component: () => import('@/views/library/albums.vue'),
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
