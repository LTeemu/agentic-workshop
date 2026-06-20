import { auditLighthouse } from './lighthouse.js';
import { auditAnatomy } from './anatomy.js';
import { auditCompression } from './compression.js';
import { auditCaching } from './caching.js';
import { auditRenderBlocking } from './render-blocking.js';
import { auditImages } from './images.js';
import { auditSecurity } from './security.js';
import { auditHtml } from './html-validator.js';
import { auditThirdParties } from './third-parties.js';
import { auditFonts } from './fonts.js';
import { auditProtocol } from './protocol.js';
import { estimateCarbon } from './carbon.js';
import { auditAccessibility } from './accessibility.js';

const RESOURCE_TIMEOUT = 5000;
const MAX_RESOURCES = 80;

export async function runAudit(url) {
  const start = performance.now();

  const pageData = await fetchPage(url);
  const { html, pageHeaders } = pageData;

  const parsed = auditAnatomy(html, url);
  const enrichedResources = await fetchResourceHeaders(parsed.resources);

  const totalBytes = enrichedResources.reduce((sum, r) => sum + (r.size || 0), 0);

  const bytesByType = {};
  const requestsByType = {};
  for (const r of enrichedResources) {
    const t = r.type || 'other';
    bytesByType[t] = (bytesByType[t] || 0) + (r.size || 0);
    requestsByType[t] = (requestsByType[t] || 0) + 1;
  }

  const lighthouse = await auditLighthouse(url);

  const compression = auditCompression(pageHeaders, enrichedResources);
  const caching = auditCaching(enrichedResources);
  const renderBlocking = auditRenderBlocking(html);
  const images = auditImages(html);
  const security = auditSecurity(pageHeaders);
  const htmlResult = auditHtml(html);
  const thirdParties = auditThirdParties(enrichedResources, url);
  const fonts = auditFonts(html);
  const protocol = auditProtocol(enrichedResources, pageHeaders);
  const carbon = estimateCarbon(totalBytes);
  const accessibility = await auditAccessibility(url);

  // Pull screenshot out of accessibility result so it can be saved to disk
  // separately from the JSON (Buffer doesn't serialise to JSON).
  const screenshot = accessibility.screenshot || null;
  if (accessibility.screenshot) delete accessibility.screenshot;

  const durationMs = Math.round(performance.now() - start);

  const suggestions = buildSuggestions({
    lighthouse,
    compression,
    caching,
    renderBlocking,
    images,
    security,
    html: htmlResult,
    thirdParties,
    fonts,
    protocol,
    carbon,
    accessibility,
  });

  return {
    url,
    timestamp: null,
    durationMs,
    screenshot,
    lighthouse,
    anatomy: {
      totalBytes,
      totalRequests: enrichedResources.length,
      bytesByType,
      requestsByType,
      resources: enrichedResources.slice(0, 200),
    },
    compression,
    caching,
    renderBlocking,
    images,
    security,
    html: htmlResult,
    thirdParties,
    fonts,
    protocol,
    carbon,
    accessibility,
    suggestions,
  };
}

function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

async function fetchPage(url) {
  try {
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 PerformanceLab/1.0' },
    });
    const rawHeaders = {};
    resp.headers.forEach((v, k) => {
      rawHeaders[k] = v;
    });
    const html = await resp.text();
    return {
      html,
      pageHeaders: { status: resp.status, headers: normalizeHeaders(rawHeaders), url: resp.url },
    };
  } catch (err) {
    console.warn('fetchPage failed:', err);
    return { html: '', pageHeaders: { status: 0, headers: {}, url } };
  }
}

async function fetchResourceHeaders(resources) {
  const unique = [];
  const seen = new Set();
  for (const r of resources) {
    if (!r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    unique.push(r);
    if (unique.length >= MAX_RESOURCES) break;
  }

  const results = await Promise.allSettled(unique.map((r) => fetchSingleResource(r)));

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.warn('fetchSingleResource failed:', unique[i].url, r.reason);
    return { ...unique[i], status: 0, headers: {}, size: 0 };
  });
}

async function fetchSingleResource(resource) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOURCE_TIMEOUT);

  try {
    const resp = await fetch(resource.url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 PerformanceLab/1.0' },
    });
    const rawHeaders = {};
    resp.headers.forEach((v, k) => {
      rawHeaders[k] = v;
    });
    const cl = parseInt(rawHeaders['content-length'] || '0', 10) || 0;
    const proto = rawHeaders['x-protocol'] || '';

    return {
      ...resource,
      status: resp.status,
      headers: normalizeHeaders(rawHeaders),
      size: cl,
      protocol: proto || (resp.url.startsWith('https') ? 'HTTP/2' : 'HTTP/1.1'),
    };
  } catch (err) {
    console.warn(`fetchSingleResource(${resource.url}):`, err);
    return { ...resource, status: 0, headers: {}, size: 0, protocol: 'unknown' };
  } finally {
    clearTimeout(timer);
  }
}

