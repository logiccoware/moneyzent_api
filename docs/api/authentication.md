# Authentication API Documentation

## Overview

The Authentication API handles user registration, login, session management, and password reset using Better Auth. This replaces the previous Firebase Authentication implementation.

**Base Path:** `/auth`

---

## Authentication Methods

### Session-Based Authentication

Better Auth uses session tokens for authentication. Sessions can be managed via:

1. **Bearer Token**: Pass session token in Authorization header
2. **Cookie**: Session token stored in HTTP-only cookie

**Header Format:**
```
Authorization: Bearer <session_token>
```

**Cookie Format:**
```
Cookie: better-auth.session_token=<session_token>
```

---

## Data Models

### User

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique user identifier |
| email | string | User email address |
| name | string \| null | Display name |
| emailVerified | boolean | Email verification status |
| image | string \| null | Profile image URL |
| role | string | User role (`user`, `admin`) |
| createdAt | string | Creation timestamp (ISO 8601) |
| updatedAt | string | Last update timestamp (ISO 8601) |

### Session

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Session identifier |
| userId | string | Associated user ID |
| token | string | Session token |
| expiresAt | string | Expiration timestamp (ISO 8601) |
| ipAddress | string \| null | Client IP address |
| userAgent | string \| null | Client user agent |

### AuthResponse

| Field | Type | Description |
|-------|------|-------------|
| user | User | User object |
| session | Session | Session object |

---

## Endpoints

### 1. Sign Up

**POST** `/auth/sign-up`

Registers a new user account.

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email format |
| password | string | Yes | Min 8 characters |
| name | string | No | Display name |

**Request Example:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:**
- **Status Code:** 201 Created
- **Body:** `AuthResponse`

**Response Example:**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "image": null,
    "role": "user",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session-uuid",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "session_token_here",
    "expiresAt": "2025-01-08T00:00:00.000Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email format or weak password
- `409 Conflict`: Email already registered

---

### 2. Sign In

**POST** `/auth/sign-in`

Authenticates an existing user.

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| password | string | Yes |

**Request Example:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `AuthResponse`

**Error Responses:**
- `400 Bad Request`: Invalid credentials
- `401 Unauthorized`: Email not verified (if required)

---

### 3. Sign Out

**POST** `/auth/sign-out`

Terminates the current session.

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `{ "success": true }`

**Error Responses:**
- `401 Unauthorized`: Invalid or expired session

---

### 4. Get Session

**GET** `/auth/session`

Returns the current session and user information.

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `AuthResponse`

**Response Example:**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "image": null,
    "role": "user",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session-uuid",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "session_token_here",
    "expiresAt": "2025-01-08T00:00:00.000Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired session

---

### 5. Forgot Password

**POST** `/auth/forgot-password`

Initiates password reset by sending an email with reset link.

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |

**Request Example:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `{ "success": true }`

**Note:** Always returns success to prevent email enumeration.

---

### 6. Reset Password

**POST** `/auth/reset-password`

Completes password reset using token from email.

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| token | string | Yes |
| newPassword | string | Yes |

**Request Example:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newSecurePassword456"
}
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `{ "success": true }`

**Error Responses:**
- `400 Bad Request`: Invalid or expired token, or weak password

---

### 7. Verify Email

**POST** `/auth/verify-email`

Verifies user email using token from verification email.

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| token | string | Yes |

**Response:**
- **Status Code:** 200 OK
- **Body:** `{ "success": true }`

**Error Responses:**
- `400 Bad Request`: Invalid or expired token

---

### 8. Resend Verification Email

**POST** `/auth/resend-verification`

Resends email verification link.

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response:**
- **Status Code:** 200 OK
- **Body:** `{ "success": true }`

**Error Responses:**
- `400 Bad Request`: Email already verified
- `401 Unauthorized`: Not authenticated

---

## OAuth Providers (Optional)

Better Auth supports OAuth providers. If configured:

### Google OAuth

**GET** `/auth/google`

Redirects to Google OAuth flow.

**GET** `/auth/google/callback`

Handles OAuth callback and creates session.

### GitHub OAuth

**GET** `/auth/github`

Redirects to GitHub OAuth flow.

**GET** `/auth/github/callback`

Handles OAuth callback and creates session.

---

## Session Management

### Session Duration

- Default session duration: 7 days
- Sessions can be extended on activity
- Expired sessions are automatically cleaned up

### Multiple Sessions

- Users can have multiple active sessions (different devices)
- Sign out only terminates current session
- "Sign out all devices" endpoint can be added if needed

---

## Migration from Firebase Auth

### Token Format Change

| Before (Firebase) | After (Better Auth) |
|-------------------|---------------------|
| Firebase ID Token (JWT) | Session Token |
| `Authorization: Bearer <firebase_jwt>` | `Authorization: Bearer <session_token>` |
| Token contains claims | Session references user in DB |

### User ID Format Change

| Before (Firebase) | After (Better Auth) |
|-------------------|---------------------|
| Firebase UID (string) | UUID |
| Example: `abc123XYZ` | Example: `550e8400-e29b-41d4-a716-446655440000` |

### Custom Claims → Role Field

| Before (Firebase) | After (Better Auth) |
|-------------------|---------------------|
| `token.role` (custom claim) | `user.role` (database field) |
| Set via Admin SDK | Set via database update |

---

## TypeScript Types

```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

interface AuthResponse {
  user: User;
  session: Session;
}

interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
}

interface SignInRequest {
  email: string;
  password: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
```

---

## Security Considerations

1. **Password Requirements**: Minimum 8 characters (configure stronger rules as needed)
2. **Rate Limiting**: Implement rate limiting on auth endpoints
3. **HTTPS Only**: Always use HTTPS in production
4. **Secure Cookies**: Session cookies should be HTTP-only and Secure
5. **Token Rotation**: Consider implementing token rotation on sensitive actions
