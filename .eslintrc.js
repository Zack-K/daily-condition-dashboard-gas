module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  extends: ['eslint:recommended', 'prettier'],
  overrides: [
    {
      files: ['*.gs'],
      plugins: ['googleappsscript'],
      env: {
        'googleappsscript/googleappsscript': true,
      },
      rules: {
        'no-unused-vars': [
          'error',
          {
            varsIgnorePattern:
              '^(doGet|doPost|include|getDashboardData|updateRecord|.*_)$',
          },
        ],
      },
    },
    {
      files: ['*.html'],
      plugins: ['html'],
      env: {
        browser: true,
        es2022: true,
      },
      globals: {
        google: 'readonly',
        Chart: 'readonly',
      },
      rules: {
        'no-unused-vars': [
          'error',
          { varsIgnorePattern: '^(fetchData|update.*|draw.*|filter.*)$' },
        ],
      },
    },
    {
      files: ['tests/**/*.js', 'playwright.config.js'],
      env: {
        node: true,
      },
    },
  ],
};
