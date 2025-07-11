#!/bin/bash

echo "🔧 Fixing npm SSL certificate issues..."
echo ""

# Option 1: Use npm's CA bundle
echo "Option 1: Updating npm CA certificates..."
npm config set cafile /etc/ssl/cert.pem

# Option 2: Set registry to use http (temporary fix)
echo ""
echo "Option 2: Try using HTTP registry (temporary)..."
echo "Run: npm config set registry http://registry.npmjs.org/"

# Option 3: Update npm
echo ""
echo "Option 3: Update npm itself..."
echo "Run: npm install -g npm@latest"

# Option 4: Clear npm cache
echo ""
echo "Option 4: Clear npm cache..."
npm cache clean --force

# Option 5: For corporate networks
echo ""
echo "Option 5: If you're behind a corporate proxy:"
echo "  npm config set proxy http://your-proxy:port"
echo "  npm config set https-proxy http://your-proxy:port"

echo ""
echo "🔐 For the certificate generation issue, let's use OpenSSL instead:"
echo ""
echo "Run this command to generate self-signed certificates:"
echo ""
echo "cd /workspace/wendigo && \\"
echo "openssl req -x509 -newkey rsa:2048 -nodes -days 365 \\"
echo "  -keyout certs/localhost-key.pem \\"
echo "  -out certs/localhost.pem \\"
echo "  -subj '/CN=localhost' \\"
echo "  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'"