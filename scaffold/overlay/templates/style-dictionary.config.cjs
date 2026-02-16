/**
 * Style Dictionary configuration for token pipeline.
 *
 * Reads DTCG-aligned JSON token files and outputs:
 * - CSS custom properties (core.css)
 * - Tailwind v4 @theme block
 * - TypeScript token map (optional)
 *
 * Usage:
 *   npx style-dictionary build --config style-dictionary.config.cjs
 */

const StyleDictionary = require('style-dictionary');

module.exports = {
  source: ['src/styles/tokens/**/*.json'],

  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/tokens/',
      prefix: 'token',
      files: [
        {
          destination: 'design-tokens.css',
          format: 'css/variables',
          options: {
            outputReferences: true,
          },
        },
      ],
    },

    // TypeScript token map (optional)
    ts: {
      transformGroup: 'js',
      buildPath: 'src/styles/tokens/',
      files: [
        {
          destination: 'tokens.ts',
          format: 'javascript/es6',
        },
      ],
    },
  },
};
