@echo off
REM Kubernetes deployment script for Forge Empire

echo Deploying Forge Empire to Kubernetes...

REM Apply Persistent Volume Claims
echo Applying Persistent Volume Claims...
kubectl apply -f k8s/pvc.yaml

REM Apply deployments and services
echo Applying deployments and services...
kubectl apply -f k8s/deployment.yaml

REM Apply ingress
echo Applying ingress...
kubectl apply -f k8s/ingress.yaml

REM Show deployment status
echo Deployment status:
kubectl get deployments
kubectl get services
kubectl get pods

echo Forge Empire deployment commands executed!
echo Note: You may need to wait for pods to be ready.