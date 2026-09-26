#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PeakForm Athletics - Google Cloud Run Deployment Script
# ==============================================================================

SERVICE_NAME="${SERVICE_NAME:-peakform-athletics}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
IMAGE_TAG="${IMAGE_TAG:-gcr.io/${PROJECT_ID}/${SERVICE_NAME}:$(git rev-parse --short HEAD)}"

echo "=== Deploying PeakForm Athletics to Google Cloud Run ==="
echo "Project ID:    ${PROJECT_ID}"
echo "Service Name:  ${SERVICE_NAME}"
echo "Region:        ${REGION}"
echo "Image:         ${IMAGE_TAG}"
echo "========================================================"

# Check for GCP project configuration
if [ -z "${PROJECT_ID}" ]; then
  echo "Error: GCP Project ID is not configured. Set PROJECT_ID or run 'gcloud config set project <ID>'."
  exit 1
fi

# Build container image with Cloud Build or local Docker
echo ">> Submitting container build to Cloud Build..."
gcloud builds submit --tag "${IMAGE_TAG}" .

# Deploy to Cloud Run
echo ">> Deploying container to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_TAG}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --port 80 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10

echo ">> Deployment completed successfully!"
URL=$(gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${REGION}" --format 'value(status.url)')
echo "Application URL: ${URL}"
