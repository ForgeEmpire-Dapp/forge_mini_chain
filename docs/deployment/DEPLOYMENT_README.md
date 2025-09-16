# Deployment Instructions

This directory contains all the necessary files for deploying the Forge Empire blockchain to production.

## Directory Structure

```
.
├── Dockerfile                  # Docker configuration for the main blockchain node
├── docker-compose.yml         # Multi-node deployment with Docker Compose
├── DEPLOYMENT_GUIDE.md        # Detailed deployment instructions
├── healthcheck.js             # Health check script for Docker containers
├── config/
│   └── production.json        # Production configuration
├── explorer/
│   └── Dockerfile             # Docker configuration for block explorer
├── scripts/
│   ├── deploy.sh              # Deployment script for Linux/macOS
│   └── deploy.bat             # Deployment script for Windows
└── k8s/
    ├── deployment.yaml        # Kubernetes deployment configuration
    ├── pvc.yaml               # Persistent volume claims for Kubernetes
    └── ingress.yaml           # Ingress configuration for external access
```

## Deployment Options

### 1. Docker Compose (Recommended for single server)

```bash
# Linux/macOS
./scripts/deploy.sh

# Windows
scripts\deploy.bat
```

### 2. Kubernetes (Recommended for cloud deployments)

```bash
# Create persistent volumes
kubectl apply -f k8s/pvc.yaml

# Deploy the blockchain
kubectl apply -f k8s/deployment.yaml

# (Optional) Configure ingress for external access
kubectl apply -f k8s/ingress.yaml
```

## Configuration

All production configuration can be found in `config/production.json`. Adjust the values according to your environment.

## Monitoring

The system exposes health endpoints at `/health` on each node for monitoring purposes.

## Scaling

To scale the system:
1. Increase follower node replicas in docker-compose.yml or k8s/deployment.yaml
2. Adjust resource limits based on your infrastructure
3. Consider implementing a load balancer for API requests