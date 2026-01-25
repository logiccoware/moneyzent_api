# Code Style & Best Practices

This document outlines the coding conventions, patterns, and best practices used in the Monovra API codebase.

---

## Table of Contents

1. [Formatting & Linting](#formatting--linting)
2. [Project Structure](#project-structure)
3. [Naming Conventions](#naming-conventions)
4. [TypeScript Conventions](#typescript-conventions)
5. [NestJS Patterns](#nestjs-patterns)
6. [Zod Validation](#zod-validation)
7. [TypeORM Entities](#typeorm-entities)
8. [Exception Handling](#exception-handling)
9. [DTOs (Data Transfer Objects)](#dtos-data-transfer-objects)
10. [Services](#services)
11. [Controllers](#controllers)
12. [Authentication](#authentication)
13. [Database Conventions](#database-conventions)
14. [Testing](#testing)

---

## Formatting & Linting

We use [Biome](https://biomejs.dev/) for linting and formatting.

### Configuration

```json
{
  "formatter": {
    "indentStyle": "tab"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double"
    }
  }
}
```

### Rules

| Rule | Style |
|------|-------|
| Indentation | Tabs |
| Quotes | Double quotes (`"`) |
| Semicolons | Required |
| Trailing commas | ES5 style |
| Import organization | Automatic via Biome |

### Commands

```bash
npm run lint      # Lint and auto-fix
npm run format    # Format all files
```

---

## Project Structure

### Module Organization

Each feature module follows this structure:

```
src/modules/<feature>/
├── <feature>.module.ts       # Module definition
├── <feature>.controller.ts   # HTTP endpoints
├── <feature>.service.ts      # Business logic
├── <feature>.entity.ts       # TypeORM entity (if applicable)
├── dto/
│   ├── req/
│   │   └── index.ts          # Request DTOs (Zod schemas)
│   └── res/
│       └── index.ts          # Response DTOs (Zod schemas)
└── transformers/             # Data transformation utilities (optional)
```

### Import Path Aliases

Use the `@/` alias for absolute imports from `src/`:

```typescript
// ✅ Good
import { ENTITY } from "@/common/constants";
import { PayeeService } from "@/modules/payee/payee.service";

// ❌ Avoid
import { ENTITY } from "../../../common/constants";
```

### Import Order

Organize imports in this order (Biome handles automatically):

1. External packages (`@nestjs/*`, `typeorm`, `zod`)
2. Internal aliases (`@/common/*`, `@/modules/*`, `@/lib/*`)
3. Relative imports (same module)

```typescript
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ENTITY } from "@/common/constants";
import { EntityNotFound } from "@/common/exceptions";
import { PayeeEntity } from "@/modules/payee/payee.entity";
import { TPayeeCreateDtoReq } from "./dto/req";
```

---

## Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| Module | `<feature>.module.ts` | `payee.module.ts` |
| Controller | `<feature>.controller.ts` | `payee.controller.ts` |
| Service | `<feature>.service.ts` | `payee.service.ts` |
| Entity | `<feature>.entity.ts` | `payee.entity.ts` |
| Request DTO | `dto/req/index.ts` | — |
| Response DTO | `dto/res/index.ts` | — |
| Transformer | `<name>.transformer.ts` | `category-tree.transformer.ts` |
| Guard | `<name>.guard.ts` | `auth.guard.ts` |
| Filter | `<name>.filter.ts` | `base-exception.filter.ts` |
| Pipe | `<name>.pipe.ts` | `zod-validation.pipe.ts` |
| Decorator | `<name>.decorator.ts` | `session.decorator.ts` |

### Classes

| Type | Pattern | Example |
|------|---------|---------|
| Module | `<Feature>Module` | `PayeeModule` |
| Controller | `<Feature>Controller` | `PayeeController` |
| Service | `<Feature>Service` | `PayeeService` |
| Entity | `<Feature>Entity` | `PayeeEntity` |
| Exception | `<Name>` (descriptive) | `EntityNotFound` |
| Guard | `<Name>Guard` | `AuthGuard` |
| Filter | `<Name>Filter` | `BaseExceptionFilter` |
| Pipe | `<Name>Pipe` | `ZodValidationPipe` |
| Transformer | `<Name>Transformer` | `CategoryTreeTransformer` |

### Zod Schemas & Types

| Type | Pattern | Example |
|------|---------|---------|
| Request schema | `<Feature><Action>DtoReqSchema` | `PayeeCreateDtoReqSchema` |
| Response schema | `<Feature>ResDtoSchema` | `PayeeResDtoSchema` |
| Inferred type | `T<SchemaName>` (prefix with T) | `TPayeeCreateDtoReq` |

```typescript
// Schema
export const PayeeCreateDtoReqSchema = z.object({ ... });

// Inferred type (prefixed with T)
export type TPayeeCreateDtoReq = z.infer<typeof PayeeCreateDtoReqSchema>;
```

### Variables & Methods

| Type | Convention | Example |
|------|------------|---------|
| Private methods | Prefix with `_` | `_formatAmount()`, `_toResDto()` |
| Public methods | camelCase | `getPayee()`, `create()` |
| Constants | UPPER_SNAKE_CASE | `ENTITY`, `AUTH_OPTIONS` |
| Entity fields | camelCase | `userId`, `createdAt` |
| DB columns | snake_case | `user_id`, `created_at` |

---

## TypeScript Conventions

### Strict Mode

The project does **not** use strict mode currently. However, follow these practices:

```typescript
// ✅ Be explicit with null/undefined
async getTransaction(id: string): Promise<TTransactionResDto | null> { ... }

// ✅ Use nullish coalescing
const value = result ?? defaultValue;

// ✅ Use optional chaining
const name = category.parent?.name ?? null;
```

### Type Inference

Let TypeScript infer when possible, but be explicit for function signatures:

```typescript
// ✅ Explicit return types for public methods
async getPayee(userId: string, payeeId: string): Promise<TPayeeResDto> { ... }

// ✅ Let TypeScript infer for local variables
const payees = await this.payeeRepository.find({ ... });
```

### Avoid `any`

```typescript
// ❌ Avoid
const data: any = response.data;

// ✅ Use proper types
const data: TPayeeResDto = response.data;

// ✅ Use `unknown` when type is truly unknown
catch(exception: unknown, host: ArgumentsHost) { ... }
```

---

## NestJS Patterns

### Dependency Injection

Use constructor injection with `readonly`:

```typescript
@Injectable()
export class PayeeService {
  constructor(
    @InjectRepository(PayeeEntity)
    private readonly payeeRepository: Repository<PayeeEntity>,
  ) {}
}
```

### Module Structure

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([PayeeEntity])],
  controllers: [PayeeController],
  providers: [PayeeService],
  exports: [PayeeService], // Export if needed by other modules
})
export class PayeeModule {}
```

### Global Modules

Use `@Global()` sparingly, only for truly cross-cutting concerns:

```typescript
@Global()
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule { ... }
}
```

---

## Zod Validation

### Schema Definition

Define schemas in `dto/req/index.ts` or `dto/res/index.ts`:

```typescript
import { z } from "zod";

// Request schema
export const PayeeCreateDtoReqSchema = z.object({
  name: z.string().min(1, "Name must be at least 1 character long"),
});

// Reuse for update if same shape
export const PayeeUpdateDtoReqSchema = PayeeCreateDtoReqSchema;

// Export inferred types
export type TPayeeCreateDtoReq = z.infer<typeof PayeeCreateDtoReqSchema>;
export type TPayeeUpdateDtoReq = z.infer<typeof PayeeUpdateDtoReqSchema>;
```

### Validation Messages

Always provide human-readable validation messages:

```typescript
// ✅ Good
z.string().min(1, "Name must be at least 1 character long")
z.number().int().positive("Amount must be positive")

// ❌ Avoid default messages
z.string().min(1)
```

### Complex Schemas

Use composition for complex schemas:

```typescript
export const LineItemDtoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().int().positive("Amount must be positive"),
  tags: z.array(z.string()).default([]),
  memo: z.string().optional(),
});

export const SplitDtoSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  amount: z.number().int().positive("Amount must be positive"),
  memo: z.string().nullable().optional(),
  lineItems: z.array(LineItemDtoSchema).default([]),
});

export const TransactionCreateDtoReqSchema = z.object({
  date: z.coerce.date(),
  splits: z.array(SplitDtoSchema).min(1, "At least one split is required"),
  // ...
});
```

### Using ZodValidationPipe

Apply validation in controllers via pipe:

```typescript
@Post()
async createPayee(
  @Session() session: UserSession,
  @Body(new ZodValidationPipe(PayeeCreateDtoReqSchema))
  dto: TPayeeCreateDtoReq,
) {
  return await this.payeeService.create(session.user.id, dto);
}

// For query params
@Get("filter")
getTransactionsFilter(
  @Query(new ZodValidationPipe(TransactionQueryDtoSchema))
  query: TTransactionQueryDto,
) { ... }
```

---

## TypeORM Entities

### Base Entity

All entities extend `BaseEntity` for audit fields:

```typescript
export abstract class BaseEntity {
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;
}
```

### Entity Definition

```typescript
@Entity("payee")
@Unique(["userId", "name"])
@Index("idx_payee_user_id", ["userId"], { where: '"deleted_at" IS NULL' })
export class PayeeEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ type: "text" })
  name: string;
}
```

### Column Naming

Map camelCase properties to snake_case columns:

```typescript
@Column({ name: "user_id", type: "uuid" })
userId: string;

@Column({ name: "financial_account_id", type: "uuid" })
financialAccountId: string;
```

### Soft Deletes

Use `softDelete()` instead of `delete()`:

```typescript
await this.payeeRepository.softDelete(payeeId);
```

### Partial Indexes

Define indexes that exclude soft-deleted records:

```typescript
@Index("idx_payee_user_id", ["userId"], { where: '"deleted_at" IS NULL' })
```

---

## Exception Handling

### Custom Exceptions

Extend `BaseException` for domain-specific errors:

```typescript
export abstract class BaseException extends Error {
  abstract readonly statusCode: HttpStatus;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class EntityNotFound extends BaseException {
  readonly statusCode = HttpStatus.NOT_FOUND;

  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`);
  }
}

export class InvalidOperation extends BaseException {
  readonly statusCode = HttpStatus.BAD_REQUEST;

  constructor(message: string) {
    super(message);
  }
}
```

### Using Entity Constants

Use the `ENTITY` constant for consistent entity names:

```typescript
import { ENTITY } from "@/common/constants";

// ✅ Good
throw new EntityNotFound(ENTITY.payee, payeeId);

// ❌ Avoid hardcoded strings
throw new EntityNotFound("Payee", payeeId);
```

### Exception Filters

Two filters handle exceptions in order:

1. **`BaseExceptionFilter`**: Handles custom `BaseException` subclasses
2. **`AllExceptionsFilter`**: Catch-all for unhandled exceptions

```typescript
// Registration order matters (catch-all last)
app.useGlobalFilters(
  app.get(AllExceptionsFilter),
  app.get(BaseExceptionFilter),
);
```

---

## DTOs (Data Transfer Objects)

### Request DTOs

- Define Zod schema with validation rules
- Export inferred type prefixed with `T`
- Located in `dto/req/index.ts`

```typescript
export const PayeeCreateDtoReqSchema = z.object({
  name: z.string().min(1, "Name must be at least 1 character long"),
});

export type TPayeeCreateDtoReq = z.infer<typeof PayeeCreateDtoReqSchema>;
```

### Response DTOs

- Define Zod schema for response shape
- Use `.parse()` to validate and transform data
- Located in `dto/res/index.ts`

```typescript
export const PayeeResDtoSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
});

export type TPayeeResDto = z.infer<typeof PayeeResDtoSchema>;
```

### Validating Responses

Always validate response data through the schema:

```typescript
// ✅ Good - validates and transforms
return PayeeResDtoSchema.parse({
  id: saved.id,
  name: saved.name,
});

// ❌ Avoid - no validation
return {
  id: saved.id,
  name: saved.name,
};
```

---

## Services

### Structure

```typescript
@Injectable()
export class PayeeService {
  constructor(
    @InjectRepository(PayeeEntity)
    private readonly payeeRepository: Repository<PayeeEntity>,
  ) {}

  // Public methods (business logic)
  async getPayee(userId: string, payeeId: string): Promise<TPayeeResDto> { ... }
  async create(userId: string, dto: TPayeeCreateDtoReq): Promise<TPayeeResDto> { ... }
  async update(userId: string, payeeId: string, dto: TPayeeUpdateDtoReq): Promise<TPayeeResDto> { ... }
  async delete(userId: string, payeeId: string): Promise<void> { ... }

  // Private helper methods (prefix with _)
  private _toResDto(entity: PayeeEntity): TPayeeResDto { ... }
  private _formatAmount(amount: number, currencyCode: string): string { ... }
}
```

### User Scoping

All queries must be scoped to the current user:

```typescript
// ✅ Always include userId in queries
const payee = await this.payeeRepository.findOne({
  where: { id: payeeId, userId },
});

// ❌ Never query without user scope
const payee = await this.payeeRepository.findOne({
  where: { id: payeeId },
});
```

### Entity Not Found Pattern

Check for existence and throw early:

```typescript
async getPayee(userId: string, payeeId: string): Promise<TPayeeResDto> {
  const payee = await this.payeeRepository.findOne({
    where: { id: payeeId, userId },
  });

  if (!payee) {
    throw new EntityNotFound(ENTITY.payee, payeeId);
  }

  return PayeeResDtoSchema.parse({ ... });
}
```

### Transactions

Use `DataSource.transaction()` for multi-table operations:

```typescript
return await this.dataSource.transaction(async (manager) => {
  const transaction = manager.create(TransactionEntity, { ... });
  const saved = await manager.save(transaction);

  for (const splitDto of dto.splits) {
    const split = manager.create(TransactionSplitEntity, { ... });
    await manager.save(split);
  }

  return this._toResDto(saved);
});
```

---

## Controllers

### Structure

```typescript
@Controller("payees")
export class PayeeController {
  constructor(private readonly payeeService: PayeeService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getPayees(@Session() session: UserSession) { ... }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPayee(@Session() session: UserSession, @Body(...) dto: T) { ... }

  @Get(":id")
  getPayee(@Session() session: UserSession, @Param("id") id: string) { ... }

  @Patch(":id")
  async updatePayee(@Session() session: UserSession, @Param("id") id: string, @Body(...) dto: T) { ... }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePayee(@Session() session: UserSession, @Param("id") id: string) { ... }
}
```

### HTTP Status Codes

Use explicit `@HttpCode()` decorators:

| Operation | Status Code |
|-----------|-------------|
| GET (list/single) | `HttpStatus.OK` (200) |
| POST (create) | `HttpStatus.CREATED` (201) |
| PATCH (update) | `HttpStatus.OK` (200) |
| DELETE | `HttpStatus.NO_CONTENT` (204) |

### Thin Controllers

Keep controllers thin—delegate logic to services:

```typescript
// ✅ Good - delegate to service
@Post()
async createPayee(@Session() session: UserSession, @Body(...) dto: TPayeeCreateDtoReq) {
  return await this.payeeService.create(session.user.id, dto);
}

// ❌ Avoid - business logic in controller
@Post()
async createPayee(@Session() session: UserSession, @Body(...) dto: TPayeeCreateDtoReq) {
  const existing = await this.payeeRepository.findOne({ ... });
  if (existing) throw new EntityAlreadyExists(...);
  const payee = this.payeeRepository.create({ ... });
  // ... more logic
}
```

---

## Authentication

### Session Decorator

Use `@Session()` to get the current user session:

```typescript
@Get()
getPayees(@Session() session: UserSession) {
  return this.payeeService.getLatestPayees(session.user.id);
}
```

### Allow Anonymous

Use `@AllowAnonymous()` for public endpoints:

```typescript
@AllowAnonymous()
@Get("health")
healthCheck() {
  return { status: "ok" };
}
```

### Optional Auth

Use `@OptionalAuth()` when auth is optional:

```typescript
@OptionalAuth()
@Get("public-with-user")
getData(@Session() session: UserSession | null) {
  if (session) {
    // Authenticated user
  } else {
    // Anonymous access
  }
}
```

---

## Database Conventions

### Table Naming

| Type | Convention | Example |
|------|------------|---------|
| Tables | snake_case, singular | `payee`, `financial_account` |
| Junction tables | `<table1>_<table2>` | `line_item_tag` |
| Auth schema | Prefix with `auth.` | `auth.user`, `auth.session` |

### Column Naming

| Type | Convention | Example |
|------|------------|---------|
| Primary key | `id` | `id` |
| Foreign keys | `<table>_id` | `user_id`, `payee_id` |
| Timestamps | `created_at`, `updated_at`, `deleted_at` | — |
| Boolean | Descriptive | `email_verified` |

### UUID Primary Keys

All tables use UUID primary keys:

```typescript
@PrimaryGeneratedColumn("uuid")
id: string;
```

### Soft Deletes

All application tables support soft delete via `deleted_at`:

```typescript
@DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
deletedAt: Date | null;
```

### Denormalization

Denormalize frequently accessed data for read performance:

```typescript
// Transaction stores denormalized names
@Column({ name: "payee_name", type: "text" })
payeeName: string;

@Column({ name: "account_name", type: "text" })
accountName: string;
```

---

## Testing

### Test File Naming

| Type | Pattern | Location |
|------|---------|----------|
| Unit tests | `*.spec.ts` | Same directory as source |
| E2E tests | `*.e2e-spec.ts` | `test/` directory |

### Test Structure

```typescript
describe("PayeeService", () => {
  let service: PayeeService;
  let repository: Repository<PayeeEntity>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ ... }).compile();
    service = module.get<PayeeService>(PayeeService);
  });

  describe("getPayee", () => {
    it("should return payee when found", async () => { ... });
    it("should throw EntityNotFound when not found", async () => { ... });
  });
});
```

### Commands

```bash
npm run test          # Unit tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:e2e      # E2E tests
```

---

## Summary Checklist

Before submitting code, verify:

- [ ] Code formatted with Biome (`npm run format`)
- [ ] No lint errors (`npm run lint`)
- [ ] Import paths use `@/` alias
- [ ] DTOs validated with Zod schemas
- [ ] Response data passed through schema `.parse()`
- [ ] Queries scoped to `userId`
- [ ] Custom exceptions used (not raw `HttpException`)
- [ ] Entity constants used (`ENTITY.payee`)
- [ ] Private methods prefixed with `_`
- [ ] Explicit `@HttpCode()` decorators on endpoints
- [ ] Tests written for new functionality

