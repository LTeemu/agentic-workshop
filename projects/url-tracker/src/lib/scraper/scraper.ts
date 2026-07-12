import * as cheerio from "cheerio";

// ── Types ──

export interface ScrapeField {
  cssSelector: string;
  attribute: "text" | "href" | "src";
  valueType: "text" | "number" | "boolean";
}

export interface ScrapedValue {
  value: string;
  error?: string;
}

export interface ScrapeResult {
  title: string;
  image: string | null;
  values: ScrapedValue[];
  blockedByRobots: boolean;
}

export interface DetectedField {
  label: string;
  cssSelector: string;
  attribute: "text" | "href" | "src";
  valueType: "text" | "number" | "boolean";
}

export interface PreviewResult {
  title: string;
  image: string | null;
  description: string | null;
  detectedFields: DetectedField[];
  blockedByRobots: boolean;
}

export interface ScrapeOptions {
  /** Minimum ms since last fetch to allow a new one (prevents hammering) */
  minIntervalMs?: number;
  /** Timestamp of last successful fetch for this URL */
  lastFetchedAt?: Date | null;
}

// ── Constants ──

const OUR_UA = "URLTracker/1.0 (respects robots.txt; +https://github.com/user/url-tracker)";

const FETCH_TIMEOUT_MS = 15_000;

/** Default delay between requests to the same hostname */
const RATE_LIMIT_MS = 3_000;

/** How long to cache robots.txt rules per hostname (1 hour) */
const ROBOTS_CACHE_TTL_MS = 3_600_000;

// ── Rate Limiter ──

class RateLimiter {
  private lastRequest = new Map<string, number>();

  async wait(hostname: string): Promise<void> {
    const last = this.lastRequest.get(hostname) ?? 0;
    const elapsed = Date.now() - last;
    const waitTime = Math.max(0, RATE_LIMIT_MS - elapsed);
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequest.set(hostname, Date.now());
  }

  /** Reset for testing */
  reset(): void {
    this.lastRequest.clear();
  }
}

const rateLimiter = new RateLimiter();

// ── Robots.txt Checker ──

interface RobotsRules {
  allowed: string[];
  disallowed: string[];
}

class RobotsChecker {
  private cache = new Map<string, { rules: RobotsRules; expiresAt: number }>();

  async isAllowed(url: string): Promise<boolean> {
    const parsed = new URL(url);
    const origin = parsed.origin;

    const rules = await this.fetchRules(origin);
    const path = parsed.pathname + parsed.search;

    // Check allow rules first (take precedence over disallow)
    for (const pattern of rules.allowed) {
      if (this.matchPattern(pattern, path)) return true;
    }

    // Check disallow rules
    for (const pattern of rules.disallowed) {
      if (this.matchPattern(pattern, path)) return false;
    }

    return true;
  }

  private async fetchRules(origin: string): Promise<RobotsRules> {
    const cached = this.cache.get(origin);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.rules;
    }

    const rules: RobotsRules = { allowed: [], disallowed: [] };

