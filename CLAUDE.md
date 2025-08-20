# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS backend application for the KAIA project, built with TypeScript. The project uses pnpm as the package manager and follows standard NestJS architectural patterns.

## Essential Commands

### Development
- `pnpm install` - Install dependencies
- `pnpm run start:dev` - Start development server with hot reload
- `pnpm run start:debug` - Start with debugging enabled
- `pnpm run build` - Build the application for production
- `pnpm run start:prod` - Run production build

### Code Quality
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier

### Testing
- `pnpm run test` - Run unit tests
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:cov` - Run tests with coverage report
- `pnpm run test:e2e` - Run end-to-end tests
- `pnpm run test:debug` - Run tests with debugging

## Architecture

### Project Structure
- `src/` - Main application source code
  - `main.ts` - Application entry point (runs on port 3000)
  - `app.module.ts` - Root application module
  - `app.controller.ts` - Main application controller
  - `app.service.ts` - Main application service
- `test/` - End-to-end test files
- `dist/` - Compiled JavaScript output (generated)

### Technology Stack
- **Framework**: NestJS with Express platform
- **Language**: TypeScript (target ES2021)
- **Testing**: Jest for unit tests, Supertest for E2E
- **Code Quality**: ESLint + Prettier with TypeScript rules
- **Build**: Standard NestJS CLI build process

### Development Configuration
- **TypeScript**: Decorators enabled, strict checks mostly disabled for development flexibility
- **ESLint**: TypeScript recommended rules with Prettier integration
- **Prettier**: Single quotes, trailing commas enforced
- **Jest**: Configured for both unit tests (`src/`) and E2E tests (`test/`)

### Module Pattern
The application follows NestJS's module-based architecture where:
- Modules organize related functionality
- Controllers handle HTTP requests
- Services contain business logic
- Providers are injectable dependencies

When adding new features, create modules in `src/` following the pattern:
```
feature/
├── feature.module.ts
├── feature.controller.ts
├── feature.service.ts
└── feature.controller.spec.ts
```

### Key Development Notes
- Port 3000 is the default development server port
- The application uses CommonJS modules
- Source maps are enabled for debugging
- Hot reload is available in development mode
- ESLint rules are relaxed for `explicit-any` and function return types to allow rapid development