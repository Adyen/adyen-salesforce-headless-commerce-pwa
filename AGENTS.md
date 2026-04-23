# AGENTS.md

## Project Overview

Adyen Payments Integration for Salesforce Composable Storefront (PWA).
Monorepo with an NPM package, a reference retail app, Playwright E2E tests, and an SFCC cartridge.

## Repository Structure

- `packages/adyen-salesforce-pwa/` - Core NPM package (`@adyen/adyen-salesforce-pwa`): React components, hooks, API routes/controllers/models, services, and utilities
- `packages/adyen-retail-react-app/` - Reference Salesforce Retail React App demonstrating integration (not for production use)
- `packages/e2e-tests/` - Playwright E2E tests
- `packages/int_adyen_PWA/` - SFCC cartridge (server-side hooks)
- `metadata/` - SFCC site import metadata
- `.github/workflows/` - CI/CD pipelines

## Tech Stack

- **Language**: JavaScript (no TypeScript)
- **Framework**: React 18, Salesforce PWA Kit 3.x
- **Bundler**: Webpack 5
- **Unit Tests**: Jest 29 + Testing Library
- **E2E Tests**: Playwright
- **Lint**: ESLint + Prettier
- **Code Quality**: SonarQube (runs on every PR)
- **Package Manager**: npm

## Key Commands

### adyen-salesforce-pwa (core package)
- `npm test` - Run unit tests (Jest)
- `npm run test:coverage` - Unit tests with coverage
- `npm run lint` - Lint
- `npm run lint:fix` - Auto-fix lint
- `npm run build-dev` / `npm run build-prod` - Build
- `npm run format` - Prettier format

### adyen-retail-react-app (reference app)
- `npm start` - Dev server (port 3000)
- `npm test` - Tests
- `npm run build` - Production build
- `npm run lint` - Lint

### e2e-tests
- `npm test` - Playwright headless
- `npm run test-headed` - Playwright headed

## Coding Conventions

- JavaScript only, ESLint + Prettier enforced
- Components: `lib/components/`, hooks: `lib/hooks/`, services: `lib/services/`, utils: `lib/utils/`
- API layer: `lib/api/` (controllers, models, helpers, middleware, routes, utils)
- New public APIs must be exported from `lib/index.js`
- Unit tests in `tests/` subdirectories adjacent to source (e.g. `lib/services/tests/`)
- Test naming: `<module>.test.js` (unit), `<feature>.spec.js` (E2E)
- Coverage thresholds: 85% global, 70% per lib file

## CI/CD

- **SonarQube** (`sonar.yml`): lint + test + coverage on every PR
- **E2E** (`e2e.yml`): Playwright on PRs to `main`/`develop` (skips renovate branches)
- **Deploy Storefront** (`deploy-storefront.yml`): builds cartridge, uploads metadata, deploys retail app on PRs
- **NPM Publish** (`npm-publish.yml`): manual dispatch or weekly Monday schedule

## Environment & Secrets

- `.env` files hold config (never commit real credentials)
- `.env.example` is the template
- Key vars: `ADYEN_API_KEY`, `ADYEN_CLIENT_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_ENVIRONMENT`
- Salesforce: `COMMERCE_API_CLIENT_ID`, `COMMERCE_API_ORG_ID`, `SCAPI_URL`, `OCAPI_URL`

## Branching & Commits

- `main` = production, `develop` = active development
- Feature branches: `feature/sfi-XXXX-description`
- Conventional Commits enforced by commitlint