const SUGGESTION_RULES = [
  {
    key: 'lighthouse.performance',
    condition: (m) => m.lighthouse?.performance !== null && m.lighthouse.performance < 0.5,
    severity: 'critical',
    text: (m) =>
      `Performance score is ${Math.round(m.lighthouse.performance * 100)} — well below the 50 threshold`,
    category: 'Lighthouse',
  },
  {
    key: 'lighthouse.lcp',
    condition: (m) => m.lighthouse?.lcp !== null && m.lighthouse.lcp > 4000,
    severity: 'critical',
    text: (m) => `LCP is ${(m.lighthouse.lcp / 1000).toFixed(1)}s (target: ≤2.5s)`,
    category: 'Lighthouse',
  },
  {
    key: 'lighthouse.cls',
    condition: (m) => m.lighthouse?.cls !== null && m.lighthouse.cls > 0.25,
    severity: 'warning',
    text: (m) => `CLS is ${m.lighthouse.cls.toFixed(2)} (target: ≤0.1)`,
    category: 'Lighthouse',
  },
  {
    key: 'lighthouse.tbt',
    condition: (m) => m.lighthouse?.tbt !== null && m.lighthouse.tbt > 600,
    severity: 'warning',
    text: (m) => `TBT is ${Math.round(m.lighthouse.tbt)}ms (target: ≤200ms)`,
    category: 'Lighthouse',
  },
  {
    key: 'compression.resourcesWithoutCompression',
    condition: (m) => m.compression?.resourcesWithoutCompression > 0,
    severity: 'warning',
    text: (m) =>
      `${m.compression.resourcesWithoutCompression} resources not compressed — potential savings ~${formatBytes(m.compression.potentialSavingsBytes)}`,
    category: 'Compression',
  },
  {
    key: 'caching.poorCacheCount',
    condition: (m) => m.caching?.poorCacheCount > 0,
    severity: 'warning',
    text: (m) => `${m.caching.poorCacheCount} resources have no or short cache TTL`,
    category: 'Caching',
  },
  {
    key: 'renderBlocking.count',
    condition: (m) => m.renderBlocking?.count > 0,
    severity: 'warning',
    text: (m) =>
      `${m.renderBlocking.count} render-blocking resources in <head> — defer/async recommended`,
    category: 'Render Blocking',
  },
  {
    key: 'images.withoutLazyLoading',
    condition: (m) => m.images?.withoutLazyLoading > 0,
    severity: 'info',
    text: (m) => `${m.images.withoutLazyLoading} images missing loading="lazy"`,
    category: 'Images',
  },
  {
    key: 'images.withoutDimensions',
    condition: (m) => m.images?.withoutDimensions > 0,
    severity: 'info',
    text: (m) => `${m.images.withoutDimensions} images missing width/height attributes`,
    category: 'Images',
  },
  {
    key: 'security.missing',
    condition: (m) => m.security?.missing?.length > 0,
    severity: 'warning',
    text: (m) => `Missing security headers: ${m.security.missing.join(', ')}`,
    category: 'Security',
  },
  {
    key: 'html.issues',
    condition: (m) => m.html?.issues?.length > 0,
    severity: 'info',
    text: (m) => `HTML issues: ${m.html.issues.join('; ')}`,
    category: 'HTML',
  },
  {
    key: 'fonts.issues',
    condition: (m) => m.fonts?.issues?.length > 0,
    severity: 'info',
    text: (m) => `Font issues: ${m.fonts.issues.join('; ')}`,
    category: 'Fonts',
  },
  {
    key: 'accessibility.violations',
    condition: (m) => m.accessibility?.violations?.length > 0,
    severity: 'critical',
    text: (m) =>
      `Accessibility: ${m.accessibility.violations.length} violations found (score: ${m.accessibility.score})`,
    category: 'Accessibility',
  },
];

function buildSuggestions(modules) {
  const critical = [];
  const warning = [];
  const info = [];

  const add = (severity, text, category) => {
    (severity === 'critical' ? critical : severity === 'warning' ? warning : info).push({
      text,
      category,
    });
  };

  for (const rule of SUGGESTION_RULES) {
    if (rule.condition(modules)) {
      add(rule.severity, rule.text(modules), rule.category);
    }
  }

  return { critical, warning, info };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