    try {
      const response = await fetch(`${origin}/robots.txt`, {
        signal: AbortSignal.timeout(5_000),
        headers: { "User-Agent": OUR_UA },
      });

      if (!response.ok) {
        // No robots.txt or error — allow everything
        this.cache.set(origin, { rules, expiresAt: Date.now() + ROBOTS_CACHE_TTL_MS });
        return rules;
      }

      const text = await response.text();
      let currentAgent: string | null = null;

      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        if (trimmed.toLowerCase().startsWith("user-agent:")) {
          currentAgent = trimmed.slice("user-agent:".length).trim().toLowerCase();
          continue;
        }

        // Only apply rules for our agent or wildcard
        if (currentAgent !== null && currentAgent !== "*" && currentAgent !== "urltracker/1.0") {
          continue;
        }

        if (trimmed.toLowerCase().startsWith("disallow:")) {
          const pattern = trimmed.slice("disallow:".length).trim();
          if (pattern) rules.disallowed.push(pattern);
        } else if (trimmed.toLowerCase().startsWith("allow:")) {
          const pattern = trimmed.slice("allow:".length).trim();
          if (pattern) rules.allowed.push(pattern);
        }
      }
    } catch {
      // Network error fetching robots.txt — allow to avoid blocking the scrape
    }

    this.cache.set(origin, { rules, expiresAt: Date.now() + ROBOTS_CACHE_TTL_MS });
    return rules;
  }

  /**
   * Match a robots.txt pattern against a path.
   * Supports wildcard `*` (matches any sequence) and trailing `$` (end-of-path match).
   */
  private matchPattern(pattern: string, path: string): boolean {
    if (!pattern) return false;

    let regexStr = "";
    let i = 0;
    const endsWith = pattern.endsWith("$");
    const pat = endsWith ? pattern.slice(0, -1) : pattern;

    while (i < pat.length) {
      const ch = pat[i];
      if (ch === "*") {
        regexStr += ".*";
      } else if (ch === "." || ch === "?" || ch === "+" || ch === "^" || ch === "$" || ch === "{" || ch === "}" || ch === "|" || ch === "(" || ch === ")" || ch === "[" || ch === "]") {
        regexStr += "\\" + ch;
      } else {
        regexStr += ch;
      }
      i++;
    }

    if (endsWith) {
      regexStr += "$";
    }

    try {
      return new RegExp(regexStr).test(path);
    } catch {
      return false;
    }
  }

  /** Clear cache (for testing) */
  reset(): void {
    this.cache.clear();
  }
}

const robotsChecker = new RobotsChecker();

// ── Helpers ──

function parseNumber(text: string): string | null {
  const cleaned = text
    .replace(/^[$\€\£\¥\s]+|[$\€\£\¥\s]+$/g, "")
    .replace(/,/g, "")
    .trim();
  const parsed = parseFloat(cleaned);
  return !isNaN(parsed) ? String(parsed) : null;
}

function parseBoolean(text: string): string | null {
  const lower = text.toLowerCase().trim();
  // Use startsWith because elements often contain trailing data attributes or JSON
  const truthy = ["in stock", "available", "instock", "true", "yes", "enabled"];
  const falsy = ["out of stock", "unavailable", "outofstock", "false", "no", "disabled"];
  if (truthy.some((v) => lower.startsWith(v))) return "true";
  if (falsy.some((v) => lower.startsWith(v))) return "false";
  return null;
}

function extractAttribute(
  $: cheerio.CheerioAPI,
  el: ReturnType<cheerio.CheerioAPI> | undefined,
  attribute: ScrapeField["attribute"],
): string {
  if (!el || el.length === 0) return "";
  switch (attribute) {
    case "href":
      return el.attr("href")?.trim() ?? "";
    case "src":
      return el.attr("src")?.trim() ?? "";
    case "text":
    default:
      return el.text().replace(/\s+/g, " ").trim();
  }
}

// ── Core API ──

/**
 * Fetch a URL and extract values for the given field definitions.
 * Checks robots.txt and enforces rate limits per hostname.
 *
 * Returns `blockedByRobots: true` if robots.txt disallows the URL,
 * without making the actual request.
 */
