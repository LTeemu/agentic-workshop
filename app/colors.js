// Terminal color helper. Auto-disabled when stdout is piped or NO_COLOR is set,
// so piped logs and test output never contain ANSI escape sequences.
// Projects spawned by the dashboard see a piped stdout and disable their own
// colors (e.g. Vite) — this module only colors text the dashboard itself renders.
// A single gate checks stdout; stderr echo shares it (both streams are typically
// a TTY together or piped together).

const ENABLED = process.stdout.isTTY && !process.env.NO_COLOR;

const STYLES = {
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  reset: '\x1b[0m',
};

/** Apply ANSI style codes; returns text unchanged when disabled or unstyled. */
function decorate(text, styles, enabled) {
  if (!enabled || styles.length === 0) return text;
  return styles.map((s) => STYLES[s]).join('') + text + STYLES.reset;
}

/**
 * Wrap text in ANSI styles (e.g. paint('http://x', 'cyan', 'bold')).
 * @param {string} text
 * @param {...string} styles
 * @returns {string}
 */
function paint(text, ...styles) {
  for (const style of styles) {
    if (!(style in STYLES)) throw new Error(`Unknown color style: ${style}`);
  }
  return decorate(text, styles, ENABLED);
}

const URL_RE = /https?:\/\/[^\s"'<>()]+/g;
const URL_TRAILING_PUNCT = /[.,;:!?)\]}]+$/;

/**
 * Highlight http(s) URLs in text with bold cyan.
 * For terminal echo only — keep stored logs raw so the UI never sees escape codes.
 * The `enabled` override exists for tests; production callers omit it.
 * @param {string} text
 * @param {boolean} [enabled=ENABLED]
 * @returns {string}
 */
function colorizeUrls(text, enabled = ENABLED) {
  return text.replace(URL_RE, (url) => {
    const clean = url.replace(URL_TRAILING_PUNCT, '');
    return decorate(clean, ['cyan', 'bold'], enabled) + url.slice(clean.length);
  });
}

module.exports = { paint, colorizeUrls };
