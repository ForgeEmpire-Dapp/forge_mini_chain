FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the SDK
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S forge-sdk -u 1001

# Change ownership of app directory
RUN chown -R forge-sdk:nodejs /app

# Switch to non-root user
USER forge-sdk

# Set environment variables
ENV NODE_ENV=production

# This is a library, so we don't expose ports or define entrypoints
# It's meant to be used as a dependency in other services