const http = require('http');
const { pushLog } = require('./logger');
const { broadcastSSE } = require('./sse');

const LIVENESS_TIMEOUT = 30000;
const LIVENESS_INTERVAL = 500;
const RECOVERY_TIMEOUT = 60000;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        res.resume();
        resolve(res.statusCode);
      })
      .on('error', reject);
  });
}

async function waitForLiveness(url, timeoutMs = LIVENESS_TIMEOUT, intervalMs = LIVENESS_INTERVAL) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const status = await httpGet(url);
      if (status >= 200 && status < 500) return true;
    } catch {
      /* server not ready yet */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function watchLateLiveness(name, url, isExited) {
  const start = Date.now();
  while (!isExited() && Date.now() - start < RECOVERY_TIMEOUT) {
    try {
      const status = await httpGet(url);
      if (status >= 200 && status < 500) {
        pushLog(name, 'system', `Server is ready on ${url}`);
        broadcastSSE({ type: 'project-status', project: name, status: 'running', url });
        return;
      }
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, LIVENESS_INTERVAL));
  }
}

module.exports = {
  httpGet,
  waitForLiveness,
  watchLateLiveness,
  LIVENESS_TIMEOUT,
  LIVENESS_INTERVAL,
  RECOVERY_TIMEOUT,
};
