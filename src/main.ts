import './assets/scss/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vue3Toastify from 'vue3-toastify'

import App from './App.vue'
import router from './router'

console.log('main.ts: Vue application starting up')
const app = createApp(App)

app.use(createPinia())
app.use(router)

import { useDark } from '@vueuse/core'
const isDark = useDark()
app.use(Vue3Toastify, {
  theme: isDark.value ? 'dark' : 'light',
  // autoClose: 30000, // Optional: configure global options
})

console.log('main.ts: Mounting Vue app to DOM')
app.mount('#app')

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
