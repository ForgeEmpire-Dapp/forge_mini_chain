FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S client -u 1001

# Change ownership of app directory
RUN chown -R client:nodejs /app

# Switch to non-root user
USER client

# Set environment variables
ENV NODE_ENV=production

# This is an example client, so we don't define an entrypoint
# It's meant to be run manually with specific commands
# Example: docker run --rm -it forge-client-example node sign-tx.js