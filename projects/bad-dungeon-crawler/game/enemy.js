import { TILE, T } from './constants.js';
import { map, isWalkable } from './dungeon.js';
import { generateItem } from './loot.js';

const ENEMY_TYPES = [
  {
    name: 'Rat',
    hp: [6, 10],
    atk: [2, 4],
    def: [0, 1],
    speed: 0.8,
    color: '#8d6e63',
    xp: 5,
    size: 0.3,
  },
  {
    name: 'Skeleton',
    hp: [12, 18],
    atk: [4, 7],
    def: [2, 3],
    speed: 0.5,
    color: '#d7ccc8',
    xp: 12,
    size: 0.4,
  },
  {
    name: 'Wraith',
    hp: [16, 24],
    atk: [6, 10],
    def: [3, 5],
    speed: 0.6,
    color: '#7c4dff',
    xp: 20,
    size: 0.45,
  },
  {
    name: 'Golem',
    hp: [25, 35],
    atk: [8, 12],
    def: [5, 8],
    speed: 0.3,
    color: '#607d8b',
    xp: 30,
    size: 0.5,
  },
];

const BOSS_TYPES = [
  {
    name: 'Shadow Lord',
    hp: [40, 60],
    atk: [10, 16],
    def: [6, 10],
    speed: 0.4,
    color: '#d50000',
    xp: 100,
    size: 0.6,
  },
];

import { rand } from './utils.js';

let idCounter = 0;

function roomCenter(r) {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function randomTileInRoom(r) {
  for (let tries = 0; tries < 20; tries++) {
    const x = r.x + rand(1, r.w - 2);
    const y = r.y + rand(1, r.h - 2);
    if (map[y]?.[x] === T.FLOOR) return { x, y };
  }
  return roomCenter(r);
}

function createEnemy(type, tileX, tileY, depth) {
  const scale = 1 + (depth - 1) * 0.15;

  return {
    id: idCounter++,
    name: type.name,
    type: type.name,
    tx: tileX,
    ty: tileY,
    px: tileX * TILE + TILE / 2,
    py: tileY * TILE + TILE / 2,
    hp: Math.round(rand(type.hp[0], type.hp[1]) * scale),
    maxHp: 0,
    atk: Math.round(rand(type.atk[0], type.atk[1]) * scale),
    def: Math.round(rand(type.def[0], type.def[1]) * scale),
    speed: type.speed,
    color: type.color,
    xp: Math.round(type.xp * scale),
    size: type.size,
    alive: true,
    attackCooldown: 1.5,
    attackTimer: 1.5 + Math.random() * 0.5,
    aggroRange: 5,
    aggro: false,
    wanderTimer: 0,
    wanderDir: { dx: 0, dy: 0 },
    facing: Math.random() * Math.PI * 2,
    state: 'wander',
    chaseTimer: 0,
    chaseTimeout: 3,
    coneAngle: (Math.PI * 2) / 3,
    coneRange: 5,
  };
}

export function spawnEnemies(rooms, depth, spawnRoom) {
  const enemies = [];
  const bossRoom = rooms[rooms.length - 1];

  for (const room of rooms) {
    if (room === spawnRoom) continue;

    const isBoss = room === bossRoom;
    const count = isBoss ? 1 : rand(1, Math.min(3, 1 + Math.floor(depth / 2)));

    for (let i = 0; i < count; i++) {
      const pos = isBoss ? roomCenter(room) : randomTileInRoom(room);

      const pool = isBoss ? BOSS_TYPES : ENEMY_TYPES;
      const template = pool[rand(0, pool.length - 1)];
      const enemy = createEnemy(template, pos.x, pos.y, depth);

      if (isBoss) {
        enemy.hp = Math.round(enemy.hp * 1.5);
        enemy.aggroRange = 8;
        enemy.coneAngle = Math.PI;
        enemy.coneRange = 8;
      }

      enemy.maxHp = enemy.hp;
      enemies.push(enemy);
    }
  }

  return enemies;
}

export function updateEnemies(enemies, player, dt) {
  for (const e of enemies) {
    if (!e.alive) continue;

    const manhattanDist = Math.abs(e.tx - player.tx) + Math.abs(e.ty - player.ty);
    const canSee = hasLineOfSight(e.tx, e.ty, player.tx, player.ty) && playerInCone(e, player);

    if (canSee) {
      e.chaseTimer = 0;
      e.state = 'chase';
    } else if (e.state === 'chase') {
      e.chaseTimer += dt;
      if (e.chaseTimer > e.chaseTimeout) {
        e.state = 'wander';
      }
    }

    e.aggro = e.state === 'chase';

    if (manhattanDist <= 1.5) {
      e.attackTimer -= dt;
      continue;
    }

    if (e.state === 'chase') {
      setFacingFromDir(e, Math.sign(player.tx - e.tx), Math.sign(player.ty - e.ty));
      moveToward(e, player.tx, player.ty, dt);
    } else {
      wander(e, dt);
    }
  }
}

function hasLineOfSight(x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0,
    y = y0;

  while (x !== x1 || y !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    // Check intermediate tiles for walls (skip start and end)
    if ((x !== x1 || y !== y1) && map[y]?.[x] === T.WALL) return false;
  }
  return true;
}

function playerInCone(e, player) {
  const dx = player.tx - e.tx;
  const dy = player.ty - e.ty;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > e.coneRange) return false;

  const angleToPlayer = Math.atan2(dy, dx);
  let angleDiff = angleToPlayer - e.facing;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  return Math.abs(angleDiff) <= e.coneAngle / 2;
}

