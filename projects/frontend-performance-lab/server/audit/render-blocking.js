import * as cheerio from 'cheerio';

export function auditRenderBlocking(html) {
  if (!html) return { count: 0, resources: [], score: 100 };

  const $ = cheerio.load(html);
  const headResources = [];

  $('head script[src]').each((_, el) => {
    const src = $(el).attr('src');
    const hasAsync = $(el).attr('async') !== undefined;
    const hasDefer = $(el).attr('defer') !== undefined;
    const type = $(el).attr('type') || 'text/javascript';

    if (!hasAsync && !hasDefer && type !== 'module') {
      headResources.push({
        tag: 'script',
        src: src || '(inline)',
        async: false,
        defer: false,
      });
    }
  });

  $('head link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    const media = $(el).attr('media') || 'all';
    const disabled = $(el).attr('disabled') !== undefined;

    if (!disabled && (media === 'all' || media === 'screen' || !media)) {
      headResources.push({
        tag: 'stylesheet',
        src: href || '(inline)',
        media,
      });
    }
  });

  return {
    count: headResources.length,
    resources: headResources,
    score: Math.max(0, 100 - headResources.length * 15),
  };
}
