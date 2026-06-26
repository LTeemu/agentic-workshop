const BASE_URL = "https://finnhub.io/api/v1";

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY is not set");
  return key;
}

async function fetchApi<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("token", getApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait before making more requests.");
    }
    throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/** Normalize Finnhub type string to our enum: "stock" | "etf" | "fund" */
export function normalizeType(rawType: string): "stock" | "etf" | "fund" {
  const lower = rawType.toLowerCase();
  if (lower.includes("etf")) return "etf";
  if (lower.includes("fund") || lower.includes("mutual")) return "fund";
  // Common Stock, Preferred Stock, ADR, REIT, etc. → stock
  return "stock";
}

// --- Types ---

export interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

export interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  industry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
}

export interface FinnhubCandle {
  c: number[];  // close prices
  h: number[];  // high prices
  l: number[];  // low prices
  o: number[];  // open prices
  s: string;    // status (ok|no_data)
  t: number[];  // timestamps (Unix)
  v: number[];  // volume
}

export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

// --- API Methods ---

export function searchSymbol(query: string): Promise<FinnhubSearchResult> {
  return fetchApi<FinnhubSearchResult>("/search", { q: query });
}

export function getProfile(symbol: string): Promise<FinnhubProfile | Record<string, never>> {
  return fetchApi<FinnhubProfile | Record<string, never>>("/stock/profile2", { symbol });
}

/** Quote data from Finnhub /quote endpoint (free tier) */
export interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change
  dp: number;  // percent change
  h: number;   // high price of the day
  l: number;   // low price of the day
  o: number;   // open price of the day
  pc: number;  // previous close price
  t: number;   // timestamp
}

export function getQuote(symbol: string): Promise<FinnhubQuote> {
  return fetchApi<FinnhubQuote>("/quote", { symbol });
}

export function getCandles(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M",
  from: number,
  to: number,
): Promise<FinnhubCandle> {
  return fetchApi<FinnhubCandle>("/stock/candle", {
    symbol,
    resolution,
    from: String(from),
    to: String(to),
  });
}

export function getNews(symbol: string, from: string, to: string): Promise<FinnhubNewsItem[]> {
  return fetchApi<FinnhubNewsItem[]>("/company-news", { symbol, from, to });
}

// --- Helpers ---

export function parseCandleData(data: FinnhubCandle | null) {
  if (!data || data.s === "no_data") return [];

  return data.t.map((timestamp, i) => ({
    time: timestamp, // Unix seconds — consumer casts to UTCTimestamp if needed
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v[i],
  }));
}
