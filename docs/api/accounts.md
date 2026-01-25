# Accounts API Documentation

## Overview

The Accounts API manages user financial accounts. Accounts are referenced by transactions (via `accountId`). All endpoints require authentication.

**Base Path:** `/accounts`

**Authentication:** Required for all endpoints

---

## Data Models

### Account

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | string (UUID) | Unique account identifier | Yes (response only) |
| name | string | Account name | Yes |
| currencyType | enum | Currency for the account: `"USD"` \| `"CAD"` | Yes |

### ErrorResponse

All errors are returned in a consistent envelope:

| Field | Type | Description |
|-------|------|-------------|
| statusCode | number | HTTP status code |
| message | string \| object | Error message (string for most errors; object for schema validation failures) |
| error | string | HTTP status text (e.g., `Bad Request`, `Unauthorized`, `Not Found`) |
| timestamp | string | ISO timestamp |
| path | string | Request path |

---

## Endpoints

### 1. List Accounts

**GET** `/accounts`

Returns all accounts for the authenticated user.

**Response:**
- **Status Code:** 200 OK
- **Body:** `Account[]`

**Response Example:**
```json
[
  { "id": "550e8400-e29b-41d4-a716-446655440000", "name": "Checking", "currencyType": "USD" },
  { "id": "550e8400-e29b-41d4-a716-446655440001", "name": "Credit Card", "currencyType": "CAD" }
]
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token

---

### 2. Create Account

**POST** `/accounts`

Creates a new account for the authenticated user.

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character |
| currencyType | enum | Yes | `"USD"` \| `"CAD"` |

**Request Example:**
```json
{
  "name": "Checking",
  "currencyType": "USD"
}
```

**Response:**
- **Status Code:** 201 Created
- **Body:** `Account`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Checking",
  "currencyType": "USD"
}
```

**Error Responses:**
- `400 Bad Request`: Schema validation failure
- `401 Unauthorized`: Invalid or missing authentication token
- `409 Conflict`: Account with same name already exists

**Validation Error Example (400):**
```json
{
  "statusCode": 400,
  "message": {
    "message": "SCHEMA_VALIDATION_FAILED",
    "errors": {
      "name": ["Name must be at least 1 character long"],
      "currencyType": ["Invalid enum value. Expected 'USD' | 'CAD', received 'INR'"]
    }
  },
  "error": "Bad Request",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/accounts"
}
```

---

### 3. Get Account

**GET** `/accounts/:id`

Returns a single account by id.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Account id | Yes |

**Response:**
- **Status Code:** 200 OK
- **Body:** `Account`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Checking",
  "currencyType": "USD"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Account not found

---

### 4. Update Account

**PATCH** `/accounts/:id`

Updates an existing account's name and currency.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Account id | Yes |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character |
| currencyType | enum | Yes | `"USD"` \| `"CAD"` |

**Request Example:**
```json
{
  "name": "Main Checking",
  "currencyType": "USD"
}
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `Account`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Main Checking",
  "currencyType": "USD"
}
```

**Error Responses:**
- `400 Bad Request`: Schema validation failure
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Account not found
- `409 Conflict`: Account with same name already exists

---

### 5. Delete Account

**DELETE** `/accounts/:id`

Deletes an account (soft delete).

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Account id | Yes |

**Response:**
- **Status Code:** 204 No Content
- **Body:** (empty)

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Account not found
- `409 Conflict`: Account has associated transactions

---

## TypeScript Types

```typescript
type CurrencyType = 'USD' | 'CAD';

interface Account {
  id: string;
  name: string;
  currencyType: CurrencyType;
}

interface CreateAccountRequest {
  name: string;
  currencyType: CurrencyType;
}

interface UpdateAccountRequest {
  name: string;
  currencyType: CurrencyType;
}
```
