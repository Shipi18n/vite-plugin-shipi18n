import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadLanguageResources } from './i18n'
import './App.css'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' }
]

function App() {
  const { t, i18n } = useTranslation()
  const [name] = useState('Developer')
  const [messageCount] = useState(5)
  const [loading, setLoading] = useState(false)

  const changeLanguage = async (lng) => {
    setLoading(true)
    try {
      // Load the language resources if not already loaded
      if (!i18n.hasResourceBundle(lng, 'translation')) {
        await loadLanguageResources(lng)
      }
      await i18n.changeLanguage(lng)
    } catch (error) {
      console.error('Language change failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🌍 Vite + Shipi18n Plugin</h1>
        <p>{t('description')}</p>
      </header>

      <main className="main">
        <div className="card">
          <h2>{t('welcome')}</h2>
          <p>{t('greeting', { name })}</p>
          <p>{t('message_count', { count: messageCount })}</p>
        </div>

        <div className="card language-selector">
          <h3>{t('ui.language_selector')}</h3>
          <p className="current-lang">
            {t('ui.current_language', { lang: i18n.language })}
          </p>
          <div className="language-buttons">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                disabled={loading || i18n.language === lang.code}
                className={i18n.language === lang.code ? 'active' : ''}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        <div className="card features">
          <h3>{t('features.title')}</h3>
          <ul>
            <li>✅ {t('features.auto_translate')}</li>
            <li>✅ {t('features.caching')}</li>
            <li>✅ {t('features.multi_lang')}</li>
            <li>✅ {t('features.preserves')}</li>
          </ul>
        </div>

        <div className="card actions">
          <button className="primary">{t('buttons.get_started')}</button>
          <button className="secondary">{t('buttons.learn_more')}</button>
          <a
            href="https://github.com/Shipi18n/vite-plugin-shipi18n"
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            {t('buttons.documentation')} →
          </a>
        </div>
      </main>

      <footer className="footer">
        <p>
          Built with{' '}
          <a href="https://shipi18n.com" target="_blank" rel="noopener noreferrer">
            Shipi18n
          </a>{' '}
          • Translations generated at build time
        </p>
      </footer>
    </div>
  )
}

export default App
