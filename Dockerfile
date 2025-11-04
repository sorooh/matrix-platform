# Matrix Platform - Dockerfile
# Global-Ready Architecture

FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY matrix-scaffold/backend/package*.json ./
COPY matrix-scaffold/backend/prisma ./prisma

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY matrix-scaffold/backend ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY matrix-scaffold/backend/package*.json ./
RUN npm ci --production

# Copy Prisma files
COPY matrix-scaffold/backend/prisma ./prisma

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]

