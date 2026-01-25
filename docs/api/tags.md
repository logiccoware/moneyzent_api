# Tags API Documentation

## Overview

The Tags API manages user-defined tags for transaction line items. Tags track usage count and are automatically created when referenced in transactions. All endpoints require authentication.

**Base Path:** `/tags`

**Authentication:** Required for all endpoints

---

## Data Models

### Tag

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | string (UUID) | Unique tag identifier | Yes (response only) |
| name | string | Tag name (lowercase) | Yes |
| usageCount | number | Number of line items using this tag | Yes (response only) |

### ErrorResponse

| Field | Type | Description |
|-------|------|-------------|
| statusCode | number | HTTP status code |
| message | string \| object | Error message |
| error | string | HTTP status text |
| timestamp | string | ISO timestamp |
| path | string | Request path |

---

## Tag Behavior

1. **Lowercase normalization**: All tag names are stored and returned in lowercase
2. **Usage tracking**: `usageCount` is automatically incremented/decremented via database trigger
3. **Auto-creation**: Tags can be auto-created when referenced in transaction line items
4. **Sorting**: Default list is sorted by `usageCount` descending (most used first)

---

## Endpoints

### 1. List Tags

**GET** `/tags`

Returns all tags for the authenticated user, sorted by usage count (descending).

**Response:**
- **Status Code:** 200 OK
- **Body:** `Tag[]`

**Response Example:**
```json
[
  { "id": "550e8400-e29b-41d4-a716-446655440000", "name": "groceries", "usageCount": 47 },
  { "id": "550e8400-e29b-41d4-a716-446655440001", "name": "organic", "usageCount": 23 },
  { "id": "550e8400-e29b-41d4-a716-446655440002", "name": "essentials", "usageCount": 12 }
]
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token

---

### 2. Create Tag

**POST** `/tags`

Creates a new tag for the authenticated user.

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character, max 50 characters |

**Request Example:**
```json
{
  "name": "Organic"
}
```

**Response:**
- **Status Code:** 201 Created
- **Body:** `Tag`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "organic",
  "usageCount": 0
}
```

**Note:** The name is normalized to lowercase.

**Error Responses:**
- `400 Bad Request`: Schema validation failure
- `401 Unauthorized`: Invalid or missing authentication token
- `409 Conflict`: Tag with same name already exists (case-insensitive)

---

### 3. Get Tag

**GET** `/tags/:id`

Returns a single tag by id.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Tag id | Yes |

**Response:**
- **Status Code:** 200 OK
- **Body:** `Tag`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "organic",
  "usageCount": 23
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Tag not found

---

### 4. Update Tag

**PATCH** `/tags/:id`

Updates an existing tag's name.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Tag id | Yes |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character, max 50 characters |

**Request Example:**
```json
{
  "name": "Organic Produce"
}
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `Tag`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "organic produce",
  "usageCount": 23
}
```

**Error Responses:**
- `400 Bad Request`: Schema validation failure
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Tag not found
- `409 Conflict`: Tag with same name already exists

---

### 5. Delete Tag

**DELETE** `/tags/:id`

Deletes an existing tag (soft delete). Associated line item references are also removed.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Tag id | Yes |

**Response:**
- **Status Code:** 204 No Content
- **Body:** (empty)

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Tag not found

---

## TypeScript Types

```typescript
interface Tag {
  id: string;
  name: string;
  usageCount: number;
}

interface CreateTagRequest {
  name: string;
}

interface UpdateTagRequest {
  name: string;
}
```

---

## Usage Count Behavior

The `usageCount` field is managed automatically by database triggers:

| Action | Effect |
|--------|--------|
| Tag added to line item | `usageCount += 1` |
| Tag removed from line item | `usageCount -= 1` |
| Line item deleted | `usageCount -= 1` for each tag |
| Transaction deleted | Cascades to line items, updating counts |

This enables features like:
- Sorting tags by popularity
- Suggesting frequently used tags
- Identifying unused tags for cleanup
