# vite-plugin-shipi18n

> Automatic i18n translation at build time for Vite projects

Translate your locale files automatically during the build process using [Shipi18n](https://shipi18n.com) API. No manual copy-pasting, no external tools - just add the plugin and run `npm run build`.

## Features

- ⚡ **Zero-Config** - Works out of the box with sensible defaults
- 🚀 **Build-Time Translation** - Translations happen during Vite build, not at runtime
- 💾 **Smart Caching** - Only translates changed content (hash-based caching)
- 🌍 **Multi-Language Support** - Translate to multiple languages in one build
- 🔧 **Preserves Placeholders** - Keeps `{{name}}`, `{count}`, `%s`, etc. intact
- 📦 **Framework Agnostic** - Works with any i18n library (react-i18next, vue-i18n, etc.)
- 🎯 **Production Ready** - Battle-tested caching and error handling

## Installation

```bash
npm install vite-plugin-shipi18n --save-dev
```

## Quick Start

### 1. Get Your API Key

Sign up at [shipi18n.com](https://shipi18n.com) to get your free API key (takes 30 seconds, no credit card required).

Free tier includes:
- 60 requests/minute
- 10,000 characters/month
- Perfect for small to medium projects

### 2. Configure the Plugin

Add to your `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import shipi18n from 'vite-plugin-shipi18n'

export default defineConfig({
  plugins: [
    shipi18n({
      apiKey: process.env.VITE_SHIPI18N_API_KEY,
      targetLanguages: ['es', 'fr', 'de', 'ja'],
      sourceDir: 'public/locales/en',
      outputDir: 'public/locales'
    })
  ]
})
```

### 3. Create Your Source Locale File

Create `public/locales/en/translation.json`:

```json
{
  "welcome": "Welcome to our app!",
  "greeting": "Hello, {{name}}!",
  "message_count": "You have {{count}} messages"
}
```

### 4. Build Your Project

```bash
npm run build
```

The plugin will automatically:
1. Read your English locale files
2. Translate them to Spanish, French, German, and Japanese
3. Save translated files to `public/locales/es/`, `public/locales/fr/`, etc.
4. Cache results for faster subsequent builds

## Configuration

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | Your Shipi18n API key |
| `targetLanguages` | `string[]` | **required** | Array of target language codes (e.g., `['es', 'fr', 'de']`) |
| `sourceDir` | `string` | `'public/locales/en'` | Directory containing source locale files |
| `outputDir` | `string` | `'public/locales'` | Directory where translated files will be saved |
| `sourceLanguage` | `string` | `'en'` | Source language code |
| `apiUrl` | `string` | Shipi18n production URL | Custom API URL (for self-hosted instances) |
| `cache` | `boolean` | `true` | Enable smart caching |
| `cacheDir` | `string` | `'node_modules/.cache/vite-plugin-shipi18n'` | Cache directory path |

### Full Configuration Example

```javascript
import { defineConfig } from 'vite'
import shipi18n from 'vite-plugin-shipi18n'

export default defineConfig({
  plugins: [
    shipi18n({
      // Required
      apiKey: process.env.VITE_SHIPI18N_API_KEY,
      targetLanguages: ['es', 'fr', 'de', 'ja', 'zh', 'pt', 'ru', 'ar'],

      // Optional (with defaults shown)
      sourceDir: 'public/locales/en',
      outputDir: 'public/locales',
      sourceLanguage: 'en',
      cache: true,
      cacheDir: 'node_modules/.cache/vite-plugin-shipi18n'
    })
  ]
})
```

## How It Works

1. **Build Hook**: Plugin runs during Vite's build process (`buildStart` hook)
2. **File Discovery**: Scans `sourceDir` for all `.json` files
3. **Cache Check**: Checks if file content has changed (using MD5 hash)
4. **API Call**: If changed, calls Shipi18n API to translate
5. **File Generation**: Writes translated JSON files to `outputDir/<lang>/<filename>.json`
6. **Cache Update**: Saves translation results for future builds

### Caching Strategy

The plugin uses content-based hashing to determine if translation is needed:

```
Hash = MD5(file_content + target_languages)
```

- ✅ **Changed content** = Re-translate
- ✅ **Added languages** = Re-translate
- ⏭️ **Unchanged** = Use cache

Cache files are stored in `node_modules/.cache/vite-plugin-shipi18n/` and are safe to delete.

## Usage with i18n Libraries

### React + react-i18next

```javascript
// src/i18n.js
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    resources: {} // Resources loaded from public/locales
  })

// Load translations dynamically
const loadLanguage = async (lng) => {
  const translation = await fetch(`/locales/${lng}/translation.json`)
  const data = await translation.json()
  i18n.addResourceBundle(lng, 'translation', data)
}

export default i18n
```

### Vue + vue-i18n

```javascript
// src/i18n.js
import { createI18n } from 'vue-i18n'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {} // Messages loaded from public/locales
})

export default i18n
```

### Next.js + next-i18next

```javascript
// next-i18next.config.js
module.exports = {
  i18n: {
    locales: ['en', 'es', 'fr', 'de'],
    defaultLocale: 'en',
  },
  localePath: './public/locales'
}
```

## Supported Languages

The plugin supports **100+ languages** via Google Cloud Translation API, including:

- **es** - Spanish
- **fr** - French
- **de** - German
- **ja** - Japanese
- **zh** - Chinese (Simplified)
- **zh-TW** - Chinese (Traditional)
- **pt** - Portuguese
- **ru** - Russian
- **ar** - Arabic
- **hi** - Hindi
- **ko** - Korean
- **it** - Italian
- **nl** - Dutch
- **pl** - Polish
- **tr** - Turkish
- **vi** - Vietnamese
- **th** - Thai
- **id** - Indonesian
- **sv** - Swedish
- **and 85+ more...**

See the [shipi18n-react-example](https://github.com/shipi18n/shipi18n-react-example/blob/main/src/constants/languages.js) repository for the complete list of 100+ supported language codes.

## Example Project

See the [example/](./example) directory for a complete working example with React + react-i18next.

### Run the Example

```bash
cd example
npm install
cp .env.example .env
# Add your API key to .env
npm run build  # Generates translations
npm run dev    # Run the app
```

## FAQ

### Does this work with any i18n library?

Yes! The plugin simply generates translated JSON files. It works with:
- react-i18next
- vue-i18n
- next-i18next
- Any library that loads locale files from a directory

### When does translation happen?

During the Vite build process (`vite build`), **not** at runtime. This means:
- ✅ Zero runtime overhead
- ✅ All translations are static files
- ✅ Works offline after build
- ✅ No API calls from users' browsers

### What if I change my English text?

The plugin detects changes and re-translates automatically. Caching ensures only changed files are re-translated.

### Can I translate from a language other than English?

Yes! Use the `sourceLanguage` option:

```javascript
shipi18n({
  sourceLanguage: 'es', // Translate from Spanish
  targetLanguages: ['en', 'fr', 'de']
})
```

### What about placeholders?

Placeholders are automatically preserved:
- `{{name}}` → stays as `{{name}}`
- `{count}` → stays as `{count}}`
- `%s` → stays as `%s`
- `<0>` → stays as `<0>`

### Can I use this in CI/CD?

Yes! Set your API key as an environment variable in your CI/CD pipeline:

```bash
# GitHub Actions
VITE_SHIPI18N_API_KEY=${{ secrets.SHIPI18N_API_KEY }}

# GitLab CI
VITE_SHIPI18N_API_KEY: $SHIPI18N_API_KEY

# Environment variable
export VITE_SHIPI18N_API_KEY=sk_live_...
```

### Does it slow down my build?

First build: Yes, translations take time (depends on file size and number of languages).
Subsequent builds: No, cached translations are used instantly.

**Tip**: Cache `node_modules/.cache/vite-plugin-shipi18n/` in your CI/CD for faster builds.

## License

MIT

## Support

- [Documentation](https://shipi18n.com/docs)
- [GitHub Issues](https://github.com/Shipi18n/vite-plugin-shipi18n/issues)
- [Discord Community](https://discord.gg/shipi18n)

---

Built with [Shipi18n](https://shipi18n.com) - Smart translation API for developers
