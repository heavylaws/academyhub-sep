# ==============================================================================
# PeakForm Athletics - Google Cloud Run Deployment Script (PowerShell)
# ==============================================================================

param(
    [string]$ServiceName = "peakform-athletics",
    [string]$Region = "us-central1",
    [string]$ProjectId = ""
)

$ErrorActionPreference = "Stop"

if (-not $ProjectId) {
    $ProjectId = (gcloud config get-value project 2>$null).Trim()
}

if (-not $ProjectId) {
    Write-Error "GCP Project ID is not configured. Pass -ProjectId <ID> or set default project via 'gcloud config set project <ID>'."
    exit 1
}

$commitHash = (git rev-parse --short HEAD).Trim()
$imageTag = "gcr.io/$ProjectId/$ServiceName`:$commitHash"

Write-Host "=== Deploying PeakForm Athletics to Google Cloud Run ===" -ForegroundColor Cyan
Write-Host "Project ID:    $ProjectId"
Write-Host "Service Name:  $ServiceName"
Write-Host "Region:        $Region"
Write-Host "Image Tag:     $imageTag"
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Build and push container via Cloud Build
Write-Host "`n>> Submitting container build to Google Cloud Build..." -ForegroundColor Yellow
gcloud builds submit --tag $imageTag .

# 2. Deploy to Cloud Run
Write-Host "`n>> Deploying service to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
    --image $imageTag `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --port 80 `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 10

Write-Host "`n>> Deployment completed successfully!" -ForegroundColor Green
$url = (gcloud run services describe $ServiceName --platform managed --region $Region --format 'value(status.url)').Trim()
Write-Host "Application URL: $url" -ForegroundColor Cyan
