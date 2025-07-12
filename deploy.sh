#!/bin/bash

# Gridmate Deployment Script
# Usage: ./deploy.sh [options]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEPLOY_WEBAPP=false
DEPLOY_EXCEL=false
DEPLOY_BACKEND=false
ENVIRONMENT="production"

# Function to print colored output
print_color() {
    echo -e "${2}${1}${NC}"
}

# Function to print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -w, --webapp     Deploy Web App to Azure Static Web Apps"
    echo "  -e, --excel      Deploy Excel Add-in"
    echo "  -b, --backend    Deploy Backend to Azure"
    echo "  -a, --all        Deploy all components"
    echo "  --env ENV        Set environment (production|staging|development) [default: production]"
    echo "  -h, --help       Display this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --webapp                    # Deploy only web app"
    echo "  $0 --webapp --backend          # Deploy web app and backend"
    echo "  $0 --all --env staging         # Deploy all components to staging"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -w|--webapp)
            DEPLOY_WEBAPP=true
            shift
            ;;
        -e|--excel)
            DEPLOY_EXCEL=true
            shift
            ;;
        -b|--backend)
            DEPLOY_BACKEND=true
            shift
            ;;
        -a|--all)
            DEPLOY_WEBAPP=true
            DEPLOY_EXCEL=true
            DEPLOY_BACKEND=true
            shift
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Check if at least one component is selected
if [[ "$DEPLOY_WEBAPP" == false && "$DEPLOY_EXCEL" == false && "$DEPLOY_BACKEND" == false ]]; then
    print_color "Error: No components selected for deployment" "$RED"
    usage
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
    print_color "Error: Invalid environment. Must be production, staging, or development" "$RED"
    exit 1
fi

print_color "=== Gridmate Deployment Script ===" "$BLUE"
print_color "Environment: $ENVIRONMENT" "$YELLOW"
echo ""

# Deploy Web App
if [[ "$DEPLOY_WEBAPP" == true ]]; then
    print_color "Deploying Web App..." "$BLUE"
    
    cd web-app
    
    # Install dependencies
    print_color "Installing dependencies..." "$YELLOW"
    npm ci
    
    # Build the application
    print_color "Building application..." "$YELLOW"
    npm run build
    
    # Get deployment token from environment or Azure CLI
    if [[ -z "$AZURE_STATIC_WEB_APPS_API_TOKEN" ]]; then
        print_color "Fetching deployment token from Azure..." "$YELLOW"
        export AZURE_STATIC_WEB_APPS_API_TOKEN=$(az staticwebapp secrets list \
            --name gridmate-frontend \
            --resource-group gridmate-rg \
            --query "properties.apiKey" \
            --output tsv)
    fi
    
    # Deploy to Azure Static Web Apps
    print_color "Deploying to Azure Static Web Apps..." "$YELLOW"
    swa deploy ./out \
        --deployment-token "$AZURE_STATIC_WEB_APPS_API_TOKEN" \
        --env "$ENVIRONMENT"
    
    print_color "✅ Web App deployed successfully!" "$GREEN"
    cd ..
    echo ""
fi

# Deploy Excel Add-in
if [[ "$DEPLOY_EXCEL" == true ]]; then
    print_color "Deploying Excel Add-in..." "$BLUE"
    
    cd excel-addin
    
    # Install dependencies
    print_color "Installing dependencies..." "$YELLOW"
    npm ci
    
    # Build the application
    print_color "Building application..." "$YELLOW"
    npm run build:prod
    
    # Deploy to Azure Storage
    print_color "Uploading to Azure Storage..." "$YELLOW"
    az storage blob upload-batch \
        --account-name "${AZURE_STORAGE_ACCOUNT:-gridmateaddin}" \
        --destination '$web' \
        --source ./dist \
        --overwrite true
    
    # Update manifest for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_color "Updating manifest for production..." "$YELLOW"
        cp manifest.xml manifest.prod.xml
        sed -i '' 's|https://localhost:3000|https://gridmateaddin.blob.core.windows.net|g' manifest.prod.xml
        print_color "Production manifest created: manifest.prod.xml" "$GREEN"
    fi
    
    print_color "✅ Excel Add-in deployed successfully!" "$GREEN"
    cd ..
    echo ""
fi

# Deploy Backend
if [[ "$DEPLOY_BACKEND" == true ]]; then
    print_color "Deploying Backend..." "$BLUE"
    
    cd backend
    
    # Build Go application
    print_color "Building Go application..." "$YELLOW"
    go mod download
    CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server
    
    # Build Docker image
    print_color "Building Docker image..." "$YELLOW"
    docker build -t gridmate-backend:latest .
    
    # Tag and push to Azure Container Registry
    ACR_NAME="${ACR_NAME:-gridmateacr}"
    print_color "Pushing to Azure Container Registry..." "$YELLOW"
    
    # Login to ACR
    az acr login --name "$ACR_NAME"
    
    # Tag and push
    docker tag gridmate-backend:latest "$ACR_NAME.azurecr.io/gridmate-backend:$ENVIRONMENT"
    docker tag gridmate-backend:latest "$ACR_NAME.azurecr.io/gridmate-backend:latest"
    docker push "$ACR_NAME.azurecr.io/gridmate-backend:$ENVIRONMENT"
    docker push "$ACR_NAME.azurecr.io/gridmate-backend:latest"
    
    # Deploy to Azure Container Apps
    print_color "Deploying to Azure Container Apps..." "$YELLOW"
    az containerapp update \
        --name "gridmate-backend-$ENVIRONMENT" \
        --resource-group gridmate-rg \
        --image "$ACR_NAME.azurecr.io/gridmate-backend:$ENVIRONMENT"
    
    print_color "✅ Backend deployed successfully!" "$GREEN"
    cd ..
    echo ""
fi

print_color "=== Deployment Complete ===" "$GREEN"
print_color "Environment: $ENVIRONMENT" "$YELLOW"

# Summary
echo ""
print_color "Deployed components:" "$BLUE"
[[ "$DEPLOY_WEBAPP" == true ]] && print_color "  ✅ Web App" "$GREEN"
[[ "$DEPLOY_EXCEL" == true ]] && print_color "  ✅ Excel Add-in" "$GREEN"
[[ "$DEPLOY_BACKEND" == true ]] && print_color "  ✅ Backend" "$GREEN"

# URLs
echo ""
print_color "Access URLs:" "$BLUE"
if [[ "$DEPLOY_WEBAPP" == true ]]; then
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_color "  Web App: https://www.gridmate.ai" "$YELLOW"
    else
        print_color "  Web App: https://icy-moss-08b73c30f.2.azurestaticapps.net" "$YELLOW"
    fi
fi
if [[ "$DEPLOY_EXCEL" == true ]]; then
    print_color "  Excel Add-in: Check manifest.prod.xml for installation" "$YELLOW"
fi
if [[ "$DEPLOY_BACKEND" == true ]]; then
    print_color "  Backend API: https://gridmate-backend-$ENVIRONMENT.azurecontainerapps.io" "$YELLOW"
fi