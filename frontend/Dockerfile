FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install

# Copy source code
COPY shared/ ./shared/
COPY frontend/ ./frontend/

# Build shared types
WORKDIR /app/shared
RUN npm run build

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Expose port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