function setFacingFromDir(e, dx, dy) {
  if (dx !== 0 || dy !== 0) {
    e.facing = Math.atan2(dy, dx);
  }
}

function moveToward(e, targetTx, targetTy, dt) {
  if (Number.isNaN(e.tx) || Number.isNaN(e.ty)) return;

  const dx = Math.sign(targetTx - e.tx);
  const dy = Math.sign(targetTy - e.ty);
  let moved = false;

  if (dx !== 0) {
    const nx = e.tx + dx;
    const ny = e.ty;
    if (isWalkable(nx, ny)) {
      e.px += dx * e.speed * TILE * dt;
      e.tx = Math.round(e.px / TILE);
      e.ty = Math.round(e.py / TILE);
      moved = true;
    }
  }

  if (dy !== 0) {
    const nx = e.tx;
    const ny = e.ty + dy;
    if (isWalkable(nx, ny)) {
      e.py += dy * e.speed * TILE * dt;
      e.tx = Math.round(e.px / TILE);
      e.ty = Math.round(e.py / TILE);
      moved = true;
    }
  }

  if (moved) setFacingFromDir(e, dx, dy);

  e.px = e.tx * TILE + TILE / 2;
  e.py = e.ty * TILE + TILE / 2;
}

function wander(e, dt) {
  if (Number.isNaN(e.tx) || Number.isNaN(e.ty)) return;

  e.wanderTimer -= dt;
  if (e.wanderTimer <= 0) {
    // Snap to tile center when picking new direction
    e.px = e.tx * TILE + TILE / 2;
    e.py = e.ty * TILE + TILE / 2;

    const dirs = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
      [0, 0],
    ];
    const dir = dirs[rand(0, dirs.length - 1)];
    e.wanderDir = { dx: dir[0], dy: dir[1] };
    e.wanderTimer = rand(1, 4);
  }

  if (e.wanderDir.dx === 0 && e.wanderDir.dy === 0) return;

  // Smooth pixel movement
  const speed = e.speed * TILE * dt;
  e.px += e.wanderDir.dx * speed;
  e.py += e.wanderDir.dy * speed;

  const newTx = Math.round(e.px / TILE);
  const newTy = Math.round(e.py / TILE);

  if (newTx !== e.tx || newTy !== e.ty) {
    if (isWalkable(newTx, newTy)) {
      e.tx = newTx;
      e.ty = newTy;
      setFacingFromDir(e, e.wanderDir.dx, e.wanderDir.dy);
    } else {
      // Blocked by wall — snap back and try a new direction next frame
      e.px = e.tx * TILE + TILE / 2;
      e.py = e.ty * TILE + TILE / 2;
      e.wanderTimer = 0;
    }
  }
}

export function attackPlayer(enemies, player, stats, dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.attackTimer -= dt;
    if (e.attackTimer > 0) continue;

    const dist = Math.abs(e.tx - player.tx) + Math.abs(e.ty - player.ty);
    if (dist <= 1.5) {
      e.attackTimer = e.attackCooldown;
      const dmg = Math.max(1, e.atk - Math.floor(stats.def * 0.5));
      player.hp -= dmg;
      return { attacker: e.name, damage: dmg };
    }
  }
  return null;
}

export function hitEnemy(enemies, tx, ty, atk) {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.tx === tx && e.ty === ty) {
      const dmg = Math.max(1, atk - e.def);
      e.hp -= dmg;
      if (e.hp <= 0) {
        e.alive = false;
        const drop = generateItem(1);
        return { hit: true, killed: true, damage: dmg, drop, xp: e.xp };
      }
      return { hit: true, killed: false, damage: dmg };
    }
  }
  return null;
}

export function getAdjacentEnemy(enemies, tx, ty) {
  for (const e of enemies) {
    if (!e.alive) continue;
    const dist = Math.abs(e.tx - tx) + Math.abs(e.ty - ty);
    if (dist === 1) return e;
  }
  return null;
}

export function findClosestEnemy(enemies, px, py, maxDist) {
  let closest = null;
  let closestDist = Infinity;

  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.tx + 0.5 - px;
    const dy = e.ty + 0.5 - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= maxDist && dist < closestDist) {
      closest = e;
      closestDist = dist;
    }
  }

  return closest;
}
