import { TILE, COLS, ROWS } from './constants.js';
import { generate, getSpawn, map, T, getRooms } from './dungeon.js';
import { createPlayer, updatePlayer, renderPlayer, startRoll, isRolling } from './player.js';
import { createCamera } from './camera.js';
import { render } from './renderer.js';
import { clearFrame, init as initInput, wasPressed } from './input.js';
import { createInventory, addToBackpack, equipItem, unequipItem, SLOT_ORDER } from './inventory.js';
import { generateItem, calcStats, itemDisplayName } from './loot.js';
import { createPanel, togglePanel, renderPanel } from './ui/panel.js';
import { spawnEnemies, updateEnemies, attackPlayer, hitEnemy, findClosestEnemy } from './enemy.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let errorMessage = '';

const ATTACK_RANGE = 1.5;
const ATTACK_COOLDOWN = 0.35;
let playerAttackTimer = 0;

// Mouse tracking
let mouseScreenX = -1,
  mouseScreenY = -1;
let mouseWorldTileX = -1,
  mouseWorldTileY = -1;
let mouseInWorld = false;

function resize() {
  const maxW = window.innerWidth - 40;
  const maxH = window.innerHeight - 40;
  const aspect = COLS / ROWS;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  canvas.width = Math.floor(w);
  canvas.height = Math.floor(h);
}

window.addEventListener('resize', resize);
resize();

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseScreenX = e.clientX - rect.left;
  mouseScreenY = e.clientY - rect.top;
});
canvas.addEventListener('mouseleave', () => {
  mouseScreenX = -1;
  mouseScreenY = -1;
});

const cam = createCamera(canvas);
const inv = createInventory();
const panel = createPanel();

initInput();

let player, enemies, stats;
let last, flashText, flashTimer;
let damageNumbers = [];
let dead = false;
let frames = 0;

function startDungeon() {
  try {
    generate();
    const rooms = getRooms();
    const spawn = getSpawn();
    const spawnRoom = rooms[0];

    player = createPlayer(spawn.x, spawn.y);
    enemies = spawnEnemies(rooms, player.depth, spawnRoom);
    flashText = '';
    flashTimer = 0;
    damageNumbers = [];
    dead = false;
    recalcStats();
    errorMessage = '';
  } catch (err) {
    console.error(`startDungeon:`, err);
    errorMessage = `startDungeon: ${err.message}`;
  }
}

function recalcStats() {
  const equipped = ['weapon', 'armor', 'accessory'].map((s) => inv.equipped[s]);
  stats = calcStats(player, equipped);
}

function flashMessage(text) {
  flashText = text;
  flashTimer = 2.0;
}

function addDamageNumber(text, tileX, tileY, color) {
  damageNumbers.push({
    text,
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    vy: -40,
    life: 1.0,
    color: color || '#fff',
  });
}

function tryPickup() {
  if (dead || !player || !map) return;
  const tx = player.tx,
    ty = player.ty;
  if (map[ty]?.[tx] !== T.STAIRS) return;
  const item = generateItem(player.depth);
  flashMessage(addToBackpack(inv, item) ? `Picked up ${itemDisplayName(item)}` : 'Inventory full!');
  recalcStats();
}

let attackTarget = null;

function tryAttackAt(tx, ty) {
  if (dead || !player || !enemies) return;

  const result = hitEnemy(enemies, tx, ty, stats.atk);
  if (!result) return;

  addDamageNumber(`-${result.damage}`, tx, ty, '#ff5252');

  if (result.killed) {
    const name = result.drop.name || 'Enemy';
    let msg = `Killed ${name}! +${result.xp} XP`;
    if (addToBackpack(inv, result.drop)) {
      msg += ` | ${itemDisplayName(result.drop)}`;
    }
    flashMessage(msg);
    recalcStats();
  }
}

function findAutoTarget() {
  if (!player || !enemies || mouseScreenX < 0) return null;

  const worldX = (mouseScreenX - cam.cam.x) / TILE;
  const worldY = (mouseScreenY - cam.cam.y) / TILE;
  mouseWorldTileX = Math.floor(worldX);
  mouseWorldTileY = Math.floor(worldY);
  mouseInWorld = true;

  // Center of player tile (add 0.5 for center-of-tile comparison)
  const playerCX = player.tx + 0.5;
  const playerCY = player.ty + 0.5;

  return findClosestEnemy(enemies, playerCX, playerCY, ATTACK_RANGE);
}

function performAutoAttack(target) {
  if (!target) return;

  const result = hitEnemy(enemies, target.tx, target.ty, stats.atk);
  if (!result) return;

  addDamageNumber(`-${result.damage}`, target.tx, target.ty, '#ff5252');

  if (result.killed) {
    const name = result.drop.name || 'Enemy';
    let msg = `Killed ${name}! +${result.xp} XP`;
    if (addToBackpack(inv, result.drop)) {
      msg += ` | ${itemDisplayName(result.drop)}`;
    }
    flashMessage(msg);
    recalcStats();
  }
}

