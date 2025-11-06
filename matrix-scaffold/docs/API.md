# Matrix Platform Enterprise API

## 🚀 Overview

The Matrix Platform API is a comprehensive, enterprise-grade RESTful API with GraphQL support designed to compete with global deployment platforms like Vercel and Netlify. Built with professional standards, comprehensive security, and scalable architecture.

## 🔗 Quick Links

- **API Documentation**: `/swagger` (Interactive Swagger UI)
- **GraphQL Playground**: `/graphql/playground` (Development only)
- **Health Check**: `/api/health`
- **API Status**: `/api/version`

## 🏗️ Architecture Overview

### Multi-Version Support
- **Current Version**: v2
- **Supported Versions**: v1, v2
- **Backward Compatibility**: Full support for v1 with migration guides
- **Version Detection**: URL path (`/api/v2/`) or headers (`X-API-Version`)

### Security Features
- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Multi-tier (free/pro/enterprise) with Redis backend
- **Security Headers**: CSP, HSTS, XSS protection
- **Request Validation**: Size limits, content type validation
- **API Keys**: Format validation with secure generation

### Database Architecture
- **Primary**: MongoDB for user data and projects
- **Caching**: Redis for sessions and rate limiting
- **Financial**: PostgreSQL for billing and analytics
- **Storage**: MinIO (S3-compatible) for assets

## 📚 API Versions

### Version 2 (Current)
```
Base URL: https://api.matrix-platform.com/api/v2/
```

**Features:**
- ✅ Complete project management
- ✅ Team collaboration
- ✅ Advanced analytics
- ✅ Webhook support
- ✅ GraphQL integration
- ✅ Real-time subscriptions

**Rate Limits:**
- Free: 1,000 requests/hour
- Pro: 10,000 requests/hour  
- Enterprise: 100,000 requests/hour

### Version 1 (Legacy)
```
Base URL: https://api.matrix-platform.com/api/v1/
```

**Features:**
- ✅ Basic project management
- ✅ Deployment operations
- ❌ Team collaboration
- ❌ Advanced analytics
- ❌ Webhooks

**Deprecation:** Support until December 31, 2025

## 🔐 Authentication

### JWT Authentication
```bash
# Login to get tokens
curl -X POST https://api.matrix-platform.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "...", "tier": "pro" }
}
```

### Using Tokens
```bash
# Include in Authorization header
curl -H "Authorization: Bearer <access_token>" \
  https://api.matrix-platform.com/api/v2/projects
```

### API Keys (Alternative)
```bash
# Generate API key in dashboard
curl -H "X-API-Key: mk_abc123def456..." \
  https://api.matrix-platform.com/api/v2/status
```

## 🛠️ Core Endpoints

### Projects Management

