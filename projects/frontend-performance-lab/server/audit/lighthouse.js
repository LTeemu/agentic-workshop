import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

export async function auditLighthouse(url) {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
      logLevel: 'error',
    });

    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      logLevel: 'error',
    });

    const lhr = result.lhr;
    if (!lhr) {
      throw new Error('Lighthouse returned no LHR');
    }

    const perf = lhr.categories?.performance?.score ?? null;
    const a11y = lhr.categories?.accessibility?.score ?? null;
    const bp = lhr.categories?.['best-practices']?.score ?? null;
    const seo = lhr.categories?.seo?.score ?? null;

    const audits = lhr.audits ?? {};
    return {
      performance: perf,
      accessibility: a11y,
      bestPractices: bp,
      seo: seo,
      fcp: audits['first-contentful-paint']?.numericValue ?? null,
      lcp: audits['largest-contentful-paint']?.numericValue ?? null,
      tbt: audits['total-blocking-time']?.numericValue ?? null,
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      si: audits['speed-index']?.numericValue ?? null,
      raw: lhr,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isChromeError =
      message.includes('ECONNREFUSED') ||
      message.includes('No Chrome installations found') ||
      message.includes('chrome');

    if (isChromeError) {
      console.error('Lighthouse audit failed — Chrome/Chromium not found.');
      return {
        performance: null,
        accessibility: null,
        bestPractices: null,
        seo: null,
        fcp: null,
        lcp: null,
        tbt: null,
        cls: null,
        si: null,
        raw: null,
        error:
          'Chrome/Chromium is required for Lighthouse audits. ' +
          'Install Chrome, or set the CHROME_PATH environment variable to your Chrome executable.\n' +
          '  • Install Chrome: https://www.google.com/chrome/\n' +
          '  • Or set: $env:CHROME_PATH = "C:\\Path\\To\\chrome.exe" (Windows)\n' +
          `  • Error: ${message}`,
      };
    }

    console.error('Lighthouse audit failed:', err);
    return {
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
      fcp: null,
      lcp: null,
      tbt: null,
      cls: null,
      si: null,
      raw: null,
      error: `Lighthouse failed: ${message}`,
    };
  } finally {
    if (chrome) {
      try {
        chrome.kill();
      } catch {
        /* ignore */
      }
    }
  }
}
