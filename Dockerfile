# Metabase MCP Server Dockerfile
# Base image: Node.js LTS Alpine for minimum footprint

# Stage 1: Build
FROM node:lts-alpine AS builder

LABEL maintainer="Hyeongjun Yu <https://github.com/hyeongjun-dev>"
LABEL description="Model Context Protocol server for Metabase integration"
LABEL version="0.1.0"

# Set working directory
WORKDIR /usr/src/app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Configure npm to skip prepare scripts
RUN npm config set ignore-scripts true
# Install all dependencies including devDependencies for build setup
RUN npm ci
# Restore the ignore-scripts setting
RUN npm config set ignore-scripts false

# Copy application code
COPY . .

# Build the TypeScript project
RUN npm run build

# Set appropriate permissions for the executable
RUN chmod +x build/index.js

# Default environment variables
ENV NODE_ENV=production \
    LOG_LEVEL=info

# Set port if needed (optional for MCP)
# ENV MCP_SERVER_PORT=3000

# Authentication setup (configure via Docker run -e flags)
# Option 1: Username and password authentication
# docker run -e METABASE_URL=https://metabase.example.com -e METABASE_USER_EMAIL=user@example.com -e METABASE_PASSWORD=pass metabase-mcp

# Option 2: API Key authentication (recommended for production)
# docker run -e METABASE_URL=https://metabase.example.com -e METABASE_API_KEY=your_api_key metabase-mcp

# Use non-root user for better security
USER node

# Run the server
CMD ["node", "build/index.js"]

# Stage 2: Runtime
FROM node:lts-alpine

WORKDIR /usr/src/app

# Install only production dependencies, excluding devDependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy build artifacts
COPY --from=builder /usr/src/app/build ./build

ENV NODE_ENV=production
USER node

CMD ["node", "build/index.js"]
