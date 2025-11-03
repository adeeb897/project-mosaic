# Authentication System Documentation

## Overview

Project Mosaic implements a robust authentication system that supports:

- Traditional username/password authentication
- OAuth 2.0/OpenID Connect integration
- JWT token management
- Session handling
- Role-based access control
- Secure credential storage
- Token revocation and logout

The authentication system is designed to be secure, scalable, and compliant with modern security standards.

## Architecture

The authentication system consists of the following components:

1. **AuthService**: Core service that handles authentication operations
2. **Authentication Middleware**: Express middleware for protecting routes
3. **Auth Routes**: API endpoints for authentication operations
4. **Token Management**: JWT token generation, validation, and revocation
5. **OAuth Integration**: Support for OAuth 2.0/OpenID Connect providers

## Authentication Flow

### Traditional Authentication

1. User registers with username, email, and password
2. Password is hashed using bcrypt before storage
3. User logs in with email and password
4. System verifies credentials and issues JWT tokens
5. Access token is used for API requests
6. Refresh token is used to obtain new access tokens

### OAuth Authentication

1. User initiates OAuth flow by requesting authorization URL
2. User is redirected to OAuth provider for authentication
3. Provider redirects back with authorization code
4. System exchanges code for tokens with provider
5. System creates or updates user account based on provider data
6. System issues JWT tokens for API access

## Token Management

The system uses two types of JWT tokens:

1. **Access Token**: Short-lived token (15 minutes) used for API access
2. **Refresh Token**: Long-lived token (7 days) used to obtain new access tokens

Tokens contain the following claims:

- `id`: User ID
- `email`: User email
- `roles`: User roles
- `type`: Token type (access or refresh)
- `jti`: Unique token ID for revocation

## Security Features

### Password Security

- Passwords are hashed using bcrypt with a cost factor of 12
- Failed login attempts are tracked and accounts are temporarily locked after 5 failures

### Token Security

- Tokens are signed with a secret key
- Access tokens have a short lifespan (15 minutes)
- Tokens can be revoked individually or for an entire user
- Revoked tokens are tracked in the database

### OAuth Security

- State parameter is used to prevent CSRF attacks
- OAuth tokens are securely exchanged for user data
- User accounts are linked to OAuth providers

## Role-Based Access Control

The system supports role-based access control with the following roles:

- `user`: Regular user with standard permissions
- `admin`: Administrator with elevated permissions

Routes can be protected with specific role requirements using the `authorize` middleware.

## API Endpoints

### Registration and Login

- `POST /api/v1/auth/register`: Register a new user
- `POST /api/v1/auth/login`: Login and get tokens
- `POST /api/v1/auth/refresh`: Refresh access token
- `POST /api/v1/auth/logout`: Logout and revoke tokens

### OAuth Integration

- `GET /api/v1/auth/oauth/:provider`: Get OAuth authorization URL
- `POST /api/v1/auth/oauth/:provider/callback`: Handle OAuth callback
- `POST /api/v1/auth/oauth/:provider/token`: Authenticate with OAuth ID token

### Password Management

- `POST /api/v1/auth/forgot-password`: Request password reset
- `POST /api/v1/auth/reset-password`: Reset password with token

## Implementation Details

### AuthService

The `AuthService` class provides the following methods:

- `register`: Register a new user
- `login`: Authenticate a user and issue tokens
- `refreshToken`: Refresh an access token
- `logout`: Revoke tokens
- `authenticateWithOAuth`: Authenticate with OAuth provider
- `verifyIdToken`: Verify OAuth ID token
- `getOAuthAuthorizationUrl`: Generate OAuth authorization URL
- `isTokenRevoked`: Check if a token is revoked
- `revokeToken`: Revoke a specific token
- `revokeAllUserTokens`: Revoke all tokens for a user

### Authentication Middleware

The authentication middleware consists of:

- `authenticate`: Verify JWT token and set user on request
- `authorize`: Check if user has required roles
- `authMiddleware`: Combined middleware for protected routes
- `adminMiddleware`: Combined middleware for admin-only routes

## Configuration

The authentication system can be configured with the following environment variables:

- `JWT_SECRET`: Secret key for signing JWT tokens
- `JWT_REFRESH_SECRET`: Secret key for signing refresh tokens (falls back to JWT_SECRET)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_REDIRECT_URI`: Google OAuth redirect URI

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production to protect tokens in transit
2. **Store Tokens Securely**: Store tokens in secure, HTTP-only cookies or secure storage
3. **Implement CSRF Protection**: Use CSRF tokens for sensitive operations
4. **Regular Token Rotation**: Implement token rotation for long-lived sessions
5. **Monitor for Suspicious Activity**: Track and alert on unusual authentication patterns
6. **Keep Dependencies Updated**: Regularly update authentication-related dependencies

## Testing

The authentication system includes comprehensive unit tests covering:

- User registration
- Login and credential verification
- Token refresh
- Token revocation
- OAuth integration
- Error handling

Run tests with:

```bash
npm test -- --testPathPattern=auth
```

## Future Enhancements

1. **Multi-factor Authentication**: Add support for MFA
2. **Additional OAuth Providers**: Implement GitHub, Microsoft, and Facebook OAuth
3. **Device Management**: Allow users to view and manage active sessions
4. **Audit Logging**: Enhance logging for security events
5. **Rate Limiting**: Implement more sophisticated rate limiting for auth endpoints
