import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, COLORS, CAT } from '../config.js';
import { Player } from '../entities/Player.js';
import { PatrolEnemy } from '../entities/PatrolEnemy.js';
import { FreeroamEnemy } from '../entities/FreeroamEnemy.js';

/**
 * GameScene — main gameplay room with platforms, player, enemies.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const WORLD_W = 1600;
    const WORLD_H = 800;

    // ── Fade in from black ──
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.matter.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor(0x000000);

    this.drawBackground(WORLD_W, WORLD_H);

    this.platforms = this.add.group();
    this.buildLevel(WORLD_W, WORLD_H);

    const GROUND_Y = Math.floor(WORLD_H / TILE_SIZE - 6) * TILE_SIZE - 24;
    this.player = new Player(this, 5 * TILE_SIZE, GROUND_Y);

    this.enemies = [];
    this.spawnEnemies(WORLD_W, WORLD_H);

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(80, 40);

    this.createAtmosphere(WORLD_W, WORLD_H);
    this.createShadows();
    this.showUI();
  }

  update(time, delta) {
    this.player.update(time, delta);
    for (const enemy of this.enemies) {
      enemy.update(time, delta);
    }
    this.updateShadows();
  }

  // ─── Parallax Background ────────────────────────────────────

  drawBackground(worldW, worldH) {
    // Layer 0: Deep sky gradient
    const sky = this.add.graphics();
    sky.setDepth(-20);
    sky.fillGradientStyle(0x050510, 0x050510, COLORS.BG_SKY, COLORS.BG_SKY, 1);
    sky.fillRect(0, 0, worldW, worldH);

    // Layer 1: Stars (very slow parallax, spread across world)
    for (let i = 0; i < 80; i++) {
      const sx = Math.random() * worldW;
      const sy = Math.random() * worldH * 0.55;
      const scale = 0.3 + Math.random() * 0.7;
      const star = this.add
        .image(sx, sy, 'star')
        .setScrollFactor(0.02)
        .setDepth(-19)
        .setAlpha(0.3 + Math.random() * 0.5)
        .setScale(scale);
      // Twinkle animation
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: star.alpha * 0.15 },
        duration: 1000 + Math.random() * 3000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 4000,
      });
    }

    // Layer 2: Mountains (scroll factor ~0.08 — slow parallax)
    for (let x = 0; x < worldW + 200; x += 200) {
      const mx = x + Math.random() * 40;
      this.add
        .image(mx, worldH - 110, 'mountain')
        .setOrigin(0, 1)
        .setScrollFactor(0.08)
        .setDepth(-18)
        .setAlpha(0.6);
    }

    // Layer 3: Hills (scroll factor ~0.25 — medium parallax)
    for (let x = 0; x < worldW + 200; x += 300) {
      const hx = x + Math.random() * 60;
      this.add
        .image(hx, worldH - 30, 'hill')
        .setOrigin(0, 1)
        .setScrollFactor(0.25)
        .setDepth(-17)
        .setAlpha(0.5);
    }

    // Subtle ground glow (horizon light)
    const glow = this.add.graphics();
    glow.setDepth(-16);
    glow.fillStyle(0x1a3a4a, 0.12);
    glow.fillRect(0, worldH - 80, worldW, 80);
  }

  // ─── Level Builder ──────────────────────────────────────────

  /** Pick a surface tile variant based on column position for organic variation */
  _surfaceTex(col) {
    return `ground-tile-${(col * 7 + 13) % 4}`;
  }

  buildLevel(worldW, worldH) {
    const T = TILE_SIZE;
    const rows = Math.ceil(worldH / T);
    const G = Math.floor(worldH / T) - 6; // ground surface row = 44

    // Fill a rectangular area: surface row gets grass variants, deeper gets dirt
    const fill = (c1, c2, r1, r2, tex) => {
      if (tex) {
        // Custom texture for the whole area (walls, trees, etc.)
        for (let c = c1; c < c2; c++)
          for (let r = r1; r < r2; r++) this.placeTile(c * T, r * T, tex);
      } else {
        // Terrain fill: surface row = grass variants, rest = dirt
        for (let c = c1; c < c2; c++) {
          this.placeTile(c * T, r1 * T, this._surfaceTex(c));
          for (let r = r1 + 1; r < r2; r++) this.placeTile(c * T, r * T, 'dirt-tile');
        }
      }
    };
    /** Shortcut: platform surface with 3-tile-deep fill */
    const plat = (c1, c2, row) => fill(c1, c2, row, row + 3);

    // ── 1. Ground surface runs ──
    const runs = [
      [0, 2, null, 'wall-tile'], // left wall
      [2, 8, G], // flat start
      [8, 11, G], // under tree 1
      [11, 16, G], // flat
      [16, 18, G + 1], // small pond dip
      [18, 22, G], // flat
      [22, 24, G - 1], // small bump
      [24, 28, G], // flat
      [28, 37, G], // house area
      [37, 42, G], // flat
      [42, 45, G - 1], // bump
      [45, 48, G], // flat
      [48, 51, G], // under tree 2
      [51, 56, G], // flat
      [56, 58, G + 1], // dip
      [58, 98, G], // flat end
      [98, 100, null, 'wall-tile'], // right wall
    ];

    for (const r of runs) {
      const [c1, c2, surf, tex] = r;
      if (surf === null) fill(c1, c2, 0, rows, tex);
      else fill(c1, c2, surf, rows);
    }

    // ── 2. Trees ──
    fill(8, 11, G - 6, G, 'tree-tile');
    fill(7, 12, G - 9, G - 6, 'leaf-tile');
    fill(6, 13, G - 11, G - 9, 'leaf-tile');

    fill(48, 51, G - 6, G, 'tree-tile');
    fill(47, 52, G - 9, G - 6, 'leaf-tile');
    fill(46, 53, G - 11, G - 9, 'leaf-tile');

    // ── 3. Background decorations (walkthrough, behind player) ──
    this.placeBgDeco(4, G, 'bush-tile');
    this.placeBgDeco(5, G, 'bush-tile');
    this.placeBgDeco(12, G, 'flower-tile');
    this.placeBgDeco(13, G, 'flower-tile');
    this.placeBgDeco(26, G, 'bush-tile');
    this.placeBgDeco(27, G, 'bush-tile');
    this.placeBgDeco(39, G, 'bush-tile');
    this.placeBgDeco(40, G, 'flower-tile');
    this.placeBgDeco(52, G, 'flower-tile');
    this.placeBgDeco(53, G, 'bush-tile');
    this.placeBgDeco(60, G, 'bush-tile');

    // ── 4. Small house ──
    fill(28, 29, G - 6, G, 'wall-tile');
    fill(36, 37, G - 6, G, 'wall-tile');
    fill(32, 34, G - 6, G - 3, 'wall-tile');
    fill(27, 38, G - 6, G - 5, 'roof-tile');
    fill(27, 38, G - 7, G - 6, 'roof-tile');
    fill(28, 37, G - 8, G - 7, 'roof-tile');

    // ── 5. Elevated Platform C (cols 4–20): left patrol with gap + stairs ──
    // Section is above & left of tree 1 (tree canopy at cols 6-13, up to row G-11).
    // Lower left segment (surface G-15)
    plat(4, 8, G - 15);
    // Gap: cols 8–9 (2 tiles — too wide for enemy to cross)
    // Lower right segment (surface G-15)
    plat(10, 15, G - 15);
    // Stair step 1 → G-16 (2 tiles wide)
    plat(15, 17, G - 16);
    // Stair step 2 → G-17 (2 tiles wide)
    plat(17, 19, G - 17);
    // Upper level (surface G-17)
    plat(19, 21, G - 17);

    // ── 6. Elevated Platform D (cols 22–36): left-center freeroam stairway ──
    // Lower level (surface G-15, left of house roof at row 36+)
    plat(22, 29, G - 15);
    // Stair step 1 → G-16
    plat(29, 31, G - 16);
    // Stair step 2 → G-17
    plat(31, 33, G - 17);
    // Upper level (surface G-17)
    plat(33, 37, G - 17);

    // ── 7. Elevated Platform A (cols 60–80): edge patrol + stairs ──
    // Lower left segment (surface G-14)
    plat(60, 66, G - 14);
    // Gap: cols 66–67 (2 tiles — too wide for enemy to cross)
    // Lower right segment (surface G-14)
    plat(68, 73, G - 14);
    // Stair step 1 → G-15
    plat(73, 74, G - 15);
    // Stair step 2 → G-16
    plat(74, 75, G - 16);
    // Upper level (surface G-16)
    plat(75, 81, G - 16);

    // ── 8. Elevated Platform B (cols 82–97): freeroam stairway ──
    // Lower level (surface G-14)
    plat(82, 90, G - 14);
    // Stair step 1 → G-15
    plat(90, 91, G - 15);
    // Stair step 2 → G-16
    plat(91, 92, G - 16);
    // Upper level (surface G-16) — ends at col 97 so right-wall tiles at 98+ don't overlap
    plat(92, 98, G - 16);
  }

  placeTile(x, y, textureKey) {
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;
    const tile = this.matter.add.sprite(cx, cy, textureKey, null, {
      isStatic: true,
      shape: { type: 'rectangle', width: TILE_SIZE, height: TILE_SIZE },
      friction: 0.3,
      restitution: 0,
      collisionFilter: { category: CAT.GROUND, mask: CAT.PLAYER | CAT.ENEMY },
    });
    tile.setDepth(5);
  }

  /** Place a background decoration (non-colliding, pushed back visually) */
  placeBgDeco(col, surfaceRow, tex) {
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = surfaceRow * TILE_SIZE - TILE_SIZE / 2;
    const deco = this.add.image(x, y, tex);
    deco.setDepth(2);
    deco.setTint(0x8899bb);
    deco.setAlpha(0.7);
  }

  // ─── Enemies ────────────────────────────────────────────────

  addEnemy(enemy) {
    this.enemies.push(enemy);
    return enemy;
  }

  spawnEnemies(worldW, worldH) {
    const T = TILE_SIZE;
    const G = Math.floor(worldH / T) - 6;
    // Helper: surface Y for any platform row (body is 44px, half = 22)
    const platY = (row) => row * T - 22;

    // Ground-level enemies
    this.addEnemy(new PatrolEnemy(this, 14 * T, platY(G), 'P1', 11 * T, 28 * T));
    this.addEnemy(new FreeroamEnemy(this, 54 * T, platY(G), 'F1'));

    // Platform A: PatrolEnemy "P2" on lower-right section (surface G-14, col 68-72)
    // Patrol bounds 68–78: gap at col 67 (edge stops left), bound at col 78 stops right past stairs
    this.addEnemy(new PatrolEnemy(this, 70 * T, platY(G - 14), 'P2', 68 * T, 78 * T));

    // Platform B: FreeroamEnemy "F2" on lower level (surface G-14, col 82-89)
    // No patrol bounds — roams freely between left void-edge and right world-wall
    this.addEnemy(new FreeroamEnemy(this, 85 * T, platY(G - 14), 'F2'));

    // Platform C: PatrolEnemy "P3" on lower-right section (surface G-15, col 10-14)
    // Patrol bounds 5–19: gap at col 9 (edge stops left), bound at col 19 stops right past stairs
    this.addEnemy(new PatrolEnemy(this, 12 * T, platY(G - 15), 'P3', 5 * T, 19 * T));

    // Platform D: FreeroamEnemy "F3" on lower level (surface G-15, col 22-28)
    // No patrol bounds — roams freely between left void-edge and the house area on the right
    this.addEnemy(new FreeroamEnemy(this, 25 * T, platY(G - 15), 'F3'));
  }

  // ─── Shadows ────────────────────────────────────────────────

  createShadows() {
    // Drop shadow under player
    this.playerShadow = this.add.image(0, 0, 'shadow').setDepth(4).setAlpha(0.6);
    // Drop shadows under enemies
    this.enemyShadows = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const s = this.add.image(0, 0, 'shadow').setDepth(4).setAlpha(0.6);
      this.enemyShadows.push(s);
    }
  }

  updateShadows() {
    // Player shadow — follows player, positioned at ground level
    if (this.player && this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + 22);
    }

    // Enemy shadows
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemyShadows[i]) {
        this.enemyShadows[i].setPosition(this.enemies[i].x, this.enemies[i].y + 22);
      }
    }
  }

  // ─── Atmosphere ─────────────────────────────────────────────

  createAtmosphere(worldW, worldH) {
    // 1. Floating dust particles (ambient)
    this.add
      .particles(0, 0, 'particle', {
        x: { min: 0, max: worldW },
        y: { min: 0, max: worldH },
        speed: { min: 3, max: 10 },
        angle: { min: 200, max: 340 },
        lifespan: { min: 5000, max: 10000 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.2, end: 0 },
        frequency: 400,
        quantity: 1,
        blendMode: 'ADD',
      })
      .setDepth(-2);

    // 2. Fireflies (warm yellow-green, near ground)
    this.add
      .particles(0, 0, 'firefly', {
        x: { min: 0, max: worldW },
        y: { min: worldH * 0.5, max: worldH * 0.85 },
        speed: { min: 5, max: 20 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 3000, max: 6000 },
        scale: { start: 0.6, end: 0.1 },
        alpha: { start: 0.7, end: 0 },
        frequency: 800,
        quantity: 1,
        blendMode: 'ADD',
      })
      .setDepth(3);

    // 3. Ground mist (fog layer near ground)
    this.add
      .particles(0, 0, 'mist', {
        x: { min: -100, max: worldW + 100 },
        y: worldH - 40,
        speed: { min: 2, max: 6 },
        angle: { min: 175, max: 185 },
        lifespan: { min: 6000, max: 12000 },
        scale: { start: 1.2, end: 0.3 },
        alpha: { start: 0.3, end: 0 },
        frequency: 1000,
        quantity: 1,
      })
      .setDepth(6);
  }

  // ─── UI ─────────────────────────────────────────────────────

  showUI() {
    const pad = 12;
    const lineH = 16;

    // Background panel
    const panel = this.add.graphics();
    panel.setScrollFactor(0);
    panel.setDepth(99);

    const textLines = ['W / SPACE  Jump', 'A / D      Walk', 'SHIFT      Dash', 'LMB        Mine'];

    const panelW = 125;
    const panelH = textLines.length * lineH + pad * 2;
    const panelX = GAME_WIDTH - panelW - 12;
    const panelY = GAME_HEIGHT - panelH - 12;

    // Semi-transparent dark panel
    panel.fillStyle(0x000000, 0.5);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 4);

    // Subtle border
    panel.lineStyle(1, 0x334466, 0.4);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 4);

    // Title text
    const title = this.add.text(GAME_WIDTH / 2, 16, 'FOREST TOWN', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#88aacc',
    });
    title.setOrigin(0.5, 0);
    title.setScrollFactor(0);
    title.setDepth(99);
    title.setAlpha(0.7);

    // Instruction lines
    for (let i = 0; i < textLines.length; i++) {
      // Split by double-space, then discard empties from variable spacing padding
      const parts = textLines[i].split('  ').filter(Boolean);
      const line = this.add.text(panelX + pad, panelY + pad + i * lineH, parts[0], {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#6688aa',
      });
      line.setScrollFactor(0);
      line.setDepth(100);

      if (parts[1]) {
        const hint = this.add.text(panelX + pad + 68, panelY + pad + i * lineH, parts[1], {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#88aacc',
        });
        hint.setScrollFactor(0);
        hint.setDepth(100);
      }
    }
  }
}
