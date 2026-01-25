# Transactions API Documentation

## Overview

The Transactions API manages financial transactions for users. Each transaction contains splits (for categorization) and optional line items with tags. All endpoints require authentication.

**Base Path:** `/transactions`

**Authentication:** Required for all endpoints

---

## Data Models

### Transaction

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | string (UUID) | Unique transaction identifier | Yes (response only) |
| date | string | Transaction date (ISO 8601) | Yes |
| payeeId | string | Payee ID | Yes |
| payeeName | string | Payee name (denormalized) | Yes (response only) |
| accountId | string | Account ID | Yes |
| accountName | string | Account name (denormalized) | Yes (response only) |
| currencyCode | enum | Currency code: `"USD"` \| `"CAD"` | Yes (response only) |
| totalAmount | number | Total transaction amount (in cents) | Yes (response only) |
| formattedTotalAmount | string | Formatted total with currency symbol | Yes (response only) |
| splitCount | number | Number of splits | Yes (response only) |
| type | enum | Transaction type: `"EXPENSE"` \| `"INCOME"` | Yes |
| memo | string \| null | Optional transaction memo | No |
| categoryName | string \| null | Derived category label from splits | Yes (response only) |
| splits | Split[] | Array of split objects | Yes |
| createdAt | string | Creation timestamp (ISO 8601) | Yes (response only) |
| updatedAt | string | Last update timestamp (ISO 8601) | Yes (response only) |

### Split

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| categoryId | string | Category ID | Yes |
| categoryFullName | string | Full category path (denormalized) | Yes (response only) |
| amount | number | Split amount (in cents, positive) | Yes |
| formattedAmount | string | Formatted amount with currency symbol | Yes (response only) |
| memo | string \| null | Optional split memo | No |
| lineItems | LineItem[] | Array of line item objects | No |

### LineItem

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| name | string | Line item description | Yes |
| amount | number | Line item amount (in cents, positive) | Yes |
| formattedAmount | string | Formatted amount with currency symbol | Yes (response only) |
| tags | string[] | Array of tag names | No |
| memo | string \| null | Optional line item memo | No |

### TransactionsGroup

| Field | Type | Description |
|-------|------|-------------|
| date | string | Date in YYYY-MM-DD format |
| transactions | Transaction[] | Transactions for this date |

### TransactionsGroupedResponse

| Field | Type | Description |
|-------|------|-------------|
| transactionsGroup | TransactionsGroup[] | Grouped transactions |

---

## Validation Rules

1. **At least one split**: Every transaction must have at least one split
2. **Positive amounts**: All split and line item amounts must be positive integers
3. **Line item sum**: If a split has line items, their amounts must sum to the split amount
4. **Entity existence**: payeeId, accountId, and categoryId must reference existing entities

---

## Endpoints

### 1. Get Filtered Transactions (Grouped by Date)

**GET** `/transactions/filter`

Retrieves transactions filtered by account and date range, grouped by date.

**Query Parameters:**

| Parameter | Type | Description | Required | Validation |
|-----------|------|-------------|----------|------------|
| accountId | string | Filter by account ID | Yes | Min 1 character |
| startOfMonth | string | Start date filter (ISO 8601) | Yes | Valid date |
| endOfMonth | string | End date filter (ISO 8601) | Yes | Valid date |

**Response:**
- **Status Code:** 200 OK
- **Body:** `TransactionsGroupedResponse`

**Response Example:**
```json
{
  "transactionsGroup": [
    {
      "date": "2024-01-15",
      "transactions": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "date": "2024-01-15T00:00:00.000Z",
          "payeeId": "payee-uuid",
          "payeeName": "Walmart",
          "accountId": "account-uuid",
          "accountName": "Checking",
          "currencyCode": "USD",
          "totalAmount": 15050,
          "formattedTotalAmount": "$150.50",
          "splitCount": 2,
          "type": "EXPENSE",
          "memo": "Weekly shopping",
          "categoryName": "food",
          "splits": [
            {
              "categoryId": "cat-uuid-1",
              "categoryFullName": "food:groceries",
              "amount": 10050,
              "formattedAmount": "$100.50",
              "memo": null,
              "lineItems": []
            },
            {
              "categoryId": "cat-uuid-2",
              "categoryFullName": "household",
              "amount": 5000,
              "formattedAmount": "$50.00",
              "memo": null,
              "lineItems": [
                {
                  "name": "Paper towels",
                  "amount": 5000,
                  "formattedAmount": "$50.00",
                  "tags": ["essentials"],
                  "memo": null
                }
              ]
            }
          ],
          "createdAt": "2024-01-15T12:00:00.000Z",
          "updatedAt": "2024-01-15T12:00:00.000Z"
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid or missing authentication token

---

### 2. Get Transaction

**GET** `/transactions/:id`

Returns a single transaction by id.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Transaction id | Yes |

**Response:**
- **Status Code:** 200 OK
- **Body:** `Transaction`

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Transaction not found

---

### 3. Get Latest Transaction by Payee

**GET** `/transactions/latest`

Returns the most recent transaction for a given payee within an account.

**Query Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| accountId | string | Account ID to scope the search | Yes |
| payeeId | string | Payee ID to match | Yes |

**Response:**
- **Status Code:** 200 OK
- **Body:** `Transaction | null`

**Response Example (found):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2024-02-01T00:00:00.000Z",
  "payeeId": "payee-uuid",
  "payeeName": "Walmart",
  ...
}
```

