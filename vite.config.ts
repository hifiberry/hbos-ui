import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "@/assets/scss/variables.scss" as *; @use "@/assets/scss/mixins.scss" as *; @use "@/assets/scss/variables/colors.scss" as *; @use "@/assets/scss/themes.scss" as *;',
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
