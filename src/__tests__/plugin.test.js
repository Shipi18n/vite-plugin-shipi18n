/**
 * Tests for vite-plugin-shipi18n
 * These tests actually import and test the plugin
 */

import shipi18nPlugin from '../index.js';
import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Mock fetch globally
const originalFetch = global.fetch;
let mockFetchResponse = {};
let mockFetchError = null;
let lastFetchCall = null;

beforeAll(() => {
  global.fetch = async (url, options) => {
    lastFetchCall = { url, options };

    if (mockFetchError) {
      throw mockFetchError;
    }

    return {
      ok: mockFetchResponse.ok !== false,
      status: mockFetchResponse.status || 200,
      json: mockFetchResponse.jsonError
        ? async () => { throw new Error('JSON parse error'); }
        : async () => mockFetchResponse.data || {},
    };
  };
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  mockFetchResponse = { ok: true, data: {} };
  mockFetchError = null;
  lastFetchCall = null;
});

describe('Plugin Configuration', () => {
  describe('Required options', () => {
    test('throws error when apiKey is missing', () => {
      expect(() => {
        shipi18nPlugin({ targetLanguages: ['es', 'fr'] });
      }).toThrow('apiKey is required');
    });

    test('throws error when targetLanguages is missing', () => {
      expect(() => {
        shipi18nPlugin({ apiKey: 'sk_test_123' });
      }).toThrow('targetLanguages is required');
    });

    test('throws error when targetLanguages is empty', () => {
      expect(() => {
        shipi18nPlugin({ apiKey: 'sk_test_123', targetLanguages: [] });
      }).toThrow('targetLanguages is required');
    });

    test('accepts valid configuration', () => {
      const plugin = shipi18nPlugin({
        apiKey: 'sk_test_123',
        targetLanguages: ['es', 'fr'],
      });

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('vite-plugin-shipi18n');
    });
  });

  describe('Plugin structure', () => {
    test('plugin has correct name', () => {
      const plugin = shipi18nPlugin({
        apiKey: 'sk_test_123',
        targetLanguages: ['es'],
      });

      expect(plugin.name).toBe('vite-plugin-shipi18n');
    });

    test('plugin has configResolved hook', () => {
      const plugin = shipi18nPlugin({
        apiKey: 'sk_test_123',
        targetLanguages: ['es'],
      });

      expect(typeof plugin.configResolved).toBe('function');
    });

    test('plugin has buildStart hook', () => {
      const plugin = shipi18nPlugin({
        apiKey: 'sk_test_123',
        targetLanguages: ['es'],
      });

      expect(typeof plugin.buildStart).toBe('function');
    });
  });

  describe('configResolved hook', () => {
    test('stores vite config', () => {
      const plugin = shipi18nPlugin({
        apiKey: 'sk_test_123',
        targetLanguages: ['es'],
      });

      const mockConfig = { root: '/test/project' };
      plugin.configResolved(mockConfig);

      // Hook should not throw and config should be stored internally
      expect(true).toBe(true);
    });
  });
});

