# Migration Plan: Firestore to PostgreSQL

## Overview

This document outlines the migration from Firebase Firestore + Firebase Auth to PostgreSQL + Better Auth for the Monovra API.

---

## 1. Migration Phases

### Phase 1: Database Setup

1. **Create PostgreSQL Schema**
   - Run DDL from `docs/database/postgresql-schema.md`
   - Create auth schema and application tables
   - Set up indexes

2. **Create Triggers & Functions**
   - Apply triggers from `docs/database/triggers-and-functions.md`
   - Test trigger behavior with sample data

3. **Enable Row-Level Security**
   - Apply RLS policies from `docs/database/row-level-security.md`
   - Test user isolation

4. **Create Materialized Views**
   - Apply views from `docs/database/materialized-views.md`
   - Set up refresh schedule

### Phase 2: Better Auth Integration

1. **Install Dependencies**
   ```bash
   npm install better-auth pg
   npm uninstall firebase-admin
   ```

2. **Create Auth Module**
   - `src/modules/auth/auth.module.ts`
   - `src/modules/auth/auth.service.ts`
   - `src/modules/auth/auth.controller.ts`

3. **Create Session Guard**
   - `src/modules/auth/guards/session.guard.ts`
   - Replace `FirebaseAuthGuard`

4. **Update CurrentUser Decorator**
   - `src/modules/auth/decorators/current-user.decorator.ts`
   - Return user from session instead of Firebase token

### Phase 3: Service Layer Migration

Migrate one module at a time:

1. **Database Module**
   - Create PostgreSQL connection pool
   - `src/modules/database/database.module.ts`
   - `src/modules/database/database.service.ts`

2. **Account Service**
   - Replace Firestore queries with PostgreSQL
   - Update DTOs if needed

3. **Payee Service**
   - Replace Firestore queries with PostgreSQL

4. **Category Service**
   - Replace Firestore queries with PostgreSQL
   - Leverage DB triggers for full_name management

5. **Tag Service**
   - Replace Firestore queries with PostgreSQL
   - Leverage DB triggers for usage_count

6. **Transaction Service** (Most Complex)
   - Replace Firestore queries with PostgreSQL
   - Use database transactions for atomic operations
   - Handle splits and line items via normalized tables

7. **Report Service**
   - Query materialized views instead of aggregating in-memory

### Phase 4: Testing & Validation

1. **Update Test Mocks**
   - Replace Firebase mocks with PostgreSQL mocks
   - Update test fixtures

2. **Run Unit Tests**
   - Fix any broken tests
   - Add new tests for PostgreSQL-specific behavior

3. **Run Integration Tests**
   - Test full API flows
   - Verify data integrity

### Phase 5: Data Migration (If Needed)

1. **Export Firestore Data**
   ```bash
   # Use Firebase Admin SDK to export
   node scripts/export-firestore.js
   ```

2. **Transform Data**
   - Convert Firestore document IDs to UUIDs
   - Normalize nested data (splits, line items)
   - Handle foreign key relationships

3. **Import to PostgreSQL**
   - Disable triggers during import
   - Import in correct order (users → accounts → ... → transactions)
   - Re-enable triggers and refresh materialized views

---

## 2. Files to Create

### New Files

| Path | Description |
|------|-------------|
| `src/modules/database/database.module.ts` | PostgreSQL connection module |
| `src/modules/database/database.service.ts` | Connection pool service |
| `src/modules/auth/auth.module.ts` | Better Auth module |
| `src/modules/auth/auth.service.ts` | Auth service |
| `src/modules/auth/auth.controller.ts` | Auth endpoints |
| `src/modules/auth/guards/session.guard.ts` | Session-based guard |
| `src/modules/auth/decorators/current-user.decorator.ts` | Updated decorator |
| `src/database/schema.sql` | Complete PostgreSQL DDL |
| `src/database/migrations/` | Migration files |

---

## 3. Files to Modify

| Path | Changes |
|------|---------|
| `src/main.ts` | Remove Firebase init, add PostgreSQL setup |
| `src/modules/app.module.ts` | Replace FirebaseModule with DatabaseModule + AuthModule |
| `src/modules/account/account.service.ts` | PostgreSQL queries |
| `src/modules/payee/payee.service.ts` | PostgreSQL queries |
| `src/modules/category/category.service.ts` | PostgreSQL queries |
| `src/modules/tag/tag.service.ts` | PostgreSQL queries |
| `src/modules/transaction/transaction.service.ts` | PostgreSQL queries + transactions |
| `src/modules/report/report.service.ts` | Use materialized views |
| `.env` | PostgreSQL connection, Better Auth config |
| `package.json` | Add pg, better-auth; remove firebase-admin |

---

## 4. Files to Remove

| Path | Reason |
|------|--------|
| `src/modules/firebase/` | Entire module no longer needed |
| `src/common/guards/firebase-auth.guard.ts` | Replaced by session guard |
| `src/common/testing/mocks/firebase.mock.ts` | Replaced by PostgreSQL mocks |

---

## 5. Environment Variables

### Before (Firebase)

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_ID=your-database-id
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### After (PostgreSQL + Better Auth)

```env
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/monovra
DATABASE_POOL_SIZE=10

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# Optional: OAuth providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 6. Implementation Order

```
Week 1: Database Setup
├── Day 1-2: Create PostgreSQL schema
├── Day 3: Create triggers and functions
├── Day 4: Set up RLS policies
└── Day 5: Create materialized views and test

Week 2: Auth Migration
├── Day 1-2: Install Better Auth, create auth module
├── Day 3: Create session guard and decorator
├── Day 4-5: Test auth flows, update existing guards

Week 3: Service Migration
├── Day 1: Database module, Account service
├── Day 2: Payee service, Category service
├── Day 3: Tag service
├── Day 4-5: Transaction service (complex)

Week 4: Reports & Testing
├── Day 1: Report service with materialized views
├── Day 2-3: Update tests, fix broken tests
├── Day 4: Integration testing
└── Day 5: Data migration script (if needed)
```

---

## 7. Rollback Plan

If issues arise during migration:

1. **Keep Firebase Running**
   - Don't delete Firebase resources until fully migrated
   - Run both systems in parallel during testing

2. **Feature Flags**
   - Use feature flags to toggle between Firebase and PostgreSQL
   - Allows gradual rollout

3. **Data Sync**
   - If running in parallel, implement two-way sync
   - Or use read-from-new, write-to-both pattern

4. **Quick Rollback**
   - Revert to Firebase by changing feature flag
   - No data loss if both systems are synced

---

## 8. Verification Checklist

- [ ] All tables created with correct constraints
- [ ] All indexes created and optimized
- [ ] Triggers working correctly
- [ ] RLS policies enforcing user isolation
- [ ] Materialized views refreshing properly
- [ ] Better Auth endpoints working
- [ ] Session-based auth replacing Firebase auth
- [ ] All CRUD operations working
- [ ] Transaction atomicity verified
- [ ] Report queries using materialized views
- [ ] All tests passing
- [ ] Performance acceptable under load
- [ ] Data migration complete (if applicable)
