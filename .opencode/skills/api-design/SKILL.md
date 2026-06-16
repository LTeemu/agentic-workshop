---
name: api-design
description: 'API design — RESTful API patterns, resource modeling, pagination, filtering, sorting, versioning, status codes, request/response conventions, HATEOAS basics.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [api, rest, api-design, pagination, versioning, status-codes]
tools: [opencode, claude, cursor, gemini]
---

# API Design

You are an **API design specialist**. You build APIs that are consistent, predictable, and self-documenting. Every endpoint follows the same conventions for naming, status codes, pagination, and error responses.

## URL Structure

```
POST   /api/v1/projects          # Create
GET    /api/v1/projects          # List (with pagination, filtering)
GET    /api/v1/projects/:id      # Read
PUT    /api/v1/projects/:id      # Full update
PATCH  /api/v1/projects/:id      # Partial update
DELETE /api/v1/projects/:id      # Delete

# Nested resources
GET    /api/v1/projects/:id/tags
POST   /api/v1/projects/:id/tags

# Actions (rare — use sparingly)
POST   /api/v1/projects/:id/archive
```

### URL rules

- Nouns only, never verbs in the resource path (`/projects`, not `/getProjects`)
- Plural resource names (`/projects`, `/users`)
- Version prefix (`/api/v1/`) — always version from day one
- Kebab-case for multi-word (`/project-templates`, not `/projectTemplates`)
- Query string for filtering/sorting/pagination, not path

## HTTP Status Codes

| Code                        | Meaning                | When                                          |
| --------------------------- | ---------------------- | --------------------------------------------- |
| `200 OK`                    | Success                | GET, PUT, PATCH (returns body)                |
| `201 Created`               | Created                | POST (returns body, includes Location header) |
| `204 No Content`            | Success, no body       | DELETE (no response body)                     |
| `400 Bad Request`           | Client error           | Invalid input, validation failure             |
| `401 Unauthorized`          | Not authenticated      | Missing or invalid auth token                 |
| `403 Forbidden`             | Not authorized         | Authenticated but lacks permission            |
| `404 Not Found`             | Resource doesn't exist | Invalid ID in path                            |
| `409 Conflict`              | State conflict         | Duplicate unique field, stale version         |
| `422 Unprocessable Entity`  | Semantic error         | Business rule violation                       |
| `429 Too Many Requests`     | Rate limited           | Too many requests in window                   |
| `500 Internal Server Error` | Server error           | Unexpected failure (no details in response)   |

## Response Envelope

Consistent response structure for all endpoints.

```json
// Success — single resource
{
  "id": "abc-123",
  "name": "My Project",
  "status": "active",
  "createdAt": "2026-06-14T12:00:00Z",
  "_links": {
    "self": { "href": "/api/v1/projects/abc-123" },
    "tags": { "href": "/api/v1/projects/abc-123/tags" }
  }
}

// Success — list with pagination
{
  "items": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}

// Error
{
  "error": "Validation failed",
  "details": [
    { "field": "name", "message": "Name is required" },
    { "field": "email", "message": "Must be a valid email address" }
  ],
  "requestId": "req-xyz-123"
}
```

## Pagination

Always paginate list endpoints. Default sensible limits.

| Style        | When                        | How                                             |
| ------------ | --------------------------- | ----------------------------------------------- |
| Page-based   | Most APIs                   | `?page=1&limit=20` — simple, stateless          |
| Cursor-based | Real-time / infinite scroll | `?cursor=abc123&limit=20` — stable under writes |

Page-based:

```javascript
// Request:  GET /api/v1/projects?page=2&limit=20
// Response:
{
  "items": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 142,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

Cursor-based:

```javascript
// Request:  GET /api/v1/projects?cursor=eyJpZCI6MTB9&limit=20
// Response:
{
  "items": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MzB9",
    "limit": 20,
    "hasMore": true
  }
}
```

## Filtering

Consistent query syntax for list endpoints.

```javascript
// ?status=active                — exact match
// ?createdAfter=2026-01-01      — date range (gte)
// ?createdBefore=2026-06-01     — date range (lte)
// ?search=term                  — full-text
// ?tags=node,react              — array contains (comma-separated)

