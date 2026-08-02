const { describe, it } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');

const term = require('../../app/terminal');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Probe stub that never spawns a real process; reports no opencode running. */
const NOOP_RUN = (_file, _args, _opts, cb) => cb(null, '');

async function waitFor(fn, timeoutMs = 10_000, intervalMs = 100) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fn()) return;
    await sleep(intervalMs);
  }
  throw new Error(`condition not met within ${timeoutMs}ms`);
}

/** Whether the real node-pty module is installed (lifecycle tests need it). */
let HAS_PTY = true;
try {
  require('node-pty');
} catch {
  HAS_PTY = false;
}

/** Fake SSE client that captures what the server broadcasts. EventEmitter so
 * tests can fire the `close` lifecycle event. */
function makeClient() {
  const client = new EventEmitter();
  client.writableEnded = false;
  client.writes = [];
  client.all = '';
  client.write = (data) => {
    client.writes.push(data);
    client.all += data;
  };
  client.end = () => {};
  return client;
}

/** Fake node-pty (EventEmitter-based) so tests can emit data/exit events. */
function makeFakePty() {
  const p = new EventEmitter();
  p.pid = Math.floor(Math.random() * 1e6) + 1;
  p.onData = (cb) => p.on('data', cb);
  p.onExit = (cb) => p.on('exit', cb);
  p.kill = () => p.emit('exit', { exitCode: 0 });
  p.write = () => {};
  p.resize = () => {};
  return p;
}

/** Fake pty with a known pid (for process-tree tests). */
function makeFakePtyWithPid(pid) {
  const p = makeFakePty();
  p.pid = pid;
  return p;
}

/** Swap in a pty factory and hand back the restore callback. Async-aware so
 * the pty swap stays in place until the test body settles. */
async function withFakePtyFactory(spawnImpl, fn) {
  const realPty = term._setPty({ spawn: spawnImpl });
  try {
    return await fn();
  } finally {
    term._setPty(realPty);
  }
}

describe('shouldRespawn', () => {
  it('refuses respawn after an explicit close', () => {
    assert.strictEqual(term.shouldRespawn({ closing: true, restartTimes: [] }), false);
  });

  it('allows respawn when under the rate limit', () => {
    const now = Date.now();
    assert.strictEqual(
      term.shouldRespawn({ closing: false, restartTimes: [now - 1000] }, now),
      true,
    );
  });

  it('refuses respawn once the limit is reached within the window', () => {
    const now = Date.now();
    const restartTimes = [now - 1000, now - 2000, now - 3000, now - 4000, now - 5000];
    assert.strictEqual(term.shouldRespawn({ closing: false, restartTimes }, now), false);
  });

  it('prunes restarts outside the window', () => {
    const now = Date.now();
    const state = { closing: false, restartTimes: [now - 1000, now - 20_000] };
    assert.strictEqual(term.shouldRespawn(state, now), true);
    assert.deepStrictEqual(state.restartTimes, [now - 1000]);
  });

  it('treats a restart exactly at the window boundary as stale', () => {
    const now = Date.now();
    const state = { closing: false, restartTimes: [now - 10_000] };
    assert.strictEqual(term.shouldRespawn(state, now), true);
    assert.deepStrictEqual(state.restartTimes, []);
  });
});

