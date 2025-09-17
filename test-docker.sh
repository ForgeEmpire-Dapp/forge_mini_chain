#!/bin/bash

echo "Testing Docker setup for Forge Empire..."

# List all Docker images
echo "Docker images:"
docker images

# List running containers
echo "Running containers:"
docker ps

# Test if we can run a simple container
echo "Testing Docker with a simple alpine container:"
docker run --rm alpine echo "Docker is working!"

echo "Test complete!"#!/bin/bash

echo "Testing Docker setup for Forge Empire..."

# List all Docker images
echo "Docker images:"
docker images

# List running containers
echo "Running containers:"
docker ps

# Test if we can run a simple container
echo "Testing Docker with a simple alpine container:"
docker run --rm alpine echo "Docker is working!"

echo "Test complete!"