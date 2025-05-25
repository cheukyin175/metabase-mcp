# Metabase MCP Server Dockerfile
# Multi-stage build for a smaller and more secure final image
FROM node:lts-alpine AS builder

LABEL maintainer="Cheuk Yin <https://github.com/cheukyin175>"
LABEL description="Model Context Protocol server for Metabase integration"
LABEL version="0.1.0"

WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Disable scripts to prevent npm lifecycle scripts from running
ENV npm_config_ignore_scripts=true

# Install all dependencies (we'll need TypeScript to compile)
RUN npm install

# Copy source code and tsconfig
COPY src/ ./src/
COPY tsconfig.json .

# Install TypeScript globally for direct access to tsc
RUN npm install -g typescript

# Manually compile TypeScript to JavaScript
RUN tsc

# Create dist directory and copy compiled files
RUN mkdir -p dist && \
    cp -r build/* dist/ && \
    ls -la dist

# Set permissions on entry point
RUN chmod 755 dist/index.js

# Remove devDependencies to make image smaller
RUN npm prune --omit=dev

# Default environment variables
ENV NODE_ENV=production \
    LOG_LEVEL=info

# Environment variables for Metabase connection in Docker network
# When running in the same Docker network as Metabase, use the container name:
# ENV METABASE_URL=http://metabase:3000

# Expose port if needed
EXPOSE 4321

# Use non-root user for better security
USER node

# Run the server
CMD ["node", "dist/index.js"]
