# ==============================================================================
# Multi-Stage Dockerfile for PeakForm Athletics (Hercules Academy)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Enable Corepack for pnpm support
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package descriptors first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || npm install

# Copy application source code
COPY . .

# Build production bundle with type checking (live mode: real Convex backend)
ARG VITE_CONVEX_URL
ENV VITE_LOCAL_DEV=false VITE_CONVEX_URL=${VITE_CONVEX_URL}
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Serve with Nginx Alpine
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled frontend dist from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port (80 for standard, Cloud Run binds to $PORT or 8080)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