**Response Example (not found):**
```json
null
```

---

### 4. Create Transaction

**POST** `/transactions`

Creates a new transaction.

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| date | string | Yes | Valid date (coerced) |
| payeeId | string | Yes | Min 1 character, must exist |
| accountId | string | Yes | Min 1 character, must exist |
| type | enum | Yes | `"EXPENSE"` \| `"INCOME"` |
| memo | string \| null | No | Nullable |
| splits | Split[] | Yes | Min 1 |

**Split (request):**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| categoryId | string | Yes | Min 1 character, must exist |
| amount | number | Yes | Integer, positive |
| memo | string \| null | No | Nullable |
| lineItems | LineItem[] | No | Defaults to `[]` |

**LineItem (request):**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character |
| amount | number | Yes | Integer, positive |
| tags | string[] | No | Defaults to `[]` |
| memo | string | No | Optional |

**Request Example:**
```json
{
  "date": "2024-01-15",
  "payeeId": "payee-uuid",
  "accountId": "account-uuid",
  "type": "EXPENSE",
  "memo": "Weekly groceries",
  "splits": [
    {
      "categoryId": "cat-uuid",
      "amount": 10000,
      "memo": "Produce and dairy",
      "lineItems": [
        {
          "name": "Organic vegetables",
          "amount": 6000,
          "tags": ["organic", "local"],
          "memo": null
        },
        {
          "name": "Milk and cheese",
          "amount": 4000,
          "tags": ["dairy"],
          "memo": null
        }
      ]
    }
  ]
}
```

**Response:**
- **Status Code:** 201 Created
- **Body:** `Transaction`

**Error Responses:**
- `400 Bad Request`: Schema validation failure OR split/line-item totals mismatch
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Payee/Account/Category not found

---

### 5. Update Transaction

**PATCH** `/transactions/:id`

Updates a transaction. All fields are optional, but if `splits` is provided it must contain at least 1 split.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Transaction id | Yes |

**Request Body (all optional):**

| Field | Type | Validation |
|-------|------|------------|
| date | string | Valid date (coerced) |
| payeeId | string | Min 1 character, must exist |
| accountId | string | Min 1 character, must exist |
| type | enum | `"EXPENSE"` \| `"INCOME"` |
| memo | string \| null | Nullable |
| splits | Split[] | Min 1 |

**Response:**
- **Status Code:** 200 OK
- **Body:** `Transaction`

**Error Responses:**
- `400 Bad Request`: Schema validation failure OR split/line-item totals mismatch
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Transaction/Payee/Account/Category not found

---

### 6. Delete Transaction

**DELETE** `/transactions/:id`

Deletes a transaction (soft delete).

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Transaction id | Yes |

**Response:**
- **Status Code:** 204 No Content
- **Body:** (empty)

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Transaction not found

---

## TypeScript Types

```typescript
type TransactionType = 'EXPENSE' | 'INCOME';
type CurrencyCode = 'USD' | 'CAD';

interface LineItem {
  name: string;
  amount: number;
  formattedAmount: string;
  tags: string[];
  memo: string | null;
}

interface Split {
  categoryId: string;
  categoryFullName: string;
  amount: number;
  formattedAmount: string;
  memo: string | null;
  lineItems: LineItem[];
}

interface Transaction {
  id: string;
  date: string;
  payeeId: string;
  payeeName: string;
  accountId: string;
  accountName: string;
  currencyCode: CurrencyCode;
  totalAmount: number;
  formattedTotalAmount: string;
  splitCount: number;
  type: TransactionType;
  memo: string | null;
  categoryName: string | null;
  splits: Split[];
  createdAt: string;
  updatedAt: string;
}

interface CreateTransactionRequest {
  date: string;
  payeeId: string;
  accountId: string;
  type: TransactionType;
  memo?: string | null;
  splits: {
    categoryId: string;
    amount: number;
    memo?: string | null;
    lineItems?: {
      name: string;
      amount: number;
      tags?: string[];
      memo?: string;
    }[];
  }[];
}

interface TransactionsGroup {
  date: string;
  transactions: Transaction[];
}

interface TransactionsGroupedResponse {
  transactionsGroup: TransactionsGroup[];
}
```
