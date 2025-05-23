/**
 * API Gateway Types and Interfaces
 */

import { Request, Response, NextFunction } from 'express';

// Gateway Configuration
export interface GatewayConfig {
  rateLimit: RateLimitConfig;
  authentication: AuthConfig;
  validation: ValidationConfig;
  monitoring: MonitoringConfig;
  cors: CorsConfig;
}

// Rate Limiting Configuration
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  tiers: RateLimitTier[];
}

export interface RateLimitTier {
  name: string;
  windowMs: number;
  max: number;
  condition: (req: Request) => boolean;
}

// Authentication Configuration
export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  publicRoutes: string[];
  adminRoutes: string[];
}

// Validation Configuration
export interface ValidationConfig {
  enableRequestValidation: boolean;
  enableResponseValidation: boolean;
  strictMode: boolean;
  customValidators: Record<string, ValidatorFunction>;
}

export type ValidatorFunction = (value: any, req: Request) => boolean | string;

// Monitoring Configuration
export interface MonitoringConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableHealthChecks: boolean;
  metricsEndpoint: string;
  healthEndpoint: string;
}

// CORS Configuration
export interface CorsConfig {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
}

// Request Context
export interface RequestContext {
  requestId: string;
  userId?: string;
  userRoles?: string[];
  startTime: number;
  metadata: Record<string, any>;
}

// API Response Format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetails;
  metadata: ResponseMetadata;
}

export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  processingTime: number;
  version: string;
  rateLimit?: RateLimitInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// Validation Schema
export interface ValidationSchema {
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
}

// Middleware Types
export type GatewayMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type AsyncGatewayMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Metrics Types
export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip: string;
  userId?: string;
  timestamp: Date;
}

export interface SystemMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

// Health Check Types
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: any;
  lastChecked: Date;
  responseTime: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  version: string;
  checks: HealthCheck[];
  system: SystemMetrics;
}

// Error Types
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export class GatewayError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Extended Request Interface
declare module 'express-serve-static-core' {
  interface Request {
    context: RequestContext;
    user?: {
      id: string;
      email: string;
      roles: string[];
    };
    rateLimitInfo?: RateLimitInfo;
  }
}
