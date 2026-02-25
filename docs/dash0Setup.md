# Plan: Dash0 Node.js Observability Integration (Prod Only)

## Context

The project has OpenTelemetry SDK packages already installed (`@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/auto-instrumentations-node`) but no initialization code. Dash0 is an observability platform that accepts OTLP telemetry. The goal is to activate tracing + log correlation for the prod Cloud Run environment only, using the existing packages — no new npm dependencies required (skipping `@opentelemetry/resource-detector-gcp` to stay lean; `envDetector`/`processDetector` are bundled in the existing SDK).

---

## Files to Modify

| File | Change |
|---|---|
| `src/instrumentation.ts` | **New file** — NodeSDK init loaded before NestJS via `--require` |
| `Dockerfile` | CMD: add `--require dist/instrumentation.js` |
| `src/common/config/env.config.ts` | Add 4 OTel env vars to Zod schema + prod `superRefine` |
| `.env.example` | Document new OTel env vars (commented out) |
| `.github/workflows/deploy.yml` | Add `env_vars` + `secrets` entries for Dash0 |
| GCP Secret Manager | 1 new secret per environment (manual step, done via `gcloud` or console) |

---

## Implementation Steps

### 1. Create `src/instrumentation.ts`

OTel SDK must be initialized **before any module is imported**. This file is loaded via Node's `--require` flag against the compiled output `dist/instrumentation.js`.

**Rules for this file:**
- No `@/` path aliases (not resolved at `--require` time)
- No NestJS imports
- CommonJS-compatible (tsconfig uses `"module": "commonjs"`)

```typescript
// src/instrumentation.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const appEnv = process.env.APP_ENV;
const otelEnabled = process.env.OTEL_ENABLED === "true";

if (otelEnabled || appEnv === "prod") {
  // SDK reads OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT,
  // OTEL_EXPORTER_OTLP_HEADERS, OTEL_EXPORTER_OTLP_PROTOCOL automatically.
  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation is extremely noisy; disable it
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  // Cloud Run sends SIGTERM — flush spans before exit
  process.on("SIGTERM", () => {
    sdk.shutdown().finally(() => process.exit(0));
  });
}
```

> Note: `@opentelemetry/instrumentation-pino` is included in `auto-instrumentations-node`. It automatically injects `trace_id` and `span_id` into every Pino log record — no changes to `nestjs-pino` config are needed.

---

### 2. Dockerfile — add `--require` to CMD

**`Dockerfile`** line 29:
```dockerfile
# Before:
CMD ["node", "dist/main.js"]

# After:
CMD ["node", "--require", "dist/instrumentation.js", "dist/main.js"]
```

`src/instrumentation.ts` compiles to `dist/instrumentation.js` via the existing `nest build` step — no tsconfig changes needed.

---

### 3. `src/common/config/env.config.ts` — add OTel vars to Zod schema

Add 4 new fields to `envSchema` and a `superRefine` for prod validation:

```typescript
// OpenTelemetry / Dash0
OTEL_ENABLED: z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true"),
OTEL_SERVICE_NAME: z.string().optional(),
OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
```

And add after the `z.object({...})` call:

```typescript
.superRefine((data, ctx) => {
  if (data.APP_ENV === "prod") {
    if (!data.OTEL_EXPORTER_OTLP_ENDPOINT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OTEL_EXPORTER_OTLP_ENDPOINT"],
        message: "Required in prod environment",
      });
    }
    if (!data.OTEL_EXPORTER_OTLP_HEADERS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OTEL_EXPORTER_OTLP_HEADERS"],
        message: "Required in prod environment",
      });
    }
  }
})
```

This ensures the app fails fast with a clear error if Dash0 credentials are missing in prod.

---

### 4. `.env.example` — document new vars

Add below the Swagger section:

```bash
# OpenTelemetry / Dash0 (prod only — obtain values from Dash0 dashboard)
OTEL_ENABLED=false
# OTEL_SERVICE_NAME=moneyzent-api
# OTEL_EXPORTER_OTLP_ENDPOINT=https://ingress.<region>.aws.dash0.com:4318
# OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
# OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <your-dash0-token>
```

---

### 5. `.github/workflows/deploy.yml` — add Dash0 config

In the `Deploy to Cloud Run` step, add to `env_vars`:

```yaml
OTEL_ENABLED=${{ inputs.environment == 'prod' && 'true' || 'false' }}
OTEL_SERVICE_NAME=${{ env.IMAGE_NAME }}-${{ inputs.environment }}
OTEL_EXPORTER_OTLP_ENDPOINT=https://ingress.<region>.aws.dash0.com:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

Add to `secrets`:

```yaml
OTEL_EXPORTER_OTLP_HEADERS=${{ inputs.environment }}_OTEL_EXPORTER_OTLP_HEADERS:latest
```

> **NOTE:** The `OTEL_EXPORTER_OTLP_ENDPOINT` value (and the exact region/domain) must be filled in from the Dash0 dashboard under Settings → Endpoints. The `OTEL_EXPORTER_OTLP_HEADERS` value format is `Authorization=Bearer <token>`.

---

### 6. GCP Secret Manager — manual one-time step

Create the secret for prod (and optionally staging) using the existing naming convention `<env>_<SECRET_NAME>`:

```bash
# Format: "Authorization=Bearer <token-from-dash0-dashboard>"
echo -n "Authorization=Bearer <your-dash0-token>" | \
  gcloud secrets create prod_OTEL_EXPORTER_OTLP_HEADERS \
    --project=moneyzent \
    --data-file=- \
    --replication-policy=automatic

# For staging (can be empty or a different token):
echo -n "Authorization=Bearer <staging-token-or-empty>" | \
  gcloud secrets create staging_OTEL_EXPORTER_OTLP_HEADERS \
    --project=moneyzent \
    --data-file=- \
    --replication-policy=automatic
```

Grant the Cloud Run service account access to the new secret via IAM (same as existing secrets).

---

## Verification

**Local smoke test (after `npm run build`):**
```bash
OTEL_ENABLED=true \
OTEL_SERVICE_NAME=moneyzent-api-local \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer test" \
node --require dist/instrumentation.js dist/main.js
```
App should start normally. BatchSpanProcessor will log non-fatal warnings about the unreachable collector.

**Post-deploy (prod) verification:**
1. Deploy to prod via GitHub Actions
2. Make a few API requests (not `/health`)
3. In Dash0 → Traces: confirm HTTP spans appear with `http.method`, `http.route`, `http.status_code`
4. In Dash0 → Logs: confirm log records include `trace_id` matching span traces
5. Check for `db.statement` spans from PostgreSQL instrumentation

## What's NOT changing

- `src/main.ts` — no changes
- `src/modules/app.module.ts` — no changes (Pino log correlation is automatic via `instrumentation-pino`)
- Any feature module — no changes
- No new npm packages required
