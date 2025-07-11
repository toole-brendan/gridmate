#!/bin/bash

# Azure deployment script for Gridmate backend

set -e

# Configuration
RESOURCE_GROUP="gridmate-rg"
LOCATION="eastus"
DB_SERVER_NAME="gridmate-db-server"
DB_ADMIN_USER="gridmateadmin"
DB_NAME="gridmate_db"
ACR_NAME="gridmateacr"
KEY_VAULT_NAME="gridmate-kv"
STATIC_WEB_APP_NAME="gridmate-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Gridmate Azure deployment...${NC}"

# Check if logged in to Azure
echo -e "${YELLOW}Checking Azure login...${NC}"
if ! az account show &>/dev/null; then
    echo -e "${RED}Not logged in to Azure. Please run 'az login' first.${NC}"
    exit 1
fi

# Get current subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo -e "${GREEN}Using subscription: $SUBSCRIPTION_ID${NC}"

# Function to check if resource exists
resource_exists() {
    local resource_type=$1
    local resource_name=$2
    local resource_group=$3
    
    if az $resource_type show --name $resource_name --resource-group $resource_group &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Create resource group if it doesn't exist
if resource_exists "group" "$RESOURCE_GROUP" ""; then
    echo -e "${YELLOW}Resource group '$RESOURCE_GROUP' already exists${NC}"
else
    echo -e "${GREEN}Creating resource group '$RESOURCE_GROUP'...${NC}"
    az group create --name $RESOURCE_GROUP --location $LOCATION --tags Project=Gridmate Environment=Production
fi

# Create PostgreSQL server if it doesn't exist
if resource_exists "postgres flexible-server" "$DB_SERVER_NAME" "$RESOURCE_GROUP"; then
    echo -e "${YELLOW}PostgreSQL server '$DB_SERVER_NAME' already exists${NC}"
else
    echo -e "${GREEN}Creating PostgreSQL server '$DB_SERVER_NAME'...${NC}"
    echo -e "${YELLOW}This may take 5-10 minutes...${NC}"
    az postgres flexible-server create \
        --resource-group $RESOURCE_GROUP \
        --name $DB_SERVER_NAME \
        --location $LOCATION \
        --admin-user $DB_ADMIN_USER \
        --admin-password "$DB_ADMIN_PASSWORD" \
        --sku-name Standard_B2ms \
        --tier Burstable \
        --storage-size 32 \
        --version 16 \
        --yes
fi

# Enable pgvector extension
echo -e "${GREEN}Enabling pgvector extension...${NC}"
az postgres flexible-server parameter set \
    --resource-group $RESOURCE_GROUP \
    --server-name $DB_SERVER_NAME \
    --name azure.extensions \
    --value vector,uuid-ossp,pgcrypto

# Create database if it doesn't exist
echo -e "${GREEN}Creating database '$DB_NAME'...${NC}"
az postgres flexible-server db create \
    --resource-group $RESOURCE_GROUP \
    --server-name $DB_SERVER_NAME \
    --database-name $DB_NAME

# Create Container Registry if it doesn't exist
if resource_exists "acr" "$ACR_NAME" "$RESOURCE_GROUP"; then
    echo -e "${YELLOW}Container Registry '$ACR_NAME' already exists${NC}"
else
    echo -e "${GREEN}Creating Container Registry '$ACR_NAME'...${NC}"
    az acr create \
        --resource-group $RESOURCE_GROUP \
        --name $ACR_NAME \
        --sku Basic \
        --admin-enabled true
fi

# Create Key Vault if it doesn't exist
if resource_exists "keyvault" "$KEY_VAULT_NAME" "$RESOURCE_GROUP"; then
    echo -e "${YELLOW}Key Vault '$KEY_VAULT_NAME' already exists${NC}"
else
    echo -e "${GREEN}Creating Key Vault '$KEY_VAULT_NAME'...${NC}"
    az keyvault create \
        --name $KEY_VAULT_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku standard
fi

# Grant current user access to Key Vault
echo -e "${GREEN}Granting Key Vault access...${NC}"
CURRENT_USER_ID=$(az ad signed-in-user show --query id -o tsv)
az role assignment create \
    --role "Key Vault Secrets Officer" \
    --assignee $CURRENT_USER_ID \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME \
    2>/dev/null || echo -e "${YELLOW}Key Vault access already granted${NC}"

# Create Static Web App if it doesn't exist
if resource_exists "staticwebapp" "$STATIC_WEB_APP_NAME" "$RESOURCE_GROUP"; then
    echo -e "${YELLOW}Static Web App '$STATIC_WEB_APP_NAME' already exists${NC}"
else
    echo -e "${GREEN}Creating Static Web App '$STATIC_WEB_APP_NAME'...${NC}"
    az staticwebapp create \
        --name $STATIC_WEB_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --location eastus2 \
        --sku Free \
        --tags Project=Gridmate Environment=Production
fi

# Output connection information
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "${GREEN}Resource Group:${NC} $RESOURCE_GROUP"
echo -e "${GREEN}PostgreSQL Server:${NC} $DB_SERVER_NAME.postgres.database.azure.com"
echo -e "${GREEN}Database Name:${NC} $DB_NAME"
echo -e "${GREEN}Container Registry:${NC} $ACR_NAME.azurecr.io"
echo -e "${GREEN}Key Vault:${NC} https://$KEY_VAULT_NAME.vault.azure.net/"
echo -e "${GREEN}Static Web App:${NC} $(az staticwebapp show --name $STATIC_WEB_APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv)"

# Get ACR credentials
echo -e "\n${YELLOW}Container Registry Credentials:${NC}"
az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query "{Username:username, Password:passwords[0].value}" -o table

# Next steps
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Store secrets in Key Vault:"
echo "   az keyvault secret set --vault-name $KEY_VAULT_NAME --name <secret-name> --value <secret-value>"
echo "2. Build and push Docker image:"
echo "   docker build -t $ACR_NAME.azurecr.io/gridmate-backend:latest ."
echo "   az acr login --name $ACR_NAME"
echo "   docker push $ACR_NAME.azurecr.io/gridmate-backend:latest"
echo "3. Deploy to App Service or Container Instances"
echo "4. Configure custom domain and SSL"