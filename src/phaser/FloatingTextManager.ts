import Phaser from 'phaser';
import * as config from './config';

export class FloatingTextManager {
  private scene: Phaser.Scene;
  private texts: { text: Phaser.GameObjects.Text, alphaSpeed: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  add(text: string, x: number, y: number) {
    const t = this.scene.add.text(x, y, text, {
      fontSize: config.FLOATING_TEXT_FONT_SIZE,
      color: config.FLOATING_TEXT_COLOR,
      fontStyle: 'bold',
      stroke: config.FLOATING_TEXT_STROKE,
      strokeThickness: config.FLOATING_TEXT_STROKE_THICKNESS,
    }).setOrigin(0.5);
    t.alpha = 1;
    this.texts.push({ text: t, alphaSpeed: config.FLOATING_TEXT_ALPHA_SPEED });
  }

  update() {
    this.texts = this.texts.filter(obj => {
      obj.text.alpha -= obj.alphaSpeed;
      if (obj.text.alpha <= 0) {
        obj.text.destroy();
        return false;
      }
      return true;
    });
  }

  clear() {
    this.texts.forEach(obj => obj.text.destroy());
    this.texts = [];
  }

  // Optionally, allow texts to finish fading after game end
  finishFading() {
    // No-op: just keep calling update() until all texts are gone
  }
}