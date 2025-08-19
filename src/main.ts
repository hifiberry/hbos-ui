import './assets/scss/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import Vue3Toastify from 'vue3-toastify'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// Create Pinia instance explicitly so stores can be used before mount
const pinia = createPinia()
app.use(pinia)
app.use(router)

import { useDark } from '@vueuse/core'
const isDark = useDark()
app.use(Vue3Toastify, {
  theme: isDark.value ? 'dark' : 'light',
  // autoClose: 30000, // Optional: configure global options
})

// Bootstrap: load persisted UI settings (e.g., expert mode) before mounting
async function bootstrap() {
  try {
    const settingsStore = useSettingsStore()
    await settingsStore.loadSettings()
  } catch (e) {
    // Non-fatal: proceed with defaults if loading fails
    console.warn('Failed to load UI settings on startup, using defaults', e)
  } finally {
    app.mount('#app')
  }
}

bootstrap()

//
// import { useLibraryStore } from '@/stores/library'
//
// async function main() {
//   const app = createApp(App)
//
//   const pinia = createPinia()
//   app.use(pinia)
//   app.use(router)
//
//   const libraryStore = useLibraryStore()
//   await libraryStore.getAvailableLibrary()
//
//   app.mount('#app')
// }
//
// main()
