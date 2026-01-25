# PostgreSQL Schema Design

## Overview

This document describes the PostgreSQL database schema for Monovra API, replacing the previous Firestore implementation. The schema is designed for enterprise production use with Better Auth integration.

---

## 1. Auth Schema (Better Auth)

```sql
-- Use separate schema for auth
CREATE SCHEMA IF NOT EXISTS auth;

-- User table (Better Auth core + extensions)
CREATE TABLE auth.user (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT,
    email           TEXT UNIQUE NOT NULL,
    email_verified  BOOLEAN DEFAULT FALSE,
    image           TEXT,
    
    -- Extended fields for Monovra
    role            TEXT DEFAULT 'user',  -- 'user', 'admin'
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Session table (Better Auth core)
CREATE TABLE auth.session (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Account table (OAuth providers - Better Auth core)
CREATE TABLE auth.account (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
    account_id                  TEXT NOT NULL,
    provider_id                 TEXT NOT NULL,
    access_token                TEXT,
    refresh_token               TEXT,
    access_token_expires_at     TIMESTAMPTZ,
    refresh_token_expires_at    TIMESTAMPTZ,
    scope                       TEXT,
    id_token                    TEXT,
    password                    TEXT,  -- For credential auth
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(provider_id, account_id)
);

-- Verification table (email verification, password reset)
CREATE TABLE auth.verification (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier      TEXT NOT NULL,
    value           TEXT NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Application Tables (Public Schema)

### Financial Account

```sql
CREATE TABLE financial_account (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
    name            TEXT NOT NULL CHECK (LENGTH(name) >= 1),
    currency_type   TEXT NOT NULL CHECK (currency_type IN ('USD', 'CAD', 'INR')),
    
    -- Audit fields
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,  -- Soft delete
    
    UNIQUE(user_id, name)  -- Prevent duplicate account names per user
);
```

### Payee

```sql
CREATE TABLE payee (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
    name            TEXT NOT NULL CHECK (LENGTH(name) >= 1),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    UNIQUE(user_id, name)
);
```

### Category (Hierarchical)

```sql
CREATE TABLE category (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
    name            TEXT NOT NULL CHECK (LENGTH(name) >= 1),
    parent_id       UUID REFERENCES category(id) ON DELETE CASCADE,
    
    -- Computed/denormalized for query efficiency
    full_name       TEXT NOT NULL,  -- "food" or "food:groceries"
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    UNIQUE(user_id, full_name),
);
```

### Tag

```sql
CREATE TABLE tag (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
    name            TEXT NOT NULL CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 50),
    usage_count     INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    UNIQUE(user_id, LOWER(name))  -- Case-insensitive uniqueness
);
```

### Transaction

```sql
CREATE TABLE transaction (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
    financial_account_id UUID NOT NULL REFERENCES financial_account(id) ON DELETE RESTRICT,
    payee_id            UUID NOT NULL REFERENCES payee(id) ON DELETE RESTRICT,
    
    date                DATE NOT NULL,
    type                TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME')),
    memo                TEXT,
    
    -- Denormalized for query performance (updated via trigger)
    total_amount        BIGINT NOT NULL CHECK (total_amount >= 0),  -- In cents
    split_count         SMALLINT NOT NULL CHECK (split_count >= 1),
    
    -- Denormalized reference data (for read performance)
    account_name        TEXT NOT NULL,
    currency_code       TEXT NOT NULL,
    payee_name          TEXT NOT NULL,
    category_name       TEXT,  -- Derived from splits
    
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);
```

### Transaction Split

```sql
CREATE TABLE transaction_split (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES category(id) ON DELETE RESTRICT,
    
    amount          BIGINT NOT NULL CHECK (amount > 0),  -- In cents
    memo            TEXT,
    
    -- Denormalized for query performance
    category_full_name TEXT NOT NULL,
    
    -- Ordering within transaction
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Line Item

```sql
CREATE TABLE line_item (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    split_id        UUID NOT NULL REFERENCES transaction_split(id) ON DELETE CASCADE,
    
    name            TEXT NOT NULL CHECK (LENGTH(name) >= 1),
    amount          BIGINT NOT NULL CHECK (amount > 0),  -- In cents
    memo            TEXT,
    
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Line Item Tags (Junction Table)

```sql
CREATE TABLE line_item_tag (
    line_item_id    UUID NOT NULL REFERENCES line_item(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    
    PRIMARY KEY (line_item_id, tag_id)
);
```

---

## 3. Indexes

```sql
-- Auth schema indexes
CREATE INDEX idx_session_user_id ON auth.session(user_id);
CREATE INDEX idx_session_token ON auth.session(token);
CREATE INDEX idx_session_expires_at ON auth.session(expires_at);
CREATE INDEX idx_account_user_id ON auth.account(user_id);
CREATE INDEX idx_verification_identifier ON auth.verification(identifier);
CREATE INDEX idx_verification_expires_at ON auth.verification(expires_at);

-- Financial Account indexes
CREATE INDEX idx_financial_account_user_id ON financial_account(user_id) WHERE deleted_at IS NULL;

-- Payee indexes
CREATE INDEX idx_payee_user_id ON payee(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payee_user_name ON payee(user_id, name) WHERE deleted_at IS NULL;

-- Category indexes
CREATE INDEX idx_category_user_id ON category(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_category_parent_id ON category(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_category_user_parent ON category(user_id, parent_id) WHERE deleted_at IS NULL;

-- Tag indexes
CREATE INDEX idx_tag_user_id ON tag(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tag_user_usage ON tag(user_id, usage_count DESC) WHERE deleted_at IS NULL;

-- Transaction indexes (critical for performance)
CREATE INDEX idx_transaction_user_id ON transaction(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transaction_user_account_date ON transaction(user_id, financial_account_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transaction_user_payee_date ON transaction(user_id, payee_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transaction_user_type_date ON transaction(user_id, type, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transaction_date ON transaction(date DESC) WHERE deleted_at IS NULL;

-- Composite index for report queries
CREATE INDEX idx_transaction_reports ON transaction(user_id, financial_account_id, type, date DESC) WHERE deleted_at IS NULL;

-- Split indexes
CREATE INDEX idx_split_transaction_id ON transaction_split(transaction_id);
CREATE INDEX idx_split_category_id ON transaction_split(category_id);

-- Line item indexes
CREATE INDEX idx_line_item_split_id ON line_item(split_id);

-- Junction table index
CREATE INDEX idx_line_item_tag_tag_id ON line_item_tag(tag_id);
```

---

## 4. Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Normalized splits & line items** | Enables complex queries, aggregations, and data integrity vs JSONB |
| **Junction table for tags** | Proper many-to-many, enables tag usage tracking via trigger |
| **Denormalized names in transaction** | Read performance for list views (account_name, payee_name, etc.) |
| **Separate auth schema** | Clean separation, matches Better Auth patterns |
| **Soft delete (deleted_at)** | Data recovery, audit compliance, filtered indexes |
| **UUID primary keys** | Better Auth compatible, no sequential guessing |
| **BIGINT for amounts** | Supports large amounts, stored in cents |
| **Partial indexes** | Filter on `deleted_at IS NULL` for active records only |
