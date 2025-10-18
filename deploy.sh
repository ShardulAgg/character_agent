#!/bin/bash

# Deploy to Google Cloud Platform
# Make sure you have gcloud CLI installed and authenticated

PROJECT_ID=$1

if [ -z "$PROJECT_ID" ]; then
    echo "Usage: ./deploy.sh <PROJECT_ID>"
    exit 1
fi

echo "Deploying to GCP project: $PROJECT_ID"

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Submit build
echo "Starting Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

echo "Deployment complete!"
echo "Check Cloud Run services:"
echo "gcloud run services list"