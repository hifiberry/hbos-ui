import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import packageJson from './package.json'
// import removeConsole from 'vite-plugin-remove-console'

// A vite plugin that remove all the specified console types in the production environment
// https://www.npmjs.com/package/vite-plugin-remove-console
// import removeConsole from 'vite-plugin-remove-console' // Temporarily disabled for debugging

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()], // removeConsole() disabled for debugging
  css: {
    preprocessorOptions: {
      scss: {
        additionalData:
          '@use "@/assets/scss/variables.scss" as *; @use "@/assets/scss/mixins.scss" as *; @use "@/assets/scss/variables/colors.scss" as *; @use "@/assets/scss/themes.scss" as *;',
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  build: {
    minify: true, // Disable minification for readable error messages
    sourcemap: true, // Enable source maps for debugging
  },
})
