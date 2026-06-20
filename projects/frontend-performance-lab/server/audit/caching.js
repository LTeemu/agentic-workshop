export function auditCaching(resources) {
  let poorCacheCount = 0;
  let totalResources = 0;
  const details = [];

  for (const res of resources) {
    if (!res.headers) continue;
    totalResources++;

    const cc = res.headers['cache-control'] || '';
    const expires = res.headers['expires'] || '';
    const maxAge = parseMaxAge(cc);

    let cacheTtl = 0;
    if (maxAge !== null) {
      cacheTtl = maxAge;
    } else if (expires) {
      cacheTtl = Math.max(0, Math.round((new Date(expires).getTime() - Date.now()) / 1000));
    }

    if (cacheTtl < 86400) {
      if (cc !== 'no-cache' && !cc.includes('no-store')) {
        poorCacheCount++;
        details.push({
          url: res.url,
          cacheControl: cc || '(none)',
          maxAgeSeconds: cacheTtl,
          recommended: '≥ 86400s (1 day)',
        });
      }
    }
  }

  return {
    poorCacheCount,
    totalResources,
    details,
    score:
      totalResources === 0
        ? 100
        : Math.max(0, 100 - Math.round((poorCacheCount / totalResources) * 100)),
  };
}

function parseMaxAge(cc) {
  if (!cc) return null;
  const match = cc.match(/max-age=(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}
