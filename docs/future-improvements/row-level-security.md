# Row-Level Security (RLS) Policies

## Overview

Row-Level Security ensures multi-tenant data isolation at the database level. Each user can only access their own data, enforced by PostgreSQL policies.

---

## 1. Enable RLS on Tables

```sql
ALTER TABLE financial_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE payee ENABLE ROW LEVEL SECURITY;
ALTER TABLE category ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_split ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_item_tag ENABLE ROW LEVEL SECURITY;
```

---

## 2. User Context Setup

The application must set the current user ID before executing queries:

```sql
-- Set at the beginning of each request/transaction
SET app.current_user_id = 'user-uuid-here';

-- Or use a function
CREATE OR REPLACE FUNCTION set_current_user(user_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, false);
END;
$$ LANGUAGE plpgsql;
```

**NestJS Implementation:**
```typescript
// In a middleware or interceptor
await this.pool.query(`SET app.current_user_id = $1`, [userId]);
```

---

## 3. Direct User-Scoped Tables

Tables with direct `user_id` foreign key:

```sql
-- Financial Account
CREATE POLICY financial_account_user_policy ON financial_account
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Payee
CREATE POLICY payee_user_policy ON payee
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Category
CREATE POLICY category_user_policy ON category
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Tag
CREATE POLICY tag_user_policy ON tag
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Transaction
CREATE POLICY transaction_user_policy ON transaction
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
```

---

## 4. Nested Tables (Via Joins)

Tables without direct `user_id` that inherit access through parent relationships:

### Transaction Split

```sql
CREATE POLICY split_user_policy ON transaction_split
    FOR ALL USING (
        transaction_id IN (
            SELECT id FROM transaction 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );
```

### Line Item

```sql
CREATE POLICY line_item_user_policy ON line_item
    FOR ALL USING (
        split_id IN (
            SELECT ts.id FROM transaction_split ts
            JOIN transaction t ON ts.transaction_id = t.id
            WHERE t.user_id = current_setting('app.current_user_id')::UUID
        )
    );
```

### Line Item Tag

```sql
CREATE POLICY line_item_tag_user_policy ON line_item_tag
    FOR ALL USING (
        line_item_id IN (
            SELECT li.id FROM line_item li
            JOIN transaction_split ts ON li.split_id = ts.id
            JOIN transaction t ON ts.transaction_id = t.id
            WHERE t.user_id = current_setting('app.current_user_id')::UUID
        )
    );
```

---

## 5. Policy Summary

| Table | Policy Type | Access Path |
|-------|-------------|-------------|
| `financial_account` | Direct | `user_id` |
| `payee` | Direct | `user_id` |
| `category` | Direct | `user_id` |
| `tag` | Direct | `user_id` |
| `transaction` | Direct | `user_id` |
| `transaction_split` | Via Join | `transaction.user_id` |
| `line_item` | Via Join | `split → transaction.user_id` |
| `line_item_tag` | Via Join | `line_item → split → transaction.user_id` |

---

## 6. Bypassing RLS (Admin Access)

For admin operations or migrations, RLS can be bypassed:

```sql
-- Create a superuser role that bypasses RLS
CREATE ROLE monovra_admin WITH LOGIN PASSWORD 'secure_password';
ALTER ROLE monovra_admin BYPASSRLS;

-- Or temporarily disable for a session
SET row_security = off;
```

---

## 7. Performance Considerations

1. **Index Support**: Ensure indexes exist on `user_id` columns
2. **Nested Policies**: Consider adding `user_id` to child tables for simpler policies
3. **Query Planning**: Use `EXPLAIN ANALYZE` to verify policy efficiency

**Alternative for Child Tables** (optional optimization):

```sql
-- Add user_id to transaction_split for simpler RLS
ALTER TABLE transaction_split ADD COLUMN user_id UUID;

-- Then use direct policy
CREATE POLICY split_user_policy ON transaction_split
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
```
