import { TILE, COLS, ROWS, T, COLORS } from './constants.js';
import { map } from './dungeon.js';

export function render(ctx, p, enemies, cam, damageNumbers) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, w, h);

  const playerTileX = Math.floor(p.px / TILE);
  const playerTileY = Math.floor(p.py / TILE);
  const halfW = Math.ceil(w / 2 / TILE) + 1;
  const halfH = Math.ceil(h / 2 / TILE) + 1;

  const startX = Math.max(0, playerTileX - halfW);
  const endX = Math.min(COLS - 1, playerTileX + halfW);
  const startY = Math.max(0, playerTileY - halfH);
  const endY = Math.min(ROWS - 1, playerTileY + halfH);

  for (let r = startY; r <= endY; r++) {
    for (let c = startX; c <= endX; c++) {
      const tile = map[r][c];
      const sx = c * TILE + cam.x;
      const sy = r * TILE + cam.y;

      if (sx + TILE < 0 || sx > w || sy + TILE < 0 || sy > h) continue;

      drawTile(ctx, tile, sx, sy, r, c);
    }
  }

  // Stairs glow aura (drawn behind entities)
  for (let r = startY; r <= endY; r++) {
    for (let c = startX; c <= endX; c++) {
      if (map[r][c] !== T.STAIRS) continue;
      const sx = c * TILE + TILE / 2 + cam.x;
      const sy = r * TILE + TILE / 2 + cam.y;
      drawStairsGlow(ctx, sx, sy);
    }
  }

  for (const e of enemies) {
    if (!e.alive) continue;
    renderEnemy(ctx, e, cam);
  }

  drawVignette(ctx, w, h);
}

function drawTile(ctx, tile, sx, sy, row, col) {
  switch (tile) {
    case T.WALL:
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(sx, sy, TILE, TILE);
      // Inner highlight (top-left edge) for 3D depth
      ctx.fillStyle = COLORS.wallLight;
      ctx.fillRect(sx, sy, TILE, 1);
      ctx.fillRect(sx, sy, 1, TILE);
      // Inner shadow (bottom-right edge)
      ctx.fillStyle = COLORS.wallShadow;
      ctx.fillRect(sx, sy + TILE - 1, TILE, 1);
      ctx.fillRect(sx + TILE - 1, sy, 1, TILE);
      break;

    case T.FLOOR:
      ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, TILE, TILE);
      break;

    case T.CORRIDOR:
      ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.corridor : COLORS.corridorAlt;
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, TILE, TILE);
      break;

    case T.STAIRS:
      ctx.fillStyle = COLORS.floor;
      ctx.fillRect(sx, sy, TILE, TILE);
      // Stairs glyph — concentric descending rectangles
      ctx.strokeStyle = COLORS.stairs;
      ctx.lineWidth = 1;
      for (let s = 0; s < 4; s++) {
        const pad = 3 + s * 3;
        ctx.strokeRect(sx + pad, sy + pad, TILE - pad * 2, TILE - pad * 2);
      }
      break;
  }
}

function drawStairsGlow(ctx, sx, sy) {
  const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, TILE * 1.5);
  gradient.addColorStop(0, COLORS.stairsGlow);
  gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(sx - TILE * 1.5, sy - TILE * 1.5, TILE * 3, TILE * 3);
}

function drawVignette(ctx, w, h) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
  gradient.addColorStop(0, 'rgba(5, 5, 8, 0)');
  gradient.addColorStop(0.6, 'rgba(5, 5, 8, 0.05)');
  gradient.addColorStop(1, COLORS.vignette);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function renderEnemy(ctx, e, cam) {
  const sx = e.tx * TILE + TILE / 2 + cam.x;
  const sy = e.ty * TILE + TILE / 2 + cam.y;
  const r = TILE * e.size;

  const hpPct = e.hp / e.maxHp;
  const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';

  // Shape by enemy type, rotated to face movement direction
  const angle = e.facing + Math.PI / 2;
  switch (e.name) {
    case 'Rat':
      drawRat(ctx, sx, sy, r, e.color);
      break;
    case 'Skeleton':
      drawSkeleton(ctx, sx, sy, r, e.color, angle);
      break;
    case 'Wraith':
      drawWraith(ctx, sx, sy, r, e.color, angle);
      break;
    case 'Golem':
      drawGolem(ctx, sx, sy, r, e.color);
      break;
    default:
      drawBoss(ctx, sx, sy, r, e.color);
      break;
  }

  // Health bar
  if (hpPct < 1) {
    const barW = TILE * 0.8;
    const barH = 2;
    const barX = sx - barW / 2;
    const barY = sy - r - 5;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * hpPct, barH);
  }

  // Aggro ring (visible when chasing)
  if (e.state === 'chase') {
    ctx.beginPath();
    ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function fillShape(ctx, color) {
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawRat(ctx, sx, sy, r, color) {
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  fillShape(ctx, color);
}

function drawSkeleton(ctx, sx, sy, r, color, angle) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(-r * 0.8, r * 0.7);
  ctx.lineTo(r * 0.8, r * 0.7);
  ctx.closePath();
  fillShape(ctx, color);
  ctx.restore();
}

function drawWraith(ctx, sx, sy, r, color, angle) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.7, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.7, 0);
  ctx.closePath();
  fillShape(ctx, color);
  ctx.restore();
}

function drawGolem(ctx, sx, sy, r, color) {
  const half = r * 0.8;
  ctx.beginPath();
  ctx.rect(sx - half, sy - half, half * 2, half * 2);
  ctx.closePath();
  fillShape(ctx, color);
}

function drawBoss(ctx, sx, sy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.5;
    const px = sx + Math.cos(angle) * radius;
    const py = sy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  fillShape(ctx, color);
}
