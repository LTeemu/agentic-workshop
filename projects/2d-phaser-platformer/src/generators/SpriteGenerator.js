import { COLORS, TILE_SIZE } from '../config.js';

const SKELETON_WIDTH = 32;
const SKELETON_HEIGHT = 48;

/**
 * Generates all game textures programmatically at boot time.
 * Creates skeleton characters with frame-based animation spritesheets
 * and tile/background textures.
 */
export class SpriteGenerator {
  /**
   * @param {Phaser.Scene} scene
   */
  static generate(scene) {
    this.generatePlayerSkeleton(scene);
    this.generateEnemySkeleton(scene);
    this.generateTiles(scene);
    this.generateParticle(scene);
    this.generateBackgroundTextures(scene);
    this.generateShadowTexture(scene);
    this.generateFireflyTexture(scene);
    this.generateMistTexture(scene);
  }

  // ─── Player Skeleton ────────────────────────────────────────

  static generatePlayerSkeleton(scene) {
    const animConfigs = [
      { key: 'idle', frames: 4 },
      { key: 'walk', frames: 6 },
      { key: 'jump', frames: 3 },
      { key: 'dash', frames: 3 },
    ];
    const totalFrames = 16;

    // Single row with all frames in sequence
    const sheetW = totalFrames * SKELETON_WIDTH;
    const sheetH = SKELETON_HEIGHT;
    const COLS = totalFrames;

    const canvas = document.createElement('canvas');
    canvas.width = sheetW;
    canvas.height = sheetH;
    const ctx = canvas.getContext('2d');

    let frameIndex = 0;

    for (const anim of animConfigs) {
      for (let i = 0; i < anim.frames; i++) {
        const x = frameIndex * SKELETON_WIDTH;
        const y = 0;
        this.drawSkeletonFrame(
          ctx,
          x,
          y,
          anim.key,
          i,
          anim.frames,
          COLORS.SKELETON_BONE,
          COLORS.SKELETON_GLOW,
        );
        frameIndex++;
      }
    }

    // Add to Phaser texture manager
    const texKey = 'skeleton-sheet';
    if (scene.textures.exists(texKey)) {
      scene.textures.remove(texKey);
    }
    scene.textures.addSpriteSheet(texKey, canvas, {
      frameWidth: SKELETON_WIDTH,
      frameHeight: SKELETON_HEIGHT,
    });

    // Create animations
    const totalFramesMap = {};
    for (const anim of animConfigs) {
      totalFramesMap[anim.key] = anim.frames;
    }
    this.createAnimations(scene, texKey, totalFramesMap);
  }

  // ─── Enemy Skeleton ─────────────────────────────────────────

