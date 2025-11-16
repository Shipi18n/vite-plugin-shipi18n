import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false // React already escapes
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    },

    // Load translations from public/locales
    resources: {},

    // Load translations asynchronously
    initImmediate: false
  })

// Dynamically load translations
const loadLanguageResources = async (lng) => {
  try {
    const translation = await fetch(`/locales/${lng}/translation.json`)
    const data = await translation.json()
    i18n.addResourceBundle(lng, 'translation', data)
  } catch (error) {
    console.error(`Failed to load ${lng} translations:`, error)
  }
}

// Load English (default)
await loadLanguageResources('en')

export default i18n
export { loadLanguageResources }
