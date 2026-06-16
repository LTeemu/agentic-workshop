---
name: authentication
description: 'Authentication and authorization — session management, JWT, password hashing, OAuth patterns, role-based access control, security best practices.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [auth, authentication, authorization, jwt, session, password, oauth, rbac]
tools: [opencode, claude, cursor, gemini]
---

# Authentication

You are an **auth specialist**. You implement authentication systems that are secure by default — proper hashing, token rotation, rate limiting, and defense in depth.

## Password Hashing

Always use bcrypt (or argon2). Never use SHA or MD5 for passwords.

```javascript
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function hash(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function compare(password, hash) {
  return bcrypt.compare(password, hash);
}
```

### Password requirements

- Minimum 8 characters (longer is better — recommend 12+)
- No arbitrary complexity rules (caps + numbers + symbols encourage predictable patterns)
- Allow all Unicode characters (including spaces and emoji)
- Rate-limit attempts (5 per minute per IP, 10 per minute per user)

## Session-Based Auth (Cookies)

Best for server-rendered apps where you control the client.

```javascript
// middleware/session.js
const crypto = require('crypto');

const sessions = new Map(); // use Redis in production

function createSession(userId) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function destroySession(sessionId) {
  sessions.delete(sessionId);
}

// Express middleware
function sessionMiddleware(req, res, next) {
  const sessionId = req.cookies?.session;
  if (sessionId) {
    const session = getSession(sessionId);
    if (session) {
      req.userId = session.userId;
      // Rotate session ID to prevent fixation
      destroySession(sessionId);
      const newId = createSession(session.userId);
      res.cookie('session', newId, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }
  }
  next();
}
```

## JWT (Token-Based Auth)

Best for APIs, mobile apps, and stateless authentication.

```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');

function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn || '7d',
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') return null;
    throw err;
  }
}

// Express middleware
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }

  req.user = payload;
  next();
}
```

### JWT best practices

| Practice                                         | Reason                         |
| ------------------------------------------------ | ------------------------------ |
| Short expiry (15m-1h for access, 7d for refresh) | Limits damage of leaked tokens |
| Store in httpOnly cookie, not localStorage       | Prevents XSS token theft       |
| Use `sub` claim for user identifier              | Standard JWT field             |
| Include `iat` and `exp`                          | Required for validity window   |
| Sign with HS256 or RS256                         | Never `none` algorithm         |
| Validate on every request                        | Don't cache tokens server-side |

### Refresh token flow

```javascript
// POST /api/auth/refresh
async function refresh(req, res) {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  const payload = verifyToken(refreshToken);
  if (!payload) return res.status(401).json({ error: 'Invalid refresh token' });

  // Verify refresh token exists in DB (revocation check)
  const stored = await db
    .prepare('SELECT id FROM refresh_tokens WHERE token = ? AND revoked = 0')
    .get(refreshToken);
  if (!stored) return res.status(401).json({ error: 'Token revoked' });

  const accessToken = signToken({ sub: payload.sub, role: payload.role });
  res.json({ accessToken });
}
```

## Role-Based Access Control (RBAC)

```javascript
// middleware/authorize.js
const ROLES = {
  admin: ['read:projects', 'write:projects', 'delete:projects', 'manage:users'],
  editor: ['read:projects', 'write:projects'],
  viewer: ['read:projects'],
};

function authorize(...required) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'viewer';
    const permissions = ROLES[userRole] || [];
    const hasAll = required.every((p) => permissions.includes(p));

    if (!hasAll) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage
router.delete('/projects/:id', authMiddleware, authorize('delete:projects'), controller.remove);
```

## OAuth 2.0 Pattern

For third-party login (GitHub, Google, etc.).

```javascript
// GET /api/auth/github — redirect to GitHub
function githubLogin(req, res) {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', config.github.clientId);
  url.searchParams.set('redirect_uri', config.github.callbackUrl);
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', crypto.randomBytes(16).toString('hex'));
  // Store state in session to verify on callback
  req.session.oauthState = state;
  res.redirect(url.toString());
}

// GET /api/auth/github/callback
async function githubCallback(req, res) {
  const { code, state } = req.query;
  if (state !== req.session.oauthState) {
    return res.status(400).json({ error: 'State mismatch' });
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
    }),
  });
  const { access_token } = await tokenRes.json();

  // Get user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const profile = await userRes.json();

  // Find or create user, then issue session/JWT
  const token = signToken({ sub: profile.id, role: 'editor' });
  res.json({ token });
}
```

## CSRF Protection

For cookie-based auth, always protect mutating requests.

```javascript
const crypto = require('crypto');

function csrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  if (token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }
  next();
}
```

## Rate Limiting

Protect auth endpoints from brute force.

```javascript
// In-memory rate limiter (use Redis in production)
const rateLimitStore = new Map();

function rateLimit({ windowMs = 60000, max = 5, keyFn }) {
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const attempts = rateLimitStore.get(key).filter((t) => t > windowStart);
    attempts.push(now);
    rateLimitStore.set(key, attempts);

    if (attempts.length > max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

// Usage on login endpoint
app.post(
  '/api/auth/login',
  rateLimit({
    windowMs: 60000,
    max: 5,
    keyFn: (req) => req.ip,
  }),
  loginController,
);
```

## Security Headers

Always set these on auth-related responses:

```javascript
// middleware/securityHeaders.js
function securityHeaders(req, res, next) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store'); // Never cache auth responses
  next();
}
```

## Checklist

- [ ] Passwords hashed with bcrypt (cost 12+) or argon2
- [ ] JWT signed with secret from env, never hardcoded
- [ ] Tokens stored in httpOnly, secure, sameSite cookies
- [ ] Refresh tokens stored and revocable in database
- [ ] Rate limiting on login/register endpoints
- [ ] CSRF protection for cookie-based auth
- [ ] RBAC enforced at route level with middleware
- [ ] Security headers set on all responses
- [ ] No sensitive data in JWT payload (no password, no email)
- [ ] Graceful session expiry handling (401 → refresh or re-login)
- [ ] OAuth state parameter validated on callback
- [ ] Password complexity audit (no minimum length? flag it)