function gameLoop(now) {
  try {
    frames++;

    if (!player || !enemies || !stats) {
      requestAnimationFrame(gameLoop);
      return;
    }

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (wasPressed('i')) togglePanel(panel);
    if (wasPressed('r') && dead) startDungeon();

    if (panel.visible) {
      const maxSel =
        panel.tab === 'backpack' ? Math.max(0, inv.backpack.length - 1) : SLOT_ORDER.length - 1;
      const step = panel.tab === 'backpack' ? 4 : 1;
      if (wasPressed('arrowup')) panel.sel = Math.max(0, panel.sel - step);
      if (wasPressed('arrowdown')) panel.sel = Math.min(maxSel, panel.sel + step);
      if (wasPressed('arrowleft')) panel.sel = Math.max(0, panel.sel - 1);
      if (wasPressed('arrowright')) panel.sel = Math.min(maxSel, panel.sel + 1);
      if (wasPressed('tab')) {
        panel.tab = panel.tab === 'backpack' ? 'equipment' : 'backpack';
        panel.sel = -1;
      }
      if (wasPressed('e') && panel.sel >= 0) {
        if (panel.tab === 'backpack') {
          if (equipItem(inv, panel.sel)) recalcStats();
        } else {
          const slot = SLOT_ORDER[panel.sel];
          if (slot && unequipItem(inv, slot)) recalcStats();
        }
        panel.sel = -1;
      }
    } else {
      if (wasPressed(' ')) startRoll(player);
      if (wasPressed('e')) tryPickup();
    }

    if (!panel.visible && !dead) {
      updatePlayer(player, dt);
      updateEnemies(enemies, player, dt);

      const rolling = isRolling(player);

      // Auto-attack — closest enemy to cursor within range (skip during roll)
      if (!rolling) {
        attackTarget = findAutoTarget();
        playerAttackTimer -= dt;
        if (playerAttackTimer <= 0 && attackTarget) {
          performAutoAttack(attackTarget);
          playerAttackTimer = ATTACK_COOLDOWN;
        }
      }

      // Enemies can't hit player during roll (i-frames)
      const attack = rolling ? null : attackPlayer(enemies, player, stats, dt);
      if (attack) {
        addDamageNumber(`-${attack.damage}`, player.tx, player.ty, '#ff1744');
        if (player.hp <= 0) {
          player.hp = 0;
          dead = true;
          flashMessage('You died! Press R to restart');
          flashTimer = 10;
        }
      }
    }

    cam.follow(player.px, player.py);
    clearFrame();

    render(ctx, player, enemies, cam.cam, damageNumbers);

    // Update player facing — toward attack target if active, else toward cursor
    const sx = player.px + cam.cam.x;
    const sy = player.py + cam.cam.y;
    if (attackTarget && attackTarget.alive) {
      const targetSX = attackTarget.tx * TILE + TILE / 2 + cam.cam.x;
      const targetSY = attackTarget.ty * TILE + TILE / 2 + cam.cam.y;
      player.cursorAngle = Math.atan2(targetSY - sy, targetSX - sx);
    } else if (mouseScreenX >= 0) {
      player.cursorAngle = Math.atan2(mouseScreenY - sy, mouseScreenX - sx);
    }
    renderPlayer(ctx, player, sx, sy);

    // Auto-attack visuals
    if (!panel.visible && !dead && !isRolling(player)) {
      const playerSX = player.px + cam.cam.x;
      const playerSY = player.py + cam.cam.y;

      // Range circle (subtle)
      ctx.beginPath();
      ctx.arc(playerSX, playerSY, ATTACK_RANGE * TILE, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mouse aim cursor (world tile highlight)
      if (mouseInWorld) {
        const cursorSX = mouseWorldTileX * TILE + cam.cam.x;
        const cursorSY = mouseWorldTileY * TILE + cam.cam.y;

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cursorSX, cursorSY, TILE, TILE);

        // Subtle crosshair
        const cx = cursorSX + TILE / 2;
        const cy = cursorSY + TILE / 2;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy);
        ctx.lineTo(cx + 6, cy);
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx, cy + 6);
        ctx.stroke();
      }

      // Target highlight
      if (attackTarget) {
        const targetSX = attackTarget.tx * TILE + cam.cam.x;
        const targetSY = attackTarget.ty * TILE + cam.cam.y;

        // Attack line from player to target
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(playerSX, playerSY);
        ctx.lineTo(targetSX + TILE / 2, targetSY + TILE / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target highlight ring
        ctx.beginPath();
        ctx.arc(targetSX + TILE / 2, targetSY + TILE / 2, TILE * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    for (const dn of damageNumbers) {
      dn.y += dn.vy * dt;
      dn.life -= dt;
      const alpha = Math.max(0, dn.life);
      ctx.fillStyle = dn.color;
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(dn.text, dn.x + cam.cam.x, dn.y + cam.cam.y);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    }
    damageNumbers = damageNumbers.filter((d) => d.life > 0);

    renderPanel(ctx, inv, panel, canvas.width, canvas.height);

    if (flashTimer > 0) {
      flashTimer -= dt;
      ctx.fillStyle = `rgba(200, 200, 208, ${Math.min(1, flashTimer)})`;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(flashText, canvas.width / 2, canvas.height / 2 - 60);
      ctx.textAlign = 'start';
    }

    if (errorMessage) {
      ctx.fillStyle = '#ff5252';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(errorMessage, canvas.width / 2, canvas.height - 20);
      ctx.textAlign = 'start';
    }

    const hud = document.getElementById('hud-hp');
    if (hud) {
      hud.textContent = `HP: ${player.hp}/${stats.maxHp}`;
      document.getElementById('hud-depth').textContent = `Depth: ${player.depth}`;
      document.getElementById('hud-level').textContent = `Lv${player.level}`;
      document.getElementById('hud-atk').textContent = `ATK: ${stats.atk}`;
      document.getElementById('hud-def').textContent = `DEF: ${stats.def}`;
    }
  } catch (err) {
    console.error(err);
    if (errorMessage !== err.message) {
      errorMessage = err.message;
    }
  }

  requestAnimationFrame(gameLoop);
}

export { inv, panel, player, stats, enemies };

startDungeon();
last = performance.now();
requestAnimationFrame(gameLoop);
