import Phaser from 'phaser';
import { PowerUp } from './PowerUp';
import type { PowerUpType } from './PowerUp';

export class PowerUpManager {
  scene: Phaser.Scene;
  powerUps: PowerUp[] = [];
  arenaWidth: number;
  arenaHeight: number;

  constructor(scene: Phaser.Scene, arenaWidth: number, arenaHeight: number) {
    this.scene = scene;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
  }

  spawnPowerUp() {
    const types: PowerUpType[] = ['shield', 'explosion', 'freeze', 'speed'];
    const type: PowerUpType = types[Phaser.Math.Between(0, types.length - 1)];
    const margin = 60;
    const x = Phaser.Math.Between(margin, this.arenaWidth - margin);
    const y = Phaser.Math.Between(margin, this.arenaHeight - margin);
    const powerUp = new PowerUp(this.scene, x, y, type);
    this.powerUps.push(powerUp);
    return powerUp;
  }

  update(playerX: number, playerY: number, onCollect: (powerUp: PowerUp) => void) {
    this.powerUps = this.powerUps.filter(powerUp => {
      // Fade out after 5 seconds
      const elapsed = this.scene.time.now - powerUp.spawnTime;
      if (elapsed > 4000 && elapsed < 5000) {
        powerUp.alpha = 1 - (elapsed - 4000) / 1000;
      } else if (elapsed >= 5000) {
        powerUp.destroy();
        return false;
      } else {
        powerUp.alpha = 1;
      }
      // Collision with player
      if (Phaser.Math.Distance.Between(playerX, playerY, powerUp.x, powerUp.y) < 40) {
        onCollect(powerUp);
        powerUp.destroy();
        return false;
      }
      return true;
    });
  }

  clear() {
    this.powerUps.forEach(p => p.destroy());
    this.powerUps = [];
  }
}