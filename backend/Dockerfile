FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared types
WORKDIR /app/shared
RUN npm run build

# Build backend
WORKDIR /app/backend
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
