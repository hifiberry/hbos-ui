<template>
  <div class="page-sandbox-bundle">
    <section v-for="(route, index) in bundleRoutes" :key="route.path">
      <div>
        <router-link
          class="button button--inline link bi bi-arrow-left"
          :to="{ name: route.name }"
          >{{ route.name }}</router-link
        >

        <button
          class="button button--icon danger bi bi-trash3"
          @click="bundleRoutes.splice(index, 1)"
        />
      </div>

      <hr />

      <div>
        <component :is="route.component" />
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
// defineOptions({ name: 'PageSandboxBundle' })

import { ref, markRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import routes from './routes.js'

import type { SandboxRoute } from '@/types/sandbox'

const route = useRoute()
const bundleRoutes = ref(
  (route.params.routes
    ? (<string>route.params.routes).split(',')
    : routes.map((route) => route.path)
  ).reduce((bundleRoutes, path) => {
    const route = routes.find((route) => route.path === path)

    if (route) {
      bundleRoutes.push(markRaw(route))
    }

    return bundleRoutes
  }, []),
)

const router = useRouter()
watch(
  bundleRoutes,
  (routes) => {
    if (routes.length) {
      if (routes.length == 1) {
        router.push({ name: routes[0].name })
      } else {
        router.replace({
          name: route.name,
          params: {
            bundle: routes
              .reduce((bundle: string, route: SandboxRoute) => (bundle += ',' + route.path), '')
              .slice(1),
          },
        })
      }
    } else {
      router.push({ name: 'sandbox' })
    }
  },
  {
    deep: true,
  },
)
</script>

<style lang="scss">
.page-sandbox-bundle {
  padding: 30px;
}
</style>
