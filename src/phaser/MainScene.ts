import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { PowerUp } from './PowerUp';
import { isCircleColliding, randomEdgePosition } from './utils';
import { Laser } from './Laser';
import { PowerUpManager } from './PowerUpManager';
import { Player } from './Player';
import * as config from './config';

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
  floatingTexts: { text: Phaser.GameObjects.Text, alphaSpeed: number }[] = [];
  gameOver = false;
  fadeOverlay: Phaser.GameObjects.Rectangle | null = null;
  fadeTween: Phaser.Tweens.Tween | null = null;
  _shieldText: Phaser.GameObjects.Text | null = null;
  explosionReady = false;
  freezeReady = false;
  freezeLaserIndex: number | null = null;
  score: number = 0;
  scoreText: Phaser.GameObjects.Text | null = null;
  highScore: number = 0;
  highScoreText: Phaser.GameObjects.Text | null = null;

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
    this.score = 0;
    // High score from localStorage
    const savedHighScore = window.localStorage.getItem('multiply_high_score');
    this.highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
    this.scoreText = this.add.text(24, 18, 'Score: 0', {
      fontSize: '28px',
      color: '#fff',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0, 0).setDepth(30);
    this.highScoreText = this.add.text(this.arenaWidth - 24, 18, `High Score: ${this.highScore}`, {
      fontSize: '28px',
      color: '#fff',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(1, 0).setDepth(30);
  }

  startShooting(direction: Direction) {
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
    if (!this.player) return;
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
            // Remove the hit enemy
            enemy.destroy();
            this.enemies.splice(j, 1);
            this.updateScore(1); // +1 for normal split
            // Remove the laser
            lasersToRemove.add(laser);
            // Calculate knockback direction
            let angle = 0;
            if (laser.direction === 'left') angle = Math.PI;
            if (laser.direction === 'right') angle = 0;
            if (laser.direction === 'up') angle = -Math.PI / 2;
            if (laser.direction === 'down') angle = Math.PI / 2;
            // Spawn two new enemies with knockback
            for (let k = 0; k < 2; k++) {
              const offsetAngle = angle + (Math.random() - 0.5) * 0.5; // Slight random spread
              const spawnDist = 18;
              const ex = enemy.x + Math.cos(offsetAngle) * spawnDist;
              const ey = enemy.y + Math.sin(offsetAngle) * spawnDist;
              const newEnemy = new Enemy(this, ex, ey, this.enemySize, this.enemySize, config.ENEMY_COLOR);
              // Knockback velocity
              const knockback = 6 + Math.random() * 2;
              newEnemy.vx = Math.cos(offsetAngle) * knockback;
              newEnemy.vy = Math.sin(offsetAngle) * knockback;
              this.add.existing(newEnemy);
              newEnemies.push(newEnemy);
            }
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
            this.explosionEffect(laser.x, laser.y);
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
    this.floatingTexts = this.floatingTexts.filter(obj => {
      obj.text.alpha -= obj.alphaSpeed;
      if (obj.text.alpha <= 0) {
        obj.text.destroy();
        return false;
      }
      return true;
    });

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
          this.shieldExplosion(this.player.x, this.player.y);
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

    // Freeze spread: if any enemy touches a frozen enemy, they also freeze (only once per enemy, and only two others per freeze event)
    const freezeDuration = 2;
    for (let i = 0; i < this.enemies.length; i++) {
      const e1 = this.enemies[i];
      if (e1.freezeTimer > 0 && !e1.freezeSpread && e1.freezeSpreadCount < 2) {
        for (let j = 0; j < this.enemies.length; j++) {
          if (i === j) continue;
          const e2 = this.enemies[j];
          if (e2.freezeTimer <= 0) {
            const d = Phaser.Math.Distance.Between(e1.x, e1.y, e2.x, e2.y);
            if (d < this.enemySize) {
              e2.freezeTimer = freezeDuration;
              e2.freezeSpread = false; // allow e2 to spread once
              e2.freezeSpreadCount = 0;
              e1.freezeSpreadCount++;
              if (e1.freezeSpreadCount >= 2) {
                e1.freezeSpread = true; // e1 has spread freeze to two, don't spread again
                break;
              }
            }
          }
        }
      }
      // Reset freezeSpread when thawed
      if (e1.freezeTimer <= 0) {
        e1.freezeSpread = false;
        e1.freezeSpreadCount = 0;
      }
    }
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
    if (powerUp.type === 'shield') {
      this.player.addShield();
      this.showFloatingText('SHIELD!');
    }
    if (powerUp.type === 'explosion') {
      this.explosionReady = true;
      this.showFloatingText('EXPLOSION!');
    }
    if (powerUp.type === 'freeze') {
      this.freezeReady = true;
      this.showFloatingText('FREEZE!');
    }
    // Add more power-up types here
  }

  showFloatingText(text: string) {
    const t = this.add.text(this.player.x, this.player.y - 40, text, {
      fontSize: config.FLOATING_TEXT_FONT_SIZE,
      color: config.FLOATING_TEXT_COLOR,
      fontStyle: 'bold',
      stroke: config.FLOATING_TEXT_STROKE,
      strokeThickness: config.FLOATING_TEXT_STROKE_THICKNESS,
    }).setOrigin(0.5);
    t.alpha = 1;
    this.floatingTexts.push({ text: t, alphaSpeed: config.FLOATING_TEXT_ALPHA_SPEED });
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
    this.floatingTexts.forEach(obj => obj.text.destroy());
    this.floatingTexts = [];
    if (this._shieldText) {
      this._shieldText.destroy();
      this._shieldText = null;
    }
    this.player.x = this.arenaWidth / 2;
    this.player.y = this.arenaHeight / 2;
    this.player.shieldCount = 0;
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
    this.score = 0;
    if (this.scoreText) {
      this.scoreText.text = 'Score: 0';
    }
    // Do not reset high score
  }

  shieldExplosion(x: number, y: number) {
    // Visual effect: white circle that quickly expands and fades
    const explosion = this.add.circle(x, y, 30, config.SHIELD_EXPLOSION_COLOR, 0.5).setDepth(10);
    this.tweens.add({
      targets: explosion,
      radius: { from: 30, to: 100 },
      alpha: { from: 0.5, to: 0 },
      duration: 350,
      onComplete: () => explosion.destroy(),
    });
    // Push back all nearby enemies
    for (const enemy of this.enemies) {
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < 100) {
        const angle = Math.atan2(enemy.y - y, enemy.x - x);
        const force = 12 * (1 - dist / 100); // Stronger if closer
        enemy.vx += Math.cos(angle) * force;
        enemy.vy += Math.sin(angle) * force;
      }
    }
  }

  explosionEffect(x: number, y: number) {
    // Visual effect: orange circle that quickly expands and fades
    const explosionRadius = 180;
    const explosion = this.add.circle(x, y, 40, config.EXPLOSION_COLOR, 0.5).setDepth(10);
    this.tweens.add({
      targets: explosion,
      radius: { from: 40, to: explosionRadius },
      alpha: { from: 0.5, to: 0 },
      duration: 400,
      onComplete: () => explosion.destroy(),
    });
    // Affect all enemies in radius
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (isCircleColliding(x, y, explosionRadius, enemy.x, enemy.y, this.enemySize / 2)) {
        // Split this enemy (like a laser hit)
        for (let k = 0; k < 2; k++) {
          const angle = Math.random() * Math.PI * 2;
          const spawnDist = 18;
          const ex = enemy.x + Math.cos(angle) * spawnDist;
          const ey = enemy.y + Math.sin(angle) * spawnDist;
          const newEnemy = new Enemy(this, ex, ey, this.enemySize, this.enemySize, config.ENEMY_COLOR);
          // Knockback velocity
          const knockback = 6 + Math.random() * 2;
          newEnemy.vx = Math.cos(angle) * knockback;
          newEnemy.vy = Math.sin(angle) * knockback;
          this.add.existing(newEnemy);
          this.enemies.push(newEnemy);
        }
        // Push back the original enemy and then destroy it
        const pushAngle = Math.atan2(enemy.y - y, enemy.x - x);
        enemy.vx += Math.cos(pushAngle) * 12;
        enemy.vy += Math.sin(pushAngle) * 12;
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  updateScore(points: number) {
    this.score += points;
    if (this.scoreText) {
      this.scoreText.text = `Score: ${this.score}`;
    }
    if (this.score > this.highScore) {
      this.highScore = this.score;
      if (this.highScoreText) {
        this.highScoreText.text = `High Score: ${this.highScore}`;
      }
      window.localStorage.setItem('multiply_high_score', this.highScore.toString());
    }
  }
}