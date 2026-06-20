const SECURITY_HEADERS = {
  'content-security-policy': 'CSP',
  'strict-transport-security': 'HSTS',
  'x-frame-options': 'X-Frame-Options',
  'x-content-type-options': 'X-Content-Type-Options',
  'referrer-policy': 'Referrer-Policy',
  'permissions-policy': 'Permissions-Policy',
};

export function auditSecurity(pageHeaders) {
  const hdrs = pageHeaders.headers ?? {};
  const present = [];
  const missing = [];

  for (const [header, name] of Object.entries(SECURITY_HEADERS)) {
    if (hdrs[header] || hdrs[header.toLowerCase()]) {
      present.push({ header: name, value: hdrs[header] || hdrs[header.toLowerCase()] });
    } else {
      missing.push(name);
    }
  }

  const presentCount = present.length;
  const totalHeaders = Object.keys(SECURITY_HEADERS).length;
  const score = Math.round((presentCount / totalHeaders) * 100);

  return {
    present,
    missing,
    score,
  };
}
