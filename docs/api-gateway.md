# API Gateway Documentation

## Overview

The Project Mosaic API Gateway is a unified, production-ready gateway that handles authentication, request validation, rate limiting, monitoring, and response formatting for consistent client communication.

## Features

### 🔐 Authentication & Authorization

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- API key support for programmatic access
- Public route configuration
- Admin route protection

### 🛡️ Request Validation

- Zod-based schema validation
- Request body, query parameters, and headers validation
- Custom validation rules
- Sanitization functions for XSS and SQL injection prevention

### ⚡ Rate Limiting

- Tiered rate limiting based on user roles
- In-memory storage with Redis support
- Configurable time windows and limits
- Rate limit headers in responses
- Graceful degradation

### 📊 Monitoring & Metrics

- Request/response metrics collection
- Health checks for system components
- Prometheus metrics endpoint
- Performance monitoring
- Error tracking and logging

### 📝 Response Formatting

- Standardized API response format
- Consistent error handling
- Request ID tracking
- Processing time measurement
- Metadata enrichment

### 🔧 Middleware Pipeline

- Context injection (request ID, timing)
- CORS handling
- Security headers (Helmet)
- Request/response logging
- Error handling and recovery

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Security (Helmet)                                          │
│  2. CORS                                                        │
│  3. Request Context & Timing                                    │
│  4. Response Formatting                                         │
│  5. Monitoring & Metrics                                        │
│  6. Rate Limiting                                               │
│  7. Authentication                                              │
│  8. Request Validation                                          │
│  9. Route Handlers                                              │
│ 10. Error Handling                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Basic Usage

```typescript
import express from 'express';
import { createApiGateway } from './src/api/gateway';

const app = express();
const gateway = createApiGateway(app);

// Initialize the gateway
gateway.initialize();

// Add your routes after initialization
app.get('/api/v1/users', (req, res) => {
  res.success({ users: [] });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Custom Configuration

```typescript
const gateway = createApiGateway(app, {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    tiers: [
      {
        name: 'premium',
        windowMs: 15 * 60 * 1000,
        max: 1000,
        condition: req => req.user?.roles?.includes('premium'),
      },
      // ... more tiers
    ],
  },
  authentication: {
    jwtSecret: process.env.JWT_SECRET,
    publicRoutes: ['/api/v1/auth/*', '/api/v1/health'],
    adminRoutes: ['/api/v1/admin/*'],
  },
  monitoring: {
    enableMetrics: true,
    enableHealthChecks: true,
    metricsEndpoint: '/metrics',
    healthEndpoint: '/health',
  },
});
```

## API Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "metadata": {
    "requestId": "req_123456789",
    "timestamp": "2023-12-07T10:30:00.000Z",
    "processingTime": 45,
    "version": "1.0.0",
    "rateLimit": {
      "limit": 100,
      "remaining": 95,
      "reset": 1701944400
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "errors": [
        {
          "path": "email",
          "message": "Invalid email format",
          "code": "invalid_string"
        }
      ]
    }
  },
  "metadata": {
    "requestId": "req_123456789",
    "timestamp": "2023-12-07T10:30:00.000Z",
    "processingTime": 12,
    "version": "1.0.0"
  }
}
```

## Response Helper Methods

The gateway adds helper methods to the Express response object:

```typescript
// Success responses
res.success(data);
res.paginated(items, pagination);

// Error responses
res.error('CUSTOM_ERROR', 'Something went wrong');
res.validationError(errors);
res.notFound('User');
res.unauthorized('Invalid token');
res.forbidden('Insufficient permissions');
res.rateLimitExceeded(60);
res.internalError('Database connection failed');
```

## Validation

### Using Built-in Validators

```typescript
import { validators } from './src/api/gateway';

// Apply validation to routes
app.post('/api/v1/users', validators.userCreation, (req, res) => {
  // req.body is now validated and typed
  res.success({ user: req.body });
});
```

### Custom Validation

```typescript
import { validate, z } from './src/api/gateway';

const customSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(120),
});

app.post('/api/v1/custom', validate.body(customSchema), (req, res) => {
  res.success(req.body);
});
```

## Rate Limiting

### Default Tiers