  static generateEnemySkeleton(scene) {
    const totalFrames = {
      idle: 4,
      walk: 4,
    };

    const totalCols = 8;
    const rows = 1;
    const eWidth = 32;
    const eHeight = 48;
    const sheetW = totalCols * eWidth;
    const sheetH = rows * eHeight;

    const canvas = document.createElement('canvas');
    canvas.width = sheetW;
    canvas.height = sheetH;
    const ctx = canvas.getContext('2d');

    let col = 0;

    // Idle frames (4)
    for (let i = 0; i < 4; i++) {
      const x = col * eWidth;
      const y = 0;
      this.drawSkeletonFrame(ctx, x, y, 'idle', i, 4, COLORS.ENEMY_BONE, COLORS.ENEMY_GLOW, true);
      col++;
    }

    // Walk frames (4)
    for (let i = 0; i < 4; i++) {
      const x = col * eWidth;
      const y = 0;
      this.drawSkeletonFrame(ctx, x, y, 'walk', i, 4, COLORS.ENEMY_BONE, COLORS.ENEMY_GLOW, true);
      col++;
    }

    const texKey = 'enemy-skeleton-sheet';
    if (scene.textures.exists(texKey)) {
      scene.textures.remove(texKey);
    }
    scene.textures.addSpriteSheet(texKey, canvas, {
      frameWidth: eWidth,
      frameHeight: eHeight,
    });

    scene.anims.create({
      key: 'enemy-idle',
      frames: scene.anims.generateFrameNumbers(texKey, { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });

    scene.anims.create({
      key: 'enemy-walk',
      frames: scene.anims.generateFrameNumbers(texKey, { start: 4, end: 7 }),
      frameRate: 6,
      repeat: -1,
    });
  }

  // ─── Core Skeleton Drawer ───────────────────────────────────

  static drawSkeletonFrame(ctx, ox, oy, anim, frame, totalFrames, boneColor, glowColor, isEnemy) {
    const skelW = SKELETON_WIDTH;
    const skelH = SKELETON_HEIGHT;
    const cx = ox + skelW / 2;
    const baseY = oy + skelH;
    const t = frame / totalFrames;
    const angle = t * Math.PI * 2;

    // Glow aura
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(angle) * 0.05;
    const glowGrad = ctx.createRadialGradient(
      cx,
      baseY - skelH / 2,
      2,
      cx,
      baseY - skelH / 2,
      skelH * 0.5,
    );
    glowGrad.addColorStop(0, this.hexToRgba(glowColor, 0.3));
    glowGrad.addColorStop(1, this.hexToRgba(glowColor, 0));
    ctx.fillStyle = glowGrad;
    ctx.fillRect(ox, oy, skelW, skelH);
    ctx.restore();

    const headY = baseY - 40; // 8px from top
    const bodyTopY = baseY - 32; // 16px from top
    const bodyBotY = baseY - 16; // 32px from top (16px torso)

    ctx.strokeStyle = boneColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // ── Walk animation vars ──
    let legSwing = 0;
    let armSwing = 0;
    let bodyBob = 0;
    let headBob = 0;

    switch (anim) {
      case 'idle': {
        const breathe = Math.sin(angle * 0.5);
        bodyBob = breathe * 0.5;
        headBob = breathe * 0.3;
        break;
      }
      case 'walk': {
        const walkPhase = (frame / totalFrames) * Math.PI * 2;
        legSwing = Math.sin(walkPhase) * 8;
        armSwing = Math.sin(walkPhase + Math.PI) * 6;
        bodyBob = Math.abs(Math.sin(walkPhase)) * 1.5;
        break;
      }
      case 'jump': {
        const jumpPhase = frame / (totalFrames - 1);
        legSwing = -3 + jumpPhase * 6;
        armSwing = -2 + jumpPhase * 4;
        bodyBob = 0;
        break;
      }
      case 'dash': {
        const dashStretch = 1 + Math.sin(frame * 1.5) * 0.3;
        const dashCenter = baseY - skelH / 2;
        ctx.save();
        ctx.translate(cx, dashCenter);
        ctx.scale(dashStretch, 2 - dashStretch);
        ctx.translate(-cx, -dashCenter);
        break;
      }
    }

    // ── Draw body ──
    const bodyCX = cx + bodyBob;
    const bodyTop = bodyTopY + bodyBob;
    const bodyBot = bodyBotY + bodyBob;

    // Spine (main vertical line)
    ctx.beginPath();
    ctx.moveTo(bodyCX, bodyTop);
    ctx.lineTo(bodyCX, bodyBot);
    ctx.stroke();

    // Ribcage (horizontal lines)
    for (let i = 0; i < 4; i++) {
      const ry = bodyTop + 4 + i * 4 + bodyBob;
      const ribW = 5 - i;
      ctx.beginPath();
      ctx.moveTo(bodyCX - ribW, ry);
      ctx.lineTo(bodyCX + ribW, ry);
      ctx.stroke();
    }

    // ── Draw head (skull) ──
    const hx = cx + headBob;
    const hy = headY + bodyBob;

    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Eyes (glowing)
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(hx - 2.5, hy - 1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + 2.5, hy - 1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (small line / grin)
    ctx.strokeStyle = boneColor;
    ctx.beginPath();
    ctx.arc(hx, hy + 2, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // ── Arms ──
    const shoulderY = bodyTop + 2;

    // Left arm
    ctx.beginPath();
    ctx.moveTo(bodyCX - 3, shoulderY);
    ctx.lineTo(bodyCX - 7 - armSwing, bodyTop + 14 + armSwing * 0.5);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(bodyCX + 3, shoulderY);
    ctx.lineTo(bodyCX + 7 + armSwing, bodyTop + 14 - armSwing * 0.5);
    ctx.stroke();

    // ── Legs ──
    const hipY = bodyBot;

    // Left leg
    ctx.beginPath();
    ctx.moveTo(bodyCX - 2, hipY);
    ctx.lineTo(bodyCX - 4 - legSwing, baseY + bodyBob);
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(bodyCX + 2, hipY);
    ctx.lineTo(bodyCX + 4 + legSwing, baseY + bodyBob);
    ctx.stroke();

    // Small feet (skipped during jump — legs stay consistent, feet just blend)
    if (anim !== 'jump') {
      const footY = baseY + bodyBob;
      ctx.beginPath();
      ctx.moveTo(bodyCX - 4 - legSwing, footY);
      ctx.lineTo(bodyCX - 8 - legSwing, footY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bodyCX + 4 + legSwing, footY);
      ctx.lineTo(bodyCX + 8 + legSwing, footY);
      ctx.stroke();
    }

    // Restore dash scale
    if (anim === 'dash') {
      ctx.restore();
    }
  }

  // ─── Animations ─────────────────────────────────────────────

  static createAnimations(scene, texKey, totalFrames) {
    const keys = ['idle', 'walk', 'jump', 'dash'];
    let offset = 0;

    for (const key of keys) {
      const count = totalFrames[key];
      const rate = key === 'idle' ? 4 : key === 'walk' ? 8 : 6;
      scene.anims.create({
        key: `player-${key}`,
        frames: scene.anims.generateFrameNumbers(texKey, {
          start: offset,
          end: offset + count - 1,
        }),
        frameRate: rate,
        repeat: key === 'idle' || key === 'walk' ? -1 : 0,
      });
      offset += count;
    }
  }

  // ─── Tiles & Environment ────────────────────────────────────

  static generateTiles(scene) {
    // ── Dirt tile (underground, no grass, matches surface tile dirt) ──
    this.generateTile(scene, 'dirt-tile', (ctx, w, h) => {
      const rand = this._rand;
      // Same base color as the surface tiles so they blend seamlessly
      const dirtBase = 0x4a3020;
      const rd = (dirtBase >> 16) & 0xff;
      const gd = (dirtBase >> 8) & 0xff;
      const bd = dirtBase & 0xff;
      ctx.fillStyle = `rgb(${rd},${gd},${bd})`;
      ctx.fillRect(0, 0, w, h);

      // Darker speckles (same shade as surface tile speckles)
      ctx.fillStyle = '#3a2015';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
      }

      // Small stones
      ctx.fillStyle = '#5a3a28';
      for (let i = 0; i < 4; i++) {
        const sx = rand() * w;
        const sy = rand() * h;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + rand() * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tiny root lines
      ctx.strokeStyle = '#3a2015';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 2; i++) {
        const rx = rand() * w;
        const ry = rand() * h;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.bezierCurveTo(
          rx + (rand() - 0.5) * 4,
          ry + (rand() - 0.5) * 4,
          rx + (rand() - 0.5) * 6,
          ry + (rand() - 0.5) * 6,
          rx + (rand() - 0.5) * 8,
          ry + (rand() - 0.5) * 4,
        );
        ctx.stroke();
      }
    });

    // ── Surface tile variants (4 patterns) — grass on top, different per variant ──
    for (let v = 0; v < 4; v++) {
      this.generateTile(scene, `ground-tile-${v}`, (ctx, w, h) => {
        // Deterministic offsets per variant so patterns are fixed
        const off = v * 37;

        // Dark earth base
        const dirtBase = 0x4a3020;
        const r = (dirtBase >> 16) & 0xff;
        const g = (dirtBase >> 8) & 0xff;
        const b = dirtBase & 0xff;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, w, h);

        // Dirt speckles (offset by variant)
        ctx.fillStyle = '#3a2015';
        ctx.fillRect((3 + off) % w, 8, 3, 1);
        ctx.fillRect((7 + off * 3) % w, 12, 2, 2);
        ctx.fillRect((11 + off * 7) % w, 6, 2, 1);
        ctx.fillRect((5 + off * 11) % w, 14, 3, 1);

        // Grass layer — height varies by variant
        const grassH = 3 + (v % 3); // 3-5px
        ctx.fillStyle = '#3a6a2a';
        ctx.fillRect(0, 0, w, grassH);

        // Grass highlight
        ctx.fillStyle = '#4a8a3a';
        ctx.fillRect(0, 0, w, 2);

        // Grass blades — different arrangement per variant
        ctx.strokeStyle = '#5a9a4a';
        ctx.lineWidth = 1;
        const bladePositions = [
          [2, 3, 1],
          [6, 5, 2],
          [10, 4, 0],
          [13, 3, 1], // variant 0
          [1, 4, 0],
          [5, 3, 2],
          [9, 5, 1],
          [14, 4, 0], // variant 1
          [3, 5, 1],
          [7, 3, 0],
          [11, 5, 2],
          [15, 4, 0], // variant 2
          [0, 3, 2],
          [4, 5, 0],
          [8, 4, 1],
          [12, 3, 2], // variant 3
        ];
        for (let i = 0; i < 4; i++) {
          const [bx, bh, bend] = bladePositions[v * 4 + i];
          const bendX = bx + (bend - 1) * 2;
          ctx.beginPath();
          ctx.moveTo(bx, grassH);
          ctx.quadraticCurveTo(bx + 1, grassH - bh * 0.6, bendX, grassH - bh);
          ctx.stroke();
        }

        // Pebbles — different per variant
        const pebblePositions = [
          [
            [11, 6],
            [6, 9],
          ],
          [
            [8, 7],
            [14, 10],
          ],
          [
            [3, 8],
            [12, 7],
          ],
          [
            [9, 8],
            [5, 10],
          ],
        ];
        ctx.fillStyle = '#6a4a3a';
        for (const [px, py] of pebblePositions[v]) {
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // ── Wall tile — warm wood grain (house walls) ──
    this.generateTile(scene, 'wall-tile', (ctx, w, h) => {
      const rand = this._rand;

      ctx.fillStyle = '#6b4423';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 0.8;
      for (let x = 2; x < w; x += 4 + rand() * 3) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (rand() - 0.5) * 2, h);
        ctx.stroke();
      }

      ctx.strokeStyle = '#4a2a0a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Knot
      const kx = 4 + rand() * (w - 8);
      const ky = 4 + rand() * (h - 8);
      ctx.strokeStyle = '#4a2a0a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 2 + rand() * 2, 1 + rand() * 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#5a3a1a';
      ctx.beginPath();
      ctx.ellipse(kx, ky, 1 + rand() * 1, 0.5 + rand() * 1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(139, 90, 43, 0.25)';
      ctx.fillRect(1, 1, 4, 1);
      ctx.fillRect(9, h / 2 + 2, 3, 1);
    });

    // ── Tree trunk tile — darker bark ──
    this.generateTile(scene, 'tree-tile', (ctx, w, h) => {
      const rand = this._rand;

      ctx.fillStyle = '#4a3020';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#3a2015';
      ctx.lineWidth = 1;
      for (let x = 3; x < w; x += 3 + rand() * 3) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y < h; y += 3) {
          ctx.lineTo(x + (rand() - 0.5) * 1.5, y);
        }
        ctx.stroke();
      }

      for (let i = 0; i < 2; i++) {
        const kx = 3 + rand() * (w - 6);
        const ky = 3 + rand() * (h - 6);
        ctx.fillStyle = '#2a1810';
        ctx.beginPath();
        ctx.ellipse(kx, ky, 1.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(50, 80, 30, 0.3)';
      for (let i = 0; i < 2; i++) {
        const mx = rand() * w;
        const my = rand() * h;
        ctx.beginPath();
        ctx.ellipse(mx, my, 3 + rand() * 3, 1 + rand() * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // ── Leaf tile — canopy foliage ──
    this.generateTile(scene, 'leaf-tile', (ctx, w, h) => {
      const rand = this._rand;

      ctx.fillStyle = '#2a4a1a';
      ctx.fillRect(0, 0, w, h);

      const colors = ['#3a6a2a', '#4a7a3a', '#5a9a3a', '#6aaa4a'];
      for (let i = 0; i < 6; i++) {
        const lx = rand() * w;
        const ly = rand() * h;
        const r = 3 + rand() * 4;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(100, 180, 60, 0.15)';
      for (let i = 0; i < 3; i++) {
        const sx = rand() * w;
        const sy = rand() * h;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + rand() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // ── Roof tile — reddish terra cotta ──
    this.generateTile(scene, 'roof-tile', (ctx, w, h) => {
      const rand = this._rand;

      ctx.fillStyle = '#5a3020';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#4a2018';
      ctx.lineWidth = 0.5;
      for (let y = 4; y < h; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#6a3a2a';
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          ctx.beginPath();
          ctx.arc(x + 2, y + 4, 3, Math.PI, 0);
          ctx.fill();
        }
      }

      ctx.fillStyle = 'rgba(120, 70, 40, 0.2)';
      ctx.fillRect(0, 0, w, 1);
    });

    // ── Bush tile — rounded green shrub ──
    this.generateTile(scene, 'bush-tile', (ctx, w, h) => {
      const rand = this._rand;

      ctx.fillStyle = '#2a4a1a';
      ctx.fillRect(0, 0, w, h);

      const greens = ['#2a5a1a', '#3a6a2a', '#4a7a2a', '#3a5a1a'];
      for (let i = 0; i < 5; i++) {
        const bx = rand() * w;
        const by = 4 + rand() * (h - 4);
        const r = 4 + rand() * 4;
        ctx.fillStyle = greens[i % greens.length];
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(100, 180, 60, 0.2)';
      ctx.beginPath();
      ctx.arc(3, 3, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Flower tile ──
    this.generateTile(scene, 'flower-tile', (ctx, w, h) => {
      const rand = this._rand;

      ctx.fillStyle = '#3a5a2a';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#4a7a3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, h);
      ctx.lineTo(8, 5);
      ctx.stroke();

      ctx.fillStyle = '#4a7a3a';
      ctx.beginPath();
      ctx.ellipse(5, 10, 3, 1.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(11, 7, 3, 1.5, 0.3, 0, Math.PI * 2);
      ctx.fill();

      const petalColors = ['#ff4466', '#ffaa44', '#cc88ff', '#ff6688'];
      const pc = petalColors[Math.floor(rand() * petalColors.length)];
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const px = 8 + Math.cos(angle) * 3;
        const py = 4 + Math.sin(angle) * 3;
        ctx.fillStyle = pc;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffdd44';
      ctx.beginPath();
      ctx.arc(8, 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ─── Background Textures ────────────────────────────────────

  static generateBackgroundTextures(scene) {
    // Star texture — tiny glowing dot
    this.generateCanvas(scene, 'star', 4, 4, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(2, 2, 0, 2, 2, 2);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(200, 220, 255, 0.6)');
      grad.addColorStop(1, 'rgba(200, 220, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });

    // Mountain silhouette — generated at larger size
    this.generateCanvas(scene, 'mountain', 200, 80, (ctx, w, h) => {
      const rand = this._rand;
      const pts = [];
      for (let x = 0; x <= w; x += 8) {
        const base = h - 10 - rand() * 30;
        const peak = base - rand() * 35;
        const y = x % 16 === 0 ? peak : base + rand() * 10;
        pts.push({ x, y: Math.max(y, 5) });
      }
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Snow caps
      ctx.fillStyle = 'rgba(200, 210, 230, 0.2)';
      ctx.beginPath();
      for (let i = 1; i < pts.length - 1; i++) {
        if (pts[i].y < pts[i - 1].y && pts[i].y < pts[i + 1].y) {
          ctx.moveTo(pts[i].x - 4, pts[i].y + 4);
          ctx.lineTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[i].x + 4, pts[i].y + 4);
        }
      }
      ctx.stroke();
    });

    // Hill silhouette — closer, slightly lighter
    this.generateCanvas(scene, 'hill', 300, 60, (ctx, w, h) => {
      const rand = this._rand;
      ctx.fillStyle = '#1e2a2a';
      ctx.beginPath();
      ctx.moveTo(0, h);
      let x = 0;
      while (x <= w) {
        const y = h - 8 - rand() * 25;
        ctx.lineTo(x, y);
        x += 10 + rand() * 15;
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Tree silhouettes on hills
      ctx.fillStyle = '#1a2626';
      for (let i = 0; i < 6; i++) {
        const tx = rand() * w;
        const ty = h - 10 - rand() * 18;
        // Trunk
        ctx.fillRect(tx - 1, ty - 4, 2, 4);
        // Canopy (triangle)
        ctx.beginPath();
        ctx.moveTo(tx, ty - 12);
        ctx.lineTo(tx - 5, ty - 2);
        ctx.lineTo(tx + 5, ty - 2);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  // ─── Shadow Texture ────────────────────────────────────────

  static generateShadowTexture(scene) {
    this.generateCanvas(scene, 'shadow', 32, 12, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(0, 0, 8, 0.4)');
      grad.addColorStop(0.5, 'rgba(0, 0, 8, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 8, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  }

  // ─── Firefly Particle ──────────────────────────────────────

  static generateFireflyTexture(scene) {
    this.generateCanvas(scene, 'firefly', 6, 6, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(3, 3, 0, 3, 3, 3);
      grad.addColorStop(0, 'rgba(200, 255, 100, 1)');
      grad.addColorStop(0.4, 'rgba(180, 240, 80, 0.6)');
      grad.addColorStop(1, 'rgba(180, 240, 80, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  }

  // ─── Mist Particle ─────────────────────────────────────────

  static generateMistTexture(scene) {
    this.generateCanvas(scene, 'mist', 32, 16, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(120, 150, 180, 0.12)');
      grad.addColorStop(0.5, 'rgba(120, 150, 180, 0.06)');
      grad.addColorStop(1, 'rgba(120, 150, 180, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  }

  static generateTile(scene, key, drawFn) {
    const size = TILE_SIZE;
    this.generateCanvas(scene, key, size, size, drawFn);
  }

  static generateCanvas(scene, key, w, h, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    drawFn(ctx, w, h);

    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    scene.textures.addCanvas(key, canvas);
  }

  static generateParticle(scene) {
    this.generateCanvas(scene, 'particle', 8, 8, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(136, 204, 255, 1)');
      grad.addColorStop(1, 'rgba(136, 204, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  }

  // ─── Helpers ────────────────────────────────────────────────

  static get _rand() {
    return Math.random;
  }

  static hexToRgba(hex, alpha) {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
