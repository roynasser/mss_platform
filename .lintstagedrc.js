module.exports = {
  // TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
    'git add'
  ],

  // JSON, YAML, and Markdown files
  '*.{json,yml,yaml,md}': [
    'prettier --write',
    'git add'
  ],

  // CSS and styling files
  '*.{css,scss,sass,less}': [
    'prettier --write',
    'git add'
  ],

  // Only run type check on TypeScript files in packages and apps
  'apps/**/*.{ts,tsx}': () => 'npm run type-check --workspace=apps/frontend --workspace=apps/api',
  'packages/**/*.{ts,tsx}': () => 'npm run type-check --workspace=packages/*',

  // Run tests for changed test files
  '**/*.{test,spec}.{ts,tsx,js,jsx}': () => 'npm run test -- --findRelatedTests --passWithNoTests',

  // Security check for package.json changes
  'package.json': [
    'npm audit --audit-level high',
    'git add'
  ],

  // Dockerfile linting
  'Dockerfile*': [
    'docker run --rm -i hadolint/hadolint < ',
  ],
};