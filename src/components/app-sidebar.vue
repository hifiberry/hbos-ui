<template>
  <aside class="app-sidebar">
    <div class="nav">
      <template
        v-for="route in routes"
        :key="route.name"
      >
        <div
          v-if="route.children && route.children.length"
          class="nav-item__parent"
        >
          <div class="nav-item">
            <span class="nav-item__icon">
              <AppIcon :icon="route.icon" />
            </span>
            <span class="nav-item__title">{{ route.title }}</span>
          </div>
          <div class="nav-item__wrapper">
            <div
              v-for="childrenRoute in route.children"
              :key="childrenRoute.name"
              class="nav-item"
              @click="router.push({ name: childrenRoute.name })"
            >
            <span class="nav-item__icon">
              <AppIcon :icon="childrenRoute.icon" />
            </span>
              <span class="nav-item__title">{{ childrenRoute.title }}</span>
            </div>
          </div>
        </div>
        <div
          v-else
          class="nav-item"
          @click="router.push({ name: route.name })"
        >
          <span class="nav-item__icon">
            <AppIcon :icon="route.icon" />
          </span>
          <span class="nav-item__title">{{ route.title }}</span>
        </div>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()

import AppIcon from '@/components/app-icon.vue'

interface Rote {
  name?: string
  title: string
  icon: string
  children?: Rote[]
}

const routes: Rote[] = [
  {
    name: 'play',
    title: 'Now Playing',
    icon: 'play-light'
  }, {
    title: 'Music Library',
    icon: 'playlist-light',
    children: [
      {
        name: 'albums',
        title: 'Albums',
        icon: 'notebook-thin'
      },
      {
        name: 'artists',
        title: 'Artists',
        icon: 'users-thin'
      }
    ]
  }
]
</script>

<style scoped lang="scss">
.app-sidebar {
  grid-area: sidebar;
  width: 56px;
  background-color: var(--background-sidebar);
  border-right: 1px solid var(--color-sidebar-border);
  position: fixed;
  left: 0;
  bottom: 0;
  top: 80px;
  padding: 0 12px;
  transition: all 0.2s linear;
  z-index: 5;
  &:hover {
    width: 200px;
  }
  .nav {
    padding: 20px 0;
    overflow-y: auto;
    overflow-x: hidden;
    &-item {
      border-radius: 5px;
      display: flex;
      align-items: center;
      cursor: pointer;
      gap: 10px;
      &:not(:last-child) {
        margin-bottom: 30px;
      }
      &__icon {
        width: 32px;
        height: 32px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: none;
      }
      &__title {
        white-space: nowrap;
        flex: 1;
      }
    }
  }
}
</style>
