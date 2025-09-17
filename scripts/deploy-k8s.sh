#!/bin/bash

# Kubernetes deployment script for Forge Empire

echo "Deploying Forge Empire to Kubernetes..."

# Apply Persistent Volume Claims
echo "Applying Persistent Volume Claims..."
kubectl apply -f k8s/pvc.yaml

# Apply deployments and services
echo "Applying deployments and services..."
kubectl apply -f k8s/deployment.yaml

# Apply ingress
echo "Applying ingress..."
kubectl apply -f k8s/ingress.yaml

# Wait for deployments to be ready
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment/forge-leader --timeout=60s
kubectl wait --for=condition=available deployment/forge-follower --timeout=60s
kubectl wait --for=condition=available deployment/forge-explorer --timeout=60s
kubectl wait --for=condition=available deployment/forge-ai-agents --timeout=60s

# Show deployment status
echo "Deployment status:"
kubectl get deployments
kubectl get services
kubectl get pods

echo "Forge Empire deployed successfully!"