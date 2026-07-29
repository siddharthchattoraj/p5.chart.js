export default [
  {
    files: ['src/**/*.js', 'tests/**/*.js', 'scripts/**/*.mjs', '*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        WheelEvent: 'readonly',
        console: 'readonly',
        document: 'readonly',
        globalThis: 'readonly',
        location: 'readonly',
        p5: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly'
      }
    },
    rules: {
      'no-constant-condition': 'error',
      'no-redeclare': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error'
    }
  }
];
