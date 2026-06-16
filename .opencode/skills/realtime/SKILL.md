---
name: realtime
description: 'Real-time communication — WebSocket server and client, Server-Sent Events, event-driven architecture, broadcasting, reconnection logic, pub/sub patterns.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [realtime, websocket, sse, events, pubsub, broadcasting]
tools: [opencode, claude, cursor, gemini]
---

# Realtime

You are a **realtime specialist**. You build systems that push data to clients the instant it's available — using WebSockets for bidirectional communication and SSE for server-to-client streaming.

## Choosing Protocol

| Protocol              | Direction            | Use Case                                             |
| --------------------- | -------------------- | ---------------------------------------------------- |
| **SSE** (EventSource) | Server → Client only | Notifications, live feeds, status updates            |
| **WebSocket**         | Bidirectional        | Chat, collaborative editing, gaming, live cursors    |
| **Long polling**      | Client pulls         | Fallback when neither is supported (very rare today) |

**When in doubt, start with SSE.** It's simpler, reconnects automatically, works over HTTP/2, and covers 90% of use cases.

## Server-Sent Events (SSE)

Zero dependencies — works with plain Node.js `http` module or Express.

### Express endpoint

```javascript
// server.js — SSE endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Keep alive — prevent proxy timeouts
  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n'); // comment line = no-op for client
  }, 30000);

  // Store client for broadcasting
  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
    clearInterval(keepAlive);
  });
});

// Broadcasting
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(msg);
    } catch {}
  }
}
```

### Client-side SSE

```javascript
const source = new EventSource('/api/events');

source.addEventListener('connected', (e) => {
  console.log('Connected to event stream');
});

source.addEventListener('message', (e) => {
  const data = JSON.parse(e.data);
  // handle update
});

source.addEventListener('notification', (e) => {
  const { title, body } = JSON.parse(e.data);
  showNotification(title, body);
});

// Built-in reconnection — EventSource reconnects automatically
// Configure delay via Last-Event-ID header
source.onerror = () => {
  console.log('Connection lost — will auto-reconnect');
};
```

### SSE event format

```
event: notification
data: {"title":"New message","body":"Hello"}

:keepalive

event: connected
data: {"type":"connected","clientId":"abc123"}
```

## WebSocket (ws library)

```javascript
const WebSocket = require('ws');
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Connection management
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = crypto.randomUUID();
  clients.set(clientId, ws);

  console.log(`Client connected: ${clientId}`);

  // Send welcome message
  ws.send(JSON.stringify({ type: 'welcome', clientId }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'message':
          // Broadcast to all other clients
          broadcast(msg.payload, clientId);
          break;
        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });

  ws.on('error', (err) => {
    clients.delete(clientId);
    console.error(`WebSocket error: ${err.message}`);
  });
});

function broadcast(data, excludeId = null) {
  const message = JSON.stringify({ type: 'broadcast', data });
  for (const [id, client] of clients) {
    if (id !== excludeId && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
```

### Client-side WebSocket

```javascript
class RealtimeClient {
  constructor(url) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxAttempts = 10;
    this.handlers = new Map();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const handlers = this.handlers.get(msg.type) || [];
        handlers.forEach((fn) => fn(msg));
      } catch {}
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms...`);
        setTimeout(() => this.connect(), delay);
        this.reconnectAttempts++;
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror — reconnect there
    };
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(handler);
  }

  send(type, payload) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  close() {
    this.maxAttempts = 0; // prevent reconnect
    this.ws.close();
  }
}

// Usage
const client = new RealtimeClient('ws://localhost:4000');
client.on('welcome', (msg) => console.log('Connected as', msg.clientId));
client.on('broadcast', (msg) => console.log('Received:', msg.data));
client.send('ping');
```

## Pub/Sub Pattern

Decouple senders from receivers. Useful when you need multiple channel types.

```javascript
class PubSub {
  constructor() {
    this.channels = new Map();
  }

