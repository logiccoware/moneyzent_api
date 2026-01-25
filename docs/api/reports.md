# Reports API Documentation

## Overview

The Reports API provides analytical insights into financial data. It aggregates transactions and returns data optimized for visualization (e.g., pie charts, summaries). All endpoints require authentication.

**Base Path:** `/reports`

**Authentication:** Required for all endpoints

---

## Data Models

### PieChartDataItem

| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique identifier for the pie slice (0-indexed) |
| value | number | Numeric value (amount in dollars) |
| label | string | Display label for the slice |
| formattedValue | string | Formatted value with currency symbol |

### SpendingsPayeesResponse

| Field | Type | Description |
|-------|------|-------------|
| totalAmount | number | Sum of all transaction amounts (in cents) |
| formattedTotalAmount | string | Formatted total with currency symbol |
| pieChartData | PieChartDataItem[] | Aggregated by payee |

### SpendingsCategoriesResponse

| Field | Type | Description |
|-------|------|-------------|
| categoryTree | CategoryTreeNode[] | Hierarchical tree structure |
| totalAmount | number | Sum of all transaction amounts (in cents) |
| formattedTotalAmount | string | Formatted total with currency symbol |
| pieChartData | PieChartDataItem[] | Aggregated by parent category |

### CategoryTreeNode

| Field | Type | Description |
|-------|------|-------------|
| categoryId | string | Category ID |
| categoryName | string | Parent category name |
| totalAmount | number | Total including subcategories (in cents) |
| formattedTotalAmount | string | Formatted total with currency symbol |
| children | CategoryTreeChild[] | Subcategories |

### CategoryTreeChild

| Field | Type | Description |
|-------|------|-------------|
| categoryId | string | Subcategory ID |
| categoryName | string | Subcategory name (without parent prefix) |
| totalAmount | number | Subcategory total (in cents) |
| formattedTotalAmount | string | Formatted total with currency symbol |

---

## Query Parameters

All report endpoints use these common query parameters:

| Parameter | Type | Description | Required | Validation |
|-----------|------|-------------|----------|------------|
| accountId | string | Filter by account ID | Yes | Min 1 character |
| startOfMonth | string | Start date filter (ISO 8601) | Yes | Valid date |
| endOfMonth | string | End date filter (ISO 8601) | Yes | Valid date |
| transactionType | enum | Filter by type: `"EXPENSE"` \| `"INCOME"` | Yes | Valid enum |

**Example date range for December 2025:**
```
startOfMonth=2025-12-01T00:00:00.000Z
endOfMonth=2025-12-31T23:59:59.999Z
```

---

## Endpoints

### 1. Get Spendings by Payees

**GET** `/reports/spendings/payees`

Retrieves aggregated spending data grouped by payee, with pie chart data for visualization.

