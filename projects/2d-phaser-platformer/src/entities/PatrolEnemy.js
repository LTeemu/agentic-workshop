import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { ENEMY_JUMP } from '../config.js';

/**
 * PatrolEnemy — walks between patrolLeft/patrolRight bounds,
 * detects obstacles ahead and jumps over 1-tile blockers, turns
 * at 2-tile walls, and reverses at its patrol edge.
 *
 * States: 'walk' → 'jump' → 'walk' (or turn if stuck)
 */
export class PatrolEnemy extends Enemy {
  constructor(scene, x, y, id, patrolLeft, patrolRight, tileW = 2, tileH = 3) {
    super(scene, x, y, tileW, tileH);
    this.id = id;
    this.patrolLeft = patrolLeft;
    this.patrolRight = patrolRight;
    this._patrolY = y; // fixed Y for patrol area indicator (does NOT override sensor offset)
    // ID label for the patrol area bar
    this._areaLabel = scene.add
      .text(0, 0, id, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#ffcc44',
        backgroundColor: '#00000088',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(100);
    // ID label above the enemy sprite
    this._enemyLabel = scene.add
      .text(0, 0, id, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#ffcc44',
        backgroundColor: '#00000000',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(100);
    this._state = 'walk';
    this._stateTimer = 0;

    // Start walking right
    this.sprite.setVelocityX(this.speed);
    this.sprite.setFlipX(true);
    this.sprite.play('enemy-walk');
  }

  /** Draw patrol range indicator (yellow) + ID labels */
  drawDebug() {
    super.drawDebug();
    const g = this._debugGfx;
    const py = this._patrolY;
    // Patrol area bar (fixed Y, won't bounce with jumps)
    g.lineStyle(1, 0xffcc44, 0.3);
    g.beginPath();
    g.moveTo(this.patrolLeft, py);
    g.lineTo(this.patrolRight, py);
    g.stroke();
    // Edge markers
    g.lineStyle(2, 0xffcc44, 0.4);
    g.beginPath();
    g.moveTo(this.patrolLeft, py - 10);
    g.lineTo(this.patrolLeft, py + 10);
    g.moveTo(this.patrolRight, py - 10);
    g.lineTo(this.patrolRight, py + 10);
    g.stroke();
    // ID label at midpoint of patrol area
    const mx = (this.patrolLeft + this.patrolRight) / 2;
    this._areaLabel.setPosition(mx, py - 16);
    // ID label above enemy (follows sprite)
    this._enemyLabel.setPosition(this.sprite.x, this.sprite.y - 32);
  }

  update(time, delta) {
    super.update(time, delta);
    const { sprite } = this;
    const onGround = this.onGround;

    switch (this._state) {
      case 'walk': {
        // Patrol bounds always take priority
        if (sprite.x <= this.patrolLeft) {
          this.log('at patrol LEFT bound → turn right');
          sprite.setPosition(this.patrolLeft, sprite.y);
          sprite.setVelocityX(this.speed);
          sprite.setFlipX(true);
          break;
        }
        if (sprite.x >= this.patrolRight) {
          this.log('at patrol RIGHT bound → turn left');
          sprite.setPosition(this.patrolRight, sprite.y);
          sprite.setVelocityX(-this.speed);
          sprite.setFlipX(false);
          break;
        }

        // Edge ahead (sensor red = no ground in 32×48 zone) → turn, never drop
        if (onGround && this.edgeAhead) {
          this.log('drop sensor red → PIT, turn');
          sprite.setFlipX(!sprite.flipX);
          sprite.setVelocityX(sprite.flipX ? this.speed : -this.speed);
          break;
        }

        // Obstacle ahead — three tiers
        if (this.wallAhead && onGround) {
          if (this.clearanceBlocked) {
            this.log('wall + top clearance BLOCKED → 3+ tile, turn');
            sprite.setFlipX(!sprite.flipX);
            sprite.setVelocityX(sprite.flipX ? this.speed : -this.speed);
          } else if (this.stepUpBlocked) {
            this.log('wall + step-up BLOCKED → 2-tile, full jump');
            sprite.setVelocityY(ENEMY_JUMP);
            sprite.setVelocityX(sprite.flipX ? this.speed : -this.speed);
          } else {
            this.log('wall only → 1-tile, small step');
            sprite.setVelocityY(ENEMY_JUMP * 0.55); // ~ -3.0 → 18px (1-tile step)
            sprite.setVelocityX(sprite.flipX ? this.speed : -this.speed);
          }
          break;
        }

        // Normal forward movement
        sprite.setVelocityX(sprite.flipX ? this.speed : -this.speed);
        break;
      }

      case 'jump':
        sprite.setVelocityX(sprite.flipX ? this.speed * 0.4 : -this.speed * 0.4);

        // Just wait for landing — the decision was already made before we jumped
        if (onGround) {
          this.log(`landed after jump`);
          this._state = 'walk';
        }
        break;
    }

    // Keep walk animation
    const animKey = sprite.anims.currentAnim?.key;
    if (animKey !== 'enemy-walk') {
      sprite.play('enemy-walk');
    }
  }

  destroy() {
    this._areaLabel.destroy();
    this._enemyLabel.destroy();
    super.destroy();
  }
}
