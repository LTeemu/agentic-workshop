/**
 * Formatting helpers shared between the dashboard UI and its unit tests.
 * UMD-style so the browser gets `window.FormatUtils` while node:test can
 * `require()` the same file without a DOM.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FormatUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function stripAnsi(str) {
    if (!str) return '';
    return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { stripAnsi, escapeHtml };
});
