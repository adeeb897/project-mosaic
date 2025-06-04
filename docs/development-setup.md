# Development Setup Guide

This comprehensive guide will help you set up the Project Mosaic development environment to run both the frontend and backend simultaneously with optimal developer experience.

## Quick Start

The fastest way to get started:

```bash
npm run dev
```

This single command starts both frontend and backend with hot reloading.

### Automated Setup

For first-time setup with dependency installation:

```bash
npm run dev:setup
```

This script will:
- Install dependencies if needed
- Create necessary directories
- Set up environment files
- Start both frontend and backend servers

## Manual Setup

If you prefer to set up the environment manually:

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and customize it for development:

```bash
cp .env.example .env.development
```

The `.env.development` file contains development-specific configurations including:
- Database connections (MongoDB, Redis)
- JWT secrets
- CORS settings
- Logging levels
- Development features

### 3. Start Development Servers

Run both frontend and backend simultaneously:

```bash
npm run dev
```

This command uses `concurrently` to run:
- **Frontend**: React app built with esbuild in watch mode
- **Backend**: Express server with nodemon for auto-restart

### 4. Individual Server Commands

You can also run servers individually:

```bash
# Backend only
npm run dev:server

# Frontend only (build and watch)
npm run dev:client

# Backend with debugging
npm run dev:debug
```

## Development Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:setup` | Automated setup with dependency installation |
| `npm run dev:server` | Start only the backend server |
| `npm run dev:client` | Start only the frontend build process |
| `npm run dev:debug` | Start backend with debugging enabled |
| `npm run build` | Build both frontend and backend for production |
| `npm run build:server` | Build only the backend (TypeScript compilation) |
| `npm run build:client` | Build only the frontend (React bundle) |

## Development Architecture

### Frontend Build Process

The frontend uses **esbuild** for fast compilation and bundling:

- **Entry Point**: `src/client/index.tsx`
- **Output**: `public/js/index.js`
- **Features**:
  - TypeScript compilation
  - React JSX transformation
  - CSS bundling
  - File watching in development
  - Source maps for debugging
  - Fast rebuilds (< 100ms)

### Backend Development

The backend uses **nodemon** with **ts-node** for development:

- **Entry Point**: `src/index.ts`
- **Features**:
  - TypeScript compilation on-the-fly
  - Auto-restart on file changes
  - Path mapping support (`@api/*`, `@services/*`, etc.)
  - Environment-specific configuration
  - Debug mode support

### File Structure

```
project-mosaic/
├── src/
│   ├── client/           # React frontend
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── styles/       # CSS styles
│   │   └── index.tsx     # Frontend entry point
│   ├── api/              # Express API routes
│   ├── services/         # Business logic
│   ├── core/             # Core abstractions
│   └── index.ts          # Backend entry point
├── public/               # Static assets
│   ├── js/               # Built frontend assets
│   └── index.html        # HTML template
├── scripts/              # Build and development scripts
└── docs/                 # Documentation
```

## Development URLs

- **Application**: http://localhost:3000
- **API Endpoints**: http://localhost:3000/api/*
- **Static Assets**: http://localhost:3000/js/*, http://localhost:3000/css/*

## Environment Variables

### Development Environment (`.env.development`)

```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/project-mosaic-dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-change-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
LOG_LEVEL=debug
```

### Required Services

For full functionality, ensure these services are running:

1. **MongoDB** (default: localhost:27017)
2. **Redis** (default: localhost:6379)

You can use Docker to run these services:

```bash
# MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Redis
docker run -d -p 6379:6379 --name redis redis:latest
```

## Build Process

### Development Build

```bash
npm run build
```

This creates:
- `dist/` - Compiled TypeScript backend
- `public/js/` - Bundled frontend assets

### Production Build

```bash
NODE_ENV=production npm run build
```

Production builds include:
- Minified JavaScript
- Optimized CSS
- No source maps
- Tree shaking for smaller bundles

## Debugging

### Backend Debugging

Start the backend in debug mode:

```bash
npm run dev:debug
```

Then attach your debugger to `localhost:9229`.

### Frontend Debugging

The development build includes source maps, so you can debug directly in the browser:

1. Open Chrome DevTools
2. Go to Sources tab
3. Find your TypeScript files under `webpack://`

## Hot Reloading

- **Backend**: Automatic restart on file changes (nodemon)
- **Frontend**: Automatic rebuild and browser refresh on file changes (esbuild watch)

## Performance

### Build Times

- **Frontend**: ~50-100ms for incremental builds
- **Backend**: ~1-2s for TypeScript compilation and restart

### Memory Usage

- **Frontend Build**: ~50MB
- **Backend Process**: ~100-200MB

## Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Find and kill the process
   lsof -ti:3000 | xargs kill -9
   ```

2. **TypeScript path mapping not working**
   - Ensure `tsconfig-paths/register` is loaded
   - Check `tsconfig.json` paths configuration

3. **Frontend not loading**
   - Check if `public/js/index.js` exists
   - Verify the build script completed successfully

4. **Database connection errors**
   - Ensure MongoDB is running on localhost:27017
   - Check `.env.development` for correct connection strings

### Logs

Development logs are output to the console with different prefixes:
- `[CLIENT]` - Frontend build messages
- `[SERVER]` - Backend server messages

## Testing During Development

Run tests while developing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Code Quality

Ensure code quality during development:

```bash
# Lint code
npm run lint

# Format code
npm run format

# Run all quality checks
npm run test:ci
```

## Next Steps

Once your development environment is running:

1. Visit http://localhost:3000 to see the application
2. Check the browser console for any errors
3. Review the [API Documentation](./api-gateway.md)
4. Explore the [Module Development Guide](./module-development.md)
