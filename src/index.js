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
 * @param {Object} options.fallback - Fallback options
 * @param {boolean} options.fallback.fallbackToSource - Use source content when translation missing (default: true)
 * @param {boolean} options.fallback.regionalFallback - Enable pt-BR -> pt fallback (default: true)
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
    cacheDir = 'node_modules/.cache/vite-plugin-shipi18n',
    fallback = {}
  } = options

  const {
    fallbackToSource = true,
    regionalFallback = true,
  } = fallback

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

        // Process regional languages for fallback
        const { processedTargets, regionalMap } = processRegionalLanguages(targetLanguages, regionalFallback)

        // Translate if not cached
        if (!translations) {
          console.log(`   ⏳ ${fileName}: Translating to ${targetLanguages.length} language(s)...`)

          try {
            translations = await translateJSON({
              apiKey,
              apiUrl,
              json: sourceJson,
              sourceLanguage,
              targetLanguages: processedTargets
            })

            // Apply fallback logic
            translations = applyFallbacks(
              translations,
              sourceJson,
              targetLanguages,
              sourceLanguage,
              fallbackToSource,
              regionalFallback,
              regionalMap
            )

            // Save to cache
            if (cache) {
              fs.writeFileSync(cacheFile, JSON.stringify(translations, null, 2))
            }

            console.log(`   ✓ ${fileName}: Translation complete`)

            // Log fallback info if any were used
            if (translations.fallbackInfo && translations.fallbackInfo.used) {
              const fi = translations.fallbackInfo
              if (Object.keys(fi.regionalFallbacks).length > 0) {
                for (const [lang, baseLang] of Object.entries(fi.regionalFallbacks)) {
                  console.log(`      ℹ️  ${lang} used ${baseLang} translation (regional fallback)`)
                }
              }
              if (fi.languagesFallbackToSource.length > 0) {
                for (const lang of fi.languagesFallbackToSource) {
                  console.log(`      ⚠️  ${lang} used source content (fallback)`)
                }
              }
            }
          } catch (error) {
            console.error(`   ❌ ${fileName}: Translation failed - ${error.message}`)

            // Use source as fallback on error if enabled
            if (fallbackToSource) {
              console.log(`      ⚠️  Using source content as fallback for all languages`)
              translations = {}
              for (const lang of targetLanguages) {
                translations[lang] = { ...sourceJson }
              }
            } else {
              continue
            }
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

/**
 * Process regional language codes for fallback support
 * @exported for testing
 */
export function processRegionalLanguages(targetLanguages, regionalFallback) {
  const regionalMap = {}
  const processedTargets = []
  const baseLanguagesAdded = new Set()

  for (const lang of targetLanguages) {
    if (lang.includes('-') && regionalFallback) {
      const baseLang = lang.split('-')[0]
      regionalMap[lang] = baseLang

      if (!baseLanguagesAdded.has(baseLang) && !targetLanguages.includes(baseLang)) {
        processedTargets.push(baseLang)
        baseLanguagesAdded.add(baseLang)
      }
    }

    if (!processedTargets.includes(lang)) {
      processedTargets.push(lang)
    }
  }

  return { processedTargets, regionalMap }
}

/**
 * Apply fallback logic to translation results
 * @exported for testing
 */
export function applyFallbacks(result, sourceContent, targetLanguages, sourceLanguage, fallbackToSource, regionalFallback, regionalMap) {
  const fallbackInfo = {
    used: false,
    languagesFallbackToSource: [],
    regionalFallbacks: {},
    keysFallback: {},
  }

  for (const lang of targetLanguages) {
    const translation = result[lang]

    // Case 1: Entire language missing
    if (!translation || Object.keys(translation).length === 0) {
      // Try regional fallback first
      if (regionalFallback && regionalMap[lang]) {
        const baseLang = regionalMap[lang]
        const baseTranslation = result[baseLang]

        if (baseTranslation && Object.keys(baseTranslation).length > 0) {
          result[lang] = { ...baseTranslation }
          fallbackInfo.used = true
          fallbackInfo.regionalFallbacks[lang] = baseLang
          continue
        }
      }

      // Fall back to source
      if (fallbackToSource) {
        result[lang] = { ...sourceContent }
        fallbackInfo.used = true
        fallbackInfo.languagesFallbackToSource.push(lang)
      }
      continue
    }

    // Case 2: Check for missing keys
    if (fallbackToSource && typeof translation === 'object') {
      const missingKeys = findMissingKeys(sourceContent, translation)

      if (missingKeys.length > 0) {
        fallbackInfo.used = true
        fallbackInfo.keysFallback[lang] = missingKeys

        for (const key of missingKeys) {
          const fallbackValue = getNestedValue(sourceContent, key)

          // Try regional fallback first
          if (regionalFallback && regionalMap[lang]) {
            const baseLang = regionalMap[lang]
            const baseTranslation = result[baseLang]
            const baseValue = baseTranslation ? getNestedValue(baseTranslation, key) : undefined

            if (baseValue !== undefined) {
              setNestedValue(translation, key, baseValue)
              continue
            }
          }

          if (fallbackValue !== undefined) {
            setNestedValue(translation, key, fallbackValue)
          }
        }
      }
    }
  }

  if (fallbackInfo.used) {
    result.fallbackInfo = fallbackInfo
  }

  return result
}

/**
 * Find missing keys in translation
 * @exported for testing
 */
export function findMissingKeys(source, translation, prefix = '') {
  const missing = []

  for (const key of Object.keys(source)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const sourceValue = source[key]
    const translationValue = translation[key]

    if (translationValue === undefined || translationValue === null || translationValue === '') {
      missing.push(fullKey)
    } else if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof translationValue === 'object' &&
      translationValue !== null
    ) {
      missing.push(...findMissingKeys(sourceValue, translationValue, fullKey))
    }
  }

  return missing
}

/**
 * Get nested value from object using dot notation
 * @exported for testing
 */
export function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return current[key]
    }
    return undefined
  }, obj)
}

/**
 * Set nested value in object using dot notation
 * @exported for testing
 */
export function setNestedValue(obj, path, value) {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}
