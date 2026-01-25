# Transaction Attachments Architecture

This document outlines the architecture for allowing users to upload file attachments (images/PDFs) to transactions using AWS S3 with secure access control.

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [S3 Configuration](#s3-configuration)
- [API Design](#api-design)
- [Security Model](#security-model)
- [Deletion Strategy](#deletion-strategy)
- [Implementation Checklist](#implementation-checklist)

---

## Overview

Users can attach up to 5 files per transaction. Files are stored in a private S3 bucket and accessed exclusively through presigned URLs, ensuring only authenticated owners can view their documents.

### Key Principles

- **Private by default**: S3 bucket blocks all public access
- **Owner-only access**: Backend validates user ownership before generating presigned URLs
- **Direct upload**: Clients upload directly to S3, reducing API server bandwidth
- **Soft delete**: Attachments follow the same soft-delete pattern as transactions

---

## Requirements

| Requirement | Value |
|-------------|-------|
| Max attachments per transaction | 5 |
| Max file size | 10 MB |
| Allowed file types | JPEG, PNG, WebP, PDF |
| Upload URL expiry | 15 minutes |
| Download URL expiry | 1 hour |

### Allowed MIME Types

```
image/jpeg
image/png
image/webp
application/pdf
```

---

## Architecture

### High-Level Flow

```
┌────────────────────────────────────────────────────────────────┐
│                         Client                                  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ 1. Request    │    │ 3. Upload     │    │ 5. Download   │
│ Presigned URL │    │ to S3         │    │ from S3       │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Monovra     │    │     AWS       │    │     AWS       │
│     API       │    │      S3       │    │      S3       │
└───────┬───────┘    └───────────────┘    └───────────────┘
        │
        ▼
┌───────────────┐
│  PostgreSQL   │
│  (metadata)   │
└───────────────┘
```

### File Structure

```
src/
├── common/
│   └── config/
│       └── env.config.ts              # Add S3 environment variables
│
├── modules/
│   ├── storage/
│   │   ├── storage.module.ts          # S3 module
│   │   ├── storage.service.ts         # Presigned URL generation, delete
│   │   └── storage.constants.ts       # Bucket config, limits
│   │
│   └── transaction/
│       ├── entities/
│       │   ├── index.ts
│       │   └── transaction-attachment.entity.ts
│       ├── dto/
│       │   └── req/
│       │       └── attachment.dto.ts  # Presign, confirm DTOs
│       ├── attachment.controller.ts   # Attachment endpoints
│       └── attachment.service.ts      # Attachment business logic
│
└── migrations/
    └── {timestamp}-CreateTransactionAttachment.ts
```

---

## Database Schema

### Transaction Attachment Table

```sql
CREATE TABLE transaction_attachment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  mime_type TEXT NOT NULL CHECK (mime_type IN (
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
  )),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_attachment_transaction 
  ON transaction_attachment(transaction_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_attachment_user 
  ON transaction_attachment(user_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_attachment_deleted 
  ON transaction_attachment(deleted_at) 
  WHERE deleted_at IS NOT NULL;
```

### Entity Definition

```typescript
// src/modules/transaction/entities/transaction-attachment.entity.ts

@Entity("transaction_attachment")
@Index("idx_attachment_transaction", ["transactionId"], { 
  where: '"deleted_at" IS NULL' 
})
@Index("idx_attachment_user", ["userId"], { 
  where: '"deleted_at" IS NULL' 
})
export class TransactionAttachmentEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "transaction_id", type: "uuid" })
  transactionId: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ name: "file_name", type: "text" })
  fileName: string;

  @Column({ name: "file_key", type: "text", unique: true })
  fileKey: string;

  @Column({ name: "file_size", type: "integer" })
  fileSize: number;

  @Column({ name: "mime_type", type: "text" })
  mimeType: string;

  @ManyToOne(() => TransactionEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "transaction_id" })
  transaction: TransactionEntity;
}
```

---

## S3 Configuration

### Bucket Structure

```
Bucket: monovra-attachments-{env}

attachments/
  └── {user_id}/
      └── {transaction_id}/
          └── {uuid}.{extension}

Example:
  attachments/
    550e8400-e29b-41d4-a716-446655440000/
      7c9e6679-7425-40de-944b-e07fc1f90ae7/
        a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
```

### Bucket Policy

Block all public access. Only allow access through presigned URLs.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceHTTPS",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::monovra-attachments-prod",
        "arn:aws:s3:::monovra-attachments-prod/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

### CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["https://app.monovra.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### IAM Policy for API Server

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AttachmentsBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::monovra-attachments-*/*"
    }
  ]
}
```

### Environment Variables

```env
# S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_ATTACHMENTS_BUCKET=monovra-attachments-prod
```

---

## API Design

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transactions/:id/attachments/presign` | Get presigned upload URL |
| `POST` | `/transactions/:id/attachments/confirm` | Confirm upload and save metadata |
| `GET` | `/transactions/:id/attachments` | List all attachments |
| `GET` | `/transactions/:id/attachments/:attachmentId/url` | Get presigned download URL |
| `DELETE` | `/transactions/:id/attachments/:attachmentId` | Delete attachment |

### Request/Response Schemas

#### POST /presign

Request:
```typescript
{
  fileName: string;   // "receipt.pdf"
  mimeType: string;   // "application/pdf"
  fileSize: number;   // 1048576 (bytes)
}
```

Response:
```typescript
{
  uploadUrl: string;  // Presigned PUT URL
  fileKey: string;    // S3 object key
  expiresIn: number;  // Seconds until expiry (900)
}
```

#### POST /confirm

Request:
```typescript
{
  fileKey: string;    // From presign response
  fileName: string;   // Original filename
  fileSize: number;   // File size in bytes
  mimeType: string;   // MIME type
}
```

Response:
```typescript
{
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}
```

#### GET /attachments

Response:
```typescript
{
  attachments: [
    {
      id: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      createdAt: string;
    }
  ]
}
```

#### GET /attachments/:id/url

Response:
```typescript
{
  downloadUrl: string;  // Presigned GET URL
  expiresIn: number;    // Seconds until expiry (3600)
}
```

### Validation DTOs

```typescript
// src/modules/transaction/dto/req/attachment.dto.ts

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png", 
  "image/webp",
  "application/pdf",
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const PresignRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
});

export const ConfirmUploadSchema = z.object({
  fileKey: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
});
```

---

## Security Model

### Presigned URL Flow

#### Upload Flow

```
┌────────┐         ┌─────────┐         ┌────┐
│ Client │         │   API   │         │ S3 │
└───┬────┘         └────┬────┘         └─┬──┘
    │                   │                │
    │ 1. POST /presign  │                │
    │ ─────────────────>│                │
    │                   │                │
    │      2. Validate: │                │
    │      - Auth user  │                │
    │      - Owns txn   │                │
    │      - Count < 5  │                │
    │      - Valid mime │                │
    │      - Valid size │                │
    │                   │                │
    │ 3. { uploadUrl }  │                │
    │ <─────────────────│                │
    │                   │                │
    │ 4. PUT file       │                │
    │ ─────────────────────────────────> │
    │                   │                │
    │ 5. POST /confirm  │                │
    │ ─────────────────>│                │
    │                   │                │
    │      6. HEAD obj  │                │
    │      ────────────────────────────> │
    │                   │                │
    │      7. Save to DB│                │
    │                   │                │
    │ 8. { attachment } │                │
    │ <─────────────────│                │
```

#### Download Flow

```
┌────────┐         ┌─────────┐         ┌────┐
│ Client │         │   API   │         │ S3 │
└───┬────┘         └────┬────┘         └─┬──┘
    │                   │                │
    │ 1. GET /.../url   │                │
    │ ─────────────────>│                │
    │                   │                │
    │      2. Validate: │                │
    │      - Auth user  │                │
    │      - Owns txn   │                │
    │      - Attachment │                │
    │        exists     │                │
    │                   │                │
    │ 3. { downloadUrl }│                │
    │ <─────────────────│                │
    │                   │                │
    │ 4. GET file       │                │
    │ ─────────────────────────────────> │
    │                   │                │
    │ 5. File content   │                │
    │ <───────────────────────────────── │
```

### Security Checklist

| Concern | Mitigation |
|---------|------------|
| Unauthorized access | Validate user owns transaction before any operation |
| File type spoofing | Validate MIME type in presign request |
| Oversized files | Enforce Content-Length condition in presigned URL |
| Orphaned S3 files | Scheduled cleanup job (see Deletion Strategy) |
| URL sharing | Short expiry times (15 min upload, 1 hour download) |
| Path traversal | Generate UUID-based file keys, never use user input for paths |

---

## Deletion Strategy

### Approach: Soft Delete with Scheduled Cleanup

When a transaction is deleted, its attachments are soft-deleted. A scheduled job permanently removes files after a grace period.

#### 1. Soft Delete Attachments with Transaction

```typescript
// transaction.service.ts

async delete(userId: string, transactionId: string): Promise<void> {
  const transaction = await this.transactionRepository.findOne({
    where: { id: transactionId, userId },
  });

  if (!transaction) {
    throw new EntityNotFound(ENTITY.transaction, transactionId);
  }

  await this.dataSource.transaction(async (manager) => {
    // Soft delete attachments
    await manager.softDelete(TransactionAttachmentEntity, { transactionId });
    // Soft delete transaction
    await manager.softDelete(TransactionEntity, transactionId);
  });
}
```

#### 2. Individual Attachment Deletion

```typescript
// attachment.service.ts

async delete(
  userId: string, 
  transactionId: string, 
  attachmentId: string
): Promise<void> {
  const attachment = await this.attachmentRepository.findOne({
    where: { id: attachmentId, transactionId, userId },
  });

  if (!attachment) {
    throw new EntityNotFound(ENTITY.attachment, attachmentId);
  }

  // Soft delete from DB
  await this.attachmentRepository.softDelete(attachmentId);
  
  // Immediately delete from S3 (or queue for later)
  await this.storageService.delete(attachment.fileKey);
}
```

#### 3. Scheduled Cleanup Job

Run daily to permanently delete soft-deleted attachments older than 30 days.

```typescript
// cleanup.service.ts

@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async cleanupDeletedAttachments(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  // Find attachments deleted more than 30 days ago
  const attachments = await this.attachmentRepository
    .createQueryBuilder("attachment")
    .withDeleted()
    .where("attachment.deleted_at IS NOT NULL")
    .andWhere("attachment.deleted_at < :cutoff", { cutoff: cutoffDate })
    .getMany();

  if (attachments.length === 0) return;

  // Delete from S3
  const fileKeys = attachments.map(a => a.fileKey);
  await this.storageService.deleteMany(fileKeys);

  // Hard delete from DB
  await this.attachmentRepository
    .createQueryBuilder()
    .delete()
    .where("id IN (:...ids)", { ids: attachments.map(a => a.id) })
    .execute();

  this.logger.log(`Cleaned up ${attachments.length} deleted attachments`);
}
```

#### Alternative: S3 Lifecycle Rules

For orphaned files that bypass the database, configure S3 lifecycle rules:

```json
{
  "Rules": [
    {
      "ID": "CleanupDeletedAttachments",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "attachments/"
      },
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

### Deletion Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Day 0     │     │   Day 1-30  │     │   Day 31+   │
│             │     │             │     │             │
│  Transaction│     │  Soft-      │     │  Cleanup    │
│  Deleted    │────>│  deleted    │────>│  Job Runs   │
│             │     │  state      │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                           ┌───────────────────┴───────────────────┐
                           │                                       │
                           ▼                                       ▼
                    ┌─────────────┐                         ┌─────────────┐
                    │  Delete     │                         │  Hard       │
                    │  from S3    │                         │  Delete DB  │
                    └─────────────┘                         └─────────────┘
```

---

## Implementation Checklist

### Phase 1: Infrastructure

- [ ] Add AWS SDK dependencies
  ```bash
  npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  ```
- [ ] Update `env.config.ts` with S3 environment variables
- [ ] Create S3 bucket with proper configuration
- [ ] Configure bucket policy and CORS
- [ ] Set up IAM role/user with appropriate permissions

### Phase 2: Database

- [ ] Create migration for `transaction_attachment` table
- [ ] Create `TransactionAttachmentEntity`
- [ ] Update entity index exports

### Phase 3: Storage Module

- [ ] Create `StorageModule`
- [ ] Implement `StorageService` with:
  - [ ] `generateUploadUrl()`
  - [ ] `generateDownloadUrl()`
  - [ ] `headObject()` - verify file exists
  - [ ] `delete()`
  - [ ] `deleteMany()`

### Phase 4: Attachment Module

- [ ] Create attachment DTOs (presign, confirm)
- [ ] Create `AttachmentController` with endpoints
- [ ] Implement `AttachmentService` with:
  - [ ] `presign()` - generate upload URL
  - [ ] `confirm()` - save metadata after upload
  - [ ] `list()` - get all attachments for transaction
  - [ ] `getDownloadUrl()` - generate download URL
  - [ ] `delete()` - soft delete attachment

### Phase 5: Transaction Integration

- [ ] Update `TransactionService.delete()` to soft-delete attachments
- [ ] Update transaction response DTOs to include attachment count
- [ ] Add attachments relation to transaction entity (optional)

### Phase 6: Cleanup Job

- [ ] Create cleanup cron job for soft-deleted attachments
- [ ] Configure S3 lifecycle rules for orphaned files

### Phase 7: Testing

- [ ] Unit tests for `StorageService`
- [ ] Unit tests for `AttachmentService`
- [ ] Integration tests for upload/download flow
- [ ] Test deletion cascade behavior

---

## Dependencies

```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x"
}
```

---

## Frontend Integration

### Upload Flow (3 Steps)

```
1. PRESIGN   →   2. UPLOAD TO S3   →   3. CONFIRM
   (API)              (S3)                (API)
```

| Step | Request | Response | Notes |
|------|---------|----------|-------|
| 1. Presign | `POST /transactions/:id/attachments/presign` | `{ uploadUrl, fileKey }` | Validates user, file type, count < 5 |
| 2. Upload | `PUT {uploadUrl}` with file body | `200 OK` | Direct to S3, include `Content-Type` header |
| 3. Confirm | `POST /transactions/:id/attachments/confirm` | `{ id, fileName, ... }` | Saves metadata to DB |

### Download Flow (2 Steps)

```
1. GET URL   →   2. FETCH FROM S3
   (API)              (S3)
```

| Step | Request | Response | Notes |
|------|---------|----------|-------|
| 1. Get URL | `GET /transactions/:id/attachments/:attachmentId/url` | `{ downloadUrl }` | URL valid for 1 hour |
| 2. Fetch | `GET {downloadUrl}` | File content | Direct from S3 |

### Client-Side Validation (Before API Call)

| Check | Rule |
|-------|------|
| File type | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| File size | ≤ 10 MB |
| Count | Current attachments + new files ≤ 5 |

### Error Handling

| HTTP Status | Meaning | Frontend Action |
|-------------|---------|-----------------|
| `400` | Invalid file type/size | Show validation error |
| `401` | Not authenticated | Redirect to login |
| `403` | Doesn't own transaction | Show permission error |
| `404` | Transaction/attachment not found | Show not found |
| `409` | Max attachments (5) reached | Disable upload button |
| `413` | File too large | Show size limit error |

### URL Expiry

- **Upload URL**: Expires in 15 minutes - must complete upload quickly
- **Download URL**: Expires in 1 hour - if 403 returned, request a fresh URL

### UX Recommendations

1. **Show remaining slots**: "Add Attachments (3 of 5 remaining)"
2. **Progress indicator**: Show upload progress for each file
3. **Preview**: Display thumbnails for images, icon for PDFs
4. **Drag & drop**: Support drag-and-drop alongside file picker
5. **Batch upload**: Allow selecting multiple files at once
6. **Retry on failure**: Allow retry for individual failed uploads

---

## References

- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [AWS SDK v3 for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3 Bucket Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)
