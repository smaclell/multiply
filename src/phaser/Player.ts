import Phaser from 'phaser';
import * as config from './config';

export class Player extends Phaser.GameObjects.Rectangle {
  speed: number = config.PLAYER_SPEED;
  shieldCount: number = 0;
  // Add more player properties as needed (health, score, upgrades, etc.)

  constructor(scene: Phaser.Scene, x: number, y: number, size: number = config.PLAYER_SIZE, color: number = config.PLAYER_COLOR) {
    super(scene, x, y, size, size, color);
    scene.add.existing(this);
  }

  move(dx: number, dy: number, minX: number, maxX: number, minY: number, maxY: number) {
    this.x = Phaser.Math.Clamp(this.x + dx, minX, maxX);
    this.y = Phaser.Math.Clamp(this.y + dy, minY, maxY);
  }

  addShield() {
    this.shieldCount++;
  }

  useShield(): boolean {
    if (this.shieldCount > 0) {
      this.shieldCount--;
      return true;
    }
    return false;
  }

  // Add more player methods as needed
}