**Query Parameters:** See [Query Parameters](#query-parameters)

**Response:**
- **Status Code:** 200 OK
- **Body:** `SpendingsPayeesResponse`

**Response Example:**
```json
{
  "totalAmount": 33500,
  "formattedTotalAmount": "$335.00",
  "pieChartData": [
    {
      "id": 0,
      "value": 250.00,
      "label": "Walmart",
      "formattedValue": "$250.00"
    },
    {
      "id": 1,
      "value": 85.00,
      "label": "Amazon",
      "formattedValue": "$85.00"
    }
  ]
}
```

**Pie Chart Data Details:**
- Data aggregated by `payeeId`, summing all transaction amounts per payee
- Sorted by `value` descending (highest spending first)
- `id` field is 0-indexed after sorting
- Empty results return empty array and zero totals

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid or missing authentication token

---

### 2. Get Spendings by Categories

**GET** `/reports/spendings/categories`

Retrieves aggregated spending data organized in a hierarchical tree structure by category. Pie chart data shows totals per parent category.

**Query Parameters:** See [Query Parameters](#query-parameters)

**Response:**
- **Status Code:** 200 OK
- **Body:** `SpendingsCategoriesResponse`

**Response Example:**
```json
{
  "categoryTree": [
    {
      "categoryId": "cat001",
      "categoryName": "food",
      "totalAmount": 35000,
      "formattedTotalAmount": "$350.00",
      "children": [
        {
          "categoryId": "cat002",
          "categoryName": "groceries",
          "totalAmount": 25000,
          "formattedTotalAmount": "$250.00"
        },
        {
          "categoryId": "cat003",
          "categoryName": "dining",
          "totalAmount": 10000,
          "formattedTotalAmount": "$100.00"
        }
      ]
    },
    {
      "categoryId": "cat010",
      "categoryName": "transport",
      "totalAmount": 15000,
      "formattedTotalAmount": "$150.00",
      "children": [
        {
          "categoryId": "cat011",
          "categoryName": "gas",
          "totalAmount": 8000,
          "formattedTotalAmount": "$80.00"
        },
        {
          "categoryId": "cat012",
          "categoryName": "rideshare",
          "totalAmount": 7000,
          "formattedTotalAmount": "$70.00"
        }
      ]
    },
    {
      "categoryId": "cat020",
      "categoryName": "shopping",
      "totalAmount": 8500,
      "formattedTotalAmount": "$85.00",
      "children": []
    }
  ],
  "totalAmount": 58500,
  "formattedTotalAmount": "$585.00",
  "pieChartData": [
    {
      "id": 0,
      "value": 350.00,
      "label": "food",
      "formattedValue": "$350.00"
    },
    {
      "id": 1,
      "value": 150.00,
      "label": "transport",
      "formattedValue": "$150.00"
    },
    {
      "id": 2,
      "value": 85.00,
      "label": "shopping",
      "formattedValue": "$85.00"
    }
  ]
}
```

**Tree Structure Details:**
- **Parent categories** contain total of all subcategories combined
- **Children** are subcategories with individual totals
- Sorted by `totalAmount` descending at both levels
- Empty results return empty arrays and zero totals

**Pie Chart Data Details:**
- Shows totals per **parent category only** (includes subcategory amounts)
- Sorted by `value` descending
- `id` field is 0-indexed

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid or missing authentication token

---

## Usage Examples

### Example 1: Get December 2025 Expenses by Payee

```bash
curl -X GET "https://api.example.com/reports/spendings/payees?startOfMonth=2025-12-01&endOfMonth=2025-12-31&accountId=acc-uuid&transactionType=EXPENSE" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 2: Get December 2025 Expenses by Category

```bash
curl -X GET "https://api.example.com/reports/spendings/categories?startOfMonth=2025-12-01&endOfMonth=2025-12-31&accountId=acc-uuid&transactionType=EXPENSE" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: Get Income by Payee

```bash
curl -X GET "https://api.example.com/reports/spendings/payees?startOfMonth=2025-12-01&endOfMonth=2025-12-31&accountId=acc-uuid&transactionType=INCOME" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## TypeScript Types

```typescript
type TransactionType = 'EXPENSE' | 'INCOME';

interface PieChartDataItem {
  id: number;
  value: number;
  label: string;
  formattedValue: string;
}

interface SpendingsPayeesResponse {
  totalAmount: number;
  formattedTotalAmount: string;
  pieChartData: PieChartDataItem[];
}

interface CategoryTreeChild {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  formattedTotalAmount: string;
}

interface CategoryTreeNode {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  formattedTotalAmount: string;
  children: CategoryTreeChild[];
}

interface SpendingsCategoriesResponse {
  categoryTree: CategoryTreeNode[];
  totalAmount: number;
  formattedTotalAmount: string;
  pieChartData: PieChartDataItem[];
}

interface ReportQueryParams {
  accountId: string;
  startOfMonth: string;
  endOfMonth: string;
  transactionType: TransactionType;
}
```

---

## Frontend Integration

### With MUI X Charts

The `pieChartData` is ready to use with `@mui/x-charts`:

```tsx
import { PieChart } from '@mui/x-charts/PieChart';

<PieChart
  series={[
    {
      data: response.pieChartData,
      highlightScope: { faded: 'global', highlighted: 'item' },
    },
  ]}
  width={400}
  height={200}
/>
```

### Category Tree with MUI TreeView

```tsx
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

function CategoryTree({ data }: { data: SpendingsCategoriesResponse }) {
  return (
    <SimpleTreeView>
      {data.categoryTree.map((parent) => (
        <TreeItem
          key={parent.categoryId}
          itemId={parent.categoryId}
          label={`${parent.categoryName} (${parent.formattedTotalAmount})`}
        >
          {parent.children.map((child) => (
            <TreeItem
              key={child.categoryId}
              itemId={child.categoryId}
              label={`${child.categoryName} (${child.formattedTotalAmount})`}
            />
          ))}
        </TreeItem>
      ))}
    </SimpleTreeView>
  );
}
```

---

## Performance Notes

1. **Materialized Views**: Reports use pre-computed materialized views for fast queries
2. **Refresh Schedule**: Views are refreshed periodically (see database documentation)
3. **Date Range**: Large date ranges may take longer; consider monthly queries
4. **Caching**: Consider client-side caching for frequently accessed reports
