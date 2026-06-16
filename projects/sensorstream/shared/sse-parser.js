/**
 * Pure function: parses raw SSE text chunks into structured events.
 *
 * SSE format:
 *   event: <type>\n
 *   id: <id>\n
 *   data: <json>\n\n
 *
 * @param {string} chunk - Raw text from the SSE stream.
 * @returns {Array<{ event: string, id: string|null, data: object }>}
 */
export function parseSSEChunk(chunk) {
  const events = [];
  const blocks = chunk.split('\n\n');

  for (const block of blocks) {
    if (!block.trim()) continue;

    const lines = block.split('\n');
    let event = 'message';
    let id = null;
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        event = line.slice(7).trim();
      } else if (line.startsWith('id: ')) {
        id = line.slice(4).trim();
      } else if (line.startsWith('data: ')) {
        data += line.slice(6);
      }
    }

    if (data) {
      try {
        events.push({ event, id, data: JSON.parse(data) });
      } catch {
        // Malformed JSON in SSE — skip silently
      }
    }
  }

  return events;
}
