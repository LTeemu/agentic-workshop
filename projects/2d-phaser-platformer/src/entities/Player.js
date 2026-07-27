import Phaser from 'phaser';
import {
  PLAYER_SPEED,
  PLAYER_JUMP,
  PLAYER_DASH_SPEED,
  PLAYER_DASH_DURATION,
  CAT,
} from '../config.js';

/**
 * Player — skeleton character using Matter physics with a capsule body.
 *
 * Capsule shape:  28×44 rectangle with chamfer radius = 14 (1.75×2.75 tiles).
 *
 * Wall collision is handled by two dedicated sensor bodies (left/right)
 * that sit just outside the main body. When a sensor overlaps level
 * geometry, movement in that direction is blocked.
 */
export class Player {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;
    const Bodies = Phaser.Physics.Matter.Matter.Bodies;
    const Body = Phaser.Physics.Matter.Matter.Body;

    // ── Main capsule body ──
    this.sprite = scene.matter.add.sprite(x, y, 'skeleton-sheet', null, {
      shape: {
        type: 'rectangle',
        width: 28, // 2px clearance per side through 2-tile (32px) gaps
        height: 44, // 2px clearance top/bottom through 3-tile (48px) gaps
        chamfer: { radius: 14 },
      },
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0.02,
      restitution: 0,
      density: 0.002,
      inertia: Infinity,
      collisionFilter: { category: CAT.PLAYER, mask: CAT.GROUND },
    });
    this.sprite.setDepth(20);

    // ── Sensor bodies ──
    // Small sensor bodies placed on the player to detect walls and ground.
    // All are dynamic (to collide with static level geometry) but ignore
    // gravity (position is synced to the player each frame).
    const sensorOpts = { isSensor: true, isStatic: false, friction: 0, frictionStatic: 0 };
    const addSensor = (sx, sy, sw, sh) => {
      const b = Bodies.rectangle(sx, sy, sw, sh, {
        ...sensorOpts,
        collisionFilter: { category: CAT.PLAYER, mask: CAT.GROUND },
      });
      b.ignoreGravity = true;
      scene.matter.world.add(b);
      return b;
    };

    // Wall sensors: full body height (minus 4px top/bottom margin), 8px wide
    this.sensorLeft = addSensor(x - 16, y, 8, 36);
    this.sensorRight = addSensor(x + 16, y, 8, 36);

    // Clearance sensors at body top (y - halfH + 3) — detect ceilings and walls reaching upper body.
    // 14px tall for reliable overlap with wall tops (covers y-28 to y-14).
    this.clearLeft = addSensor(x - 11, y - 21, 24, 14);
    this.clearRight = addSensor(x + 11, y - 21, 24, 14);

    // Step-up sensors: wall sensors at y - 17 (1px above 1-tile wall top).
    // Reduced body height (matches clearance-reduced body) at the step-up position.
    this.stepLeft = addSensor(x - 16, y - 17, 8, 44);
    this.stepRight = addSensor(x + 16, y - 17, 8, 44);

    // Ground sensor: full body width (minus 3px each side) so it catches
    // ground under the entire body without snagging walls.
    this.sensorGround = addSensor(x, y + 22, 26, 6);

    // ── Contact tracking ──
    this._groundContacts = 0;
    /** Body IDs currently overlapping left wall sensor */
    this._wallLeft = new Set();
    /** Body IDs currently overlapping right wall sensor */
    this._wallRight = new Set();
    /** Clearance detection (above-wall ceiling) */
    this._clearLeft = new Set();
    this._clearRight = new Set();
    /** Step-up detection (wall at y-16, 1 tile up) */
    this._stepLeft = new Set();
    this._stepRight = new Set();

    const track = (pair, sensor, set, delta) => {
      const { bodyA, bodyB } = pair;
      const other = bodyA === sensor ? bodyB : bodyA;
      if (other === this.sprite.body) return;
      if (!other.isStatic) return;
      if (delta === 'add') set.add(other.id);
      else set.delete(other.id);
    };