export async function scrapeUrl(
  url: string,
  fields: ScrapeField[],
  options?: ScrapeOptions,
): Promise<ScrapeResult> {
  // Respect minimum scrape interval
  if (options?.lastFetchedAt && options?.minIntervalMs) {
    const elapsed = Date.now() - options.lastFetchedAt.getTime();
    if (elapsed < options.minIntervalMs) {
      const waitMs = options.minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  const { html, title, image } = await fetchPage(url);
  const $ = cheerio.load(html);

  const values: ScrapedValue[] = fields.map((field) => {
    try {
      const els = $(field.cssSelector);
      if (els.length === 0) {
        return { value: "", error: `Selector "${field.cssSelector}" matched no elements` };
      }

      const raw = extractAttribute($, els.first(), field.attribute);
      if (!raw) {
        return { value: "", error: `Selector matched but no ${field.attribute} found` };
      }

      let value = raw;
      if (field.valueType === "number") {
        const parsed = parseNumber(raw);
        if (parsed === null) {
          return { value: raw, error: `Could not parse "${raw}" as a number` };
        }
        value = parsed;
      } else if (field.valueType === "boolean") {
        const parsed = parseBoolean(raw);
        if (parsed === null) {
          return { value: raw, error: `Could not parse "${raw}" as boolean` };
        }
        value = parsed;
      }

      return { value };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { value: "", error: message };
    }
  });

  return { title, image, values, blockedByRobots: false };
}

/**
 * Preview a URL — fetch metadata and auto-detect potential fields.
 * Checks robots.txt before fetching.
 */
export async function previewUrl(url: string): Promise<PreviewResult> {
  const { html, title, image, description } = await fetchPage(url);
  const $ = cheerio.load(html);

  const detectedFields = autoDetectFields($);

  return { title, image, description, detectedFields, blockedByRobots: false };
}

// ── Internal ──

interface PageData {
  html: string;
  title: string;
  image: string | null;
  description: string | null;
}

/**
 * Fetch a page with robots.txt check, rate limiting, and timeout.
 * Throws descriptive errors for blocked or failed requests.
 */
async function fetchPage(url: string): Promise<PageData> {
  const parsed = new URL(url);
  const hostname = parsed.hostname;

  // 1. Check robots.txt
  const allowed = await robotsChecker.isAllowed(url);
  if (!allowed) {
    throw new RobotsBlockedError(
      `URL blocked by ${hostname}/robots.txt`,
      hostname,
    );
  }

  // 2. Rate limit per hostname
  await rateLimiter.wait(hostname);

  // 3. Fetch with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": OUR_UA },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $('meta[name="twitter:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    hostname;

  const image =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    $('meta[name="twitter:image"]').attr("content")?.trim() ||
    null;

  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;

  return { html, title, image, description };
}

// ── Errors ──

export class RobotsBlockedError extends Error {
  hostname: string;

  constructor(message: string, hostname: string) {
    super(message);
    this.name = "RobotsBlockedError";
    this.hostname = hostname;
  }
}

// ── Auto-detection ──

function autoDetectFields($: cheerio.CheerioAPI): DetectedField[] {
  const fields: DetectedField[] = [];
  const seen = new Set<string>();

  function add(label: string, selector: string, attribute: ScrapeField["attribute"], valueType: ScrapeField["valueType"]) {
    const key = `${selector}:${attribute}`;
    if (seen.has(key)) return;
    seen.add(key);
    fields.push({ label, cssSelector: selector, attribute, valueType });
  }

  // 1. Schema.org JSON-LD
  const ldScripts: DetectedField[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() ?? "";
      const data = JSON.parse(raw);
      extractLdFields(data, ldScripts, "");
    } catch {
      // skip
    }
  });
  for (const f of ldScripts) {
    const key = `${f.cssSelector}:${f.attribute}`;
    if (!seen.has(key)) {
      seen.add(key);
      fields.push(f);
    }
  }

  // 2. Microdata (itemprop)
  $("[itemprop]").each((_, el) => {
    const $el = $(el);
    const prop = $el.attr("itemprop")?.trim();
    if (!prop || prop.includes(" ")) return;

    const tag = el.type === "tag" ? (el as any).name?.toLowerCase() ?? "" : "";
    const attr: ScrapeField["attribute"] =
      tag === "img" || tag === "video" ? "src" :
      tag === "a" ? "href" :
      "text";

    const selector = buildSelector($el);

    if (prop === "name" || prop === "title") add(prop, selector, attr, "text");
    else if (prop === "price" || prop === "priceCurrency" || prop === "amount") add(prop, selector, attr, "number");
    else if (prop === "availability") add("Availability", selector, attr, "boolean");
    else if (prop === "image") add("Image", selector, "src", "text");
    else if (prop === "description") add(prop, selector, attr, "text");
    else if (prop === "sku" || prop === "mpn" || prop === "gtin") add(prop, selector, attr, "text");
    else if (prop === "ratingValue" || prop === "ratingCount" || prop === "reviewCount") add(prop, selector, attr, "number");
    else add(prop, selector, attr, "text");
  });

  // 3. Common CSS class/element patterns for prices
  const pricePatterns = [
    ".price", ".product-price", ".sale-price", ".current-price",
    "[data-price]", "[class*='price']", ".amount", ".total",
    ".a-price-whole", ".a-offscreen",
    ".product__price", ".product-price__current", ".price--main",
    ".ProductPrice", ".product-single__price",
  ];
  for (const sel of pricePatterns) {
    const el = $(sel).first();
    if (el.length && el.text().trim()) {
      const text = el.text().trim();
      if (/[$€£¥\d.]/.test(text)) {
        add("Price", sel, "text", "number");
        break;
      }
    }
  }

  // 4. Common stock/availability patterns
  const stockPatterns = [
    "[itemprop='availability']", ".stock", ".availability", ".in-stock",
    ".out-of-stock", ".product__stock", "#availability", ".a-stock",
    "[class*='stock']", "[class*='availability']",
  ];
  for (const sel of stockPatterns) {
    const el = $(sel).first();
    if (el.length && el.text().trim()) {
      add("Stock Status", sel, "text", "boolean");
      break;
    }
  }

  // 5. Rating patterns
  const ratingPatterns = [
    ".rating", ".star-rating", ".stars", "[itemprop='ratingValue']",
    ".product-rating", ".review-rating",
  ];
  for (const sel of ratingPatterns) {
    const el = $(sel).first();
    if (el.length && el.text().trim()) {
      add("Rating", sel, "text", "number");
      break;
    }
  }

  return fields;
}

