import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { PowerUp } from './PowerUp';
import { isCircleColliding, randomEdgePosition } from './utils';
import { Laser } from './Laser';
import { PowerUpManager } from './PowerUpManager';
import { Player } from './Player';
import * as config from './config';
import { FloatingTextManager } from './FloatingTextManager';
import { Effects } from './Effects';
import { ScoreManager } from './ScoreManager';

export type Direction = 'up' | 'down' | 'left' | 'right';

export class MainScene extends Phaser.Scene {
  player!: Player;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  wasd: Record<string, Phaser.Input.Keyboard.Key> | null = null;
  speed = config.PLAYER_SPEED;
  lasers: Laser[] = [];
  laserSpeed = config.LASER_SPEED;
  shootingDirections: Partial<Record<Direction, { timer: number | null }>> = {};
  shootDelay = config.LASER_SHOOT_DELAY;
  shootInterval = config.LASER_SHOOT_INTERVAL;
  enemies: Enemy[] = [];
  powerUpManager!: PowerUpManager;
  enemySpeed = config.ENEMY_SPEED;
  enemySize = config.ENEMY_SIZE;
  arenaWidth = config.ARENA_WIDTH;
  arenaHeight = config.ARENA_HEIGHT;
  hitsUntilPowerUp = Phaser.Math.Between(3, 7);
  playerShield = false;
  shieldCount = 0;
  floatingTextManager!: FloatingTextManager;
  gameOver = false;
  fadeOverlay: Phaser.GameObjects.Rectangle | null = null;
  fadeTween: Phaser.Tweens.Tween | null = null;
  _shieldText: Phaser.GameObjects.Text | null = null;
  explosionReady = false;
  freezeReady = false;
  freezeLaserIndex: number | null = null;
  scoreManager!: ScoreManager;

  constructor() {
    super('MainScene');
  }

