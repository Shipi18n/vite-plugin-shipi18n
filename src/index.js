import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

/**
 * Vite plugin for automatic i18n translation using Shipi18n API
 *
 * @param {Object} options - Plugin configuration
 * @param {string} options.apiKey - Shipi18n API key (required)
 * @param {string} options.apiUrl - Shipi18n API URL (optional, defaults to production)
 * @param {string[]} options.targetLanguages - Languages to translate to (required)
 * @param {string} options.sourceDir - Directory containing source locale files (default: 'public/locales/en')
 * @param {string} options.outputDir - Directory to write translated files (default: 'public/locales')
 * @param {string} options.sourceLanguage - Source language code (default: 'en')
 * @param {boolean} options.cache - Enable caching (default: true)
 * @param {string} options.cacheDir - Cache directory (default: 'node_modules/.cache/vite-plugin-shipi18n')
 */
export default function shipi18nPlugin(options = {}) {
  const {
    apiKey,
    apiUrl = 'https://x9527l3blg.execute-api.us-east-1.amazonaws.com',
    targetLanguages = [],
    sourceDir = 'public/locales/en',
    outputDir = 'public/locales',
    sourceLanguage = 'en',
    cache = true,
    cacheDir = 'node_modules/.cache/vite-plugin-shipi18n'
  } = options

  // Validation
  if (!apiKey) {
    throw new Error('vite-plugin-shipi18n: apiKey is required')
  }

  if (!targetLanguages || targetLanguages.length === 0) {
    throw new Error('vite-plugin-shipi18n: targetLanguages is required')
  }

  let config

  return {
    name: 'vite-plugin-shipi18n',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    async buildStart() {
      const root = config.root || process.cwd()
      const sourcePath = path.resolve(root, sourceDir)
      const outputPath = path.resolve(root, outputDir)
      const cachePath = path.resolve(root, cacheDir)

      console.log('\n🌍 Shipi18n: Starting translation process...')
      console.log(`   Source: ${sourceDir}`)
      console.log(`   Target languages: ${targetLanguages.join(', ')}`)

      // Check if source directory exists
      if (!fs.existsSync(sourcePath)) {
        console.warn(`⚠️  Warning: Source directory not found: ${sourcePath}`)
        return
      }

      // Create cache directory if needed
      if (cache && !fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true })
      }

      // Find all JSON files in source directory
      const sourceFiles = fs.readdirSync(sourcePath)
        .filter(file => file.endsWith('.json'))

      if (sourceFiles.length === 0) {
        console.warn(`⚠️  Warning: No JSON files found in ${sourcePath}`)
        return
      }

      console.log(`   Found ${sourceFiles.length} source file(s)`)

      // Process each file
      for (const fileName of sourceFiles) {
        const sourceFilePath = path.join(sourcePath, fileName)
        const sourceContent = fs.readFileSync(sourceFilePath, 'utf-8')

        let sourceJson
        try {
          sourceJson = JSON.parse(sourceContent)
        } catch (error) {
          console.error(`❌ Error parsing ${fileName}: ${error.message}`)
          continue
        }

        // Calculate hash for caching
        const contentHash = crypto
          .createHash('md5')
          .update(sourceContent + targetLanguages.join(','))
          .digest('hex')

        const cacheFile = path.join(cachePath, `${fileName}.${contentHash}.json`)

        // Check cache
        let translations = null
        if (cache && fs.existsSync(cacheFile)) {
          console.log(`   ✓ ${fileName}: Using cached translations`)
          try {
            translations = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
          } catch (error) {
            console.warn(`   ⚠️  Cache corrupted for ${fileName}, re-translating...`)
            translations = null
          }
        }

        // Translate if not cached
        if (!translations) {
          console.log(`   ⏳ ${fileName}: Translating to ${targetLanguages.length} language(s)...`)

          try {
            translations = await translateJSON({
              apiKey,
              apiUrl,
              json: sourceJson,
              sourceLanguage,
              targetLanguages
            })

            // Save to cache
            if (cache) {
              fs.writeFileSync(cacheFile, JSON.stringify(translations, null, 2))
            }

            console.log(`   ✓ ${fileName}: Translation complete`)
          } catch (error) {
            console.error(`   ❌ ${fileName}: Translation failed - ${error.message}`)
            continue
          }
        }

        // Write translated files
        for (const langCode of targetLanguages) {
          if (!translations[langCode]) {
            console.warn(`   ⚠️  ${fileName}: No translation for ${langCode}`)
            continue
          }

          const outputLangDir = path.join(outputPath, langCode)
          if (!fs.existsSync(outputLangDir)) {
            fs.mkdirSync(outputLangDir, { recursive: true })
          }

          const outputFile = path.join(outputLangDir, fileName)
          fs.writeFileSync(
            outputFile,
            JSON.stringify(translations[langCode], null, 2)
          )
        }
      }

      console.log('✅ Shipi18n: Translation complete!\n')
    }
  }
}

/**
 * Call Shipi18n API to translate JSON
 */
async function translateJSON({ apiKey, apiUrl, json, sourceLanguage, targetLanguages }) {
  const response = await fetch(`${apiUrl}/api/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      inputMethod: 'json',
      jsonInput: JSON.stringify(json),
      sourceLanguage,
      targetLanguages: JSON.stringify(targetLanguages),
      preservePlaceholders: 'true'
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API request failed: ${response.status}`)
  }

  const data = await response.json()
  return data.translations || {}
}
