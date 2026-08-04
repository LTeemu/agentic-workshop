import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditRenderBlocking } from '../server/audit/render-blocking.js';

describe('auditRenderBlocking', () => {
  it('flags only synchronous head scripts, not async/defer/module', () => {
    const html = `<html><head>
      <script src="a.js"></script>
      <script src="b.js" async></script>
      <script src="c.js" defer></script>
      <script type="module" src="d.js"></script>
    </head><body></body></html>`;
    const result = auditRenderBlocking(html);
    assert.equal(result.count, 1);
    assert.equal(result.resources[0].src, 'a.js');
  });

  it('flags render-blocking stylesheets and skips print/disabled ones', () => {
    const html = `<html><head>
      <link rel="stylesheet" href="all.css" media="all">
      <link rel="stylesheet" href="print.css" media="print">
      <link rel="stylesheet" href="screen.css" media="screen">
      <link rel="stylesheet" href="off.css" disabled>
    </head><body></body></html>`;
    const result = auditRenderBlocking(html);
    // all.css and screen.css are flagged; print and disabled are skipped
    assert.equal(result.count, 2);
  });

  it('ignores scripts outside the head', () => {
    const html = '<html><head></head><body><script src="late.js"></script></body></html>';
    const result = auditRenderBlocking(html);
    assert.equal(result.count, 0);
    assert.equal(result.score, 100);
  });

  it('deducts 15 points per blocking resource', () => {
    const html = `<html><head>
      <script src="a.js"></script>
      <script src="b.js"></script>
      <script src="c.js"></script>
    </head><body></body></html>`;
    const result = auditRenderBlocking(html);
    assert.equal(result.count, 3);
    assert.equal(result.score, 55); // 100 - 3 × 15
  });

  it('handles empty HTML', () => {
    const result = auditRenderBlocking('');
    assert.equal(result.count, 0);
    assert.equal(result.score, 100);
  });
});
