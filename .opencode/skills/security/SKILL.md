---
name: security
description: 'CSP, XSS prevention, CSRF tokens, input sanitization, HTTPS/HSTS, dependency auditing, SRI, iframe sandbox.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [security, csp, xss, csrf, sanitization, https, hsts, sri, iframe, audit]
tools: [opencode, claude, cursor, gemini]
---

# Security

You are a **security engineer**. Every input is an attack vector, every third-party script is a supply chain risk, every exposed endpoint is a liability. Think like an attacker, build like a defender.

## Content Security Policy (CSP)

CSP is the most effective defense against XSS and data injection attacks. It tells the browser what sources are trusted for scripts, styles, images, fonts, and connections.

Set via HTTP header (preferred) or `<meta>` tag:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'
```

### CSP directives

| Directive                  | Controls                             |
| -------------------------- | ------------------------------------ |
| `default-src`              | Fallback for all resource types      |
| `script-src`               | Allowed script sources               |
| `style-src`                | Allowed stylesheet sources           |
| `img-src`                  | Allowed image sources                |
| `font-src`                 | Allowed font sources                 |
| `connect-src`              | Allowed fetch/XHR/WebSocket targets  |
| `frame-src`                | Allowed `<iframe>` sources           |
| `frame-ancestors`          | Who can embed this page in an iframe |
| `form-action`              | Where forms can submit to            |
| `base-uri`                 | Allowed `<base>` URLs                |
| `report-uri` / `report-to` | Where to send violation reports      |

### Policy patterns

```http
# Strict — no external resources
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; form-action 'self'

# Moderate — allow CDN scripts and images
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.googleapis.com; connect-src 'self'; frame-ancestors 'none'; form-action 'self'

# Report-only — test without blocking
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

### Inline script/workarounds

Avoid `'unsafe-inline'` in `script-src` by using:

1. **Move JS to external files** — script-src 'self' covers them
2. **Nonces** — `script-src 'nonce-abc123'` + `<script nonce="abc123">`
3. **Hashes** — `script-src 'sha256-...'` for known inline blocks

```html
<!-- Nonce approach -->
<script nonce="abc123">
  // inline code allowed because nonce matches CSP
</script>
```

### CSP in the Workshop dashboard

For the Workshop's `app/server.js` which serves projects in iframes:

```javascript
res.writeHead(200, {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src 'self'; connect-src 'self'; font-src 'self' https:",
});
```

For the dashboard iframe preview, use the sandbox attribute as a second layer:

```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms" src="..."></iframe>
```

## XSS Prevention

Cross-Site Scripting is the most common web vulnerability. Prevent it at the source.

### Never use innerHTML with user data

```javascript
// ❌ XSS — attacker can inject <img onerror="stealCookies()">
element.innerHTML = userInput;

// ✅ Safe
element.textContent = userInput;

// ✅ Safe if input is trusted
element.insertAdjacentText('beforeend', userInput);
```

### Attribute injection

```javascript
// ❌ XSS — can break out of attribute context
element.setAttribute('href', userInput);
element.href = userInput;

// ✅ Sanitize URLs
function sanitizeUrl(url) {
  const allowed = ['http:', 'https:', 'mailto:', 'tel:'];
  try {
    const parsed = new URL(url, window.location.origin);
    return allowed.includes(parsed.protocol) ? url : '#';
  } catch {
    return '#';
  }
}
```

### URL injection in CSS

```javascript
// ❌ XSS — url("javascript:...")
element.style.backgroundImage = `url("${userInput}")`;

// ✅ Throttled
const cleanUrl = userInput.replace(/[^a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=]/g, '');
element.style.backgroundImage = `url("${cleanUrl}")`;
```

### Template injection

When building HTML from trusted templates, always escape.

```javascript
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

## CSRF

Cross-Site Request Forgery — tricking a user into submitting a form from another site.

### For the Workshop dashboard (Node.js)

```javascript
// Generate token
const crypto = require('crypto');
const csrfToken = crypto.randomBytes(32).toString('hex');

// Include in forms
res.end(`
  <input type="hidden" name="_csrf" value="${csrfToken}">
`);

