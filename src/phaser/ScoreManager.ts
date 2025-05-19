import Phaser from 'phaser';
import * as config from './config';

export class ScoreManager {
  private scene: Phaser.Scene;
  private score: number = 0;
  private highScore: number = 0;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private highScoreText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Load high score from localStorage
    const savedHighScore = window.localStorage.getItem('multiply_high_score');
    this.highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
    this.createText();
    this.updateText();
  }

  private createText() {
    this.scoreText = this.scene.add.text(24, 18, '', {
      fontSize: '28px',
      color: '#fff',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0, 0).setDepth(30);
    this.highScoreText = this.scene.add.text(config.ARENA_WIDTH - 24, 18, '', {
      fontSize: '28px',
      color: '#fff',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(1, 0).setDepth(30);
  }

  add(points: number) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      window.localStorage.setItem('multiply_high_score', this.highScore.toString());
    }
    this.updateText();
  }

  reset() {
    this.score = 0;
    this.updateText();
  }

  updateText() {
    if (this.scoreText) {
      this.scoreText.text = `Score: ${this.score}`;
    }
    if (this.highScoreText) {
      this.highScoreText.text = `High Score: ${this.highScore}`;
    }
  }

  getScore() {
    return this.score;
  }

  getHighScore() {
    return this.highScore;
  }
}