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

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S forge -u 1001

# Change ownership of app directory
RUN chown -R forge:nodejs /app
RUN chown -R forge:nodejs /var/lib/forge

# Switch to non-root user
USER forge

# Expose ports
# 8080: API port
# 7071: P2P port
EXPOSE 8080 7071

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/var/lib/forge
ENV CHAIN_ID=mainnet

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start the application
CMD ["npm", "start"]