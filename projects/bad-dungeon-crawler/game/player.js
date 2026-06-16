import { TILE, COLORS } from './constants.js';
import { isDown } from './input.js';
import { isWalkable } from './dungeon.js';

const ROLL_DURATION = 0.3;
const ROLL_COOLDOWN = 0.6;
const ROLL_SPEED_MULT = 3;

export function createPlayer(tx, ty) {
  return {
    tx,
    ty,
    px: tx * TILE + TILE / 2,
    py: ty * TILE + TILE / 2,
    speed: 120,
    hp: 20,
    maxHp: 20,
    level: 1,
    depth: 1,
    rollTimer: 0,
    rollCooldownTimer: 0,
    rollDir: { dx: 0, dy: 0 },
    cursorAngle: -Math.PI / 2,
  };
}

export function startRoll(p) {
  if (p.rollCooldownTimer > 0) return false;

  let dx = 0,
    dy = 0;
  if (isDown('w') || isDown('arrowup')) dy = -1;
  if (isDown('s') || isDown('arrowdown')) dy = 1;
  if (isDown('a') || isDown('arrowleft')) dx = -1;
  if (isDown('d') || isDown('arrowright')) dx = 1;

  // If no movement key pressed, dodge downward by default
  if (dx === 0 && dy === 0) dy = 1;

  const len = Math.sqrt(dx * dx + dy * dy);
  p.rollDir.dx = dx / len;
  p.rollDir.dy = dy / len;
  p.rollTimer = ROLL_DURATION;
  p.rollCooldownTimer = ROLL_COOLDOWN;
  return true;
}

export function isRolling(p) {
  return p.rollTimer > 0;
}

export function updatePlayer(p, dt) {
  p.rollCooldownTimer = Math.max(0, p.rollCooldownTimer - dt);

  if (isRolling(p)) {
    // Dodge roll — move at boosted speed in roll direction
    const step = p.speed * ROLL_SPEED_MULT * dt;
    let nx = p.px + p.rollDir.dx * step;
    let ny = p.py + p.rollDir.dy * step;

    const tileX = Math.floor(nx / TILE);
    const tileY = Math.floor(ny / TILE);
    const cx = Math.floor(p.px / TILE);
    const cy = Math.floor(p.py / TILE);

    // Still respect walls during roll (can't roll through walls)
    if (isWalkable(tileX, cy)) p.px = nx;
    if (isWalkable(cx, tileY)) p.py = ny;
    if (isWalkable(tileX, tileY)) {
      p.px = nx;
      p.py = ny;
    }

    p.tx = Math.floor(p.px / TILE);
    p.ty = Math.floor(p.py / TILE);
    p.rollTimer -= dt;
    return;
  }

  // Normal movement
  let dx = 0,
    dy = 0;
  if (isDown('w') || isDown('arrowup')) dy = -1;
  if (isDown('s') || isDown('arrowdown')) dy = 1;
  if (isDown('a') || isDown('arrowleft')) dx = -1;
  if (isDown('d') || isDown('arrowright')) dx = 1;

  if (dx === 0 && dy === 0) return;

  const len = Math.sqrt(dx * dx + dy * dy);
  dx /= len;
  dy /= len;

  const step = p.speed * dt;

  let nx = p.px + dx * step;
  let ny = p.py + dy * step;

  const tileX = Math.floor(nx / TILE);
  const tileY = Math.floor(ny / TILE);
  const cx = Math.floor(p.px / TILE);
  const cy = Math.floor(p.py / TILE);

  if (isWalkable(tileX, cy)) p.px = nx;
  if (isWalkable(cx, tileY)) p.py = ny;
  if (isWalkable(tileX, tileY)) {
    p.px = nx;
    p.py = ny;
  }

  p.tx = Math.floor(p.px / TILE);
  p.ty = Math.floor(p.py / TILE);
}

export function renderPlayer(ctx, p, screenX, screenY) {
  const r = TILE * 0.35;
  const rolling = isRolling(p);
  const alpha = rolling ? 0.5 : 1;

  ctx.globalAlpha = 1;

  // Outer glow
  const glow = ctx.createRadialGradient(screenX, screenY, r * 0.5, screenX, screenY, r * 2.5);
  glow.addColorStop(0, COLORS.playerGlow);
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(screenX - r * 2.5, screenY - r * 2.5, r * 5, r * 5);

  // Roll trail (ghost images behind the player)
  if (rolling) {
    const trailAlpha = 0.2;
    const trailSteps = 3;
    for (let i = 1; i <= trailSteps; i++) {
      const t = i * 6;
      const tx = screenX - p.rollDir.dx * t;
      const ty = screenY - p.rollDir.dy * t;
      ctx.globalAlpha = trailAlpha / i;
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.player;
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
  }

  // Body (circle)
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.player;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Chest/core
  ctx.globalAlpha = Math.min(1, alpha * 1.5);
  ctx.beginPath();
  ctx.arc(screenX, screenY, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.playerCore;
  ctx.fill();

  ctx.globalAlpha = 1;

  // Sword faces cursor/target direction (set by main.js), with WASD fallback
  let angle = p.cursorAngle;
  if (angle === undefined || Number.isNaN(angle)) {
    if (isDown('w') || isDown('arrowup')) angle = -Math.PI / 2;
    else if (isDown('s') || isDown('arrowdown')) angle = Math.PI / 2;
    else if (isDown('a') || isDown('arrowleft')) angle = Math.PI;
    else if (isDown('d') || isDown('arrowright')) angle = 0;
    else angle = -Math.PI / 2;
  }

  const swordLen = r * 1.2;
  const sx = screenX + Math.cos(angle) * r * 0.5;
  const sy = screenY + Math.sin(angle) * r * 0.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + Math.cos(angle) * swordLen, sy + Math.sin(angle) * swordLen);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Sword tip glow
  const tipX = sx + Math.cos(angle) * swordLen;
  const tipY = sy + Math.sin(angle) * swordLen;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.fill();
}
