# MoneyZent API

A personal finance management REST API built with NestJS and PostgreSQL. Track expenses, manage accounts, categorize transactions, and generate financial reports.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | [NestJS](https://nestjs.com/) 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL 17 |
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

## Getting Started

### Prerequisites

- Node.js 24 LTS
- PostgreSQL 17
- npm 

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the project root, Reference .env.example 

## Database

### Schema Overview

See [Data Model](docs/database/data-model.md) for the complete entity relationship diagram.

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

```

## Documentation

Detailed documentation is available in the `/docs` directory:

## License

UNLICENSED — Private repository
