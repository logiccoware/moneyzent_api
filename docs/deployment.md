# GCP Cloud Run Deployment Setup

This document covers the one-time GCP infrastructure setup required before the GitHub Actions deploy workflow can run.

## Architecture Overview

```
GitHub Actions (workflow_dispatch)
  ├── Authenticate via Workload Identity Federation (no JSON keys)
  ├── Build Docker image
  ├── Push to Artifact Registry (us-east1-docker.pkg.dev/moneyzent/moneyzent-api)
  └── Deploy to Cloud Run
        ├── moneyzent-api-staging
        └── moneyzent-api-prod
```

- **Single GCP project:** `moneyzent`
- **Region:** `us-east1`
- **Auth:** Workload Identity Federation (keyless, OIDC-based)
- **Registry:** Google Artifact Registry
- **Database:** External PostgreSQL (not Cloud SQL)
- **Migrations:** Run manually, not part of the deploy pipeline

## Prerequisites

1. [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed
2. Authenticated: `gcloud auth login`
3. GCP project `moneyzent` created with billing enabled
4. You are an Owner or Editor on the project

## Automated Setup

A script handles all GCP resource creation:

```bash
chmod +x scripts/gcp-setup.sh
./scripts/gcp-setup.sh
```

The script is idempotent — safe to re-run. It performs the steps described below.

## What the Script Does

### 1. Enable APIs

- `run.googleapis.com` — Cloud Run
- `artifactregistry.googleapis.com` — Artifact Registry
- `iamcredentials.googleapis.com` — IAM Credentials (for WIF token exchange)
- `cloudresourcemanager.googleapis.com` — Resource Manager
- `iam.googleapis.com` — IAM

### 2. Create Artifact Registry Repository

- **Name:** `moneyzent-api`
- **Format:** Docker
- **Location:** `us-east1`
- Full path: `us-east1-docker.pkg.dev/moneyzent/moneyzent-api`

### 3. Create Service Account

- **Name:** `github-actions-deployer`
- **Email:** `github-actions-deployer@moneyzent.iam.gserviceaccount.com`
- **Roles granted:**
  - `roles/run.admin` — deploy and manage Cloud Run services
  - `roles/artifactregistry.writer` — push Docker images
  - `roles/iam.serviceAccountUser` — act as the Cloud Run runtime service account

### 4. Set Up Workload Identity Federation

This allows GitHub Actions to authenticate to GCP without storing a JSON key.

- **Workload Identity Pool:** `github-pool`
- **OIDC Provider:** `github-provider`
  - Issuer: `https://token.actions.githubusercontent.com`
  - Attribute mapping: `repository`, `actor`, `subject`
  - Attribute condition: `assertion.repository == 'logiccoware/moneyzent_api'` (restricts to this repo only)
- **Binding:** The pool is bound to the service account with `roles/iam.workloadIdentityUser`

## GitHub Repository Configuration

After running the setup script, configure your GitHub repo.

### Repository Secrets

Go to **Settings > Secrets and variables > Actions > Repository secrets** and add:

| Secret | Value |
|--------|-------|
| `GCP_SERVICE_ACCOUNT` | `github-actions-deployer@moneyzent.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/215250480163/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |

### GitHub Environments

Create two environments under **Settings > Environments**:

1. **`staging`**
2. **`prod`** (recommended: add required reviewers as a protection rule)

No environment-specific secrets needed in GitHub — all app secrets are managed in GCP Secret Manager.

## Secret Management (GCP Secret Manager)

All application secrets are stored in **GCP Secret Manager**, not in GitHub. Secrets are named with an environment prefix: `{env}_{SECRET_NAME}`.

### Secret Files

Two `.env`-style files (gitignored) hold the secret values:

- `secrets.staging.env` — staging environment secrets
- `secrets.prod.env` — production environment secrets

### Secrets per Environment

| Secret | Description |
|--------|-------------|
| `{env}_DATABASE_URL` | PostgreSQL connection string |
| `{env}_DATABASE_POOL_SIZE` | Database connection pool size |
| `{env}_BETTER_AUTH_SECRET` | Auth secret key |
| `{env}_BETTER_AUTH_URL` | Auth base URL |
| `{env}_CORS_ORIGIN` | Allowed frontend origin |
| `{env}_SWAGGER_ENABLED` | Enable Swagger docs (`true`/`false`) |
| `{env}_SWAGGER_BASIC_AUTH_USER` | Swagger basic auth user |
| `{env}_SWAGGER_BASIC_AUTH_PASS` | Swagger basic auth password |

### Pushing Secrets

Fill in the values in the `.env` file, then run the script:

```bash
# Push staging secrets
./scripts/push-secrets.sh staging

# Push production secrets
./scripts/push-secrets.sh prod
```

The script creates new secrets or adds a new version if the secret already exists. Empty values are skipped.

### Updating a Single Secret

To update one secret directly via CLI:

```bash
printf 'new-value' | gcloud secrets versions add staging_DATABASE_URL --data-file=- --project=moneyzent
```

## Deploy Workflow

The workflow is defined in `.github/workflows/deploy.yml`.

### Triggering a Deploy

1. Go to the repo on GitHub
2. Click **Actions** > **Deploy to Cloud Run**
3. Click **Run workflow**
4. Select the **environment** (`staging` or `prod`)
5. Optionally override the **ref** (branch/tag/SHA). Defaults:
   - `staging` env deploys the `staging` branch
   - `prod` env deploys the `main` branch

### What the Workflow Does

1. **Checkout** the selected ref
2. **Authenticate** to GCP via Workload Identity Federation (keyless OIDC)
3. **Build** a Docker image using the multi-stage `Dockerfile`
4. **Push** the image to Artifact Registry with two tags:
   - `<sha>` (immutable, for rollback)
   - `<env>-latest` (mutable, for quick reference)
5. **Deploy** the image to Cloud Run with secrets injected from GCP Secret Manager
6. **Print** a deployment summary in the GitHub Actions UI

### Cloud Run Service Configuration

Set in the workflow `flags`:

| Setting | Value |
|---------|-------|
| Port | 3000 |
| Memory | 512Mi |
| CPU | 1 |
| Min instances | 0 (scales to zero) |
| Max instances | 3 |
| Concurrency | 80 requests per instance |
| Auth | Unauthenticated (public API) |

### Concurrency

Deploys to the same environment are serialized (`concurrency.group: deploy-<env>`). A staging deploy and a prod deploy can run in parallel, but two staging deploys cannot.

## Verification

After running the script, verify:

```bash
# APIs enabled
gcloud services list --enabled --filter="name:(run OR artifactregistry OR iamcredentials)"

# Artifact Registry repo exists
gcloud artifacts repositories list --location=us-east1

# Service account exists with correct roles
gcloud iam service-accounts describe github-actions-deployer@moneyzent.iam.gserviceaccount.com
gcloud projects get-iam-policy moneyzent --flatten="bindings[].members" \
  --filter="bindings.members:github-actions-deployer@moneyzent.iam.gserviceaccount.com"

# Workload Identity Pool and Provider exist
gcloud iam workload-identity-pools list --location=global
gcloud iam workload-identity-pools providers list --workload-identity-pool=github-pool --location=global
```

## Troubleshooting

### "Permission denied" when running the script
You need Owner or Editor role on the GCP project, or at minimum: `roles/iam.admin`, `roles/artifactregistry.admin`, `roles/serviceusage.admin`.

### GitHub Actions auth fails with "Unable to exchange token"
- Verify the Workload Identity Provider attribute condition matches your repo exactly: `logiccoware/moneyzent_api`
- Ensure the pool is bound to the service account (Step 7 in the script)
- Check that `id-token: write` permission is set in the workflow

### Cloud Run deploy fails with "Permission denied"
- Ensure the service account has `roles/run.admin` and `roles/iam.serviceAccountUser`
- The `serviceAccountUser` role is needed so the deployer SA can "act as" the Cloud Run runtime SA
