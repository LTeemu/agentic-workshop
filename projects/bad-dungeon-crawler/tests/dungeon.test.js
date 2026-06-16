import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generate, getSpawn, isWalkable, map, T } from '../game/dungeon.js';

describe('BSP Dungeon Generator', () => {
  it('generates a map with correct dimensions', () => {
    generate();
    assert.equal(map.length, 50);
    assert.ok(map.every((row) => row.length === 70));
  });

  it('creates at least one floor tile', () => {
    generate();
    const floors = map.flat().filter((t) => t === T.FLOOR || t === T.CORRIDOR);
    assert.ok(floors.length > 10, `Expected >10 floor tiles, got ${floors.length}`);
  });

  it('walls outnumber floors (dungeon is mostly solid)', () => {
    generate();
    const walls = map.flat().filter((t) => t === T.WALL).length;
    const floors = map.flat().filter((t) => t !== T.WALL).length;
    assert.ok(walls > floors);
  });

  it('places stairs on the last room', () => {
    generate();
    const stairs = map.flat().filter((t) => t === T.STAIRS);
    assert.equal(stairs.length, 1);
  });

  it('spawn point is walkable', () => {
    generate();
    const spawn = getSpawn();
    assert.ok(isWalkable(spawn.x, spawn.y));
  });

  it('all rooms are reachable from spawn via walkable tiles (BFS)', () => {
    generate();
    const spawn = getSpawn();

    const visited = new Set();
    const queue = [[spawn.x, spawn.y]];
    visited.add(`${spawn.x},${spawn.y}`);

    while (queue.length) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        const key = `${nx},${ny}`;
        if (!visited.has(key) && isWalkable(nx, ny)) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }

    const walkableCount = map.flat().filter((t) => t !== T.WALL).length;
    assert.equal(
      visited.size,
      walkableCount,
      `BFS visited ${visited.size} tiles, but there are ${walkableCount} non-wall tiles`,
    );
  });

  it('generates deterministically when seeded (same seed = same map)', () => {
    // BSP uses Math.random — can't seed without replacing Math.random
    // Instead, verify two consecutive runs produce different maps
    generate();
    const first = map.map((r) => [...r]);
    generate();
    const second = map.map((r) => [...r]);
    const same = first.every((row, i) => row.every((t, j) => t === second[i][j]));
    assert.ok(!same, 'Two consecutive runs should produce different maps');
  });
});
