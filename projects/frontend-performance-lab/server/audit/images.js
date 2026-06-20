import * as cheerio from 'cheerio';

export function auditImages(html) {
  if (!html)
    return {
      total: 0,
      withoutLazyLoading: 0,
      withoutDimensions: 0,
      notWebp: 0,
      issues: [],
      score: 100,
    };

  const $ = cheerio.load(html);
  const images = [];

  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (!src || src.startsWith('data:')) return;

    const hasLazy = $(el).attr('loading') === 'lazy';
    const width = $(el).attr('width');
    const height = $(el).attr('height');
    const srcset = $(el).attr('srcset');
    const alt = $(el).attr('alt');

    images.push({
      src,
      lazy: hasLazy,
      hasWidth: width !== undefined,
      hasHeight: height !== undefined,
      hasSrcset: srcset !== undefined,
      hasAlt: alt !== undefined,
    });
  });

  const total = images.length;
  const withoutLazyLoading = images.filter((i) => !i.lazy).length;
  const withoutDimensions = images.filter((i) => !i.hasWidth || !i.hasHeight).length;
  const withoutAlt = images.filter((i) => !i.hasAlt).length;
  const withoutSrcset = images.filter((i) => !i.hasSrcset).length;

  const issues = [];
  if (withoutLazyLoading > 0) issues.push(`${withoutLazyLoading} images missing loading="lazy"`);
  if (withoutDimensions > 0) issues.push(`${withoutDimensions} images missing width/height`);
  if (withoutAlt > 0) issues.push(`${withoutAlt} images missing alt text`);
  if (withoutSrcset > 0) issues.push(`${withoutSrcset} images without srcset (responsive)`);

  const penalty = withoutLazyLoading * 10 + withoutDimensions * 5 + withoutAlt * 5;
  const score = total === 0 ? 100 : Math.max(0, 100 - Math.round(penalty / total));

  return {
    total,
    withoutLazyLoading,
    withoutDimensions,
    withoutAlt,
    withoutSrcset,
    images: images.slice(0, 50),
    issues,
    score,
  };
}
