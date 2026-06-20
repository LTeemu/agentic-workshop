import type { AuditResult, AuditSummary, UrlEntry } from './types.js';

export async function runAudit(url: string): Promise<AuditResult> {
  const resp = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  return resp.json();
}

export async function fetchLatest(): Promise<AuditResult | null> {
  const resp = await fetch('/api/latest');
  if (!resp.ok) return null;
  return resp.json();
}

export async function fetchUrls(): Promise<UrlEntry[]> {
  const resp = await fetch('/api/urls');
  if (!resp.ok) return [];
  return resp.json();
}

export async function fetchAuditByFile(hostname: string, filename: string): Promise<AuditResult> {
  const resp = await fetch(`/api/audit/${encodeURIComponent(hostname)}/${encodeURIComponent(filename)}`);
  if (!resp.ok) throw new Error(`Failed to load audit: HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchHistory(url: string): Promise<AuditSummary[]> {
  const resp = await fetch(`/api/history?url=${encodeURIComponent(url)}`);
  if (!resp.ok) return [];
  return resp.json();
}

export async function deleteAudits(files: Array<{ hostname: string; filename: string }>): Promise<boolean> {
  const resp = await fetch('/api/audits/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  return data.ok === true;
}
