# Entity Relationship Diagram

## Overview

This document describes the relationships between entities in the Monovra PostgreSQL database.

---

## 1. Visual Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   AUTH SCHEMA                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐  │
│  │    user      │     │   session    │     │   account    │     │verification│  │
│  ├──────────────┤     ├──────────────┤     ├──────────────┤     ├────────────┤  │
│  │ id (PK)      │────<│ user_id (FK) │     │ user_id (FK) │>────│ id (PK)    │  │
│  │ email        │     │ token        │     │ provider_id  │     │ identifier │  │
│  │ name         │     │ expires_at   │     │ account_id   │     │ value      │  │
│  │ role         │     │ ip_address   │     │ access_token │     │ expires_at │  │
│  └──────────────┘     └──────────────┘     └──────────────┘     └────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         │ user_id (FK)
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 PUBLIC SCHEMA                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │financial_account │    │    payee     │    │   category   │    │    tag    │  │
│  ├──────────────────┤    ├──────────────┤    ├──────────────┤    ├───────────┤  │
│  │ id (PK)          │    │ id (PK)      │    │ id (PK)      │    │ id (PK)   │  │
│  │ user_id (FK)     │    │ user_id (FK) │    │ user_id (FK) │    │user_id(FK)│  │
│  │ name             │    │ name         │    │ name         │    │ name      │  │
│  │ currency_type    │    │              │    │ parent_id(FK)│◄───│usage_count│  │
│  └────────┬─────────┘    └──────┬───────┘    │ full_name    │    └─────┬─────┘  │
│           │                     │            └──────┬───────┘          │        │
│           │                     │                   │                  │        │
│           ▼                     ▼                   ▼                  │        │
│  ┌─────────────────────────────────────────────────────────────────────┼───┐    │
│  │                         transaction                                  │   │    │
│  ├──────────────────────────────────────────────────────────────────────┼───┤    │
│  │ id (PK)                                                              │   │    │
│  │ user_id (FK) ─────────────────────────────────────────────────────>  │   │    │
│  │ financial_account_id (FK) ─────────────────────────────────────────> │   │    │
│  │ payee_id (FK) ──────────────────────────────────────────────────────>│   │    │
│  │ date, type, memo, total_amount, split_count                          │   │    │
│  │ account_name, currency_code, payee_name, category_name (denorm)      │   │    │
│  └─────────────────────────────────┬────────────────────────────────────┘   │    │
│                                    │                                        │    │
│                                    ▼                                        │    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │    │
│  │                      transaction_split                               │   │    │
│  ├──────────────────────────────────────────────────────────────────────┤   │    │
│  │ id (PK)                                                              │   │    │
│  │ transaction_id (FK) ─────────────────────────────────────────────────┘   │    │
│  │ category_id (FK) ────────────────────────────────────────────────────>   │    │
│  │ amount, memo, category_full_name, sort_order                             │    │
│  └─────────────────────────────────┬────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                          line_item                                   │        │
│  ├──────────────────────────────────────────────────────────────────────┤        │
│  │ id (PK)                                                              │        │
│  │ split_id (FK) ───────────────────────────────────────────────────────┘        │
│  │ name, amount, memo, sort_order                                                │
│  └─────────────────────────────────┬────────────────────────────────────────────┘│
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                       line_item_tag (Junction)                       │        │
│  ├──────────────────────────────────────────────────────────────────────┤        │
│  │ line_item_id (FK) ───────────────────────────────────────────────────┘        │
│  │ tag_id (FK) ─────────────────────────────────────────────────────────────────>│
│  └──────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Relationship Summary

### Auth Schema

| Parent | Child | Relationship | On Delete |
|--------|-------|--------------|-----------|
| `auth.user` | `auth.session` | 1:Many | CASCADE |
| `auth.user` | `auth.account` | 1:Many | CASCADE |

### Public Schema

| Parent | Child | Relationship | On Delete |
|--------|-------|--------------|-----------|
| `auth.user` | `financial_account` | 1:Many | CASCADE |
| `auth.user` | `payee` | 1:Many | CASCADE |
| `auth.user` | `category` | 1:Many | CASCADE |
| `auth.user` | `tag` | 1:Many | CASCADE |
| `auth.user` | `transaction` | 1:Many | CASCADE |
| `category` | `category` | 1:Many (self) | CASCADE |
| `financial_account` | `transaction` | 1:Many | RESTRICT |
| `payee` | `transaction` | 1:Many | RESTRICT |
| `transaction` | `transaction_split` | 1:Many | CASCADE |
| `category` | `transaction_split` | 1:Many | RESTRICT |
| `transaction_split` | `line_item` | 1:Many | CASCADE |
| `line_item` | `line_item_tag` | 1:Many | CASCADE |
| `tag` | `line_item_tag` | 1:Many | CASCADE |

