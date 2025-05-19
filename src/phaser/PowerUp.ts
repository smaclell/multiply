import Phaser from 'phaser';
import * as config from './config';
import type { MainScene } from './MainScene';

export type PowerUpType = 'shield' | 'explosion' | 'freeze' | 'piercing' | 'speed';

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

  applyEffect(scene: MainScene) {
    if (this.type === 'shield') {
      scene.player.addShield();
      scene.showFloatingText('SHIELD!');
    }
    if (this.type === 'explosion') {
      scene.explosionReady = true;
      scene.showFloatingText('EXPLOSION!');
    }
    if (this.type === 'freeze') {
      scene.freezeReady = true;
      scene.showFloatingText('FREEZE!');
    }
    if (this.type === 'speed') {
      scene.player.addSpeed();
      scene.showFloatingText('SPEED UP!');
    }
    // Add more power-up types here
  }
}