// Validate on POST
if (body._csrf !== csrfToken) {
  res.writeHead(403);
  res.end('Invalid CSRF token');
}
```

### For static sites (no backend)

Use same-site cookies and Origin header checks.

```javascript
// Fetch-based — Origin is set by browser and can't be forged
fetch('/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

Set `SameSite=Strict` or `SameSite=Lax` on cookies.

## Input Sanitization

Validate on both client and server (if applicable).

### Email validation

```javascript
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### URL validation

```javascript
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

### Stripping HTML tags

```javascript
function stripHtml(str) {
  const el = document.createElement('div');
  el.textContent = str;
  return el.textContent;
}
```

## HTTPS / HSTS

Always serve over HTTPS. Redirect HTTP to HTTPS.

```nginx
# Nginx example
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
}
```

For `app/server.js` (development only — HTTPS is for production):

```javascript
// In production, add response headers
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
```

## Response Headers

| Header                                             | Purpose                                                      |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `X-Content-Type-Options: nosniff`                  | Prevents MIME type sniffing                                  |
| `X-Frame-Options: DENY`                            | Prevents clickjacking                                        |
| `X-XSS-Protection: 0`                              | Disables legacy XSS filter (can cause vulns in old browsers) |
| `Referrer-Policy: strict-origin-when-cross-origin` | Controls referrer info sent                                  |
| `Permissions-Policy: camera=(), microphone=()`     | Limits API access                                            |

## Subresource Integrity (SRI)

When loading scripts or styles from CDNs, include an integrity hash so the browser rejects the resource if it's been tampered with.

```html
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
  integrity="sha512-..."
  crossorigin="anonymous"
></script>
```

Generate the hash with:

```bash
openssl dgst -sha384 -binary filename.js | openssl base64 -A
# Or use: https://www.srihash.org/
```

## Iframe Security

When embedding third-party or project content in iframes, use the `sandbox` attribute.

```html
<!-- Most restrictive — no scripts, no forms, no popups -->
<iframe sandbox="" src="..."></iframe>

<!-- Workshop dashboard allows scripts, same-origin, forms -->
<iframe sandbox="allow-scripts allow-same-origin allow-forms" src="..."></iframe>
```

| Sandbox value          | Permission                 |
| ---------------------- | -------------------------- |
| (empty)                | All restrictions apply     |
| `allow-scripts`        | Run JavaScript             |
| `allow-same-origin`    | Access parent domain data  |
| `allow-forms`          | Submit forms               |
| `allow-popups`         | Open popups/windows        |
| `allow-top-navigation` | Navigate parent frame      |
| `allow-presentation`   | Start presentation session |

## Dependency Auditing

For Node.js projects (like the Workshop dashboard):

```bash
npm audit
# Review and fix vulnerabilities:
# npm audit fix        # auto-fix compatible issues
# npm audit fix --force  # may break APIs — use cautiously
```

Add as a dashboard maintenance script:

```json
{
  "scripts": {
    "audit": "npm audit",
    "start": "node app/server.js"
  }
}
```

## Local Storage vs Session vs Cookies

| Storage          | Persistence                | Sent to server?   | Size limit |
| ---------------- | -------------------------- | ----------------- | ---------- |
| `localStorage`   | Until cleared              | No                | ~5 MB      |
| `sessionStorage` | Until tab closes           | No                | ~5 MB      |
| Cookies          | Set by `expires`/`max-age` | Yes (same-origin) | ~4 KB      |

**Security rules:**

- Never store tokens or PII in `localStorage` (accessible by any JS on the page)
- Use `httpOnly` cookies for auth tokens (inaccessible to JS)
- Use `sessionStorage` for ephemeral form data
- Use `localStorage` for preferences and cache only

## Anti-patterns

- ❌ `eval()` — executes arbitrary code
- ❌ `innerHTML` with user input
- ❌ `document.write()` — can be exploited
- ❌ Inline event handlers (`onclick="..."`) — bypass CSP
- ❌ No CSP header
- ❌ Allowing `'unsafe-inline'` in script-src when avoidable
- ❌ Storing tokens in localStorage
- ❌ Not validating file upload types/sizes server-side
- ❌ Exposing directory listings (disable in production)
- ❌ Using outdated dependencies with known CVEs

## Checklist

- [ ] CSP header set with restrictive policy
- [ ] No `innerHTML` with user data anywhere
- [ ] `textContent` or `insertAdjacentText` used instead
- [ ] Form actions validated (no open redirects)
- [ ] SRI on all CDN-loaded scripts/styles
- [ ] Iframes use `sandbox` attribute
- [ ] X-Content-Type-Options, X-Frame-Options, Referrer-Policy set
- [ ] HTTPS enforced (production)
- [ ] `npm audit` run and vulnerabilities addressed
- [ ] No sensitive data in localStorage
- [ ] Input sanitized (email, URL, HTML stripped)
- [ ] Cookies use `SameSite` and `httpOnly` where applicable
