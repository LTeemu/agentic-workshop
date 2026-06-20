import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditHtml } from '../server/audit/html-validator.js';

describe('auditHtml', () => {
  it('passes when all required elements present', () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <meta name="description" content="Test">
  <title>Test Page</title>
</head>
<body><h1>Heading</h1></body>
</html>`;
    const result = auditHtml(html);
    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 0);
  });

  it('flags missing DOCTYPE', () => {
    const html = '<html><head><title>T</title></head><body></body></html>';
    const result = auditHtml(html);
    assert.ok(result.issues.some((i) => i.includes('DOCTYPE')));
    assert.equal(result.valid, false);
  });

  it('flags missing lang attribute', () => {
    const html = '<!DOCTYPE html><html><head><title>T</title></head><body></body></html>';
    const result = auditHtml(html);
    assert.ok(result.issues.some((i) => i.includes('lang')));
  });

  it('flags missing viewport meta', () => {
    const html = '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>';
    const result = auditHtml(html);
    assert.ok(result.issues.some((i) => i.includes('viewport')));
  });

  it('flags missing title', () => {
    const html = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>';
    const result = auditHtml(html);
    assert.ok(result.issues.some((i) => i.includes('title')));
  });

  it('handles empty HTML', () => {
    const result = auditHtml('');
    assert.equal(result.valid, false);
  });

  it('flags skipped heading levels', () => {
    const html =
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><h1>A</h1><h3>C</h3></body></html>';
    const result = auditHtml(html);
    assert.ok(result.issues.some((i) => i.includes('heading') || i.includes('Heading')));
  });
});
