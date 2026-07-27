import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { SpriteGenerator } from '../generators/SpriteGenerator.js';

/**
 * BootScene — generates all textures and transitions to GameScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // Dark background while loading
    this.cameras.main.setBackgroundColor(0x000000);

    // Loading text
    const loadText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LOADING...', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#334466',
    });
    loadText.setOrigin(0.5);
    loadText.setAlpha(0.5);

    // Generate all textures
    SpriteGenerator.generate(this);

    // Subtle loading animation
    this.tweens.add({
      targets: loadText,
      alpha: 1,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        // Fade camera to game scene
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('GameScene');
        });
      },
    });
  }
}
