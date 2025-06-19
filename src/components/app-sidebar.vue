<template>
  <aside class="sidebar">
    <div
      v-if="isPlayerControls"
      class="sidebar-controls"
    >
      <AppSongControlInfo isOnSticky/>
    </div>
    <div class="nav">
      <template
        v-for="route in routes"
        :key="route.name"
      >
        <div
          v-if="route.children && route.children.length"
          :class="['nav-item__parent']"
        >
          <router-link
            :to="{ name: route.name }"
            :class="['nav-item']"
          >
            <span class="nav-item__icon">
              <AppIcon :icon="route.icon" />
            </span>
            <span class="nav-item__title">{{ route.title }}</span>
            <span class="nav-item__arrow">
              <AppIcon icon="caret-down" />
            </span>
          </router-link>
          <div class="nav-item__dropdown">
            <router-link
              v-for="childrenRoute in route.children"
              :key="childrenRoute.name"
              :to="{ name: childrenRoute.name }"
              class="nav-item"
            >
              <span class="nav-item__icon">
                <AppIcon :icon="childrenRoute.icon" />
              </span>
              <span class="nav-item__title">{{ childrenRoute.title }}</span>
            </router-link>
          </div>
        </div>
        <router-link
          v-else
          :to="{ name: route.name }"
          :class="['nav-item']"
        >
          <span class="nav-item__icon">
            <AppIcon :icon="route.icon" />
          </span>
          <span class="nav-item__title">{{ route.title }}</span>
        </router-link>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'
import AppSongControlInfo from '@/components/app-song-control-info.vue'

interface SidebarProps {
  isPlayerControls?: boolean
}
const { isPlayerControls = true } = defineProps<SidebarProps>()

interface Route {
  name?: string
  title: string
  icon: string
  children?: Route[]
}

const routes: Route[] = [
  {
    name: 'now-playing',
    title: 'Now Playing',
    icon: 'play-light',
  },
  {
    name: 'library',
    title: 'Music Library',
    icon: 'playlist-light',
    children: [
      {
        name: 'albums',
        title: 'Albums',
        icon: 'notebook-thin',
      },
      {
        name: 'artists',
        title: 'Artists',
        icon: 'users-thin',
      },
    ],
  },
  {
    name: 'sound',
    title: 'Sound',
    icon: 'music-note-simple-light',
  }
]
</script>

<style scoped lang="scss">
.sidebar {
  width: 56px;
  height: 100%;
  background-color: var(--background-sidebar);
  border-right: 1px solid var(--color-sidebar-border);
  position: fixed;
  left: 0;
  bottom: 0;
  top: 0;
  padding: 80px 12px 0;
  transition: all 0.2s linear;
  z-index: 5;
  @include media-breakpoint-down(lg) {
    top: auto;
    background-color: transparent;
    width: 100%!important;
    height: auto;
    bottom: 30px;
    padding: 0 15px;
  }
  &:hover {
    width: 200px;
    .nav-item__arrow {
      opacity: 1;
    }
  }
  &:not(&:hover) {
    .nav-item {
      &.router-link-active {
        & + .nav-item__dropdown {
          padding: 0 0 0 12px;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.2s linear, padding-top 0.2s linear, opacity 0.2s linear;
        }
      }
    }
  }
  .nav {
    padding: 20px 0;
    overflow-y: auto;
    overflow-x: hidden;
    @include media-breakpoint-down(lg) {
      padding: 0;
      overflow: visible;
      display: flex;
      align-items: center;
      justify-content: space-around;
      flex-wrap: nowrap;
    }
    & > * {
      &:not(:last-child) {
        margin-bottom: 32px;
        @include media-breakpoint-down(lg) {
          margin: 0;
        }
      }
    }
    .nav-item {
      @include media-breakpoint-down(lg) {
        display: flex;
        flex-direction: column;
      }
      &.router-link-active {
        color: $color-sidebar-item-active;
        background-color: $background-sidebar-item-active;
        @include media-breakpoint-down(lg) {
          background-color: transparent;
          color: $primary;
        }
        .nav-item__icon, .nav-item__arrow {
          svg {
            color: $color-sidebar-item-active;
          }
        }
        .nav-item__icon {
          @include media-breakpoint-down(lg) {
            background-color: $background-sidebar-item-active;
          }
        }
        .nav-item__title {
          font-weight: 600;
        }
        & + .nav-item__dropdown {
          max-height: 300px;
          padding-top: 12px;
          opacity: 1;
          @include media-breakpoint-down(lg) {
            display: none;
          }
        }
        .nav-item__arrow {
          transform: rotate(180deg);
          top: 6px;
        }
      }
    }
    &-item {
      border-radius: 5px;
      display: flex;
      align-items: center;
      cursor: pointer;
      gap: 2px;
      color: var(--color-sidebar);
      transition: all 0.2s linear;
      &:hover {
        color: $color-sidebar-hover;
        background-color: $background-sidebar-item-hover;
        @include media-breakpoint-down(lg) {
          color: var(--color-sidebar);
          background-color: transparent;
        }
        .nav-item__icon,.nav-item__arrow {
          svg {
            color: $color-sidebar-hover;
            @include media-breakpoint-down(lg) {
              color: var(--color-sidebar);
            }
          }
        }
      }
      &__icon {
        width: 32px;
        height: 32px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: none;
        transition: fill 3s linear;
      }
      &__parent {
        & > .nav {
          &-item {
            position: relative;
            .nav-item__arrow {
              position: absolute;
              top: 8px;
              right: 7px;
              transition: transform 0.2s linear;
              svg {
                width: 16px;
                height: 16px;
              }
            }
          }
        }
      }
      &__title {
        white-space: nowrap;
        flex: 1;
        padding-right: 5px;
        @include media-breakpoint-down(lg) {
          font-size: 10px;
          padding: 5px 0 0;
        }
      }
      &__dropdown {
        padding: 0 0 0 12px;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transition: max-height 0.2s linear, padding-top 0.2s linear, opacity 0.2s linear;
        .nav-item {
          &:not(:last-child) {
            margin-bottom: 12px;
          }
          &.router-link-active {
            color: $color-sidebar-hover;
            background-color: $background-sidebar-item-hover;
            .nav-item__icon {
              svg {
                color: $color-sidebar-hover;
              }
            }
          }
        }
      }
      &__arrow {
        opacity: 0;
        @include media-breakpoint-down(lg) {
          display: none;
        }
      }
    }
  }
  &-controls {
    display: none;
    margin-bottom: 12px;
    &:deep(.app-audio-controls) {
      width: auto;
    }
    @include media-breakpoint-down(lg) {
      display: block;
    }
  }
}
</style>
