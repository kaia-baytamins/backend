# Use Node.js 22 Alpine image for @kaiachain/ethers-ext compatibility
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose port (Cloud Run will override this)
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main"]