1. **Admin**: 1000 requests/15min
2. **Premium**: 500 requests/15min
3. **Authenticated**: 200 requests/15min
4. **API Key**: 150 requests/15min
5. **Anonymous**: 50 requests/15min

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701944400
X-RateLimit-Window: 900
Retry-After: 60 (when limit exceeded)
```

## Monitoring

### Health Check Endpoint

```
GET /api/v1/health
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-07T10:30:00.000Z",
    "uptime": 3600000,
    "version": "1.0.0",
    "checks": [
      {
        "name": "database",
        "status": "healthy",
        "message": "Database connection is healthy",
        "responseTime": 5
      }
    ],
    "system": {
      "requestCount": 1250,
      "errorCount": 12,
      "averageResponseTime": 45,
      "memoryUsage": {
        "heapUsed": 50331648,
        "heapTotal": 67108864
      }
    }
  }
}
```

### Metrics Endpoint

```
GET /api/v1/metrics
```

### Prometheus Metrics

```
GET /api/v1/metrics/prometheus
```

## Error Codes

| Code                    | Description               | HTTP Status |
| ----------------------- | ------------------------- | ----------- |
| `VALIDATION_ERROR`      | Request validation failed | 400         |
| `UNAUTHORIZED`          | Authentication required   | 401         |
| `FORBIDDEN`             | Insufficient permissions  | 403         |
| `NOT_FOUND`             | Resource not found        | 404         |
| `RATE_LIMIT_EXCEEDED`   | Rate limit exceeded       | 429         |
| `INTERNAL_SERVER_ERROR` | Server error              | 500         |

## Configuration Options

### Gateway Config

```typescript
interface GatewayConfig {
  rateLimit: RateLimitConfig;
  authentication: AuthConfig;
  validation: ValidationConfig;
  monitoring: MonitoringConfig;
  cors: CorsOptions;
}
```

### Rate Limit Config

```typescript
interface RateLimitConfig {
  windowMs: number;
  max: number;
  tiers: RateLimitTier[];
}

interface RateLimitTier {
  name: string;
  windowMs: number;
  max: number;
  condition: (req: Request) => boolean;
}
```

### Authentication Config

```typescript
interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  publicRoutes: string[];
  adminRoutes: string[];
}
```

## Best Practices

### 1. Route Organization

- Add routes after gateway initialization
- Use consistent route patterns (`/api/v1/...`)
- Group related routes together

### 2. Error Handling

- Use appropriate HTTP status codes
- Provide meaningful error messages
- Include relevant error details for debugging

### 3. Validation

- Validate all input data
- Use strict validation schemas
- Sanitize user input to prevent XSS/SQL injection

### 4. Rate Limiting

- Configure appropriate limits for different user types
- Monitor rate limit usage
- Implement graceful degradation

### 5. Monitoring

- Monitor key metrics (response time, error rate)
- Set up health checks for dependencies
- Use structured logging

### 6. Security

- Use HTTPS in production
- Implement proper authentication
- Follow security headers best practices
- Regularly update dependencies

## Production Deployment

### Environment Variables

```bash
# Required
JWT_SECRET=your-super-secret-jwt-key
API_VERSION=1.0.0

# Optional
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
LOG_LEVEL=info
```

### Docker Configuration

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Health Checks

Configure your load balancer to use the health endpoint:

```
Health Check URL: /api/v1/health
Expected Status: 200
Timeout: 5s
Interval: 30s
```

## Troubleshooting

### Common Issues

1. **Routes returning 404**

   - Ensure routes are added after `gateway.initialize()`
   - Check route patterns and methods

2. **Rate limiting not working**

   - Verify tier conditions
   - Check if user authentication is working

3. **Validation errors**

   - Ensure request data matches schema
   - Check for required fields

4. **Health checks failing**
   - Verify database connections
   - Check external service dependencies

### Debug Mode

Enable debug logging:

```typescript
process.env.LOG_LEVEL = 'debug';
```

## Contributing

When contributing to the API Gateway:

1. Add tests for new features
2. Update documentation
3. Follow TypeScript best practices
4. Ensure backward compatibility
5. Test with different configurations

## License

This API Gateway is part of Project Mosaic and follows the project's licensing terms.
