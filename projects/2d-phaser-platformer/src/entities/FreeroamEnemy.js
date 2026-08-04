import { Enemy } from './Enemy.js';
import { ENEMY_JUMP } from '../config.js';
import { obstacleDecision, shouldTurnForEdge } from '../logic/enemyDecision.js';

/**
 * FreeroamEnemy — walks freely with no patrol bounds.
 * Jumps over 1-tile obstacles, turns at 2-tile walls.
 *
 * States: 'walk' → 'jump' → 'walk' (or turn if stuck)
 */
export class FreeroamEnemy extends Enemy {
  constructor(scene, x, y, id, tileW = 2, tileH = 3) {
    super(scene, x, y, tileW, tileH);
    this.id = id;
    // NOTE: _patrolY not needed for freeroam since it has no patrol bar
    this._state = 'walk';
    this._stateTimer = 0;
    // ID label above enemy sprite
    this._enemyLabel = scene.add
      .text(0, 0, id, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#44ffcc',
        backgroundColor: '#00000000',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(100);
    this.sprite.setVelocityX(this.speed);
    this.sprite.setFlipX(true);
    this.sprite.play('enemy-walk');
  }

  drawDebug() {
    super.drawDebug();
    this._enemyLabel.setPosition(this.sprite.x, this.sprite.y - 32);
  }

  update(time, delta) {
    super.update(time, delta);
    const { sprite } = this;
    const onGround = this.onGround;

    switch (this._state) {
      case 'walk': {
        // Edge ahead (sensor red = no ground in 32×48 zone) → turn, never drop
        if (shouldTurnForEdge({ onGround, edgeAhead: this.edgeAhead })) {
          this.log('drop sensor red → PIT, turn');
          this.turnAround();
          break;
        }

        // Obstacle ahead — three tiers
        if (onGround) {
          const decision = obstacleDecision({
            wallAhead: this.wallAhead,
            clearanceBlocked: this.clearanceBlocked,
            stepUpBlocked: this.stepUpBlocked,
          });
          if (decision === 'turn') {
            // 3+ tile wall — turn
            sprite.setFlipX(!sprite.flipX);
            sprite.setVelocityX(sprite.flipX ? this.speed : -this.speed);
            break;
          }
          if (decision === 'jump') {
            // 2-tile wall — full jump with failure check
            this._state = 'jump';
            this._stateTimer = 0;
            sprite.setVelocityY(ENEMY_JUMP);
            sprite.setVelocityX(sprite.flipX ? this.speed * 0.4 : -this.speed * 0.4);
            break;
          }
          if (decision === 'step') {
            // 1-tile wall — small step
            sprite.setVelocityY(ENEMY_JUMP * 0.55);
            sprite.setVelocityX(sprite.flipX ? this.speed : -this.speed);
            break;
          }
          // decision === 'none' → fall through to normal movement
        }

        // Normal forward movement
        sprite.setVelocityX(sprite.flipX ? this.speed : -this.speed);
        break;
      }

      case 'jump':
        this._stateTimer += delta;
        sprite.setVelocityX(sprite.flipX ? this.speed * 0.4 : -this.speed * 0.4);

        // Only check after minimum airtime
        if (this._stateTimer > 200) {
          // wallAhead + clearanceBlocked → 3+ tile wall (jump failed)
          if (this.wallAhead && this.clearanceBlocked) {
            // Jump failed — turn around
            sprite.setFlipX(!sprite.flipX);
            sprite.setVelocityX(sprite.flipX ? this.speed : -this.speed);
          }
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
    this._enemyLabel.destroy();
    super.destroy();
  }
}
