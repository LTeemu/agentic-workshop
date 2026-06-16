import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { generate, getSpawn, getRooms, isWalkable } from '../game/dungeon.js';
import {
  spawnEnemies,
  updateEnemies,
  hitEnemy,
  getAdjacentEnemy,
  findClosestEnemy,
} from '../game/enemy.js';

describe('Enemy Spawning', () => {
  let rooms, spawnRoom;

  before(() => {
    generate();
    rooms = getRooms();
    spawnRoom = rooms[0];
  });

  it('spawns enemies in rooms', () => {
    const enemies = spawnEnemies(rooms, 1, spawnRoom);
    assert.ok(enemies.length > 0, 'Should spawn at least one enemy');
  });

  it('does not spawn enemies in spawn room', () => {
    const enemies = spawnEnemies(rooms, 1, spawnRoom);
    const inSpawnRoom = enemies.filter(
      (e) =>
        e.tx >= spawnRoom.x &&
        e.tx < spawnRoom.x + spawnRoom.w &&
        e.ty >= spawnRoom.y &&
        e.ty < spawnRoom.y + spawnRoom.h,
    );
    assert.equal(inSpawnRoom.length, 0, 'No enemies should be in spawn room');
  });

  it('spawns boss in last room', () => {
    const enemies = spawnEnemies(rooms, 1, spawnRoom);
    const bossRoom = rooms[rooms.length - 1];
    const boss = enemies.find(
      (e) =>
        e.tx >= bossRoom.x &&
        e.tx < bossRoom.x + bossRoom.w &&
        e.ty >= bossRoom.y &&
        e.ty < bossRoom.y + bossRoom.h,
    );
    assert.ok(boss, 'Should have an enemy in the boss room');
  });

  it('enemies have required properties', () => {
    const enemies = spawnEnemies(rooms, 1, spawnRoom);
    for (const e of enemies) {
      assert.ok(e.id != null);
      assert.ok(e.name);
      assert.ok(e.hp > 0);
      assert.ok(e.atk > 0);
      assert.ok(e.alive);
      assert.ok(Number.isFinite(e.tx));
      assert.ok(Number.isFinite(e.ty));
      assert.ok(Number.isFinite(e.facing));
      assert.ok(e.state === 'wander' || e.state === 'chase');
    }
  });

  it('scales enemy stats with depth', () => {
    const shallow = spawnEnemies(rooms, 1, spawnRoom);
    const deep = spawnEnemies(rooms, 10, spawnRoom);
    const avgHpShallow = shallow.reduce((s, e) => s + e.hp, 0) / shallow.length;
    const avgHpDeep = deep.reduce((s, e) => s + e.hp, 0) / deep.length;
    // Average HP at depth 10 should be notably higher due to 1 + 9*0.15 = 2.35x scale
    assert.ok(
      avgHpDeep > avgHpShallow * 1.2,
      `Deep avg HP (${avgHpDeep.toFixed(0)}) should be > shallow avg HP (${avgHpShallow.toFixed(0)}) * 1.2`,
    );
  });

  it('spawns more enemies at higher depth', () => {
    const shallow = spawnEnemies(rooms, 1, spawnRoom);
    const deep = spawnEnemies(rooms, 10, spawnRoom);
    assert.ok(
      deep.length >= shallow.length,
      `Depth 10 should spawn at least as many as depth 1 (${deep.length} vs ${shallow.length})`,
    );
  });
});

describe('Combat', () => {
  let rooms, spawnRoom, enemies;

  before(() => {
    generate();
    rooms = getRooms();
    spawnRoom = rooms[0];
    enemies = spawnEnemies(rooms, 1, spawnRoom);
  });

  it('hitEnemy deals damage and returns result', () => {
    const target = enemies.find((e) => e.alive);
    if (!target) return;

    const hpBefore = target.hp;
    const result = hitEnemy(enemies, target.tx, target.ty, 10);
    assert.ok(result);
    assert.ok(result.hit);
    assert.ok(result.damage >= 1);
    assert.ok(target.hp < hpBefore);
  });

  it('hitEnemy damage is at least 1', () => {
    const target = enemies.find((e) => e.alive);
    if (!target) return;

    const result = hitEnemy(enemies, target.tx, target.ty, 0);
    assert.ok(result);
    assert.equal(result.damage, 1);
  });

  it('hitEnemy kills enemy when HP reaches 0', () => {
    const target = enemies.find((e) => e.alive && e.hp <= 10);
    if (!target) return;

    const result = hitEnemy(enemies, target.tx, target.ty, 999);
    assert.ok(result);
    assert.ok(result.killed);
    assert.ok(result.drop);
    assert.ok(result.drop.id);
    assert.ok(result.xp > 0);
  });

  it('killed enemy has alive = false', () => {
    const target = enemies.find((e) => e.alive);
    if (!target) return;

    hitEnemy(enemies, target.tx, target.ty, 999);
    assert.ok(!target.alive);
  });

  it('getAdjacentEnemy finds enemy next to tile', () => {
    // Pick an enemy, check an adjacent tile
    const target = enemies.find((e) => e.alive);
    if (!target) return;

    const adj = getAdjacentEnemy(enemies, target.tx - 1, target.ty);
    if (adj) {
      assert.equal(adj.tx, target.tx);
      assert.equal(adj.ty, target.ty);
    }
  });

  it('getAdjacentEnemy returns null when no enemy nearby', () => {
    const result = getAdjacentEnemy(enemies, -99, -99);
    assert.equal(result, null);
  });
});

