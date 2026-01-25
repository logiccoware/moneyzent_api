# Migration Guide: ECS Fargate to AWS Lambda + Neon Postgres

This guide covers migrating the moneyzent-api NestJS REST API from AWS ECS Fargate to AWS Lambda, switching from AWS RDS PostgreSQL to Neon Postgres, and achieving a **< $3/month** backend cost.

---

## Table of Contents

1. [Cost Breakdown: < $3/month Goal](#1-cost-breakdown--3month-goal)
2. [What is AWS Lambda?](#2-what-is-aws-lambda)
3. [How NestJS Works in Lambda](#3-how-nestjs-works-in-lambda)
4. [Observability Options](#4-observability-options)
5. [Neon Postgres Migration](#5-neon-postgres-migration)
6. [Implementation Steps](#6-implementation-steps)
7. [Files to Create/Modify](#7-files-to-createmodify)
8. [Staging Environment Setup](#8-staging-environment-setup)
9. [Verification Plan](#9-verification-plan)

---

## 1. Cost Breakdown: < $3/month Goal

### Target Architecture Costs

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| **Lambda** | Free tier (1M requests, 400K GB-sec) | $0 |
| **Lambda Function URL** | Free (no API Gateway) | $0 |
| **Neon Postgres** | Free tier (0.5GB storage, 191 compute hrs) | $0 |
| **CloudWatch Logs** | Free tier (5GB ingest, 5GB storage) | $0 |
| **Secrets Manager** | ~3 secrets × $0.40 | ~$1.20 |
| **Route 53** (if custom domain) | 1 hosted zone | $0.50 |
| **Data Transfer** | Minimal for personal app | ~$0-1 |
| **Total** | | **~$1.70-2.70** |

### Key Cost Decisions

1. **Lambda Function URLs** instead of API Gateway → $0 (can add API Gateway later)
2. **Neon Free Tier** instead of RDS → saves $15-30/month
3. **CloudWatch** instead of paid observability → saves $10-20/month
4. **No NAT Gateway** (Lambda outside VPC) → saves $30+/month

### Free Tier Limits (Should Cover Personal Use)

- **Lambda**: 1M requests/month, 400,000 GB-seconds
- **Neon**: 0.5GB storage, 191 compute hours, 5 branches
- **CloudWatch**: 5GB log ingestion, 5GB storage, 1M API calls

---

## 2. What is AWS Lambda?

AWS Lambda is a **serverless compute service** that runs your code in response to HTTP requests without requiring you to provision or manage servers.

### Key Differences: ECS Fargate vs AWS Lambda

| Aspect | ECS Fargate (Current) | AWS Lambda (Target) |
|--------|----------------------|---------------------|
| **Execution Model** | Long-running containers | Request-based, ephemeral |
| **Scaling** | Task-based scaling (minutes) | Per-request scaling (milliseconds) |
| **Billing** | Per vCPU-hour + memory-hour | Per request + duration (100ms increments) |
| **Cold Starts** | None (always running) | Yes (~1-3s for NestJS) |
| **Max Execution Time** | Unlimited | 15 minutes max |
| **Connection Management** | Persistent connections | Per-invocation (requires pooling) |
| **Memory** | 512MB - 30GB per task | 128MB - 10GB per function |

### Cold Starts Explained

Cold starts occur when Lambda needs to initialize a new execution environment. For our NestJS application:

**Cold Start Timeline:**
1. Lambda Runtime Bootstrap (~100-200ms)
2. Node.js Initialization (~50-100ms)
3. NestJS Application Bootstrap (~500-2000ms)
4. Database Connection Establishment (~100-500ms)

**Expected Total Cold Start:** 1-2 seconds

**Mitigation Strategies:**
- **Optimize Bundle Size**: Smaller deployments = faster cold starts
- **Neon's Serverless Driver**: Uses HTTP-based connections that are faster to establish
- **Connection Pooling**: Use Neon's built-in pooler endpoint
- **Keep Lambda Warm**: Optional scheduled ping every 5 minutes (free with EventBridge)

### Request Lifecycle in Lambda

```
HTTPS Request → Lambda Function URL
                      │
                      ▼
         [Lambda Cold Start if needed]
                      │
                      ▼
         Handler Function Invoked
                      │
                      ▼
         serverless-express Adapter
                      │
                      ▼
         Express/NestJS Application
                      │
                      ▼
         Route Handler Execution
                      │
                      ▼
         Response Returned
                      │
                      ▼
         [Environment Freezes Until Next Request]
```

**Key Insight:** Between invocations, Lambda "freezes" the execution environment. Global variables and database connections persist across warm invocations, which is why we cache the NestJS app instance.

---

## 3. How NestJS Works in Lambda

### Architecture Change

```
CURRENT (ECS Fargate):
┌─────────────────────────────────────────────────────────────┐
│  ECS Task                                                    │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │  Fluent Bit Sidecar │  │  NestJS Container            │  │
│  │  (Log Router)       │  │  - main.ts bootstrap         │  │
│  │         │           │  │  - Express server            │  │
│  │    Loki ◄───────────┼──│  - TypeORM connections (10)  │  │
│  └─────────────────────┘  │  - Better Auth pg.Pool       │  │
│                           │  - OpenTelemetry auto-instr  │  │
│                           └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  AWS RDS    │
                        │  PostgreSQL │
                        └─────────────┘

TARGET (AWS Lambda):
┌─────────────────────────────────────────────────────────────┐
│  Lambda Function URL (FREE - no API Gateway)                 │
│  https://xxxxxxxxxx.lambda-url.us-east-1.on.aws              │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS Lambda Function                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  lambda.ts                                            │   │
│  │  - Cached NestJS app instance                        │   │
│  │  - serverless-express adapter                        │   │
│  │  - Pino logs → CloudWatch                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  Neon       │
                        │  PostgreSQL │
                        │  (Pooler)   │
                        └─────────────┘
```

### Why Lambda Function URLs (Start Simple)

Lambda Function URLs provide a dedicated HTTPS endpoint **at no cost**:

| Feature | Function URL | API Gateway (add later) |
|---------|--------------|------------------------|
| **Cost** | **FREE** | $1.00/million requests |
| **HTTPS** | Yes | Yes |
| **CORS** | Configure in response | Built-in config |
| **Custom Domain** | Via CloudFront | Native support |
| **Rate Limiting** | In app (ThrottlerGuard) | Built-in |

Since we have rate limiting via `ThrottlerModule` and auth via Better Auth, Function URLs work well to start. API Gateway can be added later for custom domains or additional features.

### The serverless-express Adapter

We'll use `@codegenie/serverless-express` (actively maintained fork of @vendia/serverless-express):

1. **Active Maintenance**: Regularly updated
2. **NestJS Compatibility**: Works seamlessly with NestJS/Express
3. **Function URL Support**: Works with Lambda Function URLs and API Gateway
4. **Binary Support**: Handles multipart forms, images, etc.

### How It Works

1. **Lambda Function URL** receives HTTPS request
2. **Lambda** invokes the handler function with the event
3. **serverless-express** translates Lambda event → Express request
4. **NestJS** processes the request (app instance cached between warm invocations)
5. **Response** returned directly to client

### Lambda Handler Structure

```typescript
// src/lambda.ts
import { configure as serverlessExpress } from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { AppModule } from './modules/app.module';

let cachedServer: ReturnType<typeof serverlessExpress>;

async function bootstrap(): Promise<ReturnType<typeof serverlessExpress>> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(AppModule, adapter, {
    bufferLogs: true,
    bodyParser: false,
  });

  // Apply middleware (helmet, CORS, Better Auth, body parsers)
  // ... same as main.ts

  await app.init();

  cachedServer = serverlessExpress({ app: expressApp });
  return cachedServer;
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Prevent Lambda from waiting for event loop to empty
  context.callbackWaitsForEmptyEventLoop = false;

  const server = await bootstrap();
  return server(event, context);
};
```

### Better Auth Considerations

The current `main.ts` disables body parsing globally and handles Better Auth routes before applying body parsers:

```typescript
// Current approach
bodyParser: false,
app.use("/auth", toNodeHandler(auth));
app.use(json());
app.use(urlencoded({ extended: true }));
```

This pattern works in Lambda, but we need to ensure the raw body is preserved for signature verification. The serverless-express adapter handles this correctly by default.

---

## 4. Observability Options

### Cost Comparison

| Platform | Free Tier | Best For |
|----------|-----------|----------|
| **CloudWatch** (recommended) | 5GB logs, 5GB storage | Simplest, no extra cost |
| **Grafana Cloud** | 50GB logs, 50GB traces | If you want dashboards |
| **Better Stack (Logtail)** | 1GB/month | Beautiful UI |
| **Axiom** | 500GB ingest/month | Generous free tier |
| **Highlight.io** | 1M logs/month | Full-stack observability |

### Recommended: CloudWatch Only (FREE)

For < $3/month budget, use **CloudWatch Logs** directly:

1. **Logs**: Pino JSON → CloudWatch (automatic)
2. **Metrics**: Lambda built-in metrics (invocations, errors, duration)
3. **Alarms**: CloudWatch Alarms for errors (free tier: 10 alarms)

This eliminates Grafana/Loki costs entirely while staying within free tier.

### Current ECS Setup

- **Traces**: OpenTelemetry → Grafana OTLP endpoint
- **Logs**: Pino → Fluent Bit → Grafana Loki

### Lambda Setup (CloudWatch)

```
Lambda Function
      │
      ▼ (automatic)
CloudWatch Logs
      │
      ▼ (optional)
CloudWatch Log Insights (query logs)
CloudWatch Metrics (built-in Lambda metrics)
CloudWatch Alarms (error notifications)
```

### Logger Configuration for Lambda

Update LoggerModule for Lambda context (keeps existing Pino setup):

```typescript
LoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService<EnvConfig, true>) => {
    const isProduction = configService.get('APP_ENV') === 'production';
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    return {
      pinoHttp: {
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) ||
          (req.headers['x-amzn-trace-id'] as string) || // Lambda trace ID
          randomUUID(),
        level: isProduction ? 'info' : 'debug',
        // In Lambda, always use JSON format (no pino-pretty)
        transport: isProduction || isLambda ? undefined : {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: true },
        },
        // Add Lambda context to logs
        mixin: isLambda ? () => ({
          awsRequestId: process.env._X_AMZN_TRACE_ID,
          functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        }) : undefined,
      },
    };
  },
}),
```

### Optional: Add Tracing Later

If you want tracing in the future, you can add the ADOT Lambda Layer:

```yaml
Layers:
  - !Sub arn:aws:lambda:${AWS::Region}:901920570463:layer:aws-otel-nodejs-arm64-ver-1-18-1:2

Environment:
  Variables:
    AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
    OTEL_SERVICE_NAME: moneyzent-api
```

This sends traces to any OTLP-compatible backend (Grafana, Jaeger, etc.).

---

## 5. Neon Postgres Migration

### Why Neon for Serverless?

Neon is designed for serverless workloads:

1. **Connection Pooling Built-in**: PgBouncer-based pooler at a separate endpoint
2. **Serverless Driver**: `@neondatabase/serverless` uses HTTP/WebSocket for faster cold starts
3. **Branching**: Create database branches for development/testing
4. **Auto-scaling**: Compute scales to zero when not in use
5. **Pay-per-use**: Only pay for actual compute time

### Connection Endpoints

Neon provides two connection endpoints:

```
# Direct connection (for migrations, long-running processes)
postgresql://user:password@ep-xxx-123.us-east-1.aws.neon.tech/dbname?sslmode=require

# Pooled connection (for application, Lambda) - USE THIS
postgresql://user:password@ep-xxx-123-pooler.us-east-1.aws.neon.tech/dbname?sslmode=require
                                  ^^^^^^^
```

**Important:** For Lambda, always use the `-pooler` endpoint.

### TypeORM Configuration for Neon

```typescript
// src/modules/database/database.module.ts
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService<EnvConfig, true>) => {
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    return {
      type: 'postgres',
      url: configService.get('DATABASE_URL'),
      autoLoadEntities: true,
      synchronize: false,
      logging: configService.get('APP_ENV') === 'development',

      // Reduced pool size for Lambda (each invocation gets 1 connection)
      poolSize: isLambda ? 1 : configService.get('DATABASE_POOL_SIZE'),

      // SSL is REQUIRED for Neon
      ssl: {
        rejectUnauthorized: true,
      },

      extra: {
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: isLambda ? 1000 : 30000,
        statement_timeout: 30000,
      },
    };
  },
}),
```

### Better Auth Configuration for Neon

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { Pool } from '@neondatabase/serverless';

const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isLambda ? 1 : 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: isLambda ? 1000 : 30000,
});

export const auth = betterAuth({
  basePath: '/auth',
  trustedOrigins: [process.env.CORS_ORIGIN!],
  emailAndPassword: { enabled: true },
  database: pool,
  advanced: {
    database: { generateId: 'uuid' },
  },
});
```

### Database Migration Process

1. **Create Neon Project**
   ```bash
   neonctl projects create --name moneyzent-prod
   ```

2. **Export RDS Data**
   ```bash
   pg_dump -h your-rds-host.rds.amazonaws.com -U postgres -d moneyzent -F c -f backup.dump
   ```

3. **Import to Neon**
   ```bash
   pg_restore -h ep-xxx-123.us-east-1.aws.neon.tech -U neondb_owner -d neondb backup.dump
   ```

4. **Verify Data**
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   SELECT 'users' as table_name, count(*) FROM users;
   ```

5. **Update Environment Variables**
   - Update `DATABASE_URL` in AWS Secrets Manager to point to Neon pooler endpoint

---

## 6. Implementation Steps

### Phase 1: Create Lambda Handler

Create `src/lambda.ts` with the cached NestJS app bootstrap pattern (see section 2).

### Phase 2: Update Database Configuration

Modify `src/modules/database/database.module.ts`:
- Add SSL requirement for Neon
- Reduce pool size to 1 for Lambda
- Add connection timeout settings

Modify `src/lib/auth.ts`:
- Use `@neondatabase/serverless` Pool
- Configure for pooler endpoint

### Phase 3: Update Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@codegenie/serverless-express": "^4.15.0",
    "@neondatabase/serverless": "^0.9.0",
    "@types/aws-lambda": "^8.10.136"
  }
}
```

### Phase 4: Create SAM Template

Create `template.yaml`:
- Lambda function with Function URL (no API Gateway)
- CORS configuration in Function URL
- IAM roles for Secrets Manager access
- Environment variables per stage (staging/prod)

### Phase 5: Update CI/CD

Modify `.github/workflows/deploy.yml`:
- Install SAM CLI
- Build with `sam build`
- Deploy with `sam deploy`

### Phase 6: Migrate Database

1. Create Neon project
2. Export RDS data with `pg_dump`
3. Import to Neon with `pg_restore`
4. Update `DATABASE_URL` secret to Neon pooler endpoint

---

## 7. Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lambda.ts` | CREATE | Lambda handler entry point |
| `template.yaml` | CREATE | SAM template with Function URL |
| `samconfig.toml` | CREATE | SAM deployment configuration |
| `src/lib/auth.ts` | MODIFY | Use Neon serverless driver |
| `src/modules/database/database.module.ts` | MODIFY | SSL config, pool size, timeouts |
| `src/modules/app.module.ts` | MODIFY | Lambda-aware logging config |
| `src/common/config/env.config.ts` | MODIFY | Add `staging` to APP_ENV |
| `package.json` | MODIFY | Add Lambda dependencies |
| `.github/workflows/deploy-lambda.yml` | CREATE | SAM deployment pipeline (staging & prod) |

---

## 8. Staging Environment Setup

### Environment Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  STAGING (Testing Ground)                                    │
│                                                              │
│  Frontend: staging.moneyzent.com                            │
│  Backend:  https://xxx.lambda-url.us-east-1.on.aws          │
│  Database: Neon branch (staging)                            │
│                                                              │
│  Purpose: Test Lambda + Neon before production              │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ When ready, manually switch
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  PRODUCTION                                                  │
│                                                              │
│  Frontend: app.moneyzent.com                                │
│  Backend:  ECS Fargate (current) → Lambda (future)          │
│  Database: RDS (current) → Neon main branch (future)        │
│                                                              │
│  ECS runs until you decide to switch off                    │
└─────────────────────────────────────────────────────────────┘
```

### Neon Database Branching

Neon's branching feature is perfect for staging:

```bash
# Create staging branch from main
neonctl branches create --name staging --project-id <project-id>

# Get staging connection string (includes -pooler for Lambda)
neonctl connection-string --branch staging --pooled
```

**Benefits:**
- Staging branch is a copy-on-write clone (instant, no storage cost for unchanged data)
- Isolated from production data
- Can reset to production state anytime

### Lambda Function Names

```
staging-moneyzent-api    → Staging Lambda
prod-moneyzent-api       → Production Lambda (when ready)
```

### Environment Variables per Stage

**Staging:**
```
APP_ENV=staging
DATABASE_URL=postgresql://...@ep-xxx-staging-pooler.neon.tech/neondb
CORS_ORIGIN=https://staging.moneyzent.com
BETTER_AUTH_URL=https://xxx.lambda-url.us-east-1.on.aws
```

**Production (future):**
```
APP_ENV=production
DATABASE_URL=postgresql://...@ep-xxx-main-pooler.neon.tech/neondb
CORS_ORIGIN=https://app.moneyzent.com
BETTER_AUTH_URL=https://yyy.lambda-url.us-east-1.on.aws
```

### Deployment Flow

```
1. Deploy to Staging Lambda
         │
         ▼
2. Test with Staging Frontend
         │
         ▼
3. Verify everything works
         │
         ▼
4. When confident, deploy to Production Lambda
         │
         ▼
5. Update Frontend to point to Lambda URL
         │
         ▼
6. Manually turn off ECS Fargate when ready
```

---

## 9. Verification Plan

### Local Testing

```bash
# Test Lambda handler locally
sam local start-api

# Or use the NestJS dev server for faster iteration
npm run start:dev
```

### Staging Verification Checklist

1. **Database Connectivity**
   - [ ] TypeORM connects to Neon staging branch
   - [ ] Better Auth connects to Neon
   - [ ] Migrations run successfully

2. **Authentication**
   - [ ] Sign up works
   - [ ] Sign in works
   - [ ] Session management works

3. **API Endpoints**
   - [ ] All CRUD operations work
   - [ ] Rate limiting works (ThrottlerGuard)
   - [ ] Error handling returns correct responses

4. **Logs**
   - [ ] Pino JSON logs appear in CloudWatch
   - [ ] Request IDs are properly generated
   - [ ] Errors are logged with stack traces

5. **Performance**
   - [ ] Measure cold start time (target: < 2s)
   - [ ] Measure warm request latency
   - [ ] Test concurrent requests

### Production Cutover Checklist

1. **Data Migration**
   - [ ] Export RDS data with `pg_dump`
   - [ ] Import to Neon main branch with `pg_restore`
   - [ ] Verify row counts match

2. **DNS/Routing**
   - [ ] Update frontend API URL to Lambda Function URL
   - [ ] Or configure custom domain with CloudFront (optional)

3. **Monitoring**
   - [ ] CloudWatch alarms set up
   - [ ] Monitor first 24 hours closely

4. **Rollback Plan**
   - [ ] ECS still running (don't turn off yet)
   - [ ] Can switch frontend back to ECS URL if needed

---

## Appendix: SAM Template Reference

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Moneyzent API - Lambda Deployment

Parameters:
  Environment:
    Type: String
    Default: staging
    AllowedValues:
      - staging
      - prod
  CorsOrigin:
    Type: String
    Description: Allowed CORS origin for the frontend

Globals:
  Function:
    Timeout: 30
    MemorySize: 1024
    Runtime: nodejs20.x
    Architectures:
      - arm64  # Graviton2 - better price/performance

Resources:
  # Lambda Function with Function URL (FREE - no API Gateway)
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub ${Environment}-moneyzent-api
      Handler: dist/lambda.handler
      CodeUri: .
      Description: Moneyzent API NestJS Application

      # Function URL (FREE alternative to API Gateway)
      FunctionUrlConfig:
        AuthType: NONE  # Auth handled by Better Auth in app
        Cors:
          AllowOrigins:
            - !Ref CorsOrigin
          AllowHeaders:
            - Content-Type
            - Authorization
            - X-Request-Id
          AllowMethods:
            - GET
            - POST
            - PUT
            - PATCH
            - DELETE
            - OPTIONS
          AllowCredentials: true
          MaxAge: 86400

      Environment:
        Variables:
          NODE_ENV: production
          APP_ENV: !Ref Environment
          CORS_ORIGIN: !Ref CorsOrigin
          DATABASE_POOL_SIZE: '1'

      # IAM permissions for Secrets Manager
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource:
                - !Sub arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${Environment}/moneyzent/*

Outputs:
  FunctionUrl:
    Description: Lambda Function URL (use this as your API endpoint)
    Value: !GetAtt ApiFunctionUrl.FunctionUrl

  FunctionArn:
    Description: Lambda Function ARN
    Value: !GetAtt ApiFunction.Arn
```

### Deploy Commands

```bash
# Build
sam build

# Deploy to staging
sam deploy \
  --stack-name moneyzent-api-staging \
  --parameter-overrides \
    Environment=staging \
    CorsOrigin=https://staging.moneyzent.com \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset

# Deploy to production (when ready)
sam deploy \
  --stack-name moneyzent-api-prod \
  --parameter-overrides \
    Environment=prod \
    CorsOrigin=https://app.moneyzent.com \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset
```
