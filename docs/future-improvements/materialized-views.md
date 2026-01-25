# Materialized Views for Reports

## Overview

Materialized views pre-compute aggregated report data for fast query performance. They are refreshed on a schedule or after batch operations.

---

## 1. Monthly Spending by Category

Aggregates transaction splits by category per month.

```sql
CREATE MATERIALIZED VIEW mv_monthly_category_spending AS
SELECT 
    t.user_id,
    t.financial_account_id,
    DATE_TRUNC('month', t.date) AS month,
    t.type,
    SPLIT_PART(ts.category_full_name, ':', 1) AS parent_category,
    ts.category_full_name,
    ts.category_id,
    SUM(ts.amount) AS total_amount,
    COUNT(*) AS transaction_count
FROM transaction t
JOIN transaction_split ts ON t.id = ts.transaction_id
WHERE t.deleted_at IS NULL
GROUP BY 
    t.user_id,
    t.financial_account_id,
    DATE_TRUNC('month', t.date),
    t.type,
    SPLIT_PART(ts.category_full_name, ':', 1),
    ts.category_full_name,
    ts.category_id;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_mv_category_spending ON mv_monthly_category_spending(
    user_id, financial_account_id, month, type, category_id
);
```

**Columns:**
- `user_id`: User identifier
- `financial_account_id`: Account filter
- `month`: First day of the month
- `type`: EXPENSE or INCOME
- `parent_category`: Top-level category (e.g., "food")
- `category_full_name`: Full category path (e.g., "food:groceries")
- `category_id`: Category identifier
- `total_amount`: Sum of split amounts (in cents)
- `transaction_count`: Number of transactions

---

## 2. Monthly Spending by Payee

Aggregates transactions by payee per month.

```sql
CREATE MATERIALIZED VIEW mv_monthly_payee_spending AS
SELECT 
    t.user_id,
    t.financial_account_id,
    DATE_TRUNC('month', t.date) AS month,
    t.type,
    t.payee_id,
    t.payee_name,
    SUM(t.total_amount) AS total_amount,
    COUNT(*) AS transaction_count
FROM transaction t
WHERE t.deleted_at IS NULL
GROUP BY 
    t.user_id,
    t.financial_account_id,
    DATE_TRUNC('month', t.date),
    t.type,
    t.payee_id,
    t.payee_name;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_mv_payee_spending ON mv_monthly_payee_spending(
    user_id, financial_account_id, month, type, payee_id
);
```

**Columns:**
- `user_id`: User identifier
- `financial_account_id`: Account filter
- `month`: First day of the month
- `type`: EXPENSE or INCOME
- `payee_id`: Payee identifier
- `payee_name`: Payee display name
- `total_amount`: Sum of transaction amounts (in cents)
- `transaction_count`: Number of transactions

---

## 3. Refresh Function

```sql
CREATE OR REPLACE FUNCTION refresh_spending_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_category_spending;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_payee_spending;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**
```sql
SELECT refresh_spending_views();
```

---

## 4. Refresh Strategies

### Option A: Scheduled Refresh (Recommended)

Use pg_cron or application scheduler:

```sql
-- Using pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Refresh every hour
SELECT cron.schedule('refresh-spending-views', '0 * * * *', 'SELECT refresh_spending_views()');

-- Or every 15 minutes during business hours
SELECT cron.schedule('refresh-spending-views', '*/15 8-20 * * *', 'SELECT refresh_spending_views()');
```

### Option B: Event-Driven Refresh

Refresh after significant changes:

```sql
-- After batch import
CREATE OR REPLACE FUNCTION refresh_on_batch_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh if significant number of rows changed
    IF TG_OP = 'INSERT' AND (SELECT COUNT(*) FROM new_table) > 100 THEN
        PERFORM refresh_spending_views();
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### Option C: Application-Level Refresh

```typescript
// In NestJS service
async refreshReportViews(): Promise<void> {
    await this.pool.query('SELECT refresh_spending_views()');
}

// Call after bulk operations
async importTransactions(data: Transaction[]): Promise<void> {
    await this.bulkInsert(data);
    await this.refreshReportViews();
}
```

---

## 5. Query Examples

### Spending by Category Report

```sql
SELECT 
    parent_category,
    category_full_name,
    total_amount,
    transaction_count
FROM mv_monthly_category_spending
WHERE user_id = $1
    AND financial_account_id = $2
    AND month >= $3 AND month <= $4
    AND type = 'EXPENSE'
ORDER BY total_amount DESC;
```

### Spending by Payee Report

```sql
SELECT 
    payee_id,
    payee_name,
    total_amount,
    transaction_count
FROM mv_monthly_payee_spending
WHERE user_id = $1
    AND financial_account_id = $2
    AND month >= $3 AND month <= $4
    AND type = 'EXPENSE'
ORDER BY total_amount DESC;
```

### Category Tree with Totals

```sql
WITH category_totals AS (
    SELECT 
        parent_category,
        category_full_name,
        SUM(total_amount) AS total_amount
    FROM mv_monthly_category_spending
    WHERE user_id = $1
        AND financial_account_id = $2
        AND month >= $3 AND month <= $4
        AND type = $5
    GROUP BY parent_category, category_full_name
)
SELECT 
    parent_category,
    SUM(total_amount) AS parent_total,
    JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'category', category_full_name,
            'amount', total_amount
        ) ORDER BY total_amount DESC
    ) AS children
FROM category_totals
GROUP BY parent_category
ORDER BY parent_total DESC;
```

---

## 6. Performance Considerations

1. **Concurrent Refresh**: Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` to avoid locks
2. **Unique Index Required**: Concurrent refresh requires a unique index
3. **Stale Data**: Views may be slightly behind real-time data
4. **Storage**: Materialized views consume disk space
5. **Refresh Time**: Large datasets may take seconds to refresh

---

## 7. Monitoring

```sql
-- Check last refresh time
SELECT schemaname, matviewname, 
       pg_size_pretty(pg_total_relation_size(schemaname || '.' || matviewname)) AS size
FROM pg_matviews 
WHERE matviewname LIKE 'mv_%';

-- Check row counts
SELECT 'mv_monthly_category_spending' AS view_name, COUNT(*) FROM mv_monthly_category_spending
UNION ALL
SELECT 'mv_monthly_payee_spending', COUNT(*) FROM mv_monthly_payee_spending;
```
