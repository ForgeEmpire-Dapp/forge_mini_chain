# Kubernetes Deployment Guide for Forge Empire

This guide provides instructions for deploying the Forge Empire blockchain to a Kubernetes cluster.

## Prerequisites

1. Kubernetes cluster (local with Minikube, Docker Desktop, or cloud provider)
2. kubectl CLI tool
3. Docker CLI tool
4. Built Docker images (see Build Process section)

## Build Process

### Option 1: Using Build Scripts (Recommended)

```bash
# Linux/macOS
./scripts/build-images.sh

# Windows
scripts\build-images.bat
```

### Option 2: Manual Build

```bash
# Build main blockchain node image
docker build -t forge-empire:latest .

# Build explorer image
docker build -t forge-explorer:latest ./explorer

# Build AI agents image
docker build -t forge-ai-agents:latest ./ai-agents
```

## Deployment Process

### 1. Verify Built Images

```bash
docker images | grep forge
```

You should see:
- forge-empire:latest
- forge-explorer:latest
- forge-ai-agents:latest

### 2. Deploy to Kubernetes

```bash
# Linux/macOS
./scripts/deploy-k8s.sh

# Windows
scripts\deploy-k8s.bat
```

### 3. Manual Deployment Steps

If you prefer to deploy manually:

```bash
# Apply Persistent Volume Claims
kubectl apply -f k8s/pvc.yaml

# Apply deployments and services
kubectl apply -f k8s/deployment.yaml

# Apply ingress
kubectl apply -f k8s/ingress.yaml
```

### 4. Verify Deployment

```bash
# Check deployments
kubectl get deployments

# Check pods
kubectl get pods

# Check services
kubectl get services

# Check ingress
kubectl get ingress
```

## Accessing Services

After deployment, services will be available at:

- Explorer: http://blockchain.example.com/
- Leader API: http://blockchain.example.com/api
- Follower API: http://blockchain.example.com/follower
- AI Agents: http://blockchain.example.com/agents

Note: You may need to update your DNS or hosts file to point blockchain.example.com to your cluster's ingress IP.

## Monitoring Deployment

```bash
# Watch pod status
kubectl get pods -w

# Check pod logs
kubectl logs -f deployment/forge-leader
kubectl logs -f deployment/forge-follower
kubectl logs -f deployment/forge-explorer
kubectl logs -f deployment/forge-ai-agents
```

## Scaling

To scale follower nodes:

```bash
kubectl scale deployment forge-follower --replicas=3
```

## Updating Configuration

To update environment variables or other configurations:

1. Edit the deployment.yaml file
2. Apply the changes:
   ```bash
   kubectl apply -f k8s/deployment.yaml
   ```

## Troubleshooting

### Common Issues

1. **Images not found**: Ensure all images are built and available in your Docker environment
2. **Pods stuck in Pending**: Check resource availability and PersistentVolumeClaims
3. **Services not accessible**: Verify ingress configuration and DNS settings

### Debugging Commands

```bash
# Describe a deployment
kubectl describe deployment forge-leader

# Describe a pod
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name>

# Exec into a pod
kubectl exec -it <pod-name> -- /bin/sh
```

## Production Considerations

1. **Image Registry**: Push images to a container registry (Docker Hub, AWS ECR, etc.)
2. **Resource Limits**: Set appropriate CPU and memory limits in deployment.yaml
3. **Security**: Use secrets for sensitive configuration
4. **Monitoring**: Implement logging and monitoring solutions
5. **Backups**: Set up regular backup procedures for PersistentVolumes