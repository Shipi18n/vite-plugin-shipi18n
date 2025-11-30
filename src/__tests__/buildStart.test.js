/**
 * Integration tests for buildStart hook
 * Tests the full translation flow with real fs operations in a temp directory
 */

import { jest } from '@jest/globals';
import shipi18nPlugin from '../index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock fetch globally
const originalFetch = global.fetch;
let mockFetchResponse = {};

beforeAll(() => {
  global.fetch = async (url, options) => {
    if (mockFetchResponse.error) {
      throw mockFetchResponse.error;
    }

    return {
      ok: mockFetchResponse.ok !== false,
      status: mockFetchResponse.status || 200,
      json: async () => mockFetchResponse.data || {},
    };
  };
});

afterAll(() => {
  global.fetch = originalFetch;
});

// Suppress console output during tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('buildStart hook', () => {
  let tempDir;
  let sourceDir;
  let outputDir;
  let cacheDir;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipi18n-test-'));
    sourceDir = path.join(tempDir, 'locales', 'en');
    outputDir = path.join(tempDir, 'locales');
    cacheDir = path.join(tempDir, '.cache');

    // Create source directory
    fs.mkdirSync(sourceDir, { recursive: true });

    // Reset mock response
    mockFetchResponse = {
      ok: true,
      data: {
        translations: {
          es: { greeting: 'Hola' },
          fr: { greeting: 'Bonjour' },
        },
      },
    };
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const createPlugin = (options = {}) => {
    const plugin = shipi18nPlugin({
      apiKey: 'sk_test_123',
      targetLanguages: ['es', 'fr'],
      sourceDir: path.relative(tempDir, sourceDir),
      outputDir: path.relative(tempDir, outputDir),
      cacheDir: path.relative(tempDir, cacheDir),
      ...options,
    });
    plugin.configResolved({ root: tempDir });
    return plugin;
  };

  test('exits early when source directory does not exist', async () => {
    // Remove source directory
    fs.rmSync(sourceDir, { recursive: true });

    const plugin = createPlugin();
    await plugin.buildStart();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Source directory not found')
    );
  });

  test('exits early when no JSON files found', async () => {
    // Create non-JSON file
    fs.writeFileSync(path.join(sourceDir, 'README.md'), 'readme');

    const plugin = createPlugin();
    await plugin.buildStart();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('No JSON files found')
    );
  });

  test('translates files and writes output', async () => {
    // Create source file
    fs.writeFileSync(
      path.join(sourceDir, 'translation.json'),
      JSON.stringify({ greeting: 'Hello' })
    );

    const plugin = createPlugin({ cache: false });
    await plugin.buildStart();

    // Check output files were created
    const esOutput = path.join(outputDir, 'es', 'translation.json');
    const frOutput = path.join(outputDir, 'fr', 'translation.json');

    expect(fs.existsSync(esOutput)).toBe(true);
    expect(fs.existsSync(frOutput)).toBe(true);

    const esContent = JSON.parse(fs.readFileSync(esOutput, 'utf-8'));
    expect(esContent.greeting).toBe('Hola');
  });

  test('creates cache file when caching enabled', async () => {
    fs.writeFileSync(
      path.join(sourceDir, 'translation.json'),
      JSON.stringify({ greeting: 'Hello' })
    );

    const plugin = createPlugin({ cache: true });
    await plugin.buildStart();

    // Check cache directory exists
    expect(fs.existsSync(cacheDir)).toBe(true);

    // Check cache file was created
    const cacheFiles = fs.readdirSync(cacheDir);
    expect(cacheFiles.length).toBeGreaterThan(0);
    expect(cacheFiles[0]).toContain('translation.json');
  });

  test('uses cached translations on second run', async () => {
    fs.writeFileSync(
      path.join(sourceDir, 'translation.json'),
      JSON.stringify({ greeting: 'Hello' })
    );

    const plugin = createPlugin({ cache: true });

    // First run - should call API
    await plugin.buildStart();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Translating to')
    );

    // Reset console mocks
    console.log.mockClear();

    // Second run - should use cache
    await plugin.buildStart();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Using cached translations')
    );
  });

  test('handles JSON parse error in source file', async () => {
    fs.writeFileSync(
      path.join(sourceDir, 'invalid.json'),
      '{ invalid json }'
    );

    const plugin = createPlugin();
    await plugin.buildStart();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error parsing')
    );
  });

  test('handles API error with fallback to source', async () => {
    fs.writeFileSync(
      path.join(sourceDir, 'translation.json'),
      JSON.stringify({ greeting: 'Hello' })
    );

    mockFetchResponse = {
      ok: false,
      status: 500,
      data: { message: 'Server error' },
    };

    const plugin = createPlugin({
      cache: false,
      fallback: { fallbackToSource: true },
    });
    await plugin.buildStart();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Translation failed')
    );

    // Should still write files with source content as fallback
    const esOutput = path.join(outputDir, 'es', 'translation.json');
    expect(fs.existsSync(esOutput)).toBe(true);

    const esContent = JSON.parse(fs.readFileSync(esOutput, 'utf-8'));
    expect(esContent.greeting).toBe('Hello'); // source content
  });

  test('skips writing on API error when fallback disabled', async () => {
    fs.writeFileSync(
      path.join(sourceDir, 'translation.json'),
      JSON.stringify({ greeting: 'Hello' })
    );

    mockFetchResponse = {
      ok: false,
      status: 500,
      data: { message: 'Server error' },
    };

    const plugin = createPlugin({
      cache: false,
      fallback: { fallbackToSource: false },
    });
    await plugin.buildStart();

    // Should not create output files
    const esOutput = path.join(outputDir, 'es', 'translation.json');
    expect(fs.existsSync(esOutput)).toBe(false);
  });

  test('processes multiple JSON files', async () => {
    fs.writeFileSync(
      path.join(sourceDir, 'translation.json'),
      JSON.stringify({ greeting: 'Hello' })
    );
    fs.writeFileSync(
      path.join(sourceDir, 'common.json'),
      JSON.stringify({ button: 'Click' })
    );

    mockFetchResponse = {
      ok: true,
      data: {
        translations: {
          es: { greeting: 'Hola', button: 'Clic' },
          fr: { greeting: 'Bonjour', button: 'Cliquer' },
        },
      },
    };

    const plugin = createPlugin({ cache: false });
    await plugin.buildStart();

    // Check both files were created for each language
    expect(fs.existsSync(path.join(outputDir, 'es', 'translation.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'es', 'common.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'fr', 'translation.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'fr', 'common.json'))).toBe(true);
  });

  test('logs regional fallback when used', async () => {
    fs.writeFileSync(
      path.join(sourceDir, 'translation.json'),
      JSON.stringify({ greeting: 'Hello' })
    );

    // Return pt but not pt-BR
    mockFetchResponse = {
      ok: true,
      data: {
        translations: {
          pt: { greeting: 'Olá' },
        },
      },
    };

    const plugin = createPlugin({
      cache: false,
      targetLanguages: ['pt-BR'],
      fallback: { regionalFallback: true },
    });
    await plugin.buildStart();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('regional fallback')
    );
  });

  test('handles corrupted cache file', async () => {
    fs.writeFileSync(
      path.join(sourceDir, 'translation.json'),
      JSON.stringify({ greeting: 'Hello' })
    );

    // Create cache directory and corrupted cache file
    fs.mkdirSync(cacheDir, { recursive: true });
    const cacheFile = path.join(cacheDir, 'translation.json.somehash.json');
    fs.writeFileSync(cacheFile, '{ corrupted json }');

    // Create plugin with same content hash (tricky - we'll just test cache corruption path)
    const sourceContent = JSON.stringify({ greeting: 'Hello' });
    const crypto = await import('crypto');
    const hash = crypto.createHash('md5')
      .update(sourceContent + ['es', 'fr'].join(','))
      .digest('hex');

    // Write corrupted cache with correct hash
    const correctCacheFile = path.join(cacheDir, `translation.json.${hash}.json`);
    fs.writeFileSync(correctCacheFile, '{ corrupted }');

    const plugin = createPlugin({ cache: true });
    await plugin.buildStart();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Cache corrupted')
    );
  });
});

describe('API request format', () => {
  let tempDir;
  let sourceDir;
  let lastFetchCall;

  beforeAll(() => {
    global.fetch = async (url, options) => {
      lastFetchCall = { url, options };
      return {
        ok: true,
        json: async () => ({
          translations: { es: { greeting: 'Hola' } },
        }),
      };
    };
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipi18n-test-'));
    sourceDir = path.join(tempDir, 'locales', 'en');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(
      path.join(sourceDir, 'translation.json'),
      JSON.stringify({ greeting: 'Hello' })
    );
    lastFetchCall = null;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('sends correct request to API', async () => {
    const plugin = shipi18nPlugin({
      apiKey: 'sk_test_abc',
      apiUrl: 'https://api.test.com',
      targetLanguages: ['es'],
      sourceLanguage: 'en',
      sourceDir: path.relative(tempDir, sourceDir),
      outputDir: path.relative(tempDir, path.join(tempDir, 'locales')),
      cache: false,
    });
    plugin.configResolved({ root: tempDir });

    await plugin.buildStart();

    expect(lastFetchCall.url).toBe('https://api.test.com/api/translate');
    expect(lastFetchCall.options.method).toBe('POST');
    expect(lastFetchCall.options.headers['X-API-Key']).toBe('sk_test_abc');
    expect(lastFetchCall.options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(lastFetchCall.options.body);
    expect(body.inputMethod).toBe('json');
    expect(body.sourceLanguage).toBe('en');
    expect(body.preservePlaceholders).toBe('true');
  });
});
