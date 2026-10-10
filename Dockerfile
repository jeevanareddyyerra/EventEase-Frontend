# ==============================================================================
# Multi-stage Dockerfile for EventEase Frontend (React 19 + Vite)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build stage using Node 20 Alpine
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors first to optimize Docker layer caching
COPY package.json package-lock.json ./

# Install clean, deterministic dependencies from lockfile
RUN npm ci

# Copy application source code (excluding files listed in .dockerignore)
COPY . .

# Build the production distribution
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production runtime stage using Nginx Alpine
# ------------------------------------------------------------------------------
FROM nginx:alpine

# Remove default Nginx welcome assets and configuration
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration supporting SPA fallback and /api/ reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Launch Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
