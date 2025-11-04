# API Documentation - Matrix Platform

## 🌐 Global-Ready Architecture API

Base URL: `http://localhost:3000` (Development)  
Base URL: `https://api.matrix-platform.com` (Production)

---

## 📋 Table of Contents

1. [Health & Monitoring](#health--monitoring)
2. [Projects](#projects)
3. [Jobs](#jobs)
4. [Memory](#memory)
5. [Graph](#graph)
6. [SUIG](#suig)
7. [Nicholas](#nicholas)
8. [Metrics](#metrics)

---

## Health & Monitoring

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-04T12:00:00.000Z",
  "services": {
    "database": true,
    "redis": true,
    "api": true
  },
  "uptime": 3600,
  "region": "us-east-1",
  "version": "0.1.0"
}
```

### GET /metrics

Simple metrics endpoint.

**Response:**
```json
{
  "uptime": 3600,
  "jobs": 10,
  "snapshots": 5
}
```

---

## Projects

### GET /api/projects

List all projects.

**Response:**
```json
[
  {
    "id": "prj-123",
    "name": "My Project",
    "description": "Project description",
    "createdAt": "2025-01-04T12:00:00.000Z",
    "updatedAt": "2025-01-04T12:00:00.000Z"
  }
]
```

### POST /api/projects

Create a new project.

**Request:**
```json
{
  "name": "My Project",
  "description": "Project description"
}
```

**Response:**
```json
{
  "id": "prj-123",
  "name": "My Project",
  "description": "Project description",
  "createdAt": "2025-01-04T12:00:00.000Z",
  "updatedAt": "2025-01-04T12:00:00.000Z"
}
```

### POST /api/projects/:id/jobs

Schedule a job for a project.

**Request:**
```json
{
  "spec": {
    "kind": "script",
    "image": "node:18",
    "command": ["node", "app.js"]
  }
}
```

**Response:**
```json
{
  "id": "job-123",
  "status": "pending"
}
```

---

## Jobs

### GET /api/jobs/:id

Get job by ID.

**Response:**
```json
{
  "id": "job-123",
  "projectId": "prj-123",
  "status": "completed",
  "spec": { ... },
  "result": { ... },
  "createdAt": "2025-01-04T12:00:00.000Z",
  "updatedAt": "2025-01-04T12:00:00.000Z"
}
```

---

## Memory

### POST /api/memory/:projectId

Add memory to a project.

**Request:**
```json
{
  "text": "Memory text",
  "metadata": {
    "kind": "summary"
  }
}
```

**Response:**
```json
{
  "id": "mem-123",
  "projectId": "prj-123",
  "text": "Memory text",
  "metadata": { ... },
  "createdAt": "2025-01-04T12:00:00.000Z"
}
```

### GET /api/memory/:projectId/search

Search memory by query.

**Query Parameters:**
- `q` (string): Search query
- `topK` (number, optional): Number of results (default: 5)

**Response:**
```json
[
  {
    "score": 0.95,
    "record": {
      "id": "mem-123",
      "text": "Memory text",
      ...
    }
  }
]
```

---

## Graph

### GET /api/graph/neighbors

Get graph neighbors.

**Query Parameters:**
- `type` (string): Node type (Project, Task, Job, etc.)
- `id` (string): Node ID

**Response:**
```json
[
  {
    "id": "edge-123",
    "from": { "type": "Project", "id": "prj-123" },
    "to": { "type": "Job", "id": "job-123" },
    "rel": "HAS_JOB",
    "createdAt": "2025-01-04T12:00:00.000Z"
  }
]
```

### GET /api/org/graph/summary

Get graph summary.

**Response:**
```json
{
  "totalEdges": 100,
  "byRelation": {
    "HAS_JOB": 50,
    "HAS_TASK": 30
  },
  "nodesByType": {
    "Project": 10,
    "Job": 50
  }
}
```

---

## SUIG

### GET /api/suig/query

Unified query across org and project memory.

**Query Parameters:**
- `q` (string): Query string
- `scope` (string, optional): `org` | `project` | `all` (default: `all`)
- `projectId` (string, optional): Project ID
- `topK` (number, optional): Number of results (default: 8)

**Response:**
```json
{
  "q": "query",
  "scope": "all",
  "org": [ ... ],
  "project": [ ... ],
  "graph": { ... }
}
```

### GET /api/suig/recs

Get project recommendations.

**Query Parameters:**
- `projectId` (string): Project ID
- `topK` (number, optional): Number of recommendations (default: 5)

**Response:**
```json
{
  "similarProjects": [
    {
      "projectId": "prj-456",
      "score": 0.85
    }
  ],
  "highlights": [ ... ]
}
```

### GET /api/suig/kpis

Get KPIs.

**Response:**
```json
{
  "projects": 10,
  "jobs": {
    "total": 100,
    "completed": 80,
    "failed": 10,
    "successRate": 0.89
  },
  "tasks": {
    "total": 200,
    "completed": 150
  },
  "memory": {
    "total": 1000
  },
  "graph": { ... }
}
```

---

## Nicholas

### GET /api/nicholas/plan

Get project plan and suggestions.

**Query Parameters:**
- `projectId` (string): Project ID

**Response:**
```json
{
  "summary": { ... },
  "suggested": [
    {
      "type": "coding",
      "reason": "apply fixes from failures"
    }
  ]
}
```

### POST /api/nicholas/bootstrap

Bootstrap a new project.

**Request:**
```json
{
  "name": "My Project"
}
```

**Response:**
```json
{
  "id": "prj-123",
  "name": "My Project",
  ...
}
```

### POST /api/nicholas/apply

Apply suggestions to a project.

**Request:**
```json
{
  "projectId": "prj-123",
  "suggested": [
    {
      "type": "coding",
      "reason": "apply fixes"
    }
  ]
}
```

**Response:**
```json
{
  "enqueued": [
    {
      "type": "coding",
      "reason": "apply fixes"
    }
  ]
}
```

---

## Metrics

### GET /api/metrics/series

Get metrics time series.

**Query Parameters:**
- `limit` (number, optional): Number of snapshots (default: 100)

**Response:**
```json
[
  {
    "ts": "2025-01-04T12:00:00.000Z",
    "kpis": { ... }
  }
]
```

---

## 🔐 Authentication (Planned)

Currently, all endpoints are public. Authentication will be added in Phase 2.

---

## 📊 Rate Limiting

Default rate limit: 100 requests per minute per IP.

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

---

## 🚨 Error Responses

All errors follow this format:

```json
{
  "error": "Error Name",
  "message": "Error message",
  "requestId": "req-123",
  "timestamp": "2025-01-04T12:00:00.000Z",
  "statusCode": 500
}
```

Common status codes:
- `200`: Success
- `400`: Bad Request
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

---

**Global-Ready API** 🌍