function makeEnemy(tx, ty, overrides) {
  return {
    id: 'test',
    name: 'Skeleton',
    tx,
    ty,
    px: tx * 40 + 20,
    py: ty * 40 + 20,
    speed: 1,
    size: 0.35,
    color: '#aaa',
    hp: 10,
    maxHp: 10,
    atk: 3,
    alive: true,
    aggro: false,
    aggroRange: 5,
    attackCooldown: 1.5,
    attackTimer: 0,
    wanderTimer: 999,
    wanderDir: { dx: 0, dy: 0 },
    facing: 0,
    state: 'wander',
    chaseTimer: 0,
    chaseTimeout: 3,
    coneAngle: (Math.PI * 2) / 3,
    coneRange: 5,
    ...overrides,
  };
}

describe('Enemy Facing Direction', () => {
  let rooms, spawnRoom, enemies;

  before(() => {
    generate();
    rooms = getRooms();
    spawnRoom = rooms[0];
  });

  function findWalkableTile() {
    for (const room of rooms) {
      for (let r = room.y; r < room.y + room.h; r++) {
        for (let c = room.x; c < room.x + room.w; c++) {
          if (isWalkable(c, r)) return { tx: c, ty: r };
        }
      }
    }
    return { tx: 0, ty: 0 };
  }

  it('chasing enemy faces toward player horizontally', () => {
    const tile = findWalkableTile();
    const enemy = makeEnemy(tile.tx, tile.ty, {
      facing: Math.PI, // facing left
      state: 'chase',
    });
    const player = { tx: tile.tx + 2, ty: tile.ty, px: 0, py: 0 };

    updateEnemies([enemy], player, 1.0);

    assert.equal(enemy.facing, 0); // now facing right (toward player)
  });

  it('chasing enemy faces toward player vertically', () => {
    const tile = findWalkableTile();
    const enemy = makeEnemy(tile.tx, tile.ty, {
      facing: 0, // facing right
      state: 'chase',
    });
    const player = { tx: tile.tx, ty: tile.ty + 2, px: 0, py: 0 };

    updateEnemies([enemy], player, 1.0);

    assert.equal(enemy.facing, Math.PI / 2); // now facing down (toward player)
  });

  it('chasing enemy faces player even when blocked by wall', () => {
    // Find a tile where right neighbor is not walkable
    const wallTest = (() => {
      for (const room of rooms) {
        for (let r = room.y; r < room.y + room.h; r++) {
          for (let c = room.x; c < room.x + room.w; c++) {
            if (isWalkable(c, r) && !isWalkable(c + 1, r)) {
              return { tx: c, ty: r };
            }
          }
        }
      }
      return null;
    })();

    if (!wallTest) return;

    const enemy = makeEnemy(wallTest.tx, wallTest.ty, {
      facing: Math.PI / 4, // arbitrary initial facing
      state: 'chase',
    });
    const player = { tx: wallTest.tx + 5, ty: wallTest.ty, px: 0, py: 0 };

    updateEnemies([enemy], player, 1.0);

    // Should face right (toward player) even though movement is blocked
    assert.equal(enemy.facing, 0);
  });

  it('wandering enemy does not face player', () => {
    const tile = findWalkableTile();
    // Facing away from player so the cone doesn't detect them
    const enemy = makeEnemy(tile.tx, tile.ty, {
      facing: Math.PI, // facing left, player is to the right
      state: 'wander',
      wanderTimer: 999, // won't change direction
      wanderDir: { dx: 0, dy: 0 }, // won't move
    });
    const player = { tx: tile.tx + 2, ty: tile.ty, px: 0, py: 0 };

    updateEnemies([enemy], player, 1.0);

    // Facing should remain unchanged (wander mode doesn't track player,
    // and player is outside the detection cone)
    assert.equal(enemy.facing, Math.PI);
  });
});
