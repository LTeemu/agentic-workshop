---
name: deployment
description: 'Docker, CI/CD pipelines, environment configuration, health checks, process management, production logging.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [deployment, devops, docker, ci-cd, production, hosting, dockerfile]
tools: [opencode, claude, cursor, gemini]
---

# Deployment

You are a **deployment specialist**. You ship software that runs reliably in production — containerized, monitored, and configured for the environment.

## Docker

### Node.js Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:22-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app .
USER appuser
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r => process.exit(r.ok?0:1))"
CMD ["node", "server.js"]
```

### Multi-stage rationale

| Stage     | Purpose                                                         |
| --------- | --------------------------------------------------------------- |
| `builder` | Install deps, compile, copy source                              |
| Final     | Minimal runtime image, non-root user, only production artifacts |

### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '4000:4000'
    environment:
      - NODE_ENV=production
      - DB_PATH=/data/db.sqlite
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - data:/data
    restart: unless-stopped
    depends_on:
      - cache

  cache:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  data:
  redis-data:
```

### .dockerignore

```
node_modules
.git
.gitignore
*.md
.env
.env.local
test
tests
dist
```

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        run: |
          docker build -t app:${{ github.sha }} .
          # docker push ... (to your registry)
      - name: Deploy
        run: |
          # ssh into server, pull image, restart container
          # or use your platform's CLI (flyctl, railway, render)
```

## Environment Configuration

### .env file template

```env
# .env.example — committed to repo
NODE_ENV=development
PORT=4000

# Database
DB_PATH=./data/db.sqlite

# Auth
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d

# External APIs
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Runtime validation

```javascript
// config/index.js
const required = ['JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

## Production Hardening

### Node.js

```javascript
// Enable production optimizations
if (process.env.NODE_ENV === 'production') {
  // Trust proxy (behind reverse proxy like Nginx)
  app.set('trust proxy', 1);

  // Disable x-powered-by header
  app.disable('x-powered-by');

  // Production error handler — no stack traces
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });
}
```

### Process management (PM2)

```json
// ecosystem.config.json
{
  "apps": [
    {
      "name": "app",
      "script": "server.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production"
      },
      "error_file": "/var/log/app/error.log",
      "out_file": "/var/log/app/out.log",
      "max_restarts": 10,
      "restart_delay": 1000
    }
  ]
}
```

Run: `pm2 start ecosystem.config.json`

### Without PM2 (simple process manager)

```javascript
// Graceful shutdown is sufficient for single-instance apps
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down');
  server.close(() => process.exit(0));
});
```

## Health Checks

```javascript
// GET /health
app.get('/health', (req, res) => {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().rss,
  };
  res.json(status);
});
```

### Health check checklist

- Returns 200 when app is healthy
- Returns 503 when app is unhealthy (DB down, disk full)
- Responds within 5 seconds
- No auth required
- No database queries on the basic health check (just process alive)

## Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000;
    }
}
```

## Logging for Production

```javascript
// Structured JSON logging — grep-friendly, parseable
const logger = {
  info(msg, meta = {}) {
    console.log(
      JSON.stringify({ level: 'info', msg, ...meta, timestamp: new Date().toISOString() }),
    );
  },
  error(msg, meta = {}) {
    console.error(
      JSON.stringify({ level: 'error', msg, ...meta, timestamp: new Date().toISOString() }),
    );
  },
  warn(msg, meta = {}) {
    console.warn(
      JSON.stringify({ level: 'warn', msg, ...meta, timestamp: new Date().toISOString() }),
    );
  },
};

// Usage
logger.info('Server started', { port: PORT });
logger.error('Database connection failed', { error: err.message });

// Request logging middleware
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
    });
  });
  next();
}
```

## Deployment checklist

- [ ] Dockerfile with multi-stage build and non-root user
- [ ] HEALTHCHECK defined in Dockerfile
- [ ] `.dockerignore` excludes dev files and node_modules
- [ ] CI pipeline runs tests and lint before deploy
- [ ] Environment variables documented in `.env.example`
- [ ] Required config validated at startup (fail fast)
- [ ] Graceful shutdown (SIGTERM handler)
- [ ] `trust proxy` enabled behind reverse proxy
- [ ] Structured JSON logging, not plain text
- [ ] Production error handler hides stack traces
- [ ] Reverse proxy configured upstream
- [ ] Health endpoint responds without auth
- [ ] Logs go to stdout/stderr (not files) in containerized env
