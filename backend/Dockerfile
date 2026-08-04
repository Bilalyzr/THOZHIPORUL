# ============================================================
# Backend Dockerfile — production-hardened.
# Changes from original: Node 20, npm ci (deterministic),
# non-root user, HEALTHCHECK.
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Install wget for the HEALTHCHECK probe (not in alpine by default).
RUN apk add --no-cache wget

# Copy package files and install dependencies (deterministic lockfile install).
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the application code.
COPY . .

# Create the uploads directory + ensure it's owned by the node user.
RUN mkdir -p uploads && chown -R node:node /app

# Run as the non-root `node` user (security: container compromise ≠ root).
USER node

# Expose the API port.
EXPOSE 5001

# Health check — hits the /api/health endpoint every 30s.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --spider -q http://localhost:5001/api/health || exit 1

# Start the application.
CMD ["npm", "start"]
