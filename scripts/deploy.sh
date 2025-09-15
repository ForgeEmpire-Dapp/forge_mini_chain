#!/bin/bash

# Deployment script for Forge Empire blockchain

set -e

echo "Forge Empire - Production Deployment"
echo "===================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null
then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Build the Docker images
echo "Building Docker images..."
docker-compose build

# Start the services
echo "Starting services..."
docker-compose up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Check service status
echo "Checking service status..."
docker-compose ps

echo ""
echo "Deployment completed successfully!"
echo ""
echo "Services:"
echo "  - Leader Node API: http://localhost:8080"
echo "  - Follower Node 1 API: http://localhost:8081"
echo "  - Follower Node 2 API: http://localhost:8082"
echo "  - Block Explorer: http://localhost:3000"
echo ""
echo "To view logs:"
echo "  - Leader: docker-compose logs -f leader"
echo "  - Follower 1: docker-compose logs -f follower1"
echo "  - Follower 2: docker-compose logs -f follower2"
echo "  - Explorer: docker-compose logs -f explorer"