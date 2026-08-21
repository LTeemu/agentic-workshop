/** SSE broadcast for dashboard + terminals. */

let sseClients = [];

/**
 * Broadcast a JSON payload to all connected SSE clients.
 * @param {object} data
 */
function broadcastSSE(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    if (client.writableEnded || client.destroyed) continue;
    try {
      client.write(msg);
    } catch {}
  }
}

/**
 * Start an SSE response: headers + initial `connected` event.
 * @param {import('http').ServerResponse} res
 */
function startSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
}

function addSSEClient(res) {
  sseClients.push(res);
}

function removeSSEClient(res) {
  sseClients = sseClients.filter((c) => c !== res);
}

function getSSEClients() {
  return sseClients;
}

module.exports = { broadcastSSE, startSSE, addSSEClient, removeSSEClient, getSSEClients };
