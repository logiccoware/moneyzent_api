#!/usr/bin/env bash
#
# One-time GCP setup for Moneyzent API deployment to Cloud Run.
#
# Prerequisites:
#   1. gcloud CLI installed: https://cloud.google.com/sdk/docs/install
#   2. Logged in: gcloud auth login
#   3. Billing enabled on the GCP project
#
# Usage:
#   chmod +x scripts/gcp-setup.sh
#   ./scripts/gcp-setup.sh
#
# This script is idempotent — safe to re-run.
#
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────────

GCP_PROJECT_ID="moneyzent"
GCP_REGION="us-east1"
GITHUB_REPO="logiccoware/moneyzent_api"

# Artifact Registry
AR_REPO_NAME="moneyzent-api"
AR_REPO_FORMAT="docker"

# Service Account
SA_NAME="github-actions-deployer"
SA_DISPLAY_NAME="GitHub Actions Deployer"

# Workload Identity Federation
WIF_POOL_NAME="github-pool"
WIF_POOL_DISPLAY_NAME="GitHub Actions Pool"
WIF_PROVIDER_NAME="github-provider"
WIF_PROVIDER_DISPLAY_NAME="GitHub Actions Provider"

# Cloud Run service names
CLOUD_RUN_SERVICE_STAGING="moneyzent-api-staging"
CLOUD_RUN_SERVICE_PROD="moneyzent-api-prod"

# ─── Derived values ─────────────────────────────────────────────────────────────

SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
PROJECT_NUMBER="" # Resolved below

# ─── Helper functions ────────────────────────────────────────────────────────────

info() { echo -e "\n\033[1;34m[INFO]\033[0m $1"; }
ok()   { echo -e "\033[1;32m[OK]\033[0m   $1"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $1"; }

# ─── Step 0: Set project ────────────────────────────────────────────────────────

info "Setting active GCP project to ${GCP_PROJECT_ID}..."
gcloud config set project "${GCP_PROJECT_ID}"
ok "Project set."

PROJECT_NUMBER=$(gcloud projects describe "${GCP_PROJECT_ID}" --format="value(projectNumber)")
info "Project number: ${PROJECT_NUMBER}"

# ─── Step 1: Enable required APIs ───────────────────────────────────────────────

info "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com
ok "APIs enabled."

# ─── Step 2: Create Artifact Registry repository ────────────────────────────────

info "Creating Artifact Registry repository '${AR_REPO_NAME}'..."
if gcloud artifacts repositories describe "${AR_REPO_NAME}" \
  --location="${GCP_REGION}" &>/dev/null; then
  warn "Repository already exists, skipping."
else
  gcloud artifacts repositories create "${AR_REPO_NAME}" \
    --repository-format="${AR_REPO_FORMAT}" \
    --location="${GCP_REGION}" \
    --description="Docker images for Moneyzent API"
  ok "Repository created."
fi

# ─── Step 3: Create Service Account ─────────────────────────────────────────────

info "Creating service account '${SA_NAME}'..."
if gcloud iam service-accounts describe "${SA_EMAIL}" &>/dev/null; then
  warn "Service account already exists, skipping."
else
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="${SA_DISPLAY_NAME}"
  ok "Service account created."
fi

# ─── Step 4: Grant IAM roles to the service account ─────────────────────────────

info "Granting IAM roles to ${SA_EMAIL}..."

ROLES=(
  "roles/run.admin"
  "roles/artifactregistry.writer"
  "roles/iam.serviceAccountUser"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet
  ok "Granted ${ROLE}"
done

# ─── Step 5: Create Workload Identity Pool ───────────────────────────────────────

info "Creating Workload Identity Pool '${WIF_POOL_NAME}'..."
if gcloud iam workload-identity-pools describe "${WIF_POOL_NAME}" \
  --location="global" &>/dev/null; then
  warn "Pool already exists, skipping."
else
  gcloud iam workload-identity-pools create "${WIF_POOL_NAME}" \
    --location="global" \
    --display-name="${WIF_POOL_DISPLAY_NAME}"
  ok "Pool created."
fi

# ─── Step 6: Create Workload Identity Provider ──────────────────────────────────

info "Creating Workload Identity Provider '${WIF_PROVIDER_NAME}'..."
if gcloud iam workload-identity-pools providers describe "${WIF_PROVIDER_NAME}" \
  --workload-identity-pool="${WIF_POOL_NAME}" \
  --location="global" &>/dev/null; then
  warn "Provider already exists, skipping."
else
  gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER_NAME}" \
    --location="global" \
    --workload-identity-pool="${WIF_POOL_NAME}" \
    --display-name="${WIF_PROVIDER_DISPLAY_NAME}" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository == '${GITHUB_REPO}'"
  ok "Provider created."
fi

# ─── Step 7: Bind WIF pool to Service Account ───────────────────────────────────

info "Binding Workload Identity Pool to service account..."
WIF_POOL_ID="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_NAME}"

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_POOL_ID}/attribute.repository/${GITHUB_REPO}" \
  --quiet
ok "Binding created."

# ─── Summary ─────────────────────────────────────────────────────────────────────

WIF_PROVIDER_FULL="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_NAME}/providers/${WIF_PROVIDER_NAME}"

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  GCP SETUP COMPLETE"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Add the following to your GitHub repository settings:"
echo ""
echo "  Repository secrets (Settings > Secrets and variables > Actions):"
echo ""
echo "    GCP_PROJECT_ID                    = ${GCP_PROJECT_ID}"
echo "    GCP_REGION                        = ${GCP_REGION}"
echo "    GCP_SERVICE_ACCOUNT               = ${SA_EMAIL}"
echo "    GCP_WORKLOAD_IDENTITY_PROVIDER    = ${WIF_PROVIDER_FULL}"
echo ""
echo "  Then create two GitHub Environments ('staging' and 'prod') with"
echo "  these environment-specific secrets:"
echo ""
echo "    DATABASE_URL"
echo "    BETTER_AUTH_SECRET"
echo "    BETTER_AUTH_URL"
echo "    CORS_ORIGIN"
echo "    SWAGGER_ENABLED"
echo "    SWAGGER_BASIC_AUTH_USER"
echo "    SWAGGER_BASIC_AUTH_PASS"
echo ""
echo "  Artifact Registry:"
echo "    ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO_NAME}"
echo ""
echo "  Cloud Run services (created on first deploy):"
echo "    ${CLOUD_RUN_SERVICE_STAGING}"
echo "    ${CLOUD_RUN_SERVICE_PROD}"
echo ""
echo "════════════════════════════════════════════════════════════════════════"
