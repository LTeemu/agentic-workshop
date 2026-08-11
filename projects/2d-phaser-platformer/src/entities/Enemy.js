import Phaser from 'phaser';
import { ENEMY_SPEED, TILE_SIZE, CAT } from '../config.js';

const P = TILE_SIZE; // 16

/**
 * Base enemy — shared body, sensors, collision tracking, debug.
 * Subclasses override `update()` with their own state machine.
 *
 * @param {number} [tileW=2]  Width in tiles (body = tileW × 16 px)
 * @param {number} [tileH=3]  Height in tiles
 */
export class Enemy {
  constructor(scene, x, y, tileW = 2, tileH = 3) {
    this.scene = scene;
    this.tileW = tileW;
    this.tileH = tileH;
    this.halfW = (tileW * P) / 2;
    this.halfH = (tileH * P) / 2;
    const bodyW = tileW * P - 4; // 28px → 2px clearance per side through 2-tile gaps
    const bodyH = tileH * P - 4; // 44px → 2px clearance top/bottom through 3-tile gaps
    const Bodies = Phaser.Physics.Matter.Matter.Bodies;

    this.sprite = scene.matter.add.sprite(x, y, 'enemy-skeleton-sheet', null, {
      shape: { type: 'rectangle', width: bodyW, height: bodyH, chamfer: { radius: bodyW / 2 } },
      friction: 0,
      frictionAir: 0,
      restitution: 0,
      density: 0.002,
      inertia: Infinity,
      collisionFilter: { category: CAT.ENEMY, mask: CAT.GROUND },
    });
    this.sprite.setDepth(10);

    this.speed = ENEMY_SPEED;
    /** Set to true to enable console.log thought process for this enemy */
    this.debugLog = false;

    // ── Sensor positions (derived from tile dimensions) ──
    const wallX = this.halfW + 2; // just outside body edge
    const clearSpan = this.halfW + P / 2; // distance from center to (edge + ½tile)
    const clearCenter = clearSpan / 2; // sensor center (midpoint of span)
    const groundY = this.halfH; // at feet
    const groundW = bodyW - 2;
    // Jump height ~2-3 tiles (Matter gravity.y=1 has scale 0.001, so actual Δvy ≈ 0.28/step)
    const jumpH = P * 3; // 3 tiles = 48px (covers observed 2-3 tile jumps)
    // Drop sensors: enemy-width wide, jump-height tall, at each bottom corner
    const dropH = jumpH;
    const dropY = groundY + dropH / 2; // center Y = halfH + jumpH/2 below body center

    // ── Sensors ──
    const sopts = { isSensor: true, isStatic: false, friction: 0, frictionStatic: 0 };
    const sensorFilter = { category: CAT.ENEMY, mask: CAT.GROUND };

    const addSensor = (sx, sy, sw, sh) => {
      const b = Bodies.rectangle(sx, sy, sw, sh, { ...sopts, collisionFilter: sensorFilter });
      b.ignoreGravity = true;
      scene.matter.world.add(b);
      return b;
    };

    // Wall sensors: full body height minus 4px top/bottom margin, 8px wide
    const wallH = bodyH - 8;
    this.sensorLeft = addSensor(x - wallX, y, 8, wallH);
    this.sensorRight = addSensor(x + wallX, y, 8, wallH);
    // Clearance at body top (y - halfH + 3) → detects ceilings and walls reaching upper body.
    // 14px tall for reliable overlap with wall tops (covers y-28 to y-14).
    const clearY = -(this.halfH - 3); // = -(24 - 3) = -21
    this.clearLeft = addSensor(x - clearCenter, y + clearY, clearSpan, 14);
    this.clearRight = addSensor(x + clearCenter, y + clearY, clearSpan, 14);
    // Step-up sensor: a wall sensor at y - P (body center if standing 1 tile higher).
    // Detects walls 2+ tiles tall: if clear → 1-tile wall (can step up),
    // if blocked → 2+ tile wall (need jump or turn).
    // Full body height for max coverage at the step-up position.
    // y - P - 1 = 1px above 1-tile wall top to avoid false detection.
    const stepUpY = -(P + 1); // one tile + 1px above body center
    this.sensorStepLeft = addSensor(x - wallX, y + stepUpY, 8, bodyH);
    this.sensorStepRight = addSensor(x + wallX, y + stepUpY, 8, bodyH);
    this.sensorGround = addSensor(x, y + groundY, groundW, 6);
    // Drop sensors: enemy-width wide, jump-height tall, at each bottom corner
    this.sensorDropLeft = addSensor(x - this.halfW, y + dropY, bodyW, dropH);
    this.sensorDropRight = addSensor(x + this.halfW, y + dropY, bodyW, dropH);

    // Store for repositioning and debug drawing
    this._bodyH = bodyH;
    this._wallX = wallX;
    this._clearCenter = clearCenter;
    this._clearSpan = clearSpan;
    this._clearY = clearY;
    this._stepUpY = stepUpY;
    this._groundY = groundY;
    this._groundW = groundW;
    this._dropY = dropY;
    this._dropH = dropH;

    // ── Contact tracking ──
    this._wallLeft = new Set();
    this._wallRight = new Set();
    this._clearLeft = new Set();
    this._clearRight = new Set();
    this._stepLeft = new Set();
    this._stepRight = new Set();
    this._groundContacts = 0;
    this._dropLeft = new Set();
    this._dropRight = new Set();

    const track = (pair, sensor, set) => {
      const { bodyA, bodyB } = pair;
      const other = bodyA === sensor ? bodyB : bodyA;
      if (other === this.sprite.body) return;
      if (!other.isStatic) return;
      if (pair.isActive) set.add(other.id);
      else set.delete(other.id);
    };

    const onSensorPair = (event, delta) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        if (bodyA === this.sensorLeft || bodyB === this.sensorLeft)
          track(pair, this.sensorLeft, this._wallLeft);
        if (bodyA === this.sensorRight || bodyB === this.sensorRight)
          track(pair, this.sensorRight, this._wallRight);
        if (bodyA === this.clearLeft || bodyB === this.clearLeft)
          track(pair, this.clearLeft, this._clearLeft);
        if (bodyA === this.clearRight || bodyB === this.clearRight)
          track(pair, this.clearRight, this._clearRight);
        if (bodyA === this.sensorStepLeft || bodyB === this.sensorStepLeft)
          track(pair, this.sensorStepLeft, this._stepLeft);
        if (bodyA === this.sensorStepRight || bodyB === this.sensorStepRight)
          track(pair, this.sensorStepRight, this._stepRight);
        if (bodyA === this.sensorDropLeft || bodyB === this.sensorDropLeft)
          track(pair, this.sensorDropLeft, this._dropLeft);
        if (bodyA === this.sensorDropRight || bodyB === this.sensorDropRight)
          track(pair, this.sensorDropRight, this._dropRight);
        if (bodyA === this.sensorGround || bodyB === this.sensorGround) {
          const other = bodyA === this.sensorGround ? bodyB : bodyA;
          if (other.isStatic) this._groundContacts += delta;
        }
      }
    };

    scene.matter.world.on('collisionstart', (event) => onSensorPair(event, 1));
    scene.matter.world.on('collisionend', (event) => onSensorPair(event, -1));

    // ── Debug graphics ──
    this._debugGfx = scene.add.graphics().setDepth(100);
  }

  /** Log a thought if debugLog is enabled */
  log(...args) {
    if (this.debugLog) console.log(`[${this.id}]`, ...args);
  }

  get onGround() {
    return this._groundContacts > 0;
  }

  /** Reverse direction and continue moving at full speed */
  turnAround() {
    const { sprite, speed } = this;
    sprite.setFlipX(!sprite.flipX);
    sprite.setVelocityX(sprite.flipX ? speed : -speed);
  }

  /** Keep the walk animation playing (subclasses call at the end of update) */
  keepWalkAnimation() {
    const animKey = this.sprite.anims.currentAnim?.key;
    if (animKey !== 'enemy-walk') {
      this.sprite.play('enemy-walk');
    }
  }

  /**
   * Create a small monospace ID label (origin centered, depth above sprites).
   * @param {string} id
   * @param {string} color
   * @param {string} [backgroundColor='#00000000']
   * @returns {Phaser.GameObjects.Text}
   */
  createLabel(id, color, backgroundColor = '#00000000') {
    return this.scene.add
      .text(0, 0, id, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color,
        backgroundColor,
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(100);
  }

  get wallAhead() {
    return this.sprite.flipX ? this._wallRight.size > 0 : this._wallLeft.size > 0;
  }
  get clearanceBlocked() {
    return this.sprite.flipX ? this._clearRight.size > 0 : this._clearLeft.size > 0;
  }
  /**
   * Step-up sensor at y - P (body center if standing 1 tile higher).
   * Detects walls 2+ tiles tall — if clear, only a 1-tile wall is ahead.
   */
  get stepUpBlocked() {
    return this.sprite.flipX ? this._stepRight.size > 0 : this._stepLeft.size > 0;
  }
  /**
   * Combined drop/edge check.  The drop sensor spans from feet to one tile below,
   * center→edge+½tile wide.  If the leading sensor detects NO ground → true pit.
   * Big jump height + wide body means we can drop to any platform below and jump back.
   */
  get edgeAhead() {
    return this.sprite.flipX ? this._dropRight.size === 0 : this._dropLeft.size === 0;
  }
  /** True when the trailing-side drop sensor still has ground (body spans a narrow gap) */
  get bodySpansGap() {
    return this.sprite.flipX ? this._dropLeft.size > 0 : this._dropRight.size > 0;
  }

  syncSensors() {
    const bx = this.sprite.body.position.x;
    const by = this.sprite.body.position.y;
    const setPos = Phaser.Physics.Matter.Matter.Body.setPosition;
    setPos(this.sensorLeft, { x: bx - this._wallX, y: by });
    setPos(this.sensorRight, { x: bx + this._wallX, y: by });
    setPos(this.clearLeft, { x: bx - this._clearCenter, y: by + this._clearY });
    setPos(this.clearRight, { x: bx + this._clearCenter, y: by + this._clearY });
    setPos(this.sensorStepLeft, { x: bx - this._wallX, y: by + this._stepUpY });
    setPos(this.sensorStepRight, { x: bx + this._wallX, y: by + this._stepUpY });
    setPos(this.sensorGround, { x: bx, y: by + this._groundY });
    setPos(this.sensorDropLeft, { x: bx - this.halfW, y: by + this._dropY });
    setPos(this.sensorDropRight, { x: bx + this.halfW, y: by + this._dropY });
  }

  drawDebug() {
    const g = this._debugGfx;
    g.clear();
    const bx = this.sprite.body.position.x;
    const by = this.sprite.body.position.y;
    const {
      _wallX,
      _clearCenter,
      _clearSpan: ch,
      _clearY,
      _stepUpY,
      _groundY,
      _groundW,
      _dropY,
      _dropH,
      halfW,
    } = this;
    const bodyW = halfW * 2;

    // Wall contact sensors (full body height − 4px margin each end, 8px wide) — red when touching
    const wallH = this._bodyH - 8;
    g.lineStyle(1.5, this._wallLeft.size > 0 ? 0xff3333 : 0x88ff88, 0.7);
    g.strokeRect(bx - _wallX - 4, by - wallH / 2, 8, wallH);
    g.lineStyle(1.5, this._wallRight.size > 0 ? 0xff3333 : 0x88ff88, 0.7);
    g.strokeRect(bx + _wallX - 4, by - wallH / 2, 8, wallH);

    // Clearance sensors (body top) — purple when blocked
    g.lineStyle(1, this._clearLeft.size > 0 ? 0xcc44ff : 0x663388, 0.6);
    g.strokeRect(bx - _clearCenter - ch / 2, by + _clearY - 7, ch, 14);
    g.lineStyle(1, this._clearRight.size > 0 ? 0xcc44ff : 0x663388, 0.6);
    g.strokeRect(bx + _clearCenter - ch / 2, by + _clearY - 7, ch, 14);

    // Step-up sensors (wall sensor at y - P = one tile up, reduced body height) — pink when blocked
    const stepUpH = this._bodyH;
    g.lineStyle(1, this._stepLeft.size > 0 ? 0xff66aa : 0x443355, 0.6);
    g.strokeRect(bx - _wallX - 4, by + _stepUpY - stepUpH / 2, 8, stepUpH);
    g.lineStyle(1, this._stepRight.size > 0 ? 0xff66aa : 0x443355, 0.6);
    g.strokeRect(bx + _wallX - 4, by + _stepUpY - stepUpH / 2, 8, stepUpH);

    // Ground sensor (near body width) — cyan when grounded
    g.lineStyle(1.5, this._groundContacts > 0 ? 0x33aaff : 0x8888ff, 0.7);
    g.strokeRect(bx - _groundW / 2, by + _groundY - 3, _groundW, 6);

    // Drop sensors (enemy-width × jump-height at each bottom corner) — orange when ground, red when pit
    g.lineStyle(1, this._dropLeft.size > 0 ? 0xff8800 : 0xff2200, 0.7);
    g.strokeRect(bx - halfW - halfW, by + _dropY - _dropH / 2, bodyW, _dropH);
    g.lineStyle(1, this._dropRight.size > 0 ? 0xff8800 : 0xff2200, 0.7);
    g.strokeRect(bx, by + _dropY - _dropH / 2, bodyW, _dropH);
  }

  /** Subclasses override with their behavior logic */
  update(time, delta) {
    this.syncSensors();
    this.drawDebug();
    this.sprite.body.angularVelocity = 0;
  }

  destroy() {
    const w = this.scene.matter.world;
    w.remove(this.sensorLeft);
    w.remove(this.sensorRight);
    w.remove(this.clearLeft);
    w.remove(this.clearRight);
    w.remove(this.sensorStepLeft);
    w.remove(this.sensorStepRight);
    w.remove(this.sensorGround);
    w.remove(this.sensorDropLeft);
    w.remove(this.sensorDropRight);
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }
}
