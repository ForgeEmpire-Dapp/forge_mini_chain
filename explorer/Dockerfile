FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S explorer -u 1001

# Change ownership of app directory
RUN chown -R explorer:nodejs /app

# Switch to non-root user
USER explorer

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]