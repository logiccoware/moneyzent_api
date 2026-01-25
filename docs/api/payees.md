# Payees API Documentation

## Overview

The Payees API manages payees for the authenticated user. Payees are used by transactions (via `payeeId`). All endpoints require authentication.

**Base Path:** `/payees`

**Authentication:** Required for all endpoints

---

## Data Models

### Payee

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | string (UUID) | Unique payee identifier | Yes (response only) |
| name | string | Payee name | Yes |

### ErrorResponse

All errors are returned in a consistent envelope:

| Field | Type | Description |
|-------|------|-------------|
| statusCode | number | HTTP status code |
| message | string \| object | Error message |
| error | string | HTTP status text |
| timestamp | string | ISO timestamp |
| path | string | Request path |

---

## Endpoints

### 1. List Payees

**GET** `/payees`

Returns all payees for the authenticated user, sorted alphabetically by name.

**Response:**
- **Status Code:** 200 OK
- **Body:** `Payee[]`

**Response Example:**
```json
[
  { "id": "550e8400-e29b-41d4-a716-446655440000", "name": "Amazon" },
  { "id": "550e8400-e29b-41d4-a716-446655440001", "name": "Walmart" }
]
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token

---

### 2. Create Payee

**POST** `/payees`

Creates a new payee for the authenticated user.

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character |

**Request Example:**
```json
{
  "name": "Walmart"
}
```

**Response:**
- **Status Code:** 201 Created
- **Body:** `Payee`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Walmart"
}
```

**Error Responses:**
- `400 Bad Request`: Schema validation failure
- `401 Unauthorized`: Invalid or missing authentication token
- `409 Conflict`: Payee with same name already exists

---

### 3. Get Payee

**GET** `/payees/:id`

Returns a single payee by id.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Payee id | Yes |

**Response:**
- **Status Code:** 200 OK
- **Body:** `Payee`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Walmart"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Payee not found

---

### 4. Update Payee

**PATCH** `/payees/:id`

Updates an existing payee's name.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Payee id | Yes |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character |

**Request Example:**
```json
{
  "name": "Walmart Supercenter"
}
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `Payee`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Walmart Supercenter"
}
```

**Error Responses:**
- `400 Bad Request`: Schema validation failure
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Payee not found
- `409 Conflict`: Payee with same name already exists

---

### 5. Delete Payee

**DELETE** `/payees/:id`

Deletes an existing payee (soft delete).

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Payee id | Yes |

**Response:**
- **Status Code:** 204 No Content
- **Body:** (empty)

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Payee not found
- `409 Conflict`: Payee has associated transactions

---

## TypeScript Types

```typescript
interface Payee {
  id: string;
  name: string;
}

interface CreatePayeeRequest {
  name: string;
}

interface UpdatePayeeRequest {
  name: string;
}
```
