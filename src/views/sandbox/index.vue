<template>
  <div class="page-sandbox">
    <template v-if="routes.length">
      <!-- <h3>
        Select a sandbox page from the list<template v-if="bundle.length > 1">
          or go to the
          <router-link
            flat
            no-caps
            color="primary"
            :to="{
              name: 'sandbox-bundle-routes',
              params: { routes: bundled ? null : bundle.join(',') },
            }"
            >bundle</router-link
          ></template
        >:
      </h3> -->

      <div v-for="route in routes" :key="route.path">
        <div>
          <!--          <input type="checkbox" v-model="bundle" :value="route.path"/>-->
          <router-link :to="{ name: route.name }" class="link">{{ route.path }}</router-link>
        </div>
      </div>
    </template>

    <template v-else>
      <h2>There are no sandbox pages yet</h2>
    </template>
  </div>
</template>

<script lang="ts" setup>
// defineOptions({name: 'PageSandbox'})

import { ref, watch } from 'vue'
import routes from './routes.js'
const bundle = ref<string[]>([])
watch(
  bundle,
  () => {
    const is_bundled =
      bundle.value.length === routes.length ? true : !bundle.value.length ? false : undefined

    if (bundled.value !== is_bundled) {
      bundled.value = is_bundled
    }
  },
  {
    deep: true,
  },
)

const bundled = ref<boolean | undefined>(true)
watch(
  bundled,
  () => {
    if (bundled.value === true) {
      bundle.value = routes.map((route) => route.path)
    } else if (bundled.value === false) {
      bundle.value.length = 0
    }
  },
  {
    immediate: true,
  },
)
</script>

<style lang="scss">
.page-sandbox {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 100%;

  .link {
    color: var(--primary);
  }
}
</style>
