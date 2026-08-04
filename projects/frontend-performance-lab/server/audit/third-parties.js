const KNOWN_TRACKERS = [
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.net',
  'doubleclick.net',
  'hotjar.com',
  'mouseflow.com',
  'fullstory.com',
  'amplitude.com',
  'mixpanel.com',
  'segment.io',
  'crazyegg.com',
  'linkedin.com/tr',
  'adsrvr.org',
  'adnxs.com',
  'rubiconproject.com',
  'criteo.com',
  'taboola.com',
  'outbrain.com',
];

export function auditThirdParties(resources, pageUrl) {
  try {
    const pageHost = new URL(pageUrl).hostname;
    const external = [];
    const trackerDomains = new Set();

    for (const res of resources) {
      try {
        const resHost = new URL(res.url).hostname;
        if (resHost !== pageHost) {
          // Domain entries match on hostname; path-based entries (e.g.
          // linkedin.com/tr) can never appear in a bare hostname, so those
          // match against the full URL instead.
          const isTracker = KNOWN_TRACKERS.some((t) =>
            t.includes('/') ? res.url.includes(t) : resHost.includes(t),
          );
          if (isTracker) trackerDomains.add(resHost);

          external.push({
            url: res.url,
            hostname: resHost,
            type: res.type,
            isTracker,
          });
        }
      } catch {
        // skip invalid URLs
      }
    }

    const domainCounts = {};
    for (const e of external) {
      domainCounts[e.hostname] = (domainCounts[e.hostname] || 0) + 1;
    }

    const domains = Object.entries(domainCounts)
      .map(([hostname, count]) => ({ hostname, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalExternal: external.length,
      uniqueDomains: domains.length,
      trackerDomains: [...trackerDomains],
      domains: domains.slice(0, 30),
      resources: external.slice(0, 100),
      score: external.length === 0 ? 100 : Math.max(0, 100 - Math.min(external.length, 50)),
    };
  } catch {
    return {
      totalExternal: 0,
      uniqueDomains: 0,
      trackerDomains: [],
      domains: [],
      resources: [],
      score: 100,
    };
  }
}
