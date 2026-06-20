import * as cheerio from 'cheerio';

export function auditHtml(html) {
  if (!html) return { valid: false, issues: ['No HTML content'], score: 0 };

  const $ = cheerio.load(html);
  const issues = [];

  if (!$('!DOCTYPE').length && !html.trim().startsWith('<!DOCTYPE')) {
    issues.push('Missing DOCTYPE');
  }

  if (!$('html').attr('lang')) {
    issues.push('Missing <html lang="...">');
  }

  if (!$('meta[name="viewport"]').length) {
    issues.push('Missing viewport meta tag');
  }

  if (!$('title').length || !$('title').text().trim()) {
    issues.push('Missing or empty <title>');
  }

  if (!$('meta[charset]').length && !$('meta[http-equiv="Content-Type"]').length) {
    issues.push('Missing charset declaration');
  }

  if (!$('meta[name="description"]').length) {
    issues.push('Missing meta description');
  }

  const headingOrder = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    headingOrder.push(parseInt(el.tagName[1], 10));
  });

  let prevLevel = 0;
  for (const level of headingOrder) {
    if (level > prevLevel + 1 && level > 1) {
      issues.push(`Heading level skipped from h${prevLevel} to h${level}`);
    }
    prevLevel = level;
  }

  const score = Math.max(0, 100 - issues.length * 15);

  return {
    valid: issues.length === 0,
    issues,
    score,
  };
}