describe('opencode process detection', () => {
  const POSIX_OUTPUT = [
    '    1     0 init',
    '  100     1 powershell',
    '  101   100 opencode2',
    '  102   100 code.exe',
  ].join('\n');

  it('finds opencode2 as a descendant of the shell', async () => {
    const fakeRun = (_file, _args, _opts, cb) => cb(null, POSIX_OUTPUT);
    assert.strictEqual(await term.isOpenCodeRunning(100, 'linux', fakeRun), true);
  });

  it('reports false when opencode2 is not a descendant', async () => {
    const fakeRun = (_file, _args, _opts, cb) => cb(null, POSIX_OUTPUT);
    assert.strictEqual(await term.isOpenCodeRunning(102, 'linux', fakeRun), false);
  });

  it('matches opencode2 deeper in the tree through intermediate processes', async () => {
    const out = ['1 0 init', '100 1 powershell', '200 100 cmd', '300 200 opencode2'].join('\n');
    const fakeRun = (_file, _args, _opts, cb) => cb(null, out);
    assert.strictEqual(await term.isOpenCodeRunning(100, 'linux', fakeRun), true);
  });

  it('parses Windows Get-CimInstance JSON output', () => {
    const out = JSON.stringify([
      { ProcessId: 10, ParentProcessId: 0, Name: 'System Idle Process' },
      { ProcessId: 100, ParentProcessId: 10, Name: 'powershell.exe' },
      { ProcessId: 200, ParentProcessId: 100, Name: 'opencode2.exe' },
    ]);
    assert.deepStrictEqual(term.parseProcessList('win32', out), [
      { pid: 10, ppid: 0, name: 'System Idle Process' },
      { pid: 100, ppid: 10, name: 'powershell.exe' },
      { pid: 200, ppid: 100, name: 'opencode2.exe' },
    ]);
  });

  it('handles a single-object Windows JSON result (not an array)', async () => {
    const out = JSON.stringify({ ProcessId: 100, ParentProcessId: 0, Name: 'opencode2.exe' });
    const fakeRun = (_file, _args, _opts, cb) => cb(null, out);
    assert.strictEqual(await term.isOpenCodeRunning(0, 'win32', fakeRun), true);
  });

  it('propagates probe failures as rejections', async () => {
    const fakeRun = (_file, _args, _opts, cb) => cb(new Error('boom'));
    await assert.rejects(term.isOpenCodeRunning(100, 'linux', fakeRun), /boom/);
  });

  it('builds the right process-listing command per platform', () => {
    const win = term.processListCommand('win32');
    assert.strictEqual(win[0], 'powershell.exe');
    assert.ok(win[1].join(' ').includes('Get-CimInstance'));
    const posix = term.processListCommand('linux');
    assert.strictEqual(posix[0], 'ps');
    assert.deepStrictEqual(posix[1], ['-eo', 'pid=,ppid=,comm=']);
  });

  it('isOpenCodeName matches opencode and opencode2 executables only', () => {
    assert.strictEqual(term.isOpenCodeName('opencode2'), true);
    assert.strictEqual(term.isOpenCodeName('opencode2.exe'), true);
    assert.strictEqual(term.isOpenCodeName('C:\\tools\\OpenCode2.EXE'), true);
    assert.strictEqual(term.isOpenCodeName('opencode'), true);
    assert.strictEqual(term.isOpenCodeName('powershell.exe'), false);
    assert.strictEqual(term.isOpenCodeName('notopencode2'), false);
  });
});

