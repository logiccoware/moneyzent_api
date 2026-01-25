# MoneyZent API

A personal finance management REST API built with NestJS and PostgreSQL. Track expenses, manage accounts, categorize transactions, and generate financial reports.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | [NestJS](https://nestjs.com/) 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL 15+ |
| ORM | [TypeORM](https://typeorm.io/) |
| Authentication | [Better Auth](https://www.better-auth.com/) |
| Validation | [Zod](https://zod.dev/) |
| Logging | [Pino](https://getpino.io/) |
| Linting/Formatting | [Biome](https://biomejs.dev/) |

## Features

### Core Features

- **Financial Accounts** — Manage bank accounts with multi-currency support (USD, CAD, INR)
- **Transactions** — Track income and expenses with split categories and line items
- **Categories** — Hierarchical categorization with parent/subcategory structure (2 levels max)
- **Payees** — Manage transaction recipients/sources
- **Tags** — Flexible tagging system for line items with automatic usage tracking
- **Reports** — Spending analytics with pie chart data by payee or category

### Technical Features

- Session-based authentication with Better Auth
- Soft delete for data recovery and audit compliance
- Denormalized fields for optimized read performance
- Database triggers for automatic data synchronization
- UUID primary keys for security
- Comprehensive validation with Zod schemas

## Project Structure

```
src/
├── main.ts                           # Application entry point
├── data-source.ts                    # TypeORM data source configuration
├── lib/
│   └── auth.ts                       # Better Auth configuration
├── common/
│   ├── config/                       # Environment configuration (Zod schema)
│   ├── constants/                    # Application constants
│   ├── decorators/                   # Custom decorators (@CurrentUser, @Public)
│   ├── entities/                     # Shared TypeORM entities
│   ├── exceptions/                   # Custom exceptions
│   ├── filters/                      # Exception filters
│   ├── guards/                       # Auth guards
│   ├── pipes/                        # Validation pipes (ZodValidationPipe)
│   └── schema/                       # Shared Zod schemas
├── modules/
│   ├── app.module.ts                 # Root module
│   ├── app.controller.ts             # Health check endpoint
│   ├── auth/                         # Authentication module (Better Auth integration)
│   ├── database/                     # Database module (TypeORM)
│   ├── account/                      # Financial accounts CRUD
│   ├── category/                     # Categories with hierarchy
│   ├── payee/                        # Payees CRUD
│   ├── tag/                          # Tags with usage tracking
│   ├── transaction/                  # Transactions with splits & line items
│   └── report/                       # Spending reports
└── migrations/                       # TypeORM migrations
```

## Getting Started

### Prerequisites

- Node.js 24 LTS
- PostgreSQL 15+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Application
APP_ENV=development
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/monovra
DATABASE_POOL_SIZE=10

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-minimum-32-characters
BETTER_AUTH_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:3001
```

| Variable | Description | Required |
|----------|-------------|----------|
| `APP_ENV` | Environment: `development`, `production`, `test` | No (default: `development`) |
| `PORT` | Server port | No (default: `3000`) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `DATABASE_POOL_SIZE` | Database connection pool size | No (default: `10`) |
| `BETTER_AUTH_SECRET` | Secret key for session encryption (min 32 chars) | Yes |
| `BETTER_AUTH_URL` | Base URL for authentication | Yes |
| `CORS_ORIGIN` | Allowed CORS origin | Yes |

## Database

### Schema Overview

All tables use the **`public`** schema, including authentication tables (user, session, account, verification) and application tables (financial_account, payee, category, tag, transaction, etc.).

See [Data Model](docs/database/data-model.md) for the complete entity relationship diagram.

### Migrations

```bash
# Generate a new migration
npm run migration:generate src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## API Reference

All endpoints (except `/auth/*` and `/health`) require authentication.

**Authentication Header:**
```
Authorization: Bearer <session_token>
```

### Endpoints

| Resource | Base Path | Description |
|----------|-----------|-------------|
| Authentication | `/auth` | Sign up, sign in, sessions, password reset |
| Accounts | `/accounts` | Financial account management |
| Payees | `/payees` | Transaction payee management |
| Categories | `/categories` | Hierarchical category management |
| Tags | `/tags` | Tag management with usage tracking |
| Transactions | `/transactions` | Transactions with splits and line items |
| Reports | `/reports` | Spending analytics and charts |

### Quick Reference

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/sign-up` | Register new user |
| POST | `/auth/sign-in` | Authenticate user |
| POST | `/auth/sign-out` | Terminate session |
| GET | `/auth/session` | Get current session |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Complete password reset |

#### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts` | List all accounts |
| POST | `/accounts` | Create account |
| GET | `/accounts/:id` | Get account |
| PATCH | `/accounts/:id` | Update account |
| DELETE | `/accounts/:id` | Delete account |

#### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List categories (flat) |
| GET | `/categories/tree` | Get category tree |
| POST | `/categories` | Create parent category |
| POST | `/categories/subcategory` | Create subcategory |
| GET | `/categories/:id` | Get category |
| PATCH | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |

#### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions/filter` | Get filtered transactions (grouped by date) |
| GET | `/transactions/latest` | Get latest transaction by payee |
| GET | `/transactions/:id` | Get transaction |
| POST | `/transactions` | Create transaction |
| PATCH | `/transactions/:id` | Update transaction |
| DELETE | `/transactions/:id` | Delete transaction |

#### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/spendings/payees` | Spending by payee (with pie chart data) |
| GET | `/reports/spendings/categories` | Spending by category (with tree and pie chart) |

### Data Conventions

**Amounts**: All monetary amounts are in **cents** (integer):
| Display | API Value |
|---------|-----------|
| $150.50 | `15050` |
| $1,000.00 | `100000` |

**Dates**: ISO 8601 format: `2025-01-15T00:00:00.000Z`

**IDs**: UUIDs: `550e8400-e29b-41d4-a716-446655440000`

## Development

### Available Scripts

```bash
# Development
npm run start             # Start server
npm run start:dev         # Start in watch mode
npm run start:debug       # Start with debugger
npm run start:prod        # Start production build

# Build
npm run build             # Build the project

# Code Quality
npm run lint              # Run Biome linter with auto-fix
npm run format            # Run Biome formatter

# Database
npm run migration:generate <path>  # Generate migration
npm run migration:run              # Run migrations
npm run migration:revert           # Revert last migration

# Testing
npm run test              # Run unit tests
npm run test:watch        # Run tests in watch mode
npm run test:cov          # Run tests with coverage
npm run test:e2e          # Run e2e tests
```

### Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

- Tab indentation
- Double quotes for strings
- Organized imports

Run `npm run lint` and `npm run format` before committing.

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

## Documentation

Detailed documentation is available in the `/docs` directory:

### API Reference
- [Authentication](docs/api/authentication.md) — User registration, login, sessions
- [Accounts](docs/api/accounts.md) — Financial account endpoints
- [Categories](docs/api/categories.md) — Category hierarchy endpoints
- [Payees](docs/api/payees.md) — Payee endpoints
- [Tags](docs/api/tags.md) — Tag endpoints
- [Transactions](docs/api/transactions.md) — Transaction endpoints
- [Reports](docs/api/reports.md) — Report endpoints

### Database
- [Data Model](docs/database/data-model.md) — Entity relationship diagram (Mermaid)
- [PostgreSQL Schema](docs/database/postgresql-schema.md) — Complete database DDL
- [Entity Relationships](docs/database/entity-relationship.md) — Detailed relationship documentation

### Migration Guide
- [Firestore to PostgreSQL](docs/migration/firestore-to-postgresql.md) — Migration from Firebase

## Error Handling

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |

## License

UNLICENSED — Private repository
