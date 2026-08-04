import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditAnatomy } from '../server/audit/anatomy.js';

const SAMPLE_HTML = `<html><head>
  <base href="https://cdn.example.com/">
  <script src="app.js"></script>
  <link rel="stylesheet" href="style.css">
  <link rel="preload" href="font.woff2" as="font">
  <link rel="icon" href="favicon.ico">
</head><body>
  <img src="pic.jpg">
  <img src="data:image/png;base64,xxx">
  <source src="video.mp4">
  <iframe src="frame.html"></iframe>
  <video src="clip.mp4"></video>
  <audio src="song.mp3"></audio>
</body></html>`;

describe('auditAnatomy', () => {
  it('extracts all external resource types', () => {
    const result = auditAnatomy(SAMPLE_HTML, 'https://example.com');
    // script, stylesheet, preload, icon, img, source, iframe, video, audio = 9
    // (the data: img is excluded)
    assert.equal(result.resources.length, 9);
    const types = result.resources.map((r) => r.type);
    for (const expected of [
      'script',
      'stylesheet',
      'preload',
      'icon',
      'image',
      'iframe',
      'video',
      'audio',
    ]) {
      assert.ok(types.includes(expected), `missing type ${expected}`);
    }
  });

  it('excludes data: URLs', () => {
    const result = auditAnatomy(SAMPLE_HTML, 'https://example.com');
    assert.ok(result.resources.every((r) => !r.url.startsWith('data:')));
  });

  it('resolves relative URLs against the <base> href', () => {
    const result = auditAnatomy(SAMPLE_HTML, 'https://example.com');
    const script = result.resources.find((r) => r.type === 'script');
    assert.equal(script.url, 'https://cdn.example.com/app.js');
  });

  it('falls back to baseUrl when no <base> tag exists', () => {
    const result = auditAnatomy('<img src="/img.png">', 'https://site.com/page');
    assert.equal(result.resources[0].url, 'https://site.com/img.png');
  });

  it('handles empty HTML', () => {
    assert.deepEqual(auditAnatomy('', 'https://example.com'), { html: '', resources: [] });
  });
});