  subscribe(channel, handler) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel).add(handler);
    return () => this.channels.get(channel)?.delete(handler);
  }

  publish(channel, data) {
    const handlers = this.channels.get(channel);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        console.error(`PubSub handler error on ${channel}:`, err);
      }
    }
  }

  clear(channel) {
    if (channel) this.channels.delete(channel);
    else this.channels.clear();
  }
}

// Usage with WebSocket
const pubsub = new PubSub();

wss.on('connection', (ws) => {
  const unsubs = [];

  // Client subscribes to channels
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'subscribe') {
      const unsub = pubsub.subscribe(msg.channel, (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ channel: msg.channel, data }));
        }
      });
      unsubs.push(unsub);
    }
  });

  ws.on('close', () => {
    unsubs.forEach((fn) => fn());
  });
});

// Any part of app can publish
pubsub.publish('projects:updated', { id: 1, name: 'New name' });
```

## Reconnection Strategy

| Attempt | Delay       | Notes                                  |
| ------- | ----------- | -------------------------------------- |
| 1       | 1s          | Immediate retry                        |
| 2       | 2s          | Exponential backoff                    |
| 3       | 4s          |                                        |
| 4       | 8s          |                                        |
| 5       | 16s         |                                        |
| 6+      | 30s         | Cap at 30 seconds                      |
| Max     | 10 attempts | Then give up (or show "offline" state) |

```javascript
function getReconnectDelay(attempt) {
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}
```

### State sync on reconnect

When a client reconnects, send the current state so they don't miss updates.

```javascript
ws.on('open', () => {
  // Client sends its last known state version
  ws.send(JSON.stringify({ type: 'sync', lastKnownId: localLastId }));
});

// Server responds with missed events
function handleSync(client, lastKnownId) {
  const missed = getEventsSince(lastKnownId);
  for (const event of missed) {
    client.send(JSON.stringify(event));
  }
}
```

## Heartbeat / Ping-Pong

Detect broken connections (especially important behind proxies and load balancers).

```javascript
// Server-side ping every 30s
setInterval(() => {
  for (const [id, ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
      // Set a timeout for pong response
      ws.pongTimeout = setTimeout(() => {
        ws.terminate(); // Force close unresponsive client
        clients.delete(id);
      }, 5000);
    }
  }
}, 30000);

ws.on('pong', () => {
  clearTimeout(ws.pongTimeout);
});
```

## Protocol considerations

| Aspect                     | SSE                        | WebSocket                        |
| -------------------------- | -------------------------- | -------------------------------- |
| Auto-reconnect             | ✅ Built-in                | ❌ Must implement                |
| HTTP/2 multiplexing        | ✅ Yes (single connection) | ❌ Separate connections          |
| Browser support            | All modern browsers        | All modern browsers              |
| Binary data                | ❌ Text only               | ✅ Blob/ArrayBuffer              |
| Custom headers             | ❌ (use cookies)           | ✅ On initial handshake          |
| Max concurrent connections | 6 per domain (HTTP/1.1)    | Unlimited (with server capacity) |
| Complexity                 | Low                        | Medium                           |
| Libraries needed           | None                       | ws (on server), native (browser) |

## Checklist

- [ ] Protocol choice matches use case (SSE vs WebSocket)
- [ ] SSE uses proper event types (named events, not just `message`)
- [ ] Keepalive pings every 30s to prevent proxy timeouts
- [ ] WebSocket has ping/pong heartbeat for dead connection detection
- [ ] Exponential backoff reconnection with cap at 30s
- [ ] State sync on reconnect — client doesn't miss events
- [ ] Pub/Sub pattern used when multiple channel types needed
- [ ] Cleanup on disconnect (remove from client list, clear timeouts)
- [ ] Error handling on send (catch disconnected client errors)
- [ ] Max reconnection attempts with graceful offline state
- [ ] WebSocket message validation (parse JSON, reject unknown types)
