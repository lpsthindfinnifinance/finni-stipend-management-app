# Use Node.js 20
FROM node:20-slim

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend with Vite
RUN npm run build


# Cloud Run uses PORT environment variable (default 8080)
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Start the application
#CMD ["node", "server/index.js"]
CMD ["node", "dist/index.js"]
