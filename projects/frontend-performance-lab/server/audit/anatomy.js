import * as cheerio from 'cheerio';

export function auditAnatomy(html, baseUrl) {
  if (!html) return { html: '', resources: [] };

  const $ = cheerio.load(html);
  const resources = [];
  const base = $('base').attr('href') || baseUrl;

  const extractAttr = (selector, attr, type) => {
    $(selector).each((_, el) => {
      const val = $(el).attr(attr);
      if (val && !val.startsWith('data:')) {
        resources.push({ url: resolveUrl(val, base), type, source: selector });
      }
    });
  };

  extractAttr('script[src]', 'src', 'script');
  extractAttr('link[rel="stylesheet"]', 'href', 'stylesheet');
  extractAttr('img[src]', 'src', 'image');
  extractAttr('source[src]', 'src', 'image');
  extractAttr('link[rel="preload"]', 'href', 'preload');
  extractAttr('link[rel="icon"]', 'href', 'icon');
  extractAttr('iframe[src]', 'src', 'iframe');
  extractAttr('video[src]', 'src', 'video');
  extractAttr('audio[src]', 'src', 'audio');

  return { html, resources };
}

function resolveUrl(href, base) {
  if (!href) return '';
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}
