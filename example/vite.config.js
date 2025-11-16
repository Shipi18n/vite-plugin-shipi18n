import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import shipi18n from '../src/index.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // Shipi18n translation plugin
    shipi18n({
      // Get API key from environment variable
      apiKey: process.env.VITE_SHIPI18N_API_KEY,

      // Languages to translate to
      targetLanguages: ['es', 'fr', 'de', 'ja'],

      // Source directory (contains en.json)
      sourceDir: 'public/locales/en',

      // Output directory (will create es/, fr/, de/, ja/ subdirectories)
      outputDir: 'public/locales',

      // Source language
      sourceLanguage: 'en',

      // Enable caching (default: true)
      cache: true
    })
  ]
})
