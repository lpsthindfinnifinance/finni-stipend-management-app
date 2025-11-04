# Finni Health - GCP Deployment Guide

This guide walks through deploying the Finni Health Stipend Management System to Google Cloud Platform.

## Prerequisites

- Google Cloud Project created
- `gcloud` CLI installed locally
- GitHub account
- Repository already created via Replit Git

---

## STEP 1: Push Code to GitHub

If you haven't already pushed to GitHub:

```bash
# Add GitHub as a remote (replace with your GitHub repo URL)
git remote add github https://github.com/YOUR_USERNAME/finni-health-stipend.git

# Push to GitHub
git push github main
```

---

## STEP 2: Set Up GCP Project

### 2.1 Install gcloud CLI (if not installed)

Download from: https://cloud.google.com/sdk/docs/install

### 2.2 Initialize gcloud

```bash
# Login to your Google account
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID
```

---

## STEP 3: Enable Required APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

---

## STEP 4: Create Artifact Registry

```bash
gcloud artifacts repositories create finni-health \
  --repository-format=docker \
  --location=us-central1 \
  --description="Finni Health Stipend Management Docker Images"
```

---

## STEP 5: Create Cloud SQL Database

```bash
# Create PostgreSQL 16 instance (adjust tier based on your needs)
gcloud sql instances create finni-health-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-1-3840 \
  --region=us-central1 \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --availability-type=zonal \
  --storage-type=SSD \
  --storage-size=10GB

# Create database
gcloud sql databases create finni_stipend_db \
  --instance=finni-health-db

# Create database user
gcloud sql users create finni_app_user \
  --instance=finni-health-db \
  --password=YOUR_SECURE_PASSWORD_HERE
```

**Note:** Save the password securely - you'll need it for the DATABASE_URL

---

## STEP 6: Create Secrets in Secret Manager

```bash
# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Database URL (Cloud SQL Unix socket format)
echo -n "postgresql://finni_app_user:YOUR_PASSWORD@/finni_stipend_db?host=/cloudsql/$PROJECT_ID:us-central1:finni-health-db" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Session secret (generate a random 32-byte string)
openssl rand -hex 32 | gcloud secrets create SESSION_SECRET --data-file=-

# Slack webhook URL
echo -n "YOUR_SLACK_WEBHOOK_URL" | \
  gcloud secrets create SLACK_WEBHOOK_URL --data-file=-

# OIDC credentials (you'll need to set these up with your auth provider)
echo -n "YOUR_OIDC_CLIENT_ID" | \
  gcloud secrets create OIDC_CLIENT_ID --data-file=-

echo -n "YOUR_OIDC_CLIENT_SECRET" | \
  gcloud secrets create OIDC_CLIENT_SECRET --data-file=-

echo -n "YOUR_OIDC_ISSUER_URL" | \
  gcloud secrets create OIDC_ISSUER_URL --data-file=-
```

---

## STEP 7: Grant Cloud Build Permissions

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant Cloud Build permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

---

## STEP 8: Connect GitHub to Cloud Build

### Option A: Using GCP Console (Recommended)

1. Go to: https://console.cloud.google.com/cloud-build/triggers
2. Click **"Create Trigger"**
3. Configure:
   - **Name**: `deploy-finni-health-main`
   - **Event**: Push to a branch
   - **Source**: 
     - Click **"Connect new repository"**
     - Select **"GitHub"**
     - Authenticate with GitHub
     - Select your `finni-health-stipend` repository
   - **Branch**: `^main$`
   - **Configuration**: Cloud Build configuration file (yaml)
   - **Location**: `cloudbuild.yaml`
   - **Region**: us-central1
4. Click **"Create"**

### Option B: Using gcloud CLI

```bash
# Install GitHub app (follow prompts)
gcloud builds connections create github finni-health-connection \
  --region=us-central1

# Create trigger
gcloud builds triggers create github \
  --name=deploy-finni-health-main \
  --repository=projects/$PROJECT_ID/locations/us-central1/connections/finni-health-connection/repositories/finni-health-stipend \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml \
  --region=us-central1
```

---

## STEP 9: Migrate Database from Replit

Before first deployment, export your data from Replit:

```bash
# In Replit Shell, export database
pg_dump $DATABASE_URL > finni_backup.sql

# Download the file from Replit

# Upload to Cloud Storage (create bucket first if needed)
gsutil mb gs://$PROJECT_ID-db-backups/
gsutil cp finni_backup.sql gs://$PROJECT_ID-db-backups/

# Import to Cloud SQL
gcloud sql import sql finni-health-db \
  gs://$PROJECT_ID-db-backups/finni_backup.sql \
  --database=finni_stipend_db
```

---

## STEP 10: Deploy!

Now push to trigger your first deployment:

```bash
# Commit the new files
git add Dockerfile cloudbuild.yaml .dockerignore .gcloudignore
git commit -m "Add GCP deployment configuration"

# Push to GitHub
git push github main
```

This will automatically trigger Cloud Build!

---

## STEP 11: Monitor Deployment

### View Build Progress

**Console:** https://console.cloud.google.com/cloud-build/builds

**CLI:**
```bash
# List recent builds
gcloud builds list --limit=5

# Stream logs of latest build
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)') --stream
```

### View Your Deployed App

```bash
# Get the Cloud Run URL
gcloud run services describe finni-health-app \
  --region=us-central1 \
  --format='value(status.url)'
```

Your app will be available at: `https://finni-health-app-XXXXX.run.app`

---

## STEP 12: Set Up Authentication (Important!)

You'll need to replace Replit Auth with a new authentication provider:

### Option A: Google Identity Platform

1. Go to: https://console.cloud.google.com/customer-identity
2. Enable Identity Platform
3. Add OAuth 2.0 provider
4. Get credentials and update secrets:

```bash
# Update OIDC secrets
echo -n "YOUR_GOOGLE_CLIENT_ID" | gcloud secrets versions add OIDC_CLIENT_ID --data-file=-
echo -n "YOUR_GOOGLE_CLIENT_SECRET" | gcloud secrets versions add OIDC_CLIENT_SECRET --data-file=-
echo -n "https://accounts.google.com" | gcloud secrets versions add OIDC_ISSUER_URL --data-file=-
```

### Option B: Auth0

1. Create Auth0 account: https://auth0.com
2. Set up application
3. Update secrets with Auth0 credentials

---

## Useful Commands

### View Logs
```bash
gcloud run services logs read finni-health-app --region=us-central1 --limit=50
```

### Update Environment Variable
```bash
gcloud run services update finni-health-app \
  --region=us-central1 \
  --update-env-vars=KEY=VALUE
```

### Rollback to Previous Version
```bash
gcloud run services update-traffic finni-health-app \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
```

### View Service Details
```bash
gcloud run services describe finni-health-app --region=us-central1
```

---

## Cost Estimate

- **Cloud Run**: ~$5-20/month (based on traffic)
- **Cloud SQL** (db-custom-1-3840): ~$50/month
- **Secret Manager**: ~$0.10/month
- **Artifact Registry**: ~$0.50/month
- **Cloud Build**: First 120 builds/day free

**Estimated Total**: ~$55-70/month

---

## Troubleshooting

### Build Fails
- Check Cloud Build logs in console
- Verify all secrets exist: `gcloud secrets list`
- Check IAM permissions

### App Won't Start
- Check Cloud Run logs: `gcloud run services logs read finni-health-app --region=us-central1`
- Verify DATABASE_URL format is correct
- Ensure Cloud SQL instance is running

### Can't Connect to Database
- Verify Cloud SQL instance name in cloudbuild.yaml
- Check that Cloud Run service account has cloudsql.client role
- Verify DATABASE_URL uses Unix socket format

---

## Production Checklist

- [ ] All secrets migrated to Secret Manager
- [ ] Database backup completed
- [ ] Authentication provider configured
- [ ] Slack webhook tested
- [ ] Custom domain configured (optional)
- [ ] Monitoring and alerts set up
- [ ] Team has access to GCP console
- [ ] Documentation updated with new URLs

---

## Support

For GCP-specific issues:
- GCP Documentation: https://cloud.google.com/docs
- Cloud Run Docs: https://cloud.google.com/run/docs
- Cloud SQL Docs: https://cloud.google.com/sql/docs
