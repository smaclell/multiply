import Phaser from 'phaser';
import * as config from './config';

export class Player extends Phaser.GameObjects.Rectangle {
  speed: number = config.PLAYER_SPEED;
  shieldCount: number = 0;
  private _shieldText: Phaser.GameObjects.Text | null = null;
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

  addSpeed(amount: number = 0.75) {
    this.speed = Math.min(this.speed + amount, config.PLAYER_SPEED_MAX);
  }

  update() {
    // Handle shield text UI
    if (this.shieldCount > 0) {
      if (!this._shieldText) {
        this._shieldText = this.scene.add.text(this.x, this.y - 70, '', {
          fontSize: '24px',
          color: config.SHIELD_TEXT_COLOR,
          fontStyle: 'bold',
          stroke: config.SHIELD_TEXT_STROKE,
          strokeThickness: config.SHIELD_TEXT_STROKE_THICKNESS,
        }).setOrigin(0.5);
        this._shieldText.setDepth(20);
      }
      if (this._shieldText) {
        this._shieldText.text = `Shields: ${this.shieldCount}`;
        this._shieldText.x = this.x;
        this._shieldText.y = this.y - 70;
        this._shieldText.alpha = 1;
      }
    } else if (this._shieldText) {
      this._shieldText.destroy();
      this._shieldText = null;
    }
  }

  reset(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.shieldCount = 0;
    this.speed = config.PLAYER_SPEED;
    this.destroyShieldText();
  }

  destroyShieldText() {
    if (this._shieldText) {
      this._shieldText.destroy();
      this._shieldText = null;
    }
  }

  // Add more player methods as needed
}