function extractLdFields(
  data: unknown,
  fields: DetectedField[],
  prefix: string,
): void {
  if (typeof data !== "object" || data === null) return;

  const obj = data as Record<string, unknown>;

  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"]) {
      extractLdFields(item, fields, prefix);
    }
    return;
  }

  if (obj["@type"]) {
    if (obj["name"] && typeof obj["name"] === "string") {
      fields.push({
        label: prefix ? `${prefix} Name` : "Name",
        cssSelector: `[itemprop='name']`,
        attribute: "text",
        valueType: "text",
      });
    }

    const priceProp = obj["offers"] || obj["price"];
    if (priceProp && typeof priceProp === "object") {
      const offer = priceProp as Record<string, unknown>;
      if (offer["price"] !== undefined) {
        fields.push({
          label: "Price",
          cssSelector: `[itemprop='price']`,
          attribute: "text",
          valueType: "number",
        });
      }
      if (offer["priceCurrency"] !== undefined) {
        fields.push({
          label: "Currency",
          cssSelector: `[itemprop='priceCurrency']`,
          attribute: "text",
          valueType: "text",
        });
      }
      if (offer["availability"] !== undefined) {
        fields.push({
          label: "Availability",
          cssSelector: `[itemprop='availability']`,
          attribute: "text",
          valueType: "boolean",
        });
      }
    }

    if (obj["image"]) {
      fields.push({
        label: "Image",
        cssSelector: `[itemprop='image']`,
        attribute: "src",
        valueType: "text",
      });
    }

    if (obj["sku"]) {
      fields.push({
        label: "SKU",
        cssSelector: `[itemprop='sku']`,
        attribute: "text",
        valueType: "text",
      });
    }

    if (obj["description"]) {
      fields.push({
        label: "Description",
        cssSelector: `[itemprop='description']`,
        attribute: "text",
        valueType: "text",
      });
    }

    if (obj["aggregateRating"]) {
      const rating = obj["aggregateRating"] as Record<string, unknown>;
      if (rating["ratingValue"] !== undefined) {
        fields.push({
          label: "Rating",
          cssSelector: `[itemprop='ratingValue']`,
          attribute: "text",
          valueType: "number",
        });
      }
      if (rating["ratingCount"] !== undefined) {
        fields.push({
          label: "Rating Count",
          cssSelector: `[itemprop='ratingCount']`,
          attribute: "text",
          valueType: "number",
        });
      }
    }
  }
}

function buildSelector($el: cheerio.Cheerio<any>): string {
  const id = $el.attr("id");
  if (id) return `#${cssEscape(id)}`;

  const tag = ($el[0] as any)?.name ?? "";
  const classes = $el.attr("class");
  if (classes) {
    const classList = classes.split(/\s+/).filter(Boolean);
    if (classList.length > 0) {
      return `${tag}.${classList.map((c) => cssEscape(c)).join(".")}`;
    }
  }

  const itemprop = $el.attr("itemprop");
  if (itemprop) return `[itemprop='${itemprop}']`;

  return tag || "*";
}

function cssEscape(value: string): string {
  return value.replace(/[ !"#$%&'()*+,./:;<=>?@[\]^`{|}~]/g, "\\$&");
}
