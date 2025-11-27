# Matrix Platform - Dockerfile
# Global-Ready Architecture - Professional Production Configuration

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY matrix-scaffold/backend/package*.json ./
COPY matrix-scaffold/backend/prisma ./prisma

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY matrix-scaffold/backend/ ./

# Build TypeScript with optimizations
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY matrix-scaffold/backend/package*.json ./
RUN npm ci --production --ignore-scripts && \
    npm cache clean --force

# Copy Prisma files
COPY matrix-scaffold/backend/prisma ./prisma

# Generate Prisma Client for production
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create necessary directories
RUN mkdir -p logs storage

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check with better configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set Node.js production optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096 --enable-source-maps"

# Start application
CMD ["node", "dist/main.js"]

