import Phaser from 'phaser';
import * as config from './config';

export type PowerUpType = 'shield' | 'explosion' | 'freeze' | 'piercing';

export class PowerUp extends Phaser.GameObjects.Ellipse {
  type: PowerUpType;
  pulseTween: Phaser.Tweens.Tween;
  spawnTime: number;
  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    super(scene, x, y, 32, 32, config.POWERUP_COLOR);
    this.type = type;
    this.spawnTime = scene.time.now;
    scene.add.existing(this);
    // Pulsate
    this.pulseTween = scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.3 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  destroy(fromScene?: boolean) {
    this.pulseTween?.stop();
    super.destroy(fromScene);
  }
}