const { broadcastSSE } = require('./sse');

const MAX_LOG_LINES = 500;

/** @type {Record<string, Array<{ts:number, stream:string, line:string}>>} */
const projectLogs = {};

function pushLog(name, stream, text) {
  if (!projectLogs[name]) projectLogs[name] = [];
  const lines = text.split('\n').filter(Boolean);
  for (const line of lines) {
    projectLogs[name].push({ ts: Date.now(), stream, line });
  }
  if (projectLogs[name].length > MAX_LOG_LINES) {
    projectLogs[name] = projectLogs[name].slice(-MAX_LOG_LINES);
  }
  broadcastSSE({ type: 'log', project: name, stream, lines });
}

function getLogs(name, limit = MAX_LOG_LINES) {
  const logs = projectLogs[name] || [];
  return logs.slice(-Math.min(limit, MAX_LOG_LINES));
}

function clearLogs(name) {
  delete projectLogs[name];
}

module.exports = { MAX_LOG_LINES, projectLogs, pushLog, getLogs, clearLogs };
