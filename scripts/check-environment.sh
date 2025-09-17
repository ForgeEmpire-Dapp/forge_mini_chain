#!/bin/bash

# Environment check script for Forge Empire deployment

echo "Checking deployment environment for Forge Empire..."

# Check Docker
if command -v docker &> /dev/null
then
    echo "✅ Docker: $(docker --version)"
else
    echo "❌ Docker: Not found"
    echo "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null
then
    echo "✅ Docker Compose: $(docker-compose --version)"
else
    echo "❌ Docker Compose: Not found"
    echo "   Docker Compose is included with Docker Desktop"
fi

# Check Kubernetes
if command -v kubectl &> /dev/null
then
    echo "✅ Kubernetes CLI (kubectl): $(kubectl version --client --short)"
else
    echo "⚠️  Kubernetes CLI (kubectl): Not found"
    echo "   For Kubernetes deployment, install kubectl"
fi

# Check Node.js
if command -v node &> /dev/null
then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js: Not found"
    echo "   Please install Node.js: https://nodejs.org/"
fi

# Check npm
if command -v npm &> /dev/null
then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm: Not found"
    echo "   npm is included with Node.js"
fi

echo ""
echo "Environment check complete!"