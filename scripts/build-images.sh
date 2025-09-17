#!/bin/bash

# Build script for all Docker images in the Forge Empire project

echo "Building Forge Empire Docker images..."

# Build main blockchain node image
echo "Building forge-empire:latest..."
docker build -t forge-empire:latest .

# Build explorer image
echo "Building forge-explorer:latest..."
docker build -t forge-explorer:latest ./explorer

# Build AI agents image
echo "Building forge-ai-agents:latest..."
docker build -t forge-ai-agents:latest ./ai-agents

# List built images
echo "Built images:"
docker images | grep forge

echo "All images built successfully!"