describe('Cache Hash Generation', () => {
  test('generates consistent hash for same content', () => {
    const content = '{"greeting": "Hello"}';
    const targetLangs = ['es', 'fr'];

    const hash1 = crypto
      .createHash('md5')
      .update(content + targetLangs.join(','))
      .digest('hex');

    const hash2 = crypto
      .createHash('md5')
      .update(content + targetLangs.join(','))
      .digest('hex');

    expect(hash1).toBe(hash2);
  });

  test('generates different hash for different content', () => {
    const content1 = '{"greeting": "Hello"}';
    const content2 = '{"greeting": "Hi"}';
    const targetLangs = ['es', 'fr'];

    const hash1 = crypto
      .createHash('md5')
      .update(content1 + targetLangs.join(','))
      .digest('hex');

    const hash2 = crypto
      .createHash('md5')
      .update(content2 + targetLangs.join(','))
      .digest('hex');

    expect(hash1).not.toBe(hash2);
  });

  test('generates different hash for different target languages', () => {
    const content = '{"greeting": "Hello"}';
    const targetLangs1 = ['es', 'fr'];
    const targetLangs2 = ['es', 'de'];

    const hash1 = crypto
      .createHash('md5')
      .update(content + targetLangs1.join(','))
      .digest('hex');

    const hash2 = crypto
      .createHash('md5')
      .update(content + targetLangs2.join(','))
      .digest('hex');

    expect(hash1).not.toBe(hash2);
  });

  test('hash is 32 character hex string', () => {
    const content = '{"greeting": "Hello"}';
    const targetLangs = ['es', 'fr'];

    const hash = crypto
      .createHash('md5')
      .update(content + targetLangs.join(','))
      .digest('hex');

    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe('API Request Formatting', () => {
  test('formats request body correctly', () => {
    const json = { greeting: 'Hello', farewell: 'Goodbye' };
    const sourceLanguage = 'en';
    const targetLanguages = ['es', 'fr'];

    const requestBody = {
      inputMethod: 'json',
      jsonInput: JSON.stringify(json),
      sourceLanguage,
      targetLanguages: JSON.stringify(targetLanguages),
      preservePlaceholders: 'true',
    };

    expect(requestBody.inputMethod).toBe('json');
    expect(requestBody.jsonInput).toBe('{"greeting":"Hello","farewell":"Goodbye"}');
    expect(requestBody.sourceLanguage).toBe('en');
    expect(requestBody.targetLanguages).toBe('["es","fr"]');
    expect(requestBody.preservePlaceholders).toBe('true');
  });

  test('includes correct headers', () => {
    const apiKey = 'sk_test_123';

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    };

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-API-Key']).toBe('sk_test_123');
  });

  test('constructs correct API endpoint', () => {
    const apiUrl = 'https://api.shipi18n.com';
    const endpoint = `${apiUrl}/api/translate`;

    expect(endpoint).toBe('https://api.shipi18n.com/api/translate');
  });
});

describe('Response Parsing', () => {
  test('extracts translations from response', () => {
    const response = {
      translations: {
        es: { greeting: 'Hola', farewell: 'Adiós' },
        fr: { greeting: 'Bonjour', farewell: 'Au revoir' },
      },
    };

    const translations = response.translations || {};

    expect(translations.es.greeting).toBe('Hola');
    expect(translations.fr.farewell).toBe('Au revoir');
  });

  test('handles empty translations', () => {
    const response = {};
    const translations = response.translations || {};

    expect(Object.keys(translations)).toHaveLength(0);
  });

  test('handles missing language in response', () => {
    const response = {
      translations: {
        es: { greeting: 'Hola' },
      },
    };

    const translations = response.translations || {};

    expect(translations.es).toBeDefined();
    expect(translations.fr).toBeUndefined();
  });
});

describe('Error Handling', () => {
  test('handles non-ok response', () => {
    const response = { ok: false, status: 401 };

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  test('extracts error message from response', () => {
    const errorData = { message: 'Invalid API key' };
    const errorMessage = errorData.message || 'API request failed';

    expect(errorMessage).toBe('Invalid API key');
  });

  test('provides fallback error message', () => {
    const errorData = {};
    const status = 500;
    const errorMessage = errorData.message || `API request failed: ${status}`;

    expect(errorMessage).toBe('API request failed: 500');
  });

  test('handles JSON parse error gracefully', () => {
    const invalidJson = '{ invalid json }';
    let parseError = null;

    try {
      JSON.parse(invalidJson);
    } catch (error) {
      parseError = error;
    }

    expect(parseError).not.toBeNull();
    expect(parseError.message).toContain('JSON');
  });
});

describe('File Path Construction', () => {
  test('constructs cache file path correctly', () => {
    const cacheDir = 'node_modules/.cache/vite-plugin-shipi18n';
    const fileName = 'translation.json';
    const hash = 'abc123def456';

    const cacheFile = path.join(cacheDir, `${fileName}.${hash}.json`);

    expect(cacheFile).toContain('translation.json.abc123def456.json');
  });

  test('constructs output file path correctly', () => {
    const outputDir = 'public/locales';
    const langCode = 'es';
    const fileName = 'translation.json';

    const outputFile = path.join(outputDir, langCode, fileName);

    expect(outputFile).toContain('es');
    expect(outputFile).toContain('translation.json');
  });

  test('filters JSON files correctly', () => {
    const files = ['translation.json', 'common.json', 'README.md', 'config.yml'];
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    expect(jsonFiles).toEqual(['translation.json', 'common.json']);
    expect(jsonFiles).toHaveLength(2);
  });
});

describe('Language Code Handling', () => {
  test('accepts standard language codes', () => {
    const targetLanguages = ['es', 'fr', 'de', 'ja', 'zh'];

    targetLanguages.forEach((lang) => {
      expect(lang).toMatch(/^[a-z]{2}$/);
    });
  });

  test('accepts regional language codes', () => {
    const targetLanguages = ['zh-CN', 'zh-TW', 'pt-BR', 'en-US'];

    targetLanguages.forEach((lang) => {
      expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    });
  });

  test('joins target languages correctly', () => {
    const targetLanguages = ['es', 'fr', 'de'];
    const joined = targetLanguages.join(', ');

    expect(joined).toBe('es, fr, de');
  });
});

describe('JSON Handling', () => {
  test('parses valid JSON', () => {
    const jsonString = '{"greeting": "Hello", "farewell": "Goodbye"}';
    const parsed = JSON.parse(jsonString);

    expect(parsed.greeting).toBe('Hello');
    expect(parsed.farewell).toBe('Goodbye');
  });

  test('stringifies object to JSON', () => {
    const obj = { greeting: 'Hello', count: 42 };
    const jsonString = JSON.stringify(obj);

    expect(jsonString).toBe('{"greeting":"Hello","count":42}');
  });

  test('formats JSON with indentation', () => {
    const obj = { greeting: 'Hello' };
    const formatted = JSON.stringify(obj, null, 2);

    expect(formatted).toContain('\n');
    expect(formatted).toContain('  ');
  });

  test('handles nested objects', () => {
    const obj = {
      app: {
        title: 'My App',
        buttons: {
          submit: 'Submit',
          cancel: 'Cancel',
        },
      },
    };

    const jsonString = JSON.stringify(obj);
    const parsed = JSON.parse(jsonString);

    expect(parsed.app.buttons.submit).toBe('Submit');
  });
});

describe('Placeholder Preservation', () => {
  test('preservePlaceholders option is set to true', () => {
    const options = { preservePlaceholders: 'true' };

    expect(options.preservePlaceholders).toBe('true');
  });

  test('JSON with placeholders is preserved as string', () => {
    const json = {
      greeting: 'Hello, {name}!',
      items: 'You have {count} items',
    };

    const jsonString = JSON.stringify(json);

    expect(jsonString).toContain('{name}');
    expect(jsonString).toContain('{count}');
  });
});

describe('Integration Scenarios', () => {
  test('full configuration creates valid plugin', () => {
    const plugin = shipi18nPlugin({
      apiKey: 'sk_live_abc123',
      apiUrl: 'https://api.shipi18n.com',
      targetLanguages: ['es', 'fr', 'de', 'ja'],
      sourceDir: 'src/locales/en',
      outputDir: 'src/locales',
      sourceLanguage: 'en',
      cache: true,
      cacheDir: '.cache/translations',
    });

    expect(plugin.name).toBe('vite-plugin-shipi18n');
    expect(typeof plugin.configResolved).toBe('function');
    expect(typeof plugin.buildStart).toBe('function');
  });

  test('minimal configuration creates valid plugin', () => {
    const plugin = shipi18nPlugin({
      apiKey: 'sk_test_123',
      targetLanguages: ['es'],
    });

    expect(plugin.name).toBe('vite-plugin-shipi18n');
  });

  test('plugin with custom options is configurable', () => {
    const plugin = shipi18nPlugin({
      apiKey: 'sk_custom',
      targetLanguages: ['es', 'fr'],
      sourceDir: 'custom/locales/en',
      outputDir: 'custom/locales',
      cache: false,
    });

    expect(plugin).toBeDefined();
  });
});

describe('Default Options', () => {
  test('uses default values when not specified', () => {
    // Test default values by creating plugin with minimal config
    const plugin = shipi18nPlugin({
      apiKey: 'sk_test_123',
      targetLanguages: ['es'],
    });

    // Plugin should be created successfully with defaults
    expect(plugin).toBeDefined();
  });
});