---

## 3. Cardinality Details

### User → Entities (1:Many)
- One user has many accounts, payees, categories, tags, transactions
- Deleting a user cascades to delete all their data

### Category Hierarchy (Self-Reference)
- Categories can have one parent (nullable)
- Maximum 2 levels: Parent → Subcategory
- Deleting a parent cascades to delete subcategories

### Transaction Structure
```
Transaction (1)
    └── Transaction Split (1:Many, min 1)
            └── Line Item (0:Many)
                    └── Line Item Tag (0:Many) ──> Tag
```

### Denormalized Fields
To avoid joins on read-heavy queries, these fields are denormalized:

| Table | Denormalized Field | Source |
|-------|-------------------|--------|
| `transaction` | `account_name` | `financial_account.name` |
| `transaction` | `currency_code` | `financial_account.currency_type` |
| `transaction` | `payee_name` | `payee.name` |
| `transaction` | `category_name` | Derived from splits |
| `transaction` | `total_amount` | Sum of split amounts |
| `transaction` | `split_count` | Count of splits |
| `transaction_split` | `category_full_name` | `category.full_name` |

---

## 4. Constraint Details

### Primary Keys
All tables use UUID primary keys generated by `gen_random_uuid()`.

### Foreign Keys

```sql
-- financial_account
REFERENCES auth.user(id) ON DELETE CASCADE

-- payee
REFERENCES auth.user(id) ON DELETE CASCADE

-- category
REFERENCES auth.user(id) ON DELETE CASCADE
REFERENCES category(id) ON DELETE CASCADE  -- self-reference for parent

-- tag
REFERENCES auth.user(id) ON DELETE CASCADE

-- transaction
REFERENCES auth.user(id) ON DELETE CASCADE
REFERENCES financial_account(id) ON DELETE RESTRICT
REFERENCES payee(id) ON DELETE RESTRICT

-- transaction_split
REFERENCES transaction(id) ON DELETE CASCADE
REFERENCES category(id) ON DELETE RESTRICT

-- line_item
REFERENCES transaction_split(id) ON DELETE CASCADE

-- line_item_tag
REFERENCES line_item(id) ON DELETE CASCADE
REFERENCES tag(id) ON DELETE CASCADE
```

### Check Constraints

```sql
-- financial_account
CHECK (currency_type IN ('USD', 'CAD', 'INR'))

-- category
CHECK (LENGTH(name) >= 1)
-- Prevent 3+ level nesting (enforced by trigger or constraint)

-- tag
CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 50)
CHECK (usage_count >= 0)

-- transaction
CHECK (type IN ('EXPENSE', 'INCOME'))
CHECK (total_amount >= 0)
CHECK (split_count >= 1)

-- transaction_split
CHECK (amount > 0)

-- line_item
CHECK (LENGTH(name) >= 1)
CHECK (amount > 0)
```

### Unique Constraints

```sql
-- financial_account
UNIQUE(user_id, name)

-- payee
UNIQUE(user_id, name)

-- category
UNIQUE(user_id, full_name)

-- tag
UNIQUE(user_id, LOWER(name))  -- Case-insensitive

-- auth.account (OAuth)
UNIQUE(provider_id, account_id)
```

---

## 5. Data Flow Example

### Creating a Transaction

```
1. User creates transaction
   └── INSERT INTO transaction (user_id, financial_account_id, payee_id, ...)
       ├── Validates: account exists, payee exists
       └── Sets: account_name, currency_code, payee_name (denormalized)

2. Add splits to transaction
   └── INSERT INTO transaction_split (transaction_id, category_id, amount, ...)
       ├── Validates: category exists
       ├── Sets: category_full_name (denormalized)
       └── TRIGGER: Updates transaction.total_amount, split_count, category_name

3. Add line items to split (optional)
   └── INSERT INTO line_item (split_id, name, amount, ...)

4. Tag line items (optional)
   └── INSERT INTO line_item_tag (line_item_id, tag_id)
       └── TRIGGER: Updates tag.usage_count += 1
```

### Deleting a Transaction

```
1. DELETE FROM transaction WHERE id = ?
   └── CASCADE: Deletes transaction_split rows
       └── CASCADE: Deletes line_item rows
           └── CASCADE: Deletes line_item_tag rows
               └── TRIGGER: Updates tag.usage_count -= 1 for each tag
```
