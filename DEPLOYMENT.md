# Gridmate Deployment Guide

## Overview

Gridmate consists of three main components that can be deployed independently:
- **Web App**: Marketing site and user dashboard (Next.js)
- **Excel Add-in**: Office add-in for Excel integration (React)
- **Backend**: API server (Go)

## Deployment Methods

### 1. GitHub Actions (Recommended for CI/CD)

The repository includes a GitHub Actions workflow that allows selective deployment of components.

#### Setup Required Secrets

Add these secrets to your GitHub repository:
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: Token for Static Web Apps deployment
- `AZURE_STORAGE_ACCOUNT`: Storage account name for Excel add-in
- `AZURE_STORAGE_KEY`: Storage account key
- `ACR_LOGIN_SERVER`: Azure Container Registry URL
- `ACR_USERNAME`: ACR username
- `ACR_PASSWORD`: ACR password
- `AZURE_RESOURCE_GROUP`: Resource group name
- `PROD_API_URL`: Production API URL
- `STAGING_API_URL`: Staging API URL
- `SLACK_WEBHOOK_URL`: (Optional) For deployment notifications

#### Manual Deployment via GitHub Actions

1. Go to Actions tab in GitHub
2. Select "Deploy Gridmate Components"
3. Click "Run workflow"
4. Select components to deploy and environment
5. Click "Run workflow"

### 2. Local Deployment Script

For manual deployments from your local machine:

```bash
# Deploy only web app
./deploy.sh --webapp

# Deploy web app and backend
./deploy.sh --webapp --backend

# Deploy all components to staging
./deploy.sh --all --env staging

# See all options
./deploy.sh --help
```

#### Prerequisites for Local Deployment

1. Azure CLI installed and logged in:
   ```bash
   az login
   ```

2. Node.js 18+ and npm installed

3. Go 1.21+ installed (for backend)

4. Docker installed (for backend)

5. Azure Static Web Apps CLI:
   ```bash
   npm install -g @azure/static-web-apps-cli
   ```

### 3. Component-Specific Deployment

#### Web App Deployment

```bash
cd web-app
npm ci
npm run build
swa deploy ./out --deployment-token <token> --env production
```

#### Excel Add-in Deployment

```bash
cd excel-addin
npm ci
npm run build:prod
az storage blob upload-batch \
  --account-name <storage-account> \
  --destination '$web' \
  --source ./dist
```

#### Backend Deployment

```bash
cd backend
docker build -t gridmate-backend .
docker tag gridmate-backend <acr-name>.azurecr.io/gridmate-backend:latest
az acr login --name <acr-name>
docker push <acr-name>.azurecr.io/gridmate-backend:latest
az containerapp update \
  --name gridmate-backend-production \
  --resource-group gridmate-rg \
  --image <acr-name>.azurecr.io/gridmate-backend:latest
```

## Environments

- **production**: Live environment (www.gridmate.ai)
- **staging**: Testing environment
- **development**: Development environment

## Post-Deployment Verification

### Web App
- Production: https://www.gridmate.ai
- Azure URL: https://icy-moss-08b73c30f.2.azurestaticapps.net

### Excel Add-in
1. Check manifest URL is accessible
2. Test add-in installation in Excel

### Backend
1. Check health endpoint: `https://<backend-url>/health`
2. Verify database connectivity
3. Check logs in Azure Portal

## Rollback Procedures

### GitHub Actions
- Re-run a previous successful workflow

### Manual Rollback
```bash
# Web App - redeploy previous version
git checkout <previous-commit>
./deploy.sh --webapp

# Backend - use previous image tag
az containerapp update \
  --name gridmate-backend-production \
  --resource-group gridmate-rg \
  --image <acr>.azurecr.io/gridmate-backend:<previous-tag>
```

## Monitoring

- Azure Portal > Static Web Apps > Analytics
- Azure Portal > Container Apps > Logs
- Application Insights (if configured)

## Troubleshooting

### Web App Issues
- Check deployment logs in Azure Portal
- Verify environment variables
- Check browser console for errors

### Excel Add-in Issues
- Verify CORS settings on storage account
- Check manifest XML validity
- Test with Excel desktop vs online

### Backend Issues
- Check container logs: `az containerapp logs show -n gridmate-backend-production -g gridmate-rg`
- Verify database connection string
- Check API health endpoint

## Security Notes

- Never commit secrets to the repository
- Use Azure Key Vault for production secrets
- Rotate deployment tokens regularly
- Enable RBAC for Azure resources