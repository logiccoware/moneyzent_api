# Categories API Documentation

## Overview

The Categories API manages hierarchical categories for transaction categorization. Categories support a two-level hierarchy (parent → subcategory). All endpoints require authentication.

**Base Path:** `/categories`

**Authentication:** Required for all endpoints

---

## Data Models

### Category

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | string (UUID) | Unique category identifier | Yes (response only) |
| name | string | Category name | Yes |
| fullName | string | Full category path (e.g., "food:groceries") | Yes (response only) |
| parentId | string \| null | Parent category ID (null for top-level) | Yes (response only) |
| parentName | string \| null | Parent category name | Yes (response only) |

### CategoryTreeNode

| Field | Type | Description |
|-------|------|-------------|
| id | string | Category ID |
| name | string | Category name |
| fullName | string | Full category path |
| children | CategoryTreeNode[] | Subcategories |

### ErrorResponse

| Field | Type | Description |
|-------|------|-------------|
| statusCode | number | HTTP status code |
| message | string \| object | Error message |
| error | string | HTTP status text |
| timestamp | string | ISO timestamp |
| path | string | Request path |

---

## Hierarchy Rules

1. **Maximum 2 levels**: Parent → Subcategory (no deeper nesting)
2. **Full name format**: 
   - Parent: `"food"` (lowercase)
   - Subcategory: `"food:groceries"` (parent:child, lowercase)
3. **Cascade on parent update**: Changing parent name updates all subcategory full names
4. **Cascade on parent delete**: Deleting parent deletes all subcategories

---

## Endpoints

### 1. List Categories (Flat)

**GET** `/categories`

Returns all categories for the authenticated user as a flat list.

**Response:**
- **Status Code:** 200 OK
- **Body:** `Category[]`

**Response Example:**
```json
[
  { 
    "id": "550e8400-e29b-41d4-a716-446655440000", 
    "name": "Food", 
    "fullName": "food",
    "parentId": null,
    "parentName": null
  },
  { 
    "id": "550e8400-e29b-41d4-a716-446655440001", 
    "name": "Groceries", 
    "fullName": "food:groceries",
    "parentId": "550e8400-e29b-41d4-a716-446655440000",
    "parentName": "Food"
  }
]
```

---

### 2. Get Category Tree

**GET** `/categories/tree`

Returns categories organized as a hierarchical tree.

**Response:**
- **Status Code:** 200 OK
- **Body:** `CategoryTreeNode[]`

**Response Example:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Food",
    "fullName": "food",
    "children": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Groceries",
        "fullName": "food:groceries",
        "children": []
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Restaurants",
        "fullName": "food:restaurants",
        "children": []
      }
    ]
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Transport",
    "fullName": "transport",
    "children": []
  }
]
```

---

### 3. Create Parent Category

**POST** `/categories`

Creates a new top-level (parent) category.

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character |

**Request Example:**
```json
{
  "name": "Food"
}
```

**Response:**
- **Status Code:** 201 Created
- **Body:** `Category`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Food",
  "fullName": "food",
  "parentId": null,
  "parentName": null
}
```

**Error Responses:**
- `400 Bad Request`: Schema validation failure
- `401 Unauthorized`: Invalid or missing authentication token
- `409 Conflict`: Category with same name already exists

---

### 4. Create Subcategory

**POST** `/categories/subcategory`

Creates a new subcategory under an existing parent.

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character |
| parentId | string | Yes | Valid parent category ID |

**Request Example:**
```json
{
  "name": "Groceries",
  "parentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
- **Status Code:** 201 Created
- **Body:** `Category`

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Groceries",
  "fullName": "food:groceries",
  "parentId": "550e8400-e29b-41d4-a716-446655440000",
  "parentName": "Food"
}
```

**Error Responses:**
- `400 Bad Request`: Schema validation failure or parent is already a subcategory
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Parent category not found
- `409 Conflict`: Subcategory with same name already exists under this parent

**Error Example (cannot nest under subcategory):**
```json
{
  "statusCode": 400,
  "message": "Cannot create subcategory of a subcategory",
  "error": "Bad Request",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/categories/subcategory"
}
```

---

### 5. Get Category

**GET** `/categories/:id`

Returns a single category by id.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Category id | Yes |

**Response:**
- **Status Code:** 200 OK
- **Body:** `Category`

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Category not found

---

### 6. Update Category

**PATCH** `/categories/:id`

Updates an existing category's name. If updating a parent, subcategory full names are cascaded.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Category id | Yes |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 1 character |

**Request Example:**
```json
{
  "name": "Food & Beverages"
}
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `Category`

**Error Responses:**
- `400 Bad Request`: Schema validation failure
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Category not found
- `409 Conflict`: Category with same name already exists

---

### 7. Delete Category

**DELETE** `/categories/:id`

Deletes a category (soft delete). If deleting a parent, all subcategories are also deleted.

**Path Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| id | string (UUID) | Category id | Yes |

**Response:**
- **Status Code:** 204 No Content
- **Body:** (empty)

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Category not found
- `409 Conflict`: Category has associated transaction splits

---

## TypeScript Types

```typescript
interface Category {
  id: string;
  name: string;
  fullName: string;
  parentId: string | null;
  parentName: string | null;
}

interface CategoryTreeNode {
  id: string;
  name: string;
  fullName: string;
  children: CategoryTreeNode[];
}

interface CreateCategoryRequest {
  name: string;
}

interface CreateSubcategoryRequest {
  name: string;
  parentId: string;
}

interface UpdateCategoryRequest {
  name: string;
}
```
