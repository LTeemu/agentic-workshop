export interface Resource {
  url: string;
  type: string;
  source?: string;
  status?: number;
  headers?: Record<string, string>;
  size?: number;
  protocol?: string;
}

export interface LighthouseResult {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  fcp: number | null;
  lcp: number | null;
  tbt: number | null;
  cls: number | null;
  si: number | null;
  raw?: unknown;
  error?: string;
}

export interface AnatomyResult {
  totalBytes: number;
  totalRequests: number;
  bytesByType: Record<string, number>;
  requestsByType: Record<string, number>;
  resources: Resource[];
}

export interface CompressionResult {
  mainPageCompressed: boolean;
  mainPageEncoding: string;
  resourcesWithoutCompression: number;
  totalBytes: number;
  potentialSavingsBytes: number;
  score: number;
  details?: Array<{ url: string; size: number; estimatedSaving: number; encoding: string }>;
}

export interface CachingResult {
  poorCacheCount: number;
  totalResources: number;
  score: number;
  details?: Array<{ url: string; cacheControl: string; maxAgeSeconds: number }>;
}

export interface RenderBlockingResult {
  count: number;
  resources: Array<{ tag: string; src: string; async?: boolean; defer?: boolean }>;
  score: number;
}

export interface ImagesResult {
  total: number;
  withoutLazyLoading: number;
  withoutDimensions: number;
  withoutAlt: number;
  withoutSrcset: number;
  issues: string[];
  score: number;
}

export interface SecurityResult {
  present: Array<{ header: string; value: string }>;
  missing: string[];
  score: number;
}

export interface HtmlResult {
  valid: boolean;
  issues: string[];
  score: number;
}

export interface ThirdPartiesResult {
  totalExternal: number;
  uniqueDomains: number;
  trackerDomains: string[];
  domains: Array<{ hostname: string; count: number }>;
  score: number;
}

export interface FontsResult {
  total: number;
  preloaded: number;
  preconnects: number;
  googleFonts: boolean;
  issues: string[];
  score: number;
}

export interface ProtocolResult {
  mainPageProtocol: string;
  http2Resources: number;
  http1Resources: number;
  unknownResources: number;
  totalChecked: number;
  http2Percent: number;
  score: number;
}

export interface AccessibilityResult {
  score: number;
  violations: Array<{
    id: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    helpUrl: string;
    nodes: number;
    tags: string[];
  }>;
  passes: number;
  incomplete: number;
}

export interface CarbonResult {
  gramsPerVisit: number;
  totalBytes: number;
  rating: string;
  equivalent: string;
}

export interface Suggestion {
  text: string;
  category: string;
}

export interface SuggestionsResult {
  critical: Suggestion[];
  warning: Suggestion[];
  info: Suggestion[];
}

export interface AuditResult {
  url: string;
  timestamp: string | null;
  durationMs: number;
  screenshotFilename?: string | null;
  lighthouse: LighthouseResult;
  anatomy: AnatomyResult;
  compression: CompressionResult;
  caching: CachingResult;
  renderBlocking: RenderBlockingResult;
  images: ImagesResult;
  security: SecurityResult;
  html: HtmlResult;
  thirdParties: ThirdPartiesResult;
  fonts: FontsResult;
  protocol: ProtocolResult;
  carbon: CarbonResult;
  accessibility: AccessibilityResult;
  suggestions: SuggestionsResult;
  changes?: Changes;
}

export interface Changes {
  isFirst: boolean;
  deltas: Record<string, string>;
}

export interface AuditSummary {
  timestamp: string;
  lighthouse: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
    fcp: number | null;
    lcp: number | null;
    tbt: number | null;
    cls: number | null;
    si: number | null;
  };
  anatomy: {
    totalBytes: number;
    totalRequests: number;
  } | null;
  compression: { score: number } | null;
  caching: { score: number } | null;
  durationMs: number;
  changes: Changes | null;
}

export interface UrlEntry {
  hostname: string;
  audits: string[];
  url: string | null;
  host: string | null;
}
