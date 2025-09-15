# Production Deployment Guide

## Overview

This guide provides instructions for deploying the Forge Empire blockchain to production. The system supports both single-node and multi-node deployments with proper production configurations.

## Prerequisites

1. Node.js 18+ installed
2. npm package manager
3. Docker (recommended for containerized deployment)
4. At least 2GB RAM and 10GB disk space

## Deployment Options

### Option 1: Direct Deployment

1. **Install Dependencies**
   ```bash
   npm ci --only=production
   ```

2. **Build the Application**
   ```bash
   npm run build
   ```

3. **Start the Leader Node**
   ```bash
   # Linux/macOS
   LEADER=1 CHAIN_ID=mainnet DATA_DIR=/var/lib/forge DATA_DIR=/var/lib/forge npm start
   
   # Windows (PowerShell)
   $env:LEADER="1"; $env:CHAIN_ID="mainnet"; $env:DATA_DIR="/var/lib/forge"; npm start
   ```

### Option 2: Docker Deployment (Recommended)

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   # Create app directory
   WORKDIR /app
   
   # Copy package files
   COPY package*.json ./
   
   # Install dependencies
   RUN npm ci --only=production
   
   # Copy source code
   COPY . .
   
   # Build the application
   RUN npm run build
   
   # Create data directory
   RUN mkdir -p /var/lib/forge
   
   # Expose ports
   EXPOSE 8080 7071
   
   # Set environment variables
   ENV NODE_ENV=production
   ENV DATA_DIR=/var/lib/forge
   ENV CHAIN_ID=mainnet
   
   # Start the application
   CMD ["npm", "start"]
   ```

2. **Build Docker Image**
   ```bash
   docker build -t forge-empire:latest .
   ```

3. **Run Leader Node**
   ```bash
   docker run -d \
     --name forge-leader \
     -p 8080:8080 \
     -p 7071:7071 \
     -v forge-data:/var/lib/forge \
     -e LEADER=1 \
     forge-empire:latest
   ```

4. **Run Follower Node**
   ```bash
   docker run -d \
     --name forge-follower \
     -p 8081:8081 \
     -v forge-follower-data:/var/lib/forge \
     -e API_PORT=8081 \
     -e LEADER_WS=ws://leader-host:7071 \
     forge-empire:latest
   ```

## Production Configuration

### Environment Variables

| Variable | Description | Default | Recommended Production Value |
|----------|-------------|---------|------------------------------|
| `LEADER` | Run as leader node | undefined | 1 (for leader), undefined (for follower) |
| `CHAIN_ID` | Blockchain identifier | forge-mini | mainnet |
| `BLOCK_MS` | Block production interval (ms) | 500 | 2000-5000 |
| `DATA_DIR` | Database directory | .data | /var/lib/forge |
| `API_PORT` | HTTP API port | 8080 (leader), 8081 (follower) | 8080 |
| `P2P_PORT` | P2P WebSocket port | 7071 (leader), 0 (follower) | 7071 |
| `BLOCK_GAS_LIMIT` | Max gas per block | 10000000 | 30000000 |
| `MIN_GAS_PRICE` | Minimum gas price | 1000000000 | 1000000000 |

## Multi-Node Setup

### Leader Node
```bash
LEADER=1 \
API_PORT=8080 \
P2P_PORT=7071 \
DATA_DIR=/var/lib/forge \
npm start
```

### Follower Nodes
```bash
API_PORT=8081 \
LEADER_WS=ws://leader-ip:7071 \
DATA_DIR=/var/lib/forge-follower-8081 \
npm start
```

## Monitoring and Health Checks

### Health Endpoint
```bash
curl http://localhost:8080/health
```

### Metrics
The system exposes metrics through the `/health` endpoint including:
- Block height
- Transaction pool size
- Peer count
- Gas usage statistics

## Backup and Recovery

### Database Backup
```bash
# Stop the node
docker stop forge-leader

# Backup data directory
tar -czf forge-backup-$(date +%Y%m%d).tar.gz /var/lib/forge

# Restart the node
docker start forge-leader
```

### Recovery
```bash
# Stop the node
docker stop forge-leader

# Restore data directory
tar -xzf forge-backup-YYYYMMDD.tar.gz -C /

# Restart the node
docker start forge-leader
```

## Security Considerations

1. **Key Management**
   - Store private keys securely
   - Use hardware security modules (HSM) in production
   - Rotate keys periodically

2. **Network Security**
   - Use firewalls to restrict access
   - Enable TLS for API endpoints
   - Implement rate limiting

3. **Access Control**
   - Restrict API access with authentication
   - Use network segmentation
   - Monitor for suspicious activity

## Scaling Considerations

1. **Vertical Scaling**
   - Increase RAM and CPU allocation
   - Optimize block production intervals
   - Adjust gas limits based on workload

2. **Horizontal Scaling**
   - Add more follower nodes
   - Implement load balancing for API requests
   - Use separate nodes for different services

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check if ports are in use
   netstat -tulpn | grep :8080
   netstat -tulpn | grep :7071
   ```

2. **Database Corruption**
   ```bash
   # Check database integrity
   # If corrupted, restore from backup
   ```

3. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

## Maintenance

1. **Regular Updates**
   - Update dependencies regularly
   - Apply security patches
   - Test updates in staging environment

2. **Log Management**
   - Implement log rotation
   - Monitor logs for errors
   - Archive old logs

3. **Performance Monitoring**
   - Monitor block production times
   - Track transaction throughput
   - Watch memory and CPU usage

This deployment guide provides a solid foundation for running the Forge Empire blockchain in production. Always test deployment procedures in a staging environment before applying to production systems.