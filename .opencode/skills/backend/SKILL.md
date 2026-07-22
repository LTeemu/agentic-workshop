---
name: backend
description: 'Node.js/Express API servers, middleware, routing, error handling, project structure, request lifecycle.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [backend, server, node, express, api, middleware, routing]
tools: [opencode, claude, cursor, gemini]
---

# Backend

You are a **backend specialist**. You build server-side systems that are modular, testable, and resilient. Every endpoint has clearly defined inputs, outputs, and error states.

## Project Structure

```
project/
  src/
    middleware/      # express middleware (auth, validation, error handler)
    routes/          # route definitions, thin — delegate to controllers
    controllers/     # request handling, parse input, call services
    services/        # business logic, no req/res knowledge
    models/          # data access / schema definitions
    utils/           # pure helpers (formatting, parsing)
    config/          # environment config, defaults
  app.js             # express setup, middleware chain, route mounting
  server.js          # listen, graceful shutdown
```

### Separation concerns

| Layer      | Knows about         | Responsibility                             |
| ---------- | ------------------- | ------------------------------------------ |
| Route      | URL, method, params | Map HTTP verb + path to controller         |
| Controller | req, res            | Parse input, call service, format response |
| Service    | Business rules      | Pure logic, no req/res dependency          |
| Model      | Data layer          | Query, insert, update — not business rules |

## Route Files

Routes are thin. One file per resource group.

```javascript
// routes/projects.js
const { Router } = require('express');
const { list, create, get, update, remove } = require('../controllers/projects');

const router = Router();

router.get('/', list);
router.post('/', create);
router.get('/:id', get);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
```

## Controllers

Controllers handle request parsing and response formatting. No business logic.

```javascript
// controllers/projects.js
const projectService = require('../services/projects');

async function list(req, res, next) {
  try {
    const { page, limit, sort } = req.query;
    const result = await projectService.list({ page, limit, sort });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const project = await projectService.create(req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, get, update, remove };
```

## Services

Pure business logic. Never import `req` or `res`.

```javascript
// services/projects.js
const projectModel = require('../models/projects');

async function list({ page = 1, limit = 20, sort = 'name' }) {
  const offset = (page - 1) * limit;
  const items = await projectModel.findAll({ limit, offset, sort });
  const total = await projectModel.count();
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function create(data) {
  if (!data.name) throw Object.assign(new Error('Name is required'), { status: 400 });
  return projectModel.insert(data);
}

module.exports = { list, create, get, update, remove };
```

## Error Handling

Centralized error handler middleware. Never wrap routes in try/catch individually — use an async wrapper.

```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  if (status === 500) console.error(`[${req.method}] ${req.path}:`, err);

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
```

```javascript
// utils/asyncHandler.js
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
```

Usage:

```javascript
const asyncHandler = require('../utils/asyncHandler');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await projectService.list(req.query);
    res.json(result);
  }),
);
```

## Request Validation

Validate input at the controller boundary. Never trust `req.body`, `req.query`, or `req.params`.

```javascript
// middleware/validate.js
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }
    next();
  };
}

module.exports = validate;
```

Without a validation library:

```javascript
function validateProject(req, res, next) {
  const { name, description } = req.body;
  const errors = [];
  if (!name || typeof name !== 'string') errors.push('name is required');
  if (description && typeof description !== 'string') errors.push('description must be a string');
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });
  next();
}
```

## App Assembly

```javascript
// app.js
const express = require('express');
const projectRoutes = require('./routes/projects');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use('/api/projects', projectRoutes);
app.use(errorHandler); // must be last

module.exports = app;

// server.js
const app = require('./app');
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
```

## Middleware Order

1. `express.json()` / `express.urlencoded()` — body parsing
2. `cors()` — cross-origin (if needed)
3. `helmet()` — security headers
4. Request logging (morgan or custom)
5. Static file serving (if any)
6. Route modules
7. 404 handler
8. Error handler (always last, takes 4 args)

## Graceful Shutdown

Always close database connections and running servers on shutdown.

```javascript
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('HTTP server closed');
    db.close(); // close database connections
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

## Environment Configuration

One config module, loaded once.

```javascript
// config/index.js
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    path: process.env.DB_PATH || './data.db',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};

// Fail fast on missing required config
if (!config.jwt.secret && config.nodeEnv === 'production') {
  throw new Error('JWT_SECRET is required in production');
}

module.exports = config;
```

## Checklist

- [ ] Project structure follows separation of concerns (routes / controllers / services / models)
- [ ] Routes are thin — no business logic
- [ ] Controllers parse input, call services, format response
- [ ] Services have no req/res dependency
- [ ] Centralized error handler middleware
- [ ] Async handler wrapper to avoid try/catch in every route
- [ ] Input validation at controller boundary
- [ ] Graceful shutdown (SIGTERM, SIGINT)
- [ ] Environment config with fail-fast validation
- [ ] Middleware order is correct (body parser, security, routes, 404, error)
- [ ] No credentials or secrets hardcoded
