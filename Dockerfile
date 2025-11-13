# Build stage for dependencies
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install required system dependencies for better-sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Create data directories
RUN mkdir -p /app/data/cache

# Copy package files and installed dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy application files
COPY index.js ./
COPY lib ./lib
COPY router ./router
COPY LICENSE ./
COPY README.md ./

# Set environment variables
ENV NODE_ENV=production \
    ARDENT_DATA_DIR=/app/data \
    ARDENT_CACHE_DIR=/app/data/cache \
    ARDENT_API_LOCAL_PORT=3002

# Expose the API port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/api', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the API
CMD ["node", "index.js"]
