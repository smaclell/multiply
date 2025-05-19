import Phaser from 'phaser';
import type { Direction } from './MainScene';

export class Laser extends Phaser.GameObjects.Rectangle {
  direction: Direction;
  freeze: boolean;
  piercing: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    direction: Direction,
    freeze = false,
    piercing = false
  ) {
    super(scene, x, y, width, height, color);
    this.direction = direction;
    this.freeze = freeze;
    this.piercing = piercing;
    scene.add.existing(this);
  }

  move(speed: number) {
    switch (this.direction) {
      case 'left':
        this.x -= speed;
        break;
      case 'right':
        this.x += speed;
        break;
      case 'up':
        this.y -= speed;
        break;
      case 'down':
        this.y += speed;
        break;
    }
  }
}