describe('shared opencode poller', () => {
  const POSIX_OUTPUT = [
    '    1     0 init',
    '  100     1 powershell',
    '  101   100 opencode2',
    '  102   100 code.exe',
  ].join('\n');
  const FAKE_RUN = (_file, _args, _opts, cb) => cb(null, POSIX_OUTPUT);
  const FAIL_RUN = (_file, _args, _opts, cb) => cb(new Error('boom'));

  it('broadcasts opencode state changes to attached terminals from one snapshot', async () => {
    await withFakePtyFactory(
      () => makeFakePtyWithPid(100),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.stopOpenCodePoller(); // hermetic: drive ticks manually below
        try {
          const client = makeClient();
          t.clients.add(client);
          await term.pollOpenCodeState('linux', FAKE_RUN);
          assert.strictEqual(t.openCodeRunning, true);
          assert.ok(
            client.writes.some((w) => w.includes('"type":"opencode"') && w.includes('true')),
            'expected an opencode=true event',
          );
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('does not broadcast when the state is unchanged', async () => {
    await withFakePtyFactory(
      () => makeFakePtyWithPid(100),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.stopOpenCodePoller(); // hermetic: drive ticks manually below
        try {
          const client = makeClient();
          t.clients.add(client);
          await term.pollOpenCodeState('linux', FAKE_RUN); // false → true
          const eventsBefore = client.writes.length;
          await term.pollOpenCodeState('linux', FAKE_RUN); // still true → no event
          assert.strictEqual(t.openCodeRunning, true);
          assert.strictEqual(client.writes.length, eventsBefore);
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('keeps the last state when the snapshot query fails', async () => {
    await withFakePtyFactory(
      () => makeFakePtyWithPid(100),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.stopOpenCodePoller(); // hermetic: drive ticks manually below
        try {
          const client = makeClient();
          t.clients.add(client);
          await term.pollOpenCodeState('linux', FAKE_RUN); // → true
          const eventsBefore = client.writes.length;
          await term.pollOpenCodeState('linux', FAIL_RUN); // probe fails
          assert.strictEqual(t.openCodeRunning, true, 'last known state must survive');
          assert.strictEqual(client.writes.length, eventsBefore, 'no event on failure');
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('recovers on the next tick after a failed snapshot', async () => {
    await withFakePtyFactory(
      () => makeFakePtyWithPid(100),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.stopOpenCodePoller(); // hermetic: drive ticks manually below
        try {
          const client = makeClient();
          t.clients.add(client);
          await term.pollOpenCodeState('linux', FAIL_RUN); // fails
          assert.strictEqual(t.openCodeRunning, false);
          await term.pollOpenCodeState('linux', FAKE_RUN); // next tick succeeds
          assert.strictEqual(t.openCodeRunning, true);
          assert.ok(
            client.writes.some((w) => w.includes('"type":"opencode"') && w.includes('true')),
            'expected an opencode=true event after recovery',
          );
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('skips terminals without attached clients', async () => {
    await withFakePtyFactory(
      () => makeFakePtyWithPid(100),
      async () => {
        const withClient = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        const noClient = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.stopOpenCodePoller(); // hermetic: drive ticks manually below
        try {
          withClient.clients.add(makeClient());
          await term.pollOpenCodeState('linux', FAKE_RUN);
          assert.strictEqual(withClient.openCodeRunning, true);
          assert.strictEqual(noClient.openCodeRunning, false);
        } finally {
          term.killTerminal(withClient.id);
          term.killTerminal(noClient.id);
        }
      },
    );
  });

  it('does not query the process tree when no terminal has clients', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.stopOpenCodePoller(); // hermetic: drive ticks manually below
        try {
          let queried = false;
          const run = (...args) => {
            queried = true;
            args[args.length - 1](null, '');
          };
          await term.pollOpenCodeState('linux', run);
          assert.strictEqual(queried, false, 'no query when there is nothing to update');
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('serializes overlapping polls (one query at a time)', async () => {
    await withFakePtyFactory(
      () => makeFakePtyWithPid(100),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.stopOpenCodePoller(); // hermetic: drive ticks manually below
        try {
          t.clients.add(makeClient());
          let inflight = 0;
          let maxInflight = 0;
          const slowRun = (_file, _args, _opts, cb) => {
            inflight += 1;
            maxInflight = Math.max(maxInflight, inflight);
            setTimeout(() => {
              inflight -= 1;
              cb(null, POSIX_OUTPUT);
            }, 50);
          };
          const first = term.pollOpenCodeState('linux', slowRun);
          await term.pollOpenCodeState('linux', slowRun); // in flight → skipped
          await first;
          assert.strictEqual(maxInflight, 1, 'queries must never overlap');
          assert.strictEqual(t.openCodeRunning, true);
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('start/stop poller is idempotent and stops with the last session', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.killTerminal(t.id);
        // All of these must be safe no-ops after the map emptied.
        term.stopOpenCodePoller();
        term.startOpenCodePoller();
        term.stopOpenCodePoller();
      },
    );
  });
});

describe('terminal session lifecycle', () => {
  it('respawns a fresh shell in place when the shell exits', { skip: !HAS_PTY }, async () => {
    const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
    const client = makeClient();
    t.clients.add(client);
    const firstPty = t.pty;

    try {
      // Wait for the shell to boot, then exit it on purpose.
      t.pty.write('echo __PTY_READY__\r');
      await waitFor(() => client.all.includes('__PTY_READY__'));
      t.pty.write('exit\r');

      await waitFor(() => firstPty !== t.pty, 10_000); // shell exited → respawned
      assert.strictEqual(t.exited, false);
      assert.ok(
        client.writes.some((w) => w.includes('"type":"restart"')),
        'expected a restart event for the new shell',
      );

      // The respawned shell must actually work.
      t.pty.write('echo __PTY_READY_2__\r');
      await waitFor(() => client.all.includes('__PTY_READY_2__'));
    } finally {
      term.killTerminal(t.id);
    }
  });

  it('does not respawn after an explicit kill', { skip: !HAS_PTY }, async () => {
    const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
    const firstPty = t.pty;

    term.killTerminal(t.id);
    await waitFor(() => t.exited === true, 5000);
    assert.strictEqual(t.exited, true);
    assert.strictEqual(t.pty, firstPty);
  });

  it('ends the session once the respawn rate limit is hit', { skip: !HAS_PTY }, async () => {
    const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
    const client = makeClient();
    t.clients.add(client);
    // Seed the limit (RESPAWN_LIMIT = 5) with fresh timestamps, then exit the shell.
    t.restartTimes = [Date.now(), Date.now(), Date.now(), Date.now(), Date.now()];

    try {
      t.pty.write('echo __PTY_READY__\r');
      await waitFor(() => client.all.includes('__PTY_READY__'));
      t.pty.write('exit\r');

      await waitFor(() => t.exited === true, 10_000);
      assert.ok(
        client.writes.some((w) => w.includes('"type":"exit"')),
        'expected a final exit event',
      );
      assert.ok(
        client.writes.some((w) => w.includes('"type":"exit","data":')),
        'exit event must carry the code in `data` (client reads ev.data)',
      );
      assert.ok(
        !client.writes.some((w) => w.includes('"type":"restart"')),
        'no restart after the rate limit was hit',
      );
    } finally {
      term.killTerminal(t.id);
    }
  });

  it('ends the session when respawning the shell fails', async () => {
    let spawnCalls = 0;
    await withFakePtyFactory(
      () => {
        spawnCalls += 1;
        if (spawnCalls > 1) throw new Error('spawn failed');
        return makeFakePty();
      },
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        const client = makeClient();
        t.clients.add(client);

        t.pty.emit('exit', { exitCode: 1 });
        assert.strictEqual(t.exited, true);
        assert.ok(
          client.writes.some((w) => w.includes('"type":"exit"')),
          'expected a final exit event after the failed respawn',
        );
        assert.strictEqual(spawnCalls, 2);
      },
    );
  });

  it('respawn broadcasts opencode=false when the TUI was running', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        try {
          const client = makeClient();
          t.clients.add(client);
          t.openCodeRunning = true; // simulate a detected TUI
          const firstPty = t.pty;
          t.pty.emit('exit', { exitCode: 0 }); // rate limit not hit → respawn
          assert.notStrictEqual(t.pty, firstPty, 'shell should respawn');
          assert.strictEqual(t.openCodeRunning, false);
          assert.ok(
            client.writes.some((w) => w.includes('"type":"opencode"') && w.includes('false')),
            'expected an opencode=false event on respawn',
          );
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });
});

describe('terminal input, resize, kill', () => {
  it('writeInput forwards data to the pty', async () => {
    const pty = makeFakePty();
    const written = [];
    pty.write = (d) => written.push(d);
    await withFakePtyFactory(
      () => pty,
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        try {
          assert.strictEqual(term.writeInput(t.id, 'hi\r'), true);
          assert.deepStrictEqual(written, ['hi\r']);
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('writeInput returns false for unknown and exited terminals', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        assert.strictEqual(term.writeInput('nope', 'x'), false);
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.killTerminal(t.id);
        assert.strictEqual(term.writeInput(t.id, 'x'), false);
      },
    );
  });

  it('writeInput swallows pty write errors', async () => {
    const pty = makeFakePty();
    pty.write = () => {
      throw new Error('pty gone');
    };
    await withFakePtyFactory(
      () => pty,
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        try {
          assert.strictEqual(term.writeInput(t.id, 'x'), false);
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('resizeTerminal resizes only on change and clamps to bounds', async () => {
    const pty = makeFakePty();
    const resized = [];
    pty.resize = (c, r) => resized.push([c, r]);
    await withFakePtyFactory(
      () => pty,
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        try {
          assert.strictEqual(term.resizeTerminal(t.id, 120, 40), true);
          assert.deepStrictEqual(resized, [[120, 40]]);
          assert.strictEqual(t.cols, 120);
          assert.strictEqual(t.rows, 40);
          term.resizeTerminal(t.id, 120, 40); // unchanged → no resize call
          assert.deepStrictEqual(resized, [[120, 40]]);
          term.resizeTerminal(t.id, 100000, 1); // clamped to MAX_COLS / MIN_ROWS
          assert.deepStrictEqual(resized, [
            [120, 40],
            [500, 2],
          ]);
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('resizeTerminal returns false for unknown terminals', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        assert.strictEqual(term.resizeTerminal('nope', 80, 24), false);
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        term.killTerminal(t.id);
        assert.strictEqual(term.resizeTerminal(t.id, 90, 30), false);
      },
    );
  });

  it('killTerminal tears down the session and reports unknown ids', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        assert.strictEqual(term.killTerminal('nope'), false);
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        assert.strictEqual(term.killTerminal(t.id), true);
        assert.strictEqual(t.exited, true);
        assert.strictEqual(term.killTerminal(t.id), false); // already gone
      },
    );
  });
});

describe('idle session reclamation', () => {
  it('tears down a session that stays idle past the TTL', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN, idleTtlMs: 20 });
        const client = makeClient();
        assert.strictEqual(
          term.attachStream(t.id, client, () => {}),
          true,
        );
        client.emit('close'); // last viewer left → idle timer starts
        await waitFor(() => t.exited === true, 2000);
      },
    );
  });

  it('cancels idle teardown when a viewer re-attaches', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN, idleTtlMs: 40 });
        const client = makeClient();
        term.attachStream(t.id, client, () => {});
        client.emit('close'); // schedules idle teardown
        const second = makeClient();
        assert.strictEqual(
          term.attachStream(t.id, second, () => {}),
          true,
        ); // cancels it
        await sleep(100); // well past the TTL
        assert.strictEqual(t.exited, false);
        second.emit('close');
        await waitFor(() => t.exited === true, 2000);
      },
    );
  });

  it('attaching a client clears a pending idle timer', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN, idleTtlMs: 30 });
        term.scheduleIdleTeardown(t); // simulate a detached session with a pending timer
        const client = makeClient();
        assert.strictEqual(
          term.attachStream(t.id, client, () => {}),
          true,
        );
        await sleep(80); // the pending timer must have been cleared
        assert.strictEqual(t.exited, false);
        term.killTerminal(t.id);
      },
    );
  });
});

describe('opencode launch quoting and resolution', () => {
  it('quotes Windows paths for PowerShell, doubling embedded quotes', () => {
    assert.strictEqual(
      term.quoteForShell('C:\\a b\\opencode2.exe', 'win32'),
      "& 'C:\\a b\\opencode2.exe'",
    );
    assert.strictEqual(
      term.quoteForShell("C:\\it's\\opencode2.exe", 'win32'),
      "& 'C:\\it''s\\opencode2.exe'",
    );
  });

  it('single-quotes POSIX paths, escaping embedded quotes', () => {
    assert.strictEqual(
      term.quoteForShell('/opt/my tool/opencode2', 'linux'),
      "'/opt/my tool/opencode2'",
    );
    assert.strictEqual(
      term.quoteForShell("/opt/it's/opencode2", 'linux'),
      "'/opt/it'\\''s/opencode2'",
    );
  });

  it('returns the bare PATH name without quoting', () => {
    assert.strictEqual(term.quoteForShell('opencode2', 'win32'), 'opencode2');
    assert.strictEqual(term.quoteForShell('opencode2', 'linux'), 'opencode2');
  });

  it('resolveOpenCodeBin honors an existing OPENCODE_BIN', () => {
    const env = { OPENCODE_BIN: process.execPath }; // a file that definitely exists
    assert.strictEqual(term.resolveOpenCodeBin('win32', env), process.execPath);
  });

  it('resolveOpenCodeBin falls back to the PATH name when candidates are missing', () => {
    const env = {
      APPDATA: 'C:\\__no_such_dir__\\AppData\\Roaming',
      LOCALAPPDATA: 'C:\\__no_such_dir__\\AppData\\Local',
    };
    assert.strictEqual(term.resolveOpenCodeBin('win32', env), 'opencode2');
  });

  it('openCodeLaunchCommand returns a non-empty command string', () => {
    const cmd = term.openCodeLaunchCommand();
    assert.strictEqual(typeof cmd, 'string');
    assert.ok(cmd.length > 0);
  });
});

describe('terminal replay buffer', () => {
  it('accumulates pty output for late reattachment', () => {
    const t = { buffer: '' };
    term.appendBuffer(t, 'hello\r\n');
    term.appendBuffer(t, 'world\r\n');
    assert.strictEqual(t.buffer, 'hello\r\nworld\r\n');
  });

  it('caps the buffer at BUFFER_MAX and trims on a line boundary', () => {
    const line = 'a'.repeat(100);
    const big = Array.from({ length: (term.BUFFER_MAX / 100) * 3 }, () => line).join('\n');
    const t = { buffer: '' };
    term.appendBuffer(t, big);
    assert.ok(t.buffer.length <= term.BUFFER_MAX, `buffer ${t.buffer.length} > max`);
    assert.ok(t.buffer.length > 0, 'buffer should keep the newest lines');
    // Trim cuts after a newline, so the head is a full line, not a partial slice.
    assert.strictEqual(t.buffer.slice(0, line.length), line);
  });

  it('prefers an ESC boundary so a trim cannot split an ANSI sequence', () => {
    const t = { buffer: '' };
    const plain = 'a'.repeat(term.BUFFER_MAX - 10); // just under the cap
    term.appendBuffer(t, plain);
    // Pushing past the cap with the excess landing inside an escape sequence.
    term.appendBuffer(t, 'b'.repeat(5) + '\x1b[31m' + 'c'.repeat(20));
    assert.strictEqual(t.buffer, '\x1b[31m' + 'c'.repeat(20));
  });

  it('keeps appending after a trim', () => {
    const line = 'b'.repeat(100);
    const big = Array.from({ length: (term.BUFFER_MAX / 100) * 3 }, () => line).join('\n');
    const t = { buffer: '' };
    term.appendBuffer(t, big);
    term.appendBuffer(t, 'tail\r\n');
    assert.ok(t.buffer.endsWith('tail\r\n'));
  });

  it('replays the buffer only to a newly attached client', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        try {
          const first = makeClient();
          t.clients.add(first);
          t.pty.emit('data', 'line one\r\nline two\r\n');

          const second = makeClient();
          assert.strictEqual(
            term.attachStream(t.id, second, () => {}),
            true,
          );
          assert.ok(second.all.includes('"type":"replay"'), 'new client should get a replay event');
          assert.ok(second.all.includes('line one'), 'replay should include buffered output');
          assert.ok(
            !first.all.includes('"type":"replay"'),
            'pre-attached client should not get a replay event',
          );
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('sends no replay event when the buffer is empty', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        try {
          const client = makeClient();
          assert.strictEqual(
            term.attachStream(t.id, client, () => {}),
            true,
          );
          assert.strictEqual(client.all, '');
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('clears the buffer when the shell respawns', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        try {
          const client = makeClient();
          t.clients.add(client);
          t.pty.emit('data', 'old output\r\n');
          assert.ok(t.buffer.includes('old output'));

          const firstPty = t.pty;
          t.pty.emit('exit', { exitCode: 0 }); // rate limit not hit → respawn in place
          assert.notStrictEqual(t.pty, firstPty, 'shell should respawn');
          assert.strictEqual(t.buffer, '', 'replay buffer should reset for the new shell');
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });

  it('keeps the newest tail when a single unbroken run exceeds the cap', () => {
    const t = { buffer: '' };
    term.appendBuffer(t, 'old history\r\n');
    const blob = 'x'.repeat(term.BUFFER_MAX * 2); // no newlines anywhere
    term.appendBuffer(t, blob);
    assert.strictEqual(t.buffer.length, term.BUFFER_MAX, 'hard cut should hold the cap');
    assert.ok(t.buffer.endsWith(blob.slice(-1)), 'newest output survives');
    assert.strictEqual(t.buffer, blob.slice(-term.BUFFER_MAX), 'keeps the newest bytes only');
  });

  it('converges to a stable size under repeated trims', () => {
    const t = { buffer: '' };
    const chunk = Array.from({ length: 1000 }, (_, i) => 'x'.repeat(200) + ` line ${i}\r\n`).join(
      '',
    );
    assert.ok(chunk.length > term.BUFFER_MAX / 4, 'chunk must be big enough to trim');
    for (let i = 0; i < 5; i++) term.appendBuffer(t, chunk);
    assert.ok(t.buffer.length <= term.BUFFER_MAX, 'buffer must stay at or under the cap');
    assert.ok(t.buffer.endsWith(' line 999\r\n'), 'newest output must survive the trims');
  });

  it('rejects attach for unknown or exited sessions', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        try {
          assert.strictEqual(
            term.attachStream('nope', makeClient(), () => {}),
            false,
          );
          term.killTerminal(t.id);
          assert.strictEqual(
            term.attachStream(t.id, makeClient(), () => {}),
            false,
          );
        } finally {
          term.killTerminal(t.id); // idempotent
        }
      },
    );
  });

  it('delivers the replay frame before any data emitted after attach', async () => {
    await withFakePtyFactory(
      () => makeFakePty(),
      async () => {
        const t = term.startTerminal(process.cwd(), 80, 24, { run: NOOP_RUN });
        try {
          const first = makeClient();
          t.clients.add(first);
          t.pty.emit('data', 'before attach\r\n');

          const client = makeClient();
          term.attachStream(t.id, client, () => {});
          t.pty.emit('data', 'after attach\r\n');

          const replayAt = client.all.indexOf('"type":"replay"');
          const dataAt = client.all.indexOf('after attach');
          assert.ok(replayAt >= 0 && dataAt > replayAt, 'replay must precede live data');
        } finally {
          term.killTerminal(t.id);
        }
      },
    );
  });
});