    const onCollideStart = (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        if (bodyA === this.sensorLeft || bodyB === this.sensorLeft) {
          track(pair, this.sensorLeft, this._wallLeft, 'add');
        }
        if (bodyA === this.sensorRight || bodyB === this.sensorRight) {
          track(pair, this.sensorRight, this._wallRight, 'add');
        }
        if (bodyA === this.clearLeft || bodyB === this.clearLeft) {
          track(pair, this.clearLeft, this._clearLeft, 'add');
        }
        if (bodyA === this.clearRight || bodyB === this.clearRight) {
          track(pair, this.clearRight, this._clearRight, 'add');
        }
        if (bodyA === this.stepLeft || bodyB === this.stepLeft) {
          track(pair, this.stepLeft, this._stepLeft, 'add');
        }
        if (bodyA === this.stepRight || bodyB === this.stepRight) {
          track(pair, this.stepRight, this._stepRight, 'add');
        }
        // Ground sensor — only count contacts with static bodies
        if (bodyA === this.sensorGround || bodyB === this.sensorGround) {
          const other = bodyA === this.sensorGround ? bodyB : bodyA;
          if (other.isStatic) {
            if (this._groundContacts === 0) {
              // First contact — capture pre-resolution velocity for landing effects
              this._landingVelocity = this.sprite.body.velocity.y;
            }
            this._groundContacts++;
          }
        }
      }
    };

    const onCollideEnd = (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        if (bodyA === this.sensorLeft || bodyB === this.sensorLeft) {
          track(pair, this.sensorLeft, this._wallLeft, 'remove');
        }
        if (bodyA === this.sensorRight || bodyB === this.sensorRight) {
          track(pair, this.sensorRight, this._wallRight, 'remove');
        }
        if (bodyA === this.clearLeft || bodyB === this.clearLeft) {
          track(pair, this.clearLeft, this._clearLeft, 'remove');
        }
        if (bodyA === this.clearRight || bodyB === this.clearRight) {
          track(pair, this.clearRight, this._clearRight, 'remove');
        }
        if (bodyA === this.stepLeft || bodyB === this.stepLeft) {
          track(pair, this.stepLeft, this._stepLeft, 'remove');
        }
        if (bodyA === this.stepRight || bodyB === this.stepRight) {
          track(pair, this.stepRight, this._stepRight, 'remove');
        }
        if (bodyA === this.sensorGround || bodyB === this.sensorGround) {
          const other = bodyA === this.sensorGround ? bodyB : bodyA;
          if (other.isStatic) this._groundContacts--;
        }
      }
    };

    scene.matter.world.on('collisionstart', onCollideStart);
    scene.matter.world.on('collisionend', onCollideEnd);

    // ── State ──
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 600;
    this._dashDir = 1;
    this.lastDashTime = 0;
    this.facingRight = true;
    this.jumpKeyUsed = null;

    // ── Input ──
    this.cursors = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });

    // ── Trail particle ──
    this.trailEmitter = scene.add.particles(0, 0, 'particle', {
      speed: { min: 10, max: 30 },
      lifespan: 400,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.4, end: 0 },
      emitting: false,
    });
    this.trailEmitter.setDepth(5);

    // ── Landing dust emitter ──
    this.landingEmitter = scene.add.particles(0, 0, 'particle', {
      speed: { min: 5, max: 25 },
      angle: { min: 240, max: 300 },
      lifespan: 350,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.3, end: 0 },
      emitting: false,
      tint: 0x88aacc,
    });
    this.landingEmitter.setDepth(7);

    this._wasOnGround = true;
    this._landingVelocity = 0;

    this.sprite.play('player-idle');

    // ── Mining ──
    this._miningTarget = null; // Matter body being mined
    this._miningProgress = 0; // 0..1
    this._miningGfx = scene.add.graphics().setDepth(60);

    // ── Debug: sensor outlines ──
    this._debugGfx = scene.add.graphics().setDepth(100);
  }

  get onGround() {
    return this._groundContacts > 0;
  }

  /** Step-up at y-16 is blocked — wall is 2+ tiles tall */
  get _stepUpBlocked() {
    return this.facingRight ? this._stepRight.size > 0 : this._stepLeft.size > 0;
  }
  /** Top clearance is blocked — wall is 3+ tiles tall */
  get _clearanceBlocked() {
    return this.facingRight ? this._clearRight.size > 0 : this._clearLeft.size > 0;
  }

  /** Sync sensor positions to follow the player body each frame */
  syncSensors() {
    const bx = this.sprite.body.position.x;
    const by = this.sprite.body.position.y;
    Phaser.Physics.Matter.Matter.Body.setPosition(this.sensorLeft, { x: bx - 16, y: by });
    Phaser.Physics.Matter.Matter.Body.setPosition(this.sensorRight, { x: bx + 16, y: by });
    Phaser.Physics.Matter.Matter.Body.setPosition(this.clearLeft, { x: bx - 11, y: by - 21 });
    Phaser.Physics.Matter.Matter.Body.setPosition(this.clearRight, { x: bx + 11, y: by - 21 });
    Phaser.Physics.Matter.Matter.Body.setPosition(this.stepLeft, { x: bx - 16, y: by - 17 });
    Phaser.Physics.Matter.Matter.Body.setPosition(this.stepRight, { x: bx + 16, y: by - 17 });
    Phaser.Physics.Matter.Matter.Body.setPosition(this.sensorGround, { x: bx, y: by + 22 });
  }

  /** Draw debug outlines for the sensor bodies */
  drawDebug() {
    const g = this._debugGfx;
    g.clear();
    const bx = this.sprite.body.position.x;
    const by = this.sprite.body.position.y;

    // Left wall sensor (8×36, center at x-16, y)
    g.lineStyle(1.5, this._wallLeft.size > 0 ? 0xff3333 : 0x88ff88, 0.7);
    g.strokeRect(bx - 20, by - 18, 8, 36);

    // Right wall sensor (8×36, center at x+16, y)
    g.lineStyle(1.5, this._wallRight.size > 0 ? 0xff3333 : 0x88ff88, 0.7);
    g.strokeRect(bx + 12, by - 18, 8, 36);

    // Clearance sensors (24×14 at x±11, y-21) — purple when blocked
    g.lineStyle(1, this._clearLeft.size > 0 ? 0xcc44ff : 0x663388, 0.6);
    g.strokeRect(bx - 23, by - 28, 24, 14);
    g.lineStyle(1, this._clearRight.size > 0 ? 0xcc44ff : 0x663388, 0.6);
    g.strokeRect(bx - 1, by - 28, 24, 14);

    // Step-up sensors (8×44 at x±16, y-17 = one tile + 1px up) — pink when blocked
    g.lineStyle(1, this._stepLeft.size > 0 ? 0xff66aa : 0x443355, 0.6);
    g.strokeRect(bx - 20, by - 39, 8, 44);
    g.lineStyle(1, this._stepRight.size > 0 ? 0xff66aa : 0x443355, 0.6);
    g.strokeRect(bx + 12, by - 39, 8, 44);

    // Ground sensor (26×6, center at x, y+22)
    g.lineStyle(1.5, this._groundContacts > 0 ? 0x33aaff : 0x8888ff, 0.7);
    g.strokeRect(bx - 13, by + 19, 26, 6);
  }

  update(time, delta) {
    const { sprite, cursors } = this;

    // Keep sensors locked to player position
    this.syncSensors();
    this.drawDebug();

    // Lock rotation
    sprite.body.angularVelocity = 0;
    const onGround = this.onGround;

    // ── Dash (gravity disabled) ──
    if (this.isDashing) {
      this.dashTimer -= delta;
      // Reapply horizontal velocity every frame so wall collisions don't stop us
      sprite.setVelocityX(PLAYER_DASH_SPEED * this._dashDir);
      // Auto-step over 1-tile walls during dash (same smooth lift)
      const dashStepping =
        (this._wallLeft.size > 0 && this._stepLeft.size === 0) ||
        (this._wallRight.size > 0 && this._stepRight.size === 0);
      if (dashStepping) {
        sprite.setVelocityY(-4);
      } else {
        // Cancel gravity every frame so the dash is purely horizontal
        sprite.setVelocityY(0);
      }

      // Continuous trail during dash
      if (Math.random() < 0.6) {
        this.trailEmitter.emitParticleAt(sprite.x + (Math.random() - 0.5) * 16, sprite.y + 22, 1);
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
      this.updateAnimation('dash');
      // Don't update facing from velocity during dash — physics collision
      // with a wall can momentarily reverse velocity, flipping the sprite
      // backwards. The facing was set correctly at dash-start.
      return;
    }

    const dashPressed = Phaser.Input.Keyboard.JustDown(this.cursors.dash);
    const canDash = time - this.lastDashTime > this.dashCooldown;

    if (dashPressed && canDash) {
      this.startDash(time);
      return;
    }

    // ── Horizontal movement ──
    // Update facing direction from input first (even when wall-blocked)
    if (cursors.left.isDown) {
      this.facingRight = false;
    } else if (cursors.right.isDown) {
      this.facingRight = true;
    }

    let vx = 0;
    // Wall sensor blocks movement for 2+ tile walls (step-up sensor detects them).
    // For 1-tile walls the chamfered body rides up with an auto-step.
    const wallBlockedLeft = this._wallLeft.size > 0 && this._stepLeft.size > 0;
    const wallBlockedRight = this._wallRight.size > 0 && this._stepRight.size > 0;
    if (cursors.left.isDown && !wallBlockedLeft) {
      vx = -PLAYER_SPEED;
    } else if (cursors.right.isDown && !wallBlockedRight) {
      vx = PLAYER_SPEED;
    }
    sprite.setVelocityX(vx);
    sprite.setFlipX(!this.facingRight);

    // ── Auto-step over 1-tile walls (sloped feel) ──
    // When on ground, walking into a 1-tile wall (wall hits, step-up clear),
    // apply a gentle sustained upward velocity so the body rides up smoothly
    // like a ramp rather than popping.
    if (onGround) {
      const stepping =
        (this._wallLeft.size > 0 && this._stepLeft.size === 0 && vx < 0) ||
        (this._wallRight.size > 0 && this._stepRight.size === 0 && vx > 0);
      if (stepping) {
        // Sustained lift — reapplied each frame while wall contact persists,
        // strong enough to overcome gravity (~+0.28/frame) and clear 1 tile fast
        sprite.setVelocityY(-4);
      }
    }

    // ── Jump (ground + one air jump) ──
    const jumpJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.jump);
    const upJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.up);
    const jumpPressed = jumpJustDown || upJustDown;

    if (jumpPressed) {
      if (onGround) {
        // Ground jump — free, doesn't consume air charge
        sprite.setVelocityY(PLAYER_JUMP);
        this.jumpKeyUsed = jumpJustDown ? this.cursors.jump : this.cursors.up;
      } else if (this._airJumps > 0) {
        // Air jump — consumes the single charge
        sprite.setVelocityY(PLAYER_JUMP);
        this.jumpKeyUsed = jumpJustDown ? this.cursors.jump : this.cursors.up;
        this._airJumps--;
      }
    }

    // Variable jump height
    if (this.jumpKeyUsed && sprite.body.velocity.y < -2) {
      const stillHeld = this.jumpKeyUsed.isDown;
      if (!stillHeld) {
        sprite.setVelocityY(sprite.body.velocity.y * 0.65);
        this.jumpKeyUsed = null;
      }
    }

    if (onGround) {
      this.jumpKeyUsed = null;
      this._airJumps = 1;

      // Landing detection — was airborne, now grounded
      if (!this._wasOnGround) {
        const vy = this._landingVelocity;
        // Emit landing dust (proportional to fall speed)
        const dustCount = Math.min(4 + Math.floor(Math.abs(vy) * 2), 12);
        this.landingEmitter.emitParticleAt(this.sprite.x, this.sprite.y + 22, dustCount);

        this._landingVelocity = 0;
      }
    }
    this._wasOnGround = onGround;
    const inAir = !onGround;
    if (inAir) {
      this.updateAnimation('jump');
    } else if (vx !== 0) {
      this.updateAnimation('walk');
    } else {
      this.updateAnimation('idle');
    }

    // Particle trail on ground
    if (onGround && vx !== 0 && Math.random() < 0.15) {
      this.trailEmitter.emitParticleAt(sprite.x, sprite.y + 22, 1);
    }

    // ── Mining (hold left mouse) ──
    this._updateMining(delta);
  }

  startDash(time) {
    this.isDashing = true;
    this.dashTimer = PLAYER_DASH_DURATION;
    this.lastDashTime = time;

    // Left/right key overrides, otherwise go sprite facing direction
    const dir = this.cursors.left.isDown
      ? -1
      : this.cursors.right.isDown
        ? 1
        : !this.sprite.flipX
          ? 1
          : -1;
    this._dashDir = dir;
    this.sprite.setVelocityX(PLAYER_DASH_SPEED * dir);
    this.sprite.setVelocityY(0);
    this.sprite.anims.play('player-dash');
    this.sprite.anims.timeScale = 1.5;

    // Dash trail burst
    for (let i = 0; i < 8; i++) {
      this.trailEmitter.emitParticleAt(
        this.sprite.x + (Math.random() - 0.5) * 24,
        this.sprite.y + 22,
        1,
      );
    }
  }

  updateAnimation(anim) {
    const key = `player-${anim}`;
    const current = this.sprite.anims.currentAnim?.key;
    if (current !== key) {
      this.sprite.play(key);
      this.sprite.anims.timeScale = 1;
    }
  }

  // ─── Mining / Block Breaking ────────────────────────────────

  /** Find the block under the mouse cursor, within mining range */
  _findTargetBlock() {
    const Matter = Phaser.Physics.Matter.Matter;
    const pointer = this.scene.input.activePointer;
    // worldX/worldY give the world-space position under the cursor
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    if (wx == null || wy == null) return null;

    // Must be within 4 tiles (64px) of player center
    const dx = wx - this.sprite.x;
    const dy = wy - this.sprite.y;
    if (dx * dx + dy * dy > 64 * 64) return null;

    // Find a static body with a game object at the cursor position
    const allBodies = Matter.Composite.allBodies(this.scene.matter.world.localWorld);
    const hits = Matter.Query.point(allBodies, { x: wx, y: wy });
    return hits.find((b) => b.isStatic && b.gameObject);
  }

  /** Update mining — call every frame while mining is active */
  _updateMining(delta) {
    const pointer = this.scene.input.activePointer;
    if (!pointer.isDown || pointer.rightButtonDown()) {
      this._clearMining();
      return;
    }

    const target = this._findTargetBlock();
    if (!target) {
      this._clearMining();
      return;
    }

    // Prevent mining world bounds (cols 0-1, 98-99)
    const col = Math.floor(target.position.x / 16);
    if (col <= 1 || col >= 98) {
      this._clearMining();
      return;
    }

    // Switching target → reset progress
    if (this._miningTarget !== target) {
      this._miningTarget = target;
      this._miningProgress = 0;
    }

    const texKey = target.gameObject.texture.key;
    const duration = texKey === 'wall-tile' ? 600 : 400;
    this._miningProgress += delta / duration;

    // Draw crack overlay
    this._drawCrack(target.position.x, target.position.y, this._miningProgress);

    if (this._miningProgress >= 1) {
      this._breakBlock(target);
    }
  }

  /** Draw crack overlay on the block being mined */
  _drawCrack(cx, cy, progress) {
    const g = this._miningGfx;
    g.clear();
    if (progress <= 0) return;
    const s = 8; // half tile (16/2)
    const alpha = Math.min(progress * 1.5, 1);
    const width = Math.max(1, Math.floor(progress * 4));
    g.lineStyle(width, 0xffffff, alpha * 0.7);

    // Small X pattern
    const o = s * 0.5;
    g.beginPath();
    g.moveTo(cx - o, cy - o);
    g.lineTo(cx + o, cy + o);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + o, cy - o);
    g.lineTo(cx - o, cy + o);
    g.stroke();

    // Extra cracks at higher progress
    if (progress > 0.5) {
      g.lineStyle(width * 0.5, 0xffffff, alpha * 0.4);
      g.beginPath();
      g.moveTo(cx - s, cy);
      g.lineTo(cx - o, cy - o);
      g.stroke();
      g.beginPath();
      g.moveTo(cx + s, cy);
      g.lineTo(cx + o, cy - o);
      g.stroke();
    }
  }

  /** Remove the block from the world */
  _breakBlock(body) {
    const gameObj = body.gameObject;
    this.scene.matter.world.remove(body);
    if (gameObj) gameObj.destroy();

    // One-shot particle burst (auto-destroys after particles die)
    const burst = this.scene.add.particles(body.position.x, body.position.y, 'particle', {
      speed: { min: 20, max: 60 },
      lifespan: 300,
      scale: { start: 0.4, end: 0 },
      emitting: false,
    });
    burst.explode(6);
    this.scene.time.delayedCall(500, () => {
      if (burst) burst.destroy();
    });

    this._clearMining();
  }

  /** Reset mining state */
  _clearMining() {
    this._miningTarget = null;
    this._miningProgress = 0;
    this._miningGfx.clear();
  }

  /** Clean up sensor bodies and mining graphics on destroy */
  destroy() {
    this._miningGfx.destroy();
    this.scene.matter.world.remove(this.sensorLeft);
    this.scene.matter.world.remove(this.sensorRight);
    this.scene.matter.world.remove(this.clearLeft);
    this.scene.matter.world.remove(this.clearRight);
    this.scene.matter.world.remove(this.stepLeft);
    this.scene.matter.world.remove(this.stepRight);
    this.scene.matter.world.remove(this.sensorGround);
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }
}
