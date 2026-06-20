import * as cheerio from 'cheerio';

export function auditFonts(html) {
  if (!html) return { total: 0, preloaded: 0, issues: [], score: 100 };

  const $ = cheerio.load(html);
  const fontDeclarations = [];
  const issues = [];

  $('link[rel="preload"][as="font"]').each((_, el) => {
    fontDeclarations.push({
      type: 'preload',
      href: $(el).attr('href') || '',
      crossorigin: $(el).attr('crossorigin') !== undefined,
    });
  });

  $('link[rel="preconnect"][href*="font"]').each((_, el) => {
    fontDeclarations.push({
      type: 'preconnect',
      href: $(el).attr('href') || '',
    });
  });

  const preloadFonts = fontDeclarations.filter((f) => f.type === 'preload');

  if ($('link[href*="fonts.googleapis.com"]').length && preloadFonts.length === 0) {
    issues.push('Google Fonts loaded without preload');
  }

  const styles = $('style')
    .map((_, el) => $(el).html())
    .get()
    .join('\n');
  const links = $('link[rel="stylesheet"]')
    .map((_, el) => $(el).attr('href'))
    .get();

  const fontFaceDeclarations = (styles.match(/@font-face\s*\{/gi) || []).length;
  if (fontFaceDeclarations > 0) {
    const hasFontDisplay = styles.match(/font-display/gi);
    if (!hasFontDisplay) {
      issues.push(`${fontFaceDeclarations} @font-face declarations without font-display`);
    }
  }

  return {
    total: fontDeclarations.length + fontFaceDeclarations,
    preloaded: preloadFonts.length,
    preconnects: fontDeclarations.filter((f) => f.type === 'preconnect').length,
    googleFonts: $('link[href*="fonts.googleapis.com"]').length > 0,
    issues,
    score: Math.max(0, 100 - issues.length * 20),
  };
}
