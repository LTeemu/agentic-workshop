import { getChromePath } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import axePuppeteer from '@axe-core/puppeteer';

const IMPACT_WEIGHTS = { critical: 25, serious: 10, moderate: 3, minor: 1 };

/**
 * Run axe-core accessibility analysis via headless Chrome.
 * Returns a score 0–100, a list of violations, and a full-page screenshot buffer.
 */
export async function auditAccessibility(url) {
  let browser;
  try {
    const chromePath = getChromePath();
    if (!chromePath) {
      return {
        ...fallback('Chrome not found — install Chrome or set CHROME_PATH'),
        screenshot: null,
      };
    }

    browser = await puppeteer.launch({
      executablePath: chromePath,
      args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setBypassCSP(true);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });

    // Best-effort settling for post-load API calls. Silently times out after
    // 8s for pages with persistent connections (SSE, WebSocket, polling).
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 8000 }).catch(() => {});
    // Small extra pause for font loading / paint sequencing
    await new Promise((r) => setTimeout(r, 500));

    // Take a full-page screenshot from the same Chrome instance
    const screenshot = await page.screenshot({ fullPage: true, type: 'png' });

    const results = await new axePuppeteer(page).analyze();

    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact || 'minor',
      description: v.help || v.description || v.id,
      helpUrl: v.helpUrl || '',
      nodes: v.nodes.length,
      tags: v.tags || [],
    }));

    // Score: 100 minus weighted penalty per violation
    let penalty = 0;
    for (const v of violations) {
      penalty += (IMPACT_WEIGHTS[v.impact] || IMPACT_WEIGHTS.minor) * v.nodes;
    }
    const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

    return {
      score,
      violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      screenshot,
    };
  } catch (err) {
    return { ...fallback(err instanceof Error ? err.message : 'Unknown error'), screenshot: null };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function fallback(reason) {
  console.warn('accessibility audit failed:', reason);
  return { score: 0, violations: [], passes: 0, incomplete: 0 };
}
