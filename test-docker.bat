@echo off
echo Testing Docker setup for Forge Empire...

echo Docker images:
docker images

echo Running containers:
docker ps

echo Testing Docker with a simple alpine container:
docker run --rm alpine echo "Docker is working!"

echo Test complete!