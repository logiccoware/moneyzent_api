# ============================================
# Stage 1: Dependencies
# ============================================
FROM --platform=linux/amd64 node:24-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev for build stage)
RUN npm ci --ignore-scripts

# ============================================
# Stage 2: Builder
# ============================================
FROM --platform=linux/amd64 node:24-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the NestJS application
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --production --ignore-scripts

# ============================================
# Stage 3: Production
# ============================================
FROM --platform=linux/amd64 node:24-alpine AS production

# Install dumb-init for proper signal handling in containers
# Combine with user creation to reduce layers
RUN apk add --no-cache dumb-init \
    && addgroup --system --gid 1001 app \
    && adduser --system --uid 1001 app

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV APP_ENV=production

# Copy production dependencies and built application
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/package.json ./package.json

# Switch to non-root user
USER app

# Expose the application port
EXPOSE 3000

# Health check using Node.js (no external dependencies)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use dumb-init to handle PID 1 and signal forwarding
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
