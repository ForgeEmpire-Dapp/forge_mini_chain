# Docker Compose Deployment Guide for Forge Empire

This guide provides instructions for deploying the Forge Empire blockchain using Docker Compose for local development and testing.

## Prerequisites

1. Docker Desktop (with Docker Compose)
2. At least 4GB of available RAM

## Quick Start

### 1. Build and Deploy

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d
```

### 2. Verify Services

```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f
```

## Services Overview

The Docker Compose configuration includes:

1. **Leader Node** (forge-leader)
   - API Port: 8080
   - P2P Port: 7071
   
2. **Follower Nodes** (forge-follower1, forge-follower2)
   - Follower 1 API Port: 8081
   - Follower 2 API Port: 8082
   
3. **Block Explorer** (forge-explorer)
   - Web Port: 3000
   
4. **AI Agents** (forge-ai-agents)
   - API Port: 3001

## Accessing Services

After deployment, services will be available at:

- Explorer: http://localhost:3000
- Leader API: http://localhost:8080
- Follower 1 API: http://localhost:8081
- Follower 2 API: http://localhost:8082
- AI Agents API: http://localhost:3001

## Managing the Deployment

### Start Services

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d leader explorer
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop specific services
docker-compose stop follower1 follower2
```

### View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f leader

# View last 100 lines of logs
docker-compose logs --tail=100
```

### Scale Services

```bash
# Scale follower nodes
docker-compose up -d --scale follower=3
```

## Development Workflow

### Rebuilding Images

```bash
# Rebuild all images
docker-compose build

# Rebuild specific service
docker-compose build leader
```

### Update Configuration

1. Modify environment variables in docker-compose.yml
2. Restart services:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8080, 8081, 8082, 3000, 3001 are not in use
2. **Insufficient resources**: Allocate more memory to Docker Desktop
3. **Build failures**: Check Dockerfile syntax and dependencies

### Debugging Commands

```bash
# Check container status
docker-compose ps

# Inspect a container
docker inspect mini_chain_leader

# Execute commands in a container
docker-compose exec leader /bin/sh

# View resource usage
docker stats
```

## Production Considerations

While Docker Compose is suitable for development and testing, consider these points for production:

1. **Persistence**: Use named volumes for data persistence
2. **Security**: Use secrets for sensitive configuration
3. **Monitoring**: Implement logging and monitoring solutions
4. **Backup**: Set up regular backup procedures for volumes
5. **Scaling**: Kubernetes is recommended for production scaling