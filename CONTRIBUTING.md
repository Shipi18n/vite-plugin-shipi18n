# Contributing to vite-plugin-shipi18n

Thank you for your interest in contributing to vite-plugin-shipi18n! This document provides guidelines and instructions for contributing.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (OS, Node version, Vite version)
- Vite config and plugin options
- Build output or error messages

### Suggesting Enhancements

We welcome suggestions for new features or improvements! Please create an issue with:

- A clear description of the enhancement
- Why this would be useful
- Example use cases
- Any implementation ideas

### Pull Requests

1. **Fork the repository** and create your branch from `main`

```bash
git checkout -b feature/my-new-feature
```

2. **Make your changes**

   - Follow the existing code style
   - Add JSDoc comments for functions
   - Update documentation if needed

3. **Test your changes**

```bash
npm install
npm test
```

4. **Commit your changes**

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add support for watch mode"
```

5. **Push to your fork**

```bash
git push origin feature/my-new-feature
```

6. **Open a Pull Request**

   - Describe what your PR does
   - Reference any related issues
   - Include examples of usage

## Code Style Guidelines

### JavaScript/Node.js

- Use ES modules (`import`/`export`)
- Use clear, descriptive variable names
- Add JSDoc comments for functions
- Handle errors gracefully
- Follow Vite plugin conventions

**Example:**

```javascript
/**
 * Transform locale files at build time
 * @param {Object} options - Plugin options
 * @param {string} options.apiKey - Shipi18n API key
 * @param {string[]} options.targetLanguages - Target languages
 * @returns {Object} Vite plugin object
 */
export default function shipi18nPlugin(options = {}) {
  return {
    name: 'vite-plugin-shipi18n',

    async buildStart() {
      // Plugin logic
    }
  }
}
```

### Plugin Design

- Follow Vite plugin conventions
- Use plugin hooks appropriately
- Provide clear error messages
- Support both development and production modes
- Cache translations when possible

### File Organization

```
vite-plugin-shipi18n/
├── src/
│   └── index.js         # Main plugin
└── __tests__/           # Jest tests
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm
- Vite 4.x or 5.x
- A Shipi18n API key (for testing)

### Local Development

1. Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/vite-plugin-shipi18n.git
cd vite-plugin-shipi18n
```

2. Install dependencies

```bash
npm install
```

3. Link locally for testing

```bash
npm link
```

4. Test in a Vite project

```bash
cd /path/to/your/vite/project
npm link vite-plugin-shipi18n
```

## Testing

Before submitting a PR:

1. Run the full test suite

```bash
npm test
```

2. Test the plugin manually in a Vite project

```javascript
// vite.config.js
import shipi18nPlugin from 'vite-plugin-shipi18n'

export default {
  plugins: [
    shipi18nPlugin({
      apiKey: process.env.SHIPI18N_API_KEY,
      sourceDir: './locales',
      targetLanguages: ['es', 'fr']
    })
  ]
}
```

3. Test both development and production builds
4. Verify error handling
5. Check performance with large locale files

### Writing Tests

We use Jest for testing. Example test:

```javascript
import shipi18nPlugin from '../src/index.js'

describe('vite-plugin-shipi18n', () => {
  it('should create a valid Vite plugin', () => {
    const plugin = shipi18nPlugin({ apiKey: 'test' })
    expect(plugin.name).toBe('vite-plugin-shipi18n')
  })

  it('should validate required options', () => {
    expect(() => shipi18nPlugin()).toThrow('API key is required')
  })
})
```

## Documentation

If you add new features:

- Update README.md with usage examples
- Add JSDoc comments to functions
- Document new plugin options
- Include configuration examples

## Vite Plugin Best Practices

- Use appropriate plugin hooks (`buildStart`, `buildEnd`, `transform`, etc.)
- Don't block the build process unnecessarily
- Provide helpful error messages
- Support both ESM and CJS if possible
- Cache API responses to avoid redundant calls

## Questions?

- Open an issue for questions
- Check existing issues and PRs
- Read the [Vite plugin docs](https://vitejs.dev/guide/api-plugin.html)
- Read the [Shipi18n documentation](https://shipi18n.com/docs)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Keep discussions focused and professional

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to vite-plugin-shipi18n! 🎉
