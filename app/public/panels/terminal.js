/**
 * Terminal panel — real shell via xterm + server PTY.
 * Self-contained; expects window.ResizeUtils.
 */
(function () {
  'use strict';
  // Capture xterm globals before we expose the panel API under window.Terminal.
  // xterm.js UMD sets self.Terminal / window.Terminal; the panel historically
  // overwrote window.Terminal with {initTerminal,…}, so `new Terminal()` inside
  // initTerminal would resolve to the panel object and throw
  // "Terminal is not a constructor" on the next open.
  const XTerm =
    (typeof Terminal !== 'undefined' ? Terminal : null) || window.Terminal || self.Terminal;
  const XFitAddon =
    (typeof FitAddon !== 'undefined' ? FitAddon : null) || window.FitAddon || self.FitAddon;
  const terminalTab = document.getElementById('terminal-tab');
  const terminalContainer = document.getElementById('terminal-container');
  const terminalOpenCodeBtn = document.getElementById('terminal-opencode');
  const TERMINAL_ID_KEY = 'workshop-terminal-id';
  let termInstance = null,
    termFit = null,
    terminalId = null,
    openCodeCommand = null,
    terminalStream = null,
    terminalStarting = false,
    terminalSessionPending = false,
    pageUnloading = false;
  window.addEventListener('beforeunload', () => {
    pageUnloading = true;
  });
  window.addEventListener('pagehide', () => {
    pageUnloading = true;
  });
  window.addEventListener('pageshow', (e) => {
    pageUnloading = false;
    if (
      e.persisted &&
      terminalId &&
      terminalStream &&
      terminalStream.readyState === EventSource.CLOSED
    )
      openTerminalStream();
  });
  async function api(url, options = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    return res.json();
  }
  function initTerminal() {
    if (termInstance || terminalStarting) return;
    terminalStarting = true;
    try {
      const Ctor = XTerm || window.Terminal || self.Terminal;
      if (typeof Ctor !== 'function') throw new Error('xterm Terminal not loaded');
      termInstance = new Ctor({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        scrollback: 5000,
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff',
          selectionBackground: '#1f6feb',
          black: '#0d1117',
          red: '#f85149',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#c9d1d9',
          brightBlack: '#484f58',
          brightRed: '#ff7b72',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#f0f6fc',
        },
      });
      const FitCtor = XFitAddon || window.FitAddon || self.FitAddon;
      termFit = new FitCtor.FitAddon();
      termInstance.loadAddon(termFit);
      termInstance.open(terminalContainer);
      termInstance.onData(sendTerminalInput);
      fitTerminal();
      startTerminalSession();
    } finally {
      terminalStarting = false;
    }
  }
  async function startTerminalSession() {
    if (terminalSessionPending) return;
    terminalSessionPending = true;
    try {
      const savedId = localStorage.getItem(TERMINAL_ID_KEY);
      if (savedId) {
        const probe = await probeSession(savedId);
        if (probe.state) {
          setOpenCodeButton(probe.state.running);
          attachToSession(savedId, probe.state.openCodeCommand);
          return;
        }
        if (probe.gone) localStorage.removeItem(TERMINAL_ID_KEY);
        else throw new Error('cannot reach the dashboard server');
      }
      await createFreshSession();
    } catch (err) {
      terminalOpenCodeBtn.disabled = true;
      termInstance.write('\r\n\x1b[31mFailed to start shell: ' + err.message + '\x1b[0m\r\n');
    } finally {
      terminalSessionPending = false;
    }
  }
  async function createFreshSession() {
    const data = await api('/api/terminal', {
      method: 'POST',
      body: JSON.stringify({ cols: termInstance.cols, rows: termInstance.rows }),
    });
    if (data.error) throw new Error(data.error);
    if (!data.id) throw new Error('server returned no session id');
    localStorage.setItem(TERMINAL_ID_KEY, data.id);
    termInstance.write('\x1b[2J\x1b[H');
    attachToSession(data.id, data.openCodeCommand);
  }
  function isSessionGone(s) {
    return s === 404 || s === 410;
  }
  async function probeSession(id) {
    try {
      const res = await fetch('/api/terminal/' + id + '/opencode', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return isSessionGone(res.status) ? { gone: true } : { error: true };
      return { state: await res.json() };
    } catch {
      return { error: true };
    }
  }
  function attachToSession(id, command) {
    terminalId = id;
    openCodeCommand = command || 'opencode2';
    terminalOpenCodeBtn.disabled = false;
    fitTerminal();
    openTerminalStream();
  }
  function resetTerminalState() {
    if (terminalStream) {
      terminalStream.close();
      terminalStream = null;
    }
    terminalId = null;
    openCodeCommand = null;
    setOpenCodeButton(false);
    terminalOpenCodeBtn.disabled = true;
  }
  function openTerminalStream() {
    if (terminalStream) terminalStream.close();
    const es = new EventSource('/api/terminal/' + terminalId + '/stream');
    terminalStream = es;
    es.onopen = () => syncOpenCodeState();
    es.addEventListener('message', (e) => {
      let ev;
      try {
        ev = JSON.parse(e.data);
      } catch {
        return;
      }
      if (ev.type === 'data') termInstance.write(ev.data);
      else if (ev.type === 'replay') {
        termInstance.write('\x1b[2J\x1b[H');
        termInstance.write(ev.data);
      } else if (ev.type === 'restart') {
        termInstance.write('\x1b[2J\x1b[H');
        termInstance.write(
          '\r\n\x1b[2m[shell restarted' +
            (ev.data ? ' (code ' + ev.data + ')' : '') +
            ']\x1b[0m\r\n',
        );
      } else if (ev.type === 'opencode') setOpenCodeButton(ev.data === true);
      else if (ev.type === 'exit') {
        termInstance.write(
          '\r\n\x1b[90m[shell exited' + (ev.data ? ' (code ' + ev.data + ')' : '') + ']\x1b[0m\r\n',
        );
        resetTerminalState();
      }
    });
    es.onerror = () => {
      if (es.readyState !== EventSource.CLOSED) return;
      if (terminalStream !== es) return;
      recoverLostSession();
    };
  }
  async function postTerminal(id, p, body) {
    if (!id) return;
    try {
      const res = await fetch('/api/terminal/' + id + '/' + p, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (isSessionGone(res.status) && terminalId === id) recoverLostSession();
    } catch {}
  }
  function sendTerminalInput(data) {
    postTerminal(terminalId, 'input', { data });
  }
  function sendResize(cols, rows) {
    postTerminal(terminalId, 'resize', { cols, rows });
  }
  let terminalRecovering = false;
  async function recoverLostSession() {
    if (pageUnloading || terminalRecovering) return;
    terminalRecovering = true;
    try {
      resetTerminalState();
      termInstance.write(
        '\r\n\x1b[90m[terminal session lost \u2014 starting a new shell]\x1b[0m\r\n',
      );
      await startTerminalSession();
    } finally {
      terminalRecovering = false;
    }
  }
  function setOpenCodeButton(running) {
    const isRunning = running === true;
    const wasHidden = terminalOpenCodeBtn.classList.contains('hidden');
    terminalOpenCodeBtn.classList.toggle('hidden', isRunning);
    if (wasHidden && !isRunning) terminalOpenCodeBtn.disabled = false;
  }
  async function syncOpenCodeState() {
    if (!terminalId) return null;
    const probe = await probeSession(terminalId);
    if (!probe.state) return null;
    setOpenCodeButton(probe.state.running);
    return probe.state;
  }
  terminalOpenCodeBtn.addEventListener('click', async () => {
    if (!terminalId) return;
    const state = await syncOpenCodeState();
    if (state && state.running) return;
    terminalOpenCodeBtn.disabled = true;
    sendTerminalInput('\x03' + openCodeCommand + '\r');
    setTimeout(() => {
      if (!terminalOpenCodeBtn.classList.contains('hidden')) terminalOpenCodeBtn.disabled = false;
    }, 1500);
  });
  function fitTerminal() {
    if (!termInstance || !termFit) return;
    const cols = termInstance.cols,
      rows = termInstance.rows;
    try {
      termFit.fit();
    } catch {
      return;
    }
    if (terminalId && (termInstance.cols !== cols || termInstance.rows !== rows))
      sendResize(termInstance.cols, termInstance.rows);
  }
  window.ResizeUtils.watchResize(terminalContainer, fitTerminal, 150);
  const panelApi = {
    initTerminal,
    fitTerminal,
    get instance() {
      return termInstance;
    },
  };
  window.WorkshopTerminal = panelApi;
  window.TerminalPanel = panelApi;
  // Keep `new Terminal()` working for xterm while also exposing `Terminal.initTerminal`.
  // Attach panel API onto the xterm constructor instead of overwriting it.
  if (XTerm && typeof XTerm === 'function') {
    Object.assign(XTerm, panelApi);
    try {
      Object.defineProperty(XTerm, 'instance', {
        get() {
          return termInstance;
        },
        configurable: true,
      });
    } catch {}
    window.Terminal = XTerm;
    try {
      self.Terminal = XTerm;
    } catch {}
  } else {
    window.Terminal = panelApi;
  }
  window.addEventListener('workshop:panel-tab', (e) => {
    if (e.detail === 'terminal') {
      if (!termInstance) initTerminal();
      else {
        if (!terminalId) startTerminalSession();
        requestAnimationFrame(fitTerminal);
      }
    }
  });
})();
