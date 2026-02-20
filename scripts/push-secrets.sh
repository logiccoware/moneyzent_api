#!/usr/bin/env bash
#
# Push secrets from a .env file to GCP Secret Manager.
#
# Usage:
#   ./scripts/push-secrets.sh <environment>
#
# Examples:
#   ./scripts/push-secrets.sh staging    # reads secrets.staging.env
#   ./scripts/push-secrets.sh prod       # reads secrets.prod.env
#
# Each secret is created as {env}_{KEY} in Secret Manager (e.g., staging_DATABASE_URL).
# If the secret already exists, a new version is added.
#
set -euo pipefail

GCP_PROJECT_ID="moneyzent"

# ─── Validate arguments ─────────────────────────────────────────────────────────

ENV="${1:-}"

if [ -z "${ENV}" ]; then
  echo "Usage: $0 <environment>"
  echo "  e.g., $0 staging"
  exit 1
fi

ENV_FILE="secrets.${ENV}.env"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Error: ${ENV_FILE} not found."
  echo "Create it from the template and fill in the values."
  exit 1
fi

# ─── Helper functions ────────────────────────────────────────────────────────────

info() { echo -e "\033[1;34m[INFO]\033[0m $1"; }
ok()   { echo -e "\033[1;32m[OK]\033[0m   $1"; }
err()  { echo -e "\033[1;31m[ERR]\033[0m  $1"; }

# ─── Process each line ──────────────────────────────────────────────────────────

CREATED=0
UPDATED=0
SKIPPED=0

while IFS= read -r line; do
  # Skip comments and empty lines
  [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  # Skip if value is empty
  if [ -z "${VALUE}" ]; then
    err "Skipping ${KEY} — value is empty"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  SECRET_NAME="${ENV}_${KEY}"

  # Check if the secret already exists
  if gcloud secrets describe "${SECRET_NAME}" --project="${GCP_PROJECT_ID}" &>/dev/null; then
    # Secret exists — add a new version
    printf '%s' "${VALUE}" | gcloud secrets versions add "${SECRET_NAME}" \
      --project="${GCP_PROJECT_ID}" \
      --data-file=- \
      --quiet
    ok "${SECRET_NAME} — updated (new version)"
    UPDATED=$((UPDATED + 1))
  else
    # Secret doesn't exist — create it with the initial value
    printf '%s' "${VALUE}" | gcloud secrets create "${SECRET_NAME}" \
      --project="${GCP_PROJECT_ID}" \
      --replication-policy=automatic \
      --data-file=- \
      --quiet
    ok "${SECRET_NAME} — created"
    CREATED=$((CREATED + 1))
  fi

done < "${ENV_FILE}"

# ─── Summary ─────────────────────────────────────────────────────────────────────

echo ""
echo "Done. Created: ${CREATED}, Updated: ${UPDATED}, Skipped: ${SKIPPED}"