function parseFilters(query) {
  const filters = {};
  if (query.status) filters.status = query.status;
  if (query.createdAfter) filters.createdAfter = new Date(query.createdAfter);
  if (query.createdBefore) filters.createdBefore = new Date(query.createdBefore);
  if (query.search) filters.search = query.search;
  if (query.tags) filters.tags = query.tags.split(',');
  return filters;
}
```

## Sorting

```javascript
// ?sort=name                    — ascending
// ?sort=-name                   — descending (leading minus)
// ?sort=name,-createdAt         — multi-field

function parseSort(query, allowed = ['name', 'createdAt', 'status']) {
  if (!query.sort) return [{ field: 'createdAt', dir: 'DESC' }];
  return query.sort
    .split(',')
    .map((s) => {
      const dir = s.startsWith('-') ? 'DESC' : 'ASC';
      const field = s.replace(/^-/, '');
      if (!allowed.includes(field)) return null;
      return { field, dir };
    })
    .filter(Boolean);
}
```

## Input Validation

Validate every input at the boundary. Return detailed error messages.

```javascript
function validateCreateProject(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string') {
    errors.push({ field: 'name', message: 'Name is required and must be a string' });
  } else {
    if (body.name.length < 2)
      errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
    if (body.name.length > 200)
      errors.push({ field: 'name', message: 'Name must be at most 200 characters' });
  }

  if (body.status && !['draft', 'active', 'archived'].includes(body.status)) {
    errors.push({ field: 'status', message: 'Status must be draft, active, or archived' });
  }

  return errors;
}
```

## Versioning

Always version from day one. Never release an unversioned API.

| Strategy                                              | Pros                    | Cons                                  |
| ----------------------------------------------------- | ----------------------- | ------------------------------------- |
| URL prefix (`/api/v1/`)                               | Explicit, easy to route | URL pollution                         |
| Header (`Accept: application/vnd.api+json;version=1`) | Clean URLs              | Harder to discover, test              |
| Query param (`?v=1`)                                  | Simple                  | Pollutes query string, caching issues |

**Recommendation**: URL prefix for public APIs, header for internal microservices.

## Partial Responses (Sparse Fieldsets)

Let clients request only the fields they need.

```javascript
// GET /api/v1/projects?fields=id,name,status
// Response:
{ "items": [{ "id": 1, "name": "Foo", "status": "active" }, ...] }

function selectFields(obj, fields) {
  if (!fields) return obj
  const set = new Set(fields.split(','))
  return Object.fromEntries(Object.entries(obj).filter(([k]) => set.has(k)))
}
```

## Error Response Detail

```javascript
// Consistent error shape across all endpoints
class ApiError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      ...(this.details.length && { details: this.details }),
    };
  }
}

// Usage
throw new ApiError(400, 'Validation failed', [
  { field: 'email', message: 'Must be a valid email' },
]);

// Express error handler
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json(err.toJSON());
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
```

## API Design Checklist

- [ ] URLs use plural nouns, never verbs
- [ ] Version prefix from day one (`/api/v1/`)
- [ ] Consistent status codes across all endpoints
- [ ] All list endpoints paginated with defaults
- [ ] Error responses have consistent shape with details array
- [ ] Input validation at boundary with field-level errors
- [ ] No sensitive data in responses (passwords, tokens)
- [ ] CORS configured explicitly (not `*` in production)
- [ ] API returns `requestId` for debugging
- [ ] Rate limiting implemented (per-IP, per-user)
- [ ] Content-Type enforcement (`application/json` only)
- [ ] Idempotency for mutating endpoints (PUT, DELETE)
