# Metabase MCP Server Dockerfile
# Base image: Node.js LTS Alpine for minimum footprint

# Stage 1: Build
FROM node:18-alpine AS builder

LABEL maintainer="Cheuk Yin <https://github.com/cheukyin175>"
LABEL description="Model Context Protocol server for Metabase"
LABEL version="0.1.0"

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies for build
RUN npm install --ignore-scripts

# Copy application code
COPY . .

# Build the TypeScript project
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --only=production

# Copy build artifacts from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist

# Default environment variables
ENV NODE_ENV=production \
    LOG_LEVEL=info

# Environment variables for Metabase connection in Docker network
# When running in the same Docker network as Metabase, use the container name:
# ENV METABASE_URL=http://metabase:3000

# Expose the port (if needed for external access)
EXPOSE 4321

# Use non-root user for better security
USER node

# Command to run the server (adjust the path based on your build output)
CMD ["node", "dist/index.js"]
