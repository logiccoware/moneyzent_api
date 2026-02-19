# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moneyzent API — a personal finance REST API built with NestJS 11, TypeScript 5, and PostgreSQL 17. Deployed in Render. Authentication is session-based using Better Auth (not NextAuth).

## Commands

```bash
# Development
npm run dev                    # Start local server (ts-node, port 3000)
npm run build                  # NestJS compile 

# Linting & Formatting (Biome)
npm run lint                   # Check lint errors
npm run lint:fix               # Auto-fix lint errors
npm run format                 # Format all files

# Testing (Jest)
npm run test                   # Run unit tests
npm run test:watch             # Watch mode
npm run test:cov               # Coverage report
npm run test:e2e               # E2E tests (test/jest-e2e.json config)

# Run a single test file
npx jest path/to/file.spec.ts

# Database Migrations (TypeORM)
npm run migration:generate -- src/migrations/<MigrationName>
npm run migration:run          # Run pending migrations
npm run migration:revert       # Revert last migration
```

## Architecture

### Module Structure

Each feature module lives under `src/modules/<feature>/` with: module, controller, service, entity, and `dto/req/` + `dto/res/` directories for Zod schemas.

**Feature modules:** account, auth, category, payee, report, tag, transaction

**Infrastructure modules:** database (TypeORM config + seeders), auth (guards, decorators)

**Common code** in `src/common/`: config (env validation, Swagger), constants (entity name map), entities (BaseEntity with audit timestamps), exceptions (BaseException hierarchy), filters (BaseExceptionFilter + AllExceptionsFilter), pipes (ZodValidationPipe), schema (shared Zod schemas).

### Authentication

Better Auth handles all `/auth/*` routes outside of NestJS. Within NestJS:
- `AuthGuard` is applied globally — all routes require authentication by default
- `@AllowAnonymous()` — marks a route as public
- `@OptionalAuth()` — auth is optional, session may be null
- `@Session()` — parameter decorator to extract the user session

### Database

PostgreSQL with TypeORM. All entities extend `BaseEntity` (created_at, updated_at, deleted_at). UUID primary keys. Soft deletes via `deleted_at`. Partial indexes exclude soft-deleted rows. Denormalized fields on transactions (payee_name, account_name) kept in sync by database triggers. Migrations in `src/migrations/`.

### Validation & DTOs

Zod schemas define request/response shapes. Request validation uses `ZodValidationPipe` in controller parameter decorators. Response data is always passed through `Schema.parse()` before returning. Schema naming: `<Feature><Action>DtoReqSchema`, type: `T<SchemaName>`.

### Exception Handling

Custom exceptions extend `BaseException` (which sets statusCode). Two global filters process errors: `BaseExceptionFilter` for domain exceptions, `AllExceptionsFilter` as catch-all. Use `ENTITY` constants from `@/common/constants` when constructing `EntityNotFound` errors.

### Deployment

TBD

## Code Conventions

- **Imports:** Use `@/` path alias for all absolute imports (maps to `src/`). Never use relative paths across module boundaries.
- **Formatting:** Biome — tabs, double quotes, auto-organized imports. Unsafe parameter decorators enabled for NestJS.
- **Naming:** Files are `kebab-case` with type suffix (`.service.ts`, `.entity.ts`). Classes are `PascalCase` with suffix. Private methods prefixed with `_`. DB columns are `snake_case`, entity fields are `camelCase`.
- **Controllers:** Thin — delegate all logic to services. Use explicit `@HttpCode()` decorators (201 for POST, 204 for DELETE).
- **Services:** All queries scoped to `userId`. Use `DataSource.transaction()` for multi-table writes.
- **Entities:** Column decorator must specify `name` in snake_case and `type`. Use `softDelete()` not `delete()`.

Full style guide: `docs/CODE_STYLE.md`

## Environment Variables

Copy `.env.example` to `.env`. Key variables: `APP_ENV`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`. Swagger is behind basic auth — set `SWAGGER_ENABLED`, `SWAGGER_BASIC_AUTH_USER`, `SWAGGER_BASIC_AUTH_PASS`.
