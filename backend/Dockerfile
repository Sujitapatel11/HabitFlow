FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

# Graceful shutdown support
STOPSIGNAL SIGTERM

CMD ["node", "server.js"]