#### List Projects
```http
GET /api/v2/projects
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (int): Number of results (default: 20, max: 100)
- `offset` (int): Pagination offset (default: 0)
- `status` (string): Filter by status (active, paused, archived)
- `framework` (string): Filter by framework (react, vue, next, etc.)

**Response:**
```json
{
  "apiVersion": "v2",
  "data": [
    {
      "id": "proj_abc123",
      "name": "My React App",
      "description": "A modern React application",
      "status": "active",
      "framework": "react",
      "repository": {
        "url": "https://github.com/user/repo",
        "branch": "main",
        "provider": "github"
      },
      "domain": "my-app.matrix-platform.com",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Create Project
```http
POST /api/v2/projects
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My New Project",
  "description": "Project description",
  "framework": "react",
  "repository": {
    "url": "https://github.com/user/new-repo",
    "branch": "main",
    "provider": "github",
    "private": false
  },
  "domain": "custom-domain.com",
  "visibility": "public"
}
```

#### Get Project
```http
GET /api/v2/projects/{id}
Authorization: Bearer <token>
```

#### Update Project
```http
PUT /api/v2/projects/{id}
Authorization: Bearer <token>
Content-Type: application/json
```

#### Delete Project
```http
DELETE /api/v2/projects/{id}
Authorization: Bearer <token>
```

### Deployments Management

#### List Deployments
```http
GET /api/v2/deployments
Authorization: Bearer <token>
```

**Query Parameters:**
- `projectId` (string): Filter by project ID
- `status` (string): Filter by status (pending, building, success, failed)
- `limit` (int): Number of results (default: 20)

#### Create Deployment
```http
POST /api/v2/deployments
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "projectId": "proj_abc123",
  "branch": "main",
  "commitHash": "abc123def456",
  "commitMessage": "Add new feature",
  "environment": {
    "NODE_ENV": "production",
    "API_URL": "https://api.example.com"
  }
}
```

#### Get Deployment
```http
GET /api/v2/deployments/{id}
Authorization: Bearer <token>
```

#### Get Deployment Logs
```http
GET /api/v2/deployments/{id}/logs
Authorization: Bearer <token>
```

### Team Collaboration (v2+)

#### Invite Team Member
```http
POST /api/v2/projects/{id}/team/invite
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "teammate@example.com",
  "role": "developer",
  "permissions": ["read", "deploy"]
}
```

#### List Team Members
```http
GET /api/v2/projects/{id}/team
Authorization: Bearer <token>
```

#### Remove Team Member
```http
DELETE /api/v2/projects/{id}/team/{userId}
Authorization: Bearer <token>
```

### Analytics (v2+)

#### Project Analytics
```http
GET /api/v2/analytics/projects/{id}
Authorization: Bearer <token>
```

**Query Parameters:**
- `timeRange` (string): Time range (1d, 7d, 30d, 90d, 1y)
- `metrics` (string[]): Specific metrics to include

**Response:**
```json
{
  "apiVersion": "v2",
  "data": {
    "totalViews": 15420,
    "uniqueVisitors": 8731,
    "averageLoadTime": 1250,
    "deploymentCount": 45,
    "uptime": 99.95,
    "topPages": [
      { "path": "/", "views": 5230 },
      { "path": "/about", "views": 2140 }
    ]
  },
  "meta": {
    "timeRange": "7d",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### User Analytics
```http
GET /api/v2/analytics/usage
Authorization: Bearer <token>
```

### Webhooks (v2+)

#### Create Webhook
```http
POST /api/v2/webhooks
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://example.com/webhook",
  "events": ["deployment.success", "deployment.failed"],
  "projectId": "proj_abc123",
  "secret": "webhook_secret_key"
}
```

#### List Webhooks
```http
GET /api/v2/webhooks
Authorization: Bearer <token>
```

#### Update Webhook
```http
PUT /api/v2/webhooks/{id}
Authorization: Bearer <token>
```

#### Delete Webhook
```http
DELETE /api/v2/webhooks/{id}
Authorization: Bearer <token>
```

## 🔗 GraphQL API

### Endpoint
```
POST /graphql
Authorization: Bearer <token>
Content-Type: application/json
```

### Example Queries

#### Get User with Projects
```graphql
query GetUserWithProjects {
  me {
    id
    email
    name
    tier
    projects(limit: 10) {
      id
      name
      status
      framework
      latestDeployment {
        id
        status
        createdAt
      }
    }
    stats {
      totalProjects
      totalDeployments
      storageUsed
    }
  }
}
```

#### Create Project
```graphql
mutation CreateProject($input: ProjectInput!) {
  createProject(input: $input) {
    id
    name
    status
    domain
  }
}
```

#### Get Project Analytics
```graphql
query ProjectAnalytics($projectId: ID!, $timeRange: String) {
  analytics(projectId: $projectId, timeRange: $timeRange) {
    totalViews
    uniqueVisitors
    averageLoadTime
    uptime
  }
}
```

## 🚨 Error Handling

### Standard Error Response
```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_abc123def456"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid authentication |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

## 🔒 Rate Limiting

### Headers
All responses include rate limiting headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2024-01-15T11:00:00Z
Retry-After: 3600
```

### Tier Limits

| Tier | Requests/Hour | Burst | Concurrent |
|------|---------------|--------|------------|
| Free | 1,000 | 10/min | 5 |
| Pro | 10,000 | 100/min | 20 |
| Enterprise | 100,000 | 1000/min | 100 |

### Endpoint-Specific Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 requests | 15 minutes |
| `/auth/register` | 3 requests | 1 hour |
| `/projects/deploy` | 100 requests | 1 hour |

## 🔄 Webhooks

### Event Types
- `deployment.started`
- `deployment.success`
- `deployment.failed`
- `project.created`
- `project.updated`
- `project.deleted`
- `team.member.added`
- `team.member.removed`

### Payload Structure
```json
{
  "id": "evt_abc123def456",
  "type": "deployment.success",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "deployment": {
      "id": "dep_xyz789",
      "projectId": "proj_abc123",
      "status": "success",
      "url": "https://my-app-xyz789.matrix-platform.com"
    }
  },
  "project": {
    "id": "proj_abc123",
    "name": "My React App"
  }
}
```

### Verification
Webhooks include an `X-Matrix-Signature` header for verification:

```javascript
const crypto = require('crypto')

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return `sha256=${expectedSignature}` === signature
}
```

## 📊 Response Formats

### Success Response
```json
{
  "apiVersion": "v2",
  "data": { /* Response data */ },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123def456",
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Error Response
```json
{
  "error": "Validation Error",
  "message": "The request body contains invalid data",
  "code": "VALIDATION_ERROR",
  "details": {
    "name": "Name is required",
    "email": "Email must be valid"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_abc123def456"
}
```

## 🔄 Migration Guide (v1 → v2)

### Breaking Changes
None - v2 is fully backward compatible with v1.

### New Features in v2
1. **Team Collaboration**
   - `/api/v2/projects/{id}/team/*` endpoints
   - User roles and permissions

2. **Advanced Analytics**
   - `/api/v2/analytics/*` endpoints
   - Real-time metrics and insights

3. **Webhook Support**
   - `/api/v2/webhooks/*` endpoints
   - Event-driven integrations

4. **GraphQL Integration**
   - `/graphql` endpoint
   - Flexible query capabilities

5. **Enhanced Error Handling**
   - Detailed error codes
   - Better error messages

### Migration Timeline
- **Announcement**: January 1, 2024
- **v1 Deprecation**: June 1, 2025
- **v1 Sunset**: December 31, 2025

## 📋 Best Practices

### Authentication
- Always use HTTPS for API requests
- Store tokens securely (environment variables, secure storage)
- Implement token refresh logic
- Use API keys for server-to-server communication

### Rate Limiting
- Implement exponential backoff for 429 responses
- Monitor rate limit headers
- Consider upgrading to higher tiers for production workloads

### Error Handling
- Always check response status codes
- Implement proper error handling for all error codes
- Use `requestId` for debugging and support

### Performance
- Use pagination for large result sets
- Implement caching where appropriate
- Use GraphQL for complex queries to reduce over-fetching

### Security
- Validate webhook signatures
- Use environment-specific API keys
- Implement proper access controls
- Regularly rotate API keys and tokens

## 🛠️ SDKs and Tools

### Official SDKs
- **JavaScript/TypeScript**: `@matrix-platform/sdk`
- **Python**: `matrix-platform-python`
- **Go**: `matrix-platform-go`
- **CLI**: `matrix-cli`

### Third-Party Integrations
- GitHub Actions
- GitLab CI/CD
- Docker
- Kubernetes
- Terraform

## 🆘 Support

### Documentation
- **API Reference**: [docs.matrix-platform.com/api](https://docs.matrix-platform.com/api)
- **Guides**: [docs.matrix-platform.com/guides](https://docs.matrix-platform.com/guides)
- **Examples**: [github.com/matrix-platform/examples](https://github.com/matrix-platform/examples)

### Support Channels
- **Email**: support@matrix-platform.com
- **Discord**: [discord.gg/matrix-platform](https://discord.gg/matrix-platform)
- **GitHub**: [github.com/matrix-platform/matrix-platform](https://github.com/matrix-platform/matrix-platform)

### Status Page
- **Status**: [status.matrix-platform.com](https://status.matrix-platform.com)
- **Incidents**: Real-time incident updates
- **Maintenance**: Scheduled maintenance windows

---

## 🏢 Enterprise Features

For enterprise customers, additional features are available:

- **Dedicated Support**: 24/7 priority support
- **Custom Rate Limits**: Tailored to your needs
- **Private Cloud**: Dedicated infrastructure
- **SSO Integration**: SAML, OAuth2, LDAP
- **Compliance**: SOC2, GDPR, HIPAA
- **SLA**: 99.99% uptime guarantee

Contact sales@matrix-platform.com for enterprise pricing and features.