  create() {
    this.player = new Player(this, this.arenaWidth / 2, this.arenaHeight / 2, config.PLAYER_SIZE, config.PLAYER_COLOR);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-LEFT', () => this.startShooting('left'), this);
    this.input.keyboard!.on('keyup-LEFT', () => this.stopShooting('left'), this);
    this.input.keyboard!.on('keydown-RIGHT', () => this.startShooting('right'), this);
    this.input.keyboard!.on('keyup-RIGHT', () => this.stopShooting('right'), this);
    this.input.keyboard!.on('keydown-UP', () => this.startShooting('up'), this);
    this.input.keyboard!.on('keyup-UP', () => this.stopShooting('up'), this);
    this.input.keyboard!.on('keydown-DOWN', () => this.startShooting('down'), this);
    this.input.keyboard!.on('keyup-DOWN', () => this.stopShooting('down'), this);
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (this.gameOver) {
        this.restartGame();
      }
    });
    // Spawn one enemy at a random edge
    const { x, y } = randomEdgePosition(this.arenaWidth, this.arenaHeight);
    const enemy = new Enemy(this, x, y, this.enemySize, this.enemySize, config.ENEMY_COLOR);
    this.add.existing(enemy);
    this.enemies.push(enemy);
    // PowerUpManager
    this.powerUpManager = new PowerUpManager(this, this.arenaWidth, this.arenaHeight);
    this.scoreManager = new ScoreManager(this);
    this.floatingTextManager = new FloatingTextManager(this);
  }

  startShooting(direction: Direction) {
    if (this.gameOver) return;
    if (this.shootingDirections[direction]?.timer) return;
    this.shootLaser(direction);
    const timeout = window.setTimeout(() => {
      const interval = window.setInterval(() => {
        this.shootLaser(direction);
      }, this.shootInterval);
      this.shootingDirections[direction]!.timer = interval;
    }, this.shootDelay);
    this.shootingDirections[direction] = { timer: timeout };
  }

  stopShooting(direction: Direction) {
    const entry = this.shootingDirections[direction];
    if (entry && entry.timer !== null) {
      window.clearTimeout(entry.timer);
      window.clearInterval(entry.timer);
    }
    delete this.shootingDirections[direction];
  }

  shootLaser(direction: Direction) {
    if (this.gameOver) return;
    const laserWidth = direction === 'left' || direction === 'right' ? config.LASER_WIDTH : config.LASER_HEIGHT;
    const laserHeight = direction === 'up' || direction === 'down' ? config.LASER_WIDTH : config.LASER_HEIGHT;
    let color = config.LASER_COLOR;
    let freeze = false;
    if (this.freezeReady && this.freezeLaserIndex == null) {
      color = config.LASER_FREEZE_COLOR; // blue for freeze
      freeze = true;
    }
    const laser = new Laser(this, this.player.x, this.player.y, laserWidth, laserHeight, color, direction, freeze);
    this.lasers.push(laser);
    // Mark this laser as the freeze laser if needed
    if (this.freezeReady && this.freezeLaserIndex == null) {
      this.freezeLaserIndex = this.lasers.length - 1;
    }
  }

  update() {
    // Always move lasers and remove off-screen ones
    this.lasers = this.lasers.filter(laser => {
      laser.move(this.laserSpeed);
      return laser.x >= -20 && laser.x <= this.arenaWidth + 20 && laser.y >= -20 && laser.y <= this.arenaHeight + 20;
    });
    // Always update floating texts, even after game over
    this.floatingTextManager.update();
    if (this.gameOver) return;
    if (!this.cursors || !this.wasd) return;
    let dx = 0, dy = 0;
    if (this.wasd.left.isDown) dx = -this.speed;
    if (this.wasd.right.isDown) dx = this.speed;
    if (this.wasd.up.isDown) dy = -this.speed;
    if (this.wasd.down.isDown) dy = this.speed;
    this.player.move(dx, dy, 25, this.arenaWidth - 25, 25, this.arenaHeight - 25);

    // Laser movement and bounds
    this.lasers = this.lasers.filter(laser => {
      laser.move(this.laserSpeed);
      return laser.x >= -20 && laser.x <= this.arenaWidth + 20 && laser.y >= -20 && laser.y <= this.arenaHeight + 20;
    });

    // --- Splitting and knockback logic ---
    const newEnemies: Enemy[] = [];
    const lasersToRemove: Set<Laser> = new Set();
    for (let i = 0; i < this.lasers.length; i++) {
      const laser = this.lasers[i];
      let hit = false;
      for (let j = 0; j < this.enemies.length; j++) {
        const enemy = this.enemies[j];
        if (isCircleColliding(laser.x, laser.y, 8, enemy.x, enemy.y, this.enemySize / 2)) {
          if (enemy.freezeTimer > 0) {
            // Shatter effect: destroy, show text, blue burst
            this.showFloatingText('SHATTER!');
            this.updateScore(2); // +2 for shatter
            const shatter = this.add.circle(enemy.x, enemy.y, 24, config.SHATTER_COLOR, 0.5).setDepth(10);
            this.tweens.add({
              targets: shatter,
              radius: { from: 24, to: 60 },
              alpha: { from: 0.5, to: 0 },
              duration: 300,
              onComplete: () => shatter.destroy(),
            });
            enemy.destroy();
            this.enemies.splice(j, 1);
            lasersToRemove.add(laser);
          } else {
            // Split the enemy into two new enemies
            const splitEnemies = enemy.splitAndKnockback(laser.direction);
            // Remove the hit enemy
            enemy.destroy();
            this.enemies.splice(j, 1);
            this.updateScore(1); // +1 for normal split
            // Remove the laser
            lasersToRemove.add(laser);
            // Add the two new enemies
            newEnemies.push(...splitEnemies);
          }
          // Power-up spawn logic
          this.hitsUntilPowerUp--;
          if (this.hitsUntilPowerUp <= 0) {
            this.spawnPowerUp();
            this.hitsUntilPowerUp = Phaser.Math.Between(3, 7);
          }
          // Explosion power-up logic
          if (this.explosionReady) {
            this.explosionReady = false;
            const destroyed = Effects.explosionEffect(this, laser.x, laser.y, this.enemies, this.enemySize);
            if (destroyed > 0) this.updateScore(destroyed);
          }
          // Freeze power-up logic
          if (this.freezeReady && this.freezeLaserIndex === i) {
            this.freezeReady = false;
            this.freezeLaserIndex = null;
            // Freeze only the two split enemies
            const freezeDuration = 2;
            for (const e of newEnemies.slice(-2)) {
              e.freezeTimer = freezeDuration;
            }
          }
          hit = true;
          break; // Only one enemy can be hit by a laser at a time
        }
      }
      if (hit) continue; // Skip to next laser if this one hit
    }
    // Remove hit lasers
    lasersToRemove.forEach(laser => laser.destroy());
    this.lasers = this.lasers.filter(l => !lasersToRemove.has(l));
    // Add new split enemies
    this.enemies.push(...newEnemies);
    // --- End splitting and knockback logic ---

    // Power-up update and collection
    this.powerUpManager.update(this.player.x, this.player.y, (powerUp) => this.collectPowerUp(powerUp));

    // Floating text update
    this.floatingTextManager.update();

    // --- Game Over check ---
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (isCircleColliding(this.player.x, this.player.y, config.PLAYER_SIZE / 2, enemy.x, enemy.y, this.enemySize / 2)) {
        if (this.player.useShield()) {
          this.showFloatingText('SHIELD BLOCKED!');
          // Optionally, destroy the enemy that hit
          enemy.destroy();
          this.enemies.splice(i, 1);
          // Shield explosion: push back all nearby enemies
          Effects.shieldExplosion(this, this.player.x, this.player.y);
          break;
        } else {
          this.endGame();
          break;
        }
      }
    }
    // --- End Game Over check ---

    // Show shield count as floating text (persistent)
    if (this.player.shieldCount > 0) {
      if (!this._shieldText) {
        this._shieldText = this.add.text(this.player.x, this.player.y - 70, '', {
          fontSize: '24px',
          color: config.SHIELD_TEXT_COLOR,
          fontStyle: 'bold',
          stroke: config.SHIELD_TEXT_STROKE,
          strokeThickness: config.SHIELD_TEXT_STROKE_THICKNESS,
        }).setOrigin(0.5);
        this._shieldText.setDepth(20);
      }
      if (this._shieldText) {
        this._shieldText.text = `Shields: ${this.player.shieldCount}`;
        this._shieldText.x = this.player.x;
        this._shieldText.y = this.player.y - 70;
        this._shieldText.alpha = 1;
      }
    } else if (this._shieldText) {
      this._shieldText.destroy();
      this._shieldText = null;
    }

    // Enemy update
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].update(this.player, this.enemies);
    }

    // If all enemies are eliminated, spawn a new one
    if (!this.gameOver && this.enemies.length === 0) {
      const { x, y } = randomEdgePosition(this.arenaWidth, this.arenaHeight);
      const enemy = new Enemy(this, x, y, this.enemySize, this.enemySize, config.ENEMY_COLOR);
      this.add.existing(enemy);
      this.enemies.push(enemy);
    }

    // Freeze spread: if any enemy touches a frozen enemy, they also freeze (only once per enemy, and only two others per freeze event)
    const freezeDuration = 2;
    Enemy.spreadFreeze(this.enemies, freezeDuration);

    this.player.update();
  }

  shutdown() {
    Object.keys(this.shootingDirections).forEach(dir => {
      this.stopShooting(dir as Direction);
    });
  }

  spawnPowerUp() {
    this.powerUpManager.spawnPowerUp();
  }

  collectPowerUp(powerUp: PowerUp) {
    powerUp.applyEffect(this);
  }

  showFloatingText(text: string) {
    if (this.gameOver) return;
    this.floatingTextManager.add(text, this.player.x, this.player.y - 40);
  }

  endGame() {
    this.gameOver = true;
    // Fade overlay
    if (!this.fadeOverlay) {
      this.fadeOverlay = this.add.rectangle(this.arenaWidth / 2, this.arenaHeight / 2, this.arenaWidth, this.arenaHeight, config.FADE_OVERLAY_COLOR, 0.25).setDepth(5);
    }
    this.fadeTween = this.tweens.add({
      targets: this.fadeOverlay,
      alpha: { from: 0, to: 0.85 },
      duration: 2400,
      ease: 'Sine.easeInOut',
    });
  }

  restartGame() {
    // Remove all game objects except fade overlay
    this.lasers.forEach(l => l.destroy());
    this.lasers = [];
    this.enemies.forEach(e => e.destroy());
    this.enemies = [];
    this.powerUpManager.clear();
    this.floatingTextManager.clear();
    this.player.reset(this.arenaWidth / 2, this.arenaHeight / 2);
    // Reset state
    this.playerShield = false;
    this.hitsUntilPowerUp = Phaser.Math.Between(3, 7);
    this.gameOver = false;
    // Reset all power-up states
    this.explosionReady = false;
    this.freezeReady = false;
    this.freezeLaserIndex = null;
    // Remove fade overlay
    if (this.fadeOverlay) {
      this.fadeOverlay.destroy();
      this.fadeOverlay = null;
    }
    // Spawn one enemy at a random edge
    const { x, y } = randomEdgePosition(this.arenaWidth, this.arenaHeight);
    const enemy = new Enemy(this, x, y, this.enemySize, this.enemySize, config.ENEMY_COLOR);
    this.add.existing(enemy);
    this.enemies.push(enemy);
    this.scoreManager.reset();
  }

  updateScore(points: number) {
    this.scoreManager.add(points);
  }
}