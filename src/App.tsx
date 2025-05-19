import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

type Direction = 'up' | 'down' | 'left' | 'right';
interface Laser extends Phaser.GameObjects.Rectangle {
  direction: Direction;
}

class Enemy extends Phaser.GameObjects.Rectangle {
  vx = 0;
  vy = 0;
  lag = 0.12; // Homing lag factor
  repulsionStrength = 0.8;
  repulsionRadius = 40;
  freezeTimer = 0;
  freezeSpread = false;
  freezeSpreadCount = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number) {
    super(scene, x, y, w, h, color);
    if (scene.physics) {
      scene.physics.add.existing(this);
    }
  }

  update(target: Phaser.GameObjects.Rectangle, allEnemies: Enemy[]) {
    if (this.freezeTimer > 0) {
      this.freezeTimer -= (this.scene.game.loop.delta || 16) / 1000;
      if (this.freezeTimer > 0) {
        this.setFillStyle(0x38bdf8); // blue tint
        return;
      } else {
        this.setFillStyle(0xfacc15); // reset color
        this.freezeTimer = 0;
      }
    }
    // Homing with lag
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      const desiredVx = (dx / dist) * 1.5;
      const desiredVy = (dy / dist) * 1.5;
      this.vx += (desiredVx - this.vx) * this.lag;
      this.vy += (desiredVy - this.vy) * this.lag;
    }
    // Repulsion from other enemies
    for (const other of allEnemies) {
      if (other === this) continue;
      const ox = this.x - other.x;
      const oy = this.y - other.y;
      const odist = Math.hypot(ox, oy);
      if (odist > 0 && odist < this.repulsionRadius) {
        let force = (this.repulsionRadius - odist) / this.repulsionRadius * this.repulsionStrength;
        // Stronger repulsion from frozen enemies
        if (other.freezeTimer > 0) {
          force *= 2.5; // Increase this value for even stronger avoidance
        }
        this.vx += (ox / odist) * force;
        this.vy += (oy / odist) * force;
      }
    }
    // Moved
    this.x += this.vx;
    this.y += this.vy;
    // Clamp to arena
    const scene = this.scene as Phaser.Scene & { arenaWidth?: number; arenaHeight?: number };
    const arenaWidth = scene.arenaWidth ?? 800;
    const arenaHeight = scene.arenaHeight ?? 800;
    this.x = Phaser.Math.Clamp(this.x, 18, arenaWidth - 18);
    this.y = Phaser.Math.Clamp(this.y, 18, arenaHeight - 18);
  }
}

type PowerUpType = 'shield' | 'explosion' | 'freeze' | 'piercing';

class PowerUp extends Phaser.GameObjects.Ellipse {
  type: PowerUpType;
  pulseTween: Phaser.Tweens.Tween;
  spawnTime: number;
  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    super(scene, x, y, 32, 32, 0x22c55e);
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

function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    class MainScene extends Phaser.Scene {
      rect: Phaser.GameObjects.Rectangle | null = null;
      cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
      wasd: Record<string, Phaser.Input.Keyboard.Key> | null = null;
      speed = 4;
      lasers: Laser[] = [];
      laserSpeed = 8;
      shootingDirections: Partial<Record<Direction, { timer: number | null }>> = {};
      shootDelay = 250; // ms before first repeat
      shootInterval = 120; // ms between shots
      enemies: Enemy[] = [];
      powerUps: PowerUp[] = [];
      enemySpeed = 1.5; // Start slow
      enemySize = 36;
      arenaWidth = 800;
      arenaHeight = 800;
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

      constructor() {
        super('MainScene');
      }

      create() {
        this.rect = this.add.rectangle(this.arenaWidth / 2, this.arenaHeight / 2, 50, 50, 0x38bdf8);
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
        const edge = Phaser.Math.Between(0, 3);
        let x = 0, y = 0;
        if (edge === 0) { x = 0; y = Phaser.Math.Between(0, this.arenaHeight); }
        if (edge === 1) { x = this.arenaWidth; y = Phaser.Math.Between(0, this.arenaHeight); }
        if (edge === 2) { x = Phaser.Math.Between(0, this.arenaWidth); y = 0; }
        if (edge === 3) { x = Phaser.Math.Between(0, this.arenaWidth); y = this.arenaHeight; }
        const enemy = new Enemy(this, x, y, this.enemySize, this.enemySize, 0xfacc15);
        this.add.existing(enemy);
        this.enemies.push(enemy);
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
        if (!this.rect) return;
        const laserWidth = direction === 'left' || direction === 'right' ? 30 : 8;
        const laserHeight = direction === 'up' || direction === 'down' ? 30 : 8;
        let color = 0xef4444;
        if (this.freezeReady && this.freezeLaserIndex == null) {
          color = 0x38bdf8; // blue for freeze
        }
        const laser = this.add.rectangle(this.rect.x, this.rect.y, laserWidth, laserHeight, color) as Laser;
        laser.direction = direction;
        this.lasers.push(laser);
        // Mark this laser as the freeze laser if needed
        if (this.freezeReady && this.freezeLaserIndex == null) {
          this.freezeLaserIndex = this.lasers.length - 1;
        }
      }

      update() {
        if (this.gameOver) return;
        if (!this.rect || !this.cursors || !this.wasd) return;
        let dx = 0, dy = 0;
        if (this.wasd.left.isDown) dx = -this.speed;
        if (this.wasd.right.isDown) dx = this.speed;
        if (this.wasd.up.isDown) dy = -this.speed;
        if (this.wasd.down.isDown) dy = this.speed;
        this.rect.x = Phaser.Math.Clamp(this.rect.x + dx, 25, this.arenaWidth - 25);
        this.rect.y = Phaser.Math.Clamp(this.rect.y + dy, 25, this.arenaHeight - 25);

        // Laser movement and bounds
        this.lasers = this.lasers.filter(laser => {
          if (laser.direction === 'left') laser.x -= this.laserSpeed;
          if (laser.direction === 'right') laser.x += this.laserSpeed;
          if (laser.direction === 'up') laser.y -= this.laserSpeed;
          if (laser.direction === 'down') laser.y += this.laserSpeed;
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
            const dist = Phaser.Math.Distance.Between(laser.x, laser.y, enemy.x, enemy.y);
            if (dist < this.enemySize / 2 + 8) { // 8 is half laser thickness
              if (enemy.freezeTimer > 0) {
                // Shatter effect: destroy, show text, blue burst
                this.showFloatingText('SHATTER!');
                const shatter = this.add.circle(enemy.x, enemy.y, 24, 0x38bdf8, 0.5).setDepth(10);
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
                  const newEnemy = new Enemy(this, ex, ey, this.enemySize, this.enemySize, 0xfacc15);
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

        // Power-up collision and fade out
        this.powerUps = this.powerUps.filter(powerUp => {
          // Fade out after 5 seconds
          const elapsed = this.time.now - powerUp.spawnTime;
          if (elapsed > 4000 && elapsed < 5000) {
            powerUp.alpha = 1 - (elapsed - 4000) / 1000;
          } else if (elapsed >= 5000) {
            powerUp.destroy();
            return false;
          } else {
            powerUp.alpha = 1;
          }
          if (Phaser.Math.Distance.Between(this.rect!.x, this.rect!.y, powerUp.x, powerUp.y) < 40) {
            this.collectPowerUp(powerUp);
            powerUp.destroy();
            return false;
          }
          return true;
        });

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
          const dist = Phaser.Math.Distance.Between(this.rect.x, this.rect.y, enemy.x, enemy.y);
          if (dist < (this.enemySize + 50) / 2) { // 50 is player size
            if (this.shieldCount > 0) {
              this.shieldCount--;
              this.showFloatingText('SHIELD BLOCKED!');
              // Optionally, destroy the enemy that hit
              enemy.destroy();
              this.enemies.splice(i, 1);
              // Shield explosion: push back all nearby enemies
              this.shieldExplosion(this.rect.x, this.rect.y);
              break;
            } else {
              this.endGame();
              break;
            }
          }
        }
        // --- End Game Over check ---

        // Show shield count as floating text (persistent)
        if (this.shieldCount > 0) {
          if (!this._shieldText) {
            this._shieldText = this.add.text(this.rect!.x, this.rect!.y - 70, '', {
              fontSize: '24px',
              color: '#22c55e',
              fontStyle: 'bold',
              stroke: '#000',
              strokeThickness: 4,
            }).setOrigin(0.5);
            this._shieldText.setDepth(20);
          }
          this._shieldText.text = `Shields: ${this.shieldCount}`;
          this._shieldText.x = this.rect!.x;
          this._shieldText.y = this.rect!.y - 70;
          this._shieldText.alpha = 1;
        } else if (this._shieldText) {
          this._shieldText.destroy();
          this._shieldText = null;
        }

        // Enemy update
        if (this.rect) {
          for (let i = 0; i < this.enemies.length; i++) {
            this.enemies[i].update(this.rect, this.enemies);
          }
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
        const types: PowerUpType[] = ['shield', 'explosion', 'freeze'];
        const type: PowerUpType = types[Phaser.Math.Between(0, types.length - 1)];
        const margin = 60;
        const x = Phaser.Math.Between(margin, this.arenaWidth - margin);
        const y = Phaser.Math.Between(margin, this.arenaHeight - margin);
        const powerUp = new PowerUp(this, x, y, type);
        this.powerUps.push(powerUp);
      }

      collectPowerUp(powerUp: PowerUp) {
        if (powerUp.type === 'shield') {
          this.shieldCount++;
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
        const t = this.add.text(this.rect!.x, this.rect!.y - 40, text, {
          fontSize: '32px',
          color: '#22c55e',
          fontStyle: 'bold',
          stroke: '#000',
          strokeThickness: 4,
        }).setOrigin(0.5);
        t.alpha = 1;
        this.floatingTexts.push({ text: t, alphaSpeed: 0.025 });
      }

      endGame() {
        this.gameOver = true;
        // Fade overlay
        if (!this.fadeOverlay) {
          this.fadeOverlay = this.add.rectangle(this.arenaWidth / 2, this.arenaHeight / 2, this.arenaWidth, this.arenaHeight, 0x888888, 0.25).setDepth(5);
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
        this.powerUps.forEach(p => p.destroy());
        this.powerUps = [];
        this.floatingTexts.forEach(obj => obj.text.destroy());
        this.floatingTexts = [];
        if (this._shieldText) {
          this._shieldText.destroy();
          this._shieldText = null;
        }
        if (this.rect) {
          this.rect.x = this.arenaWidth / 2;
          this.rect.y = this.arenaHeight / 2;
        }
        // Reset state
        this.playerShield = false;
        this.shieldCount = 0;
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
        const edge = Phaser.Math.Between(0, 3);
        let x = 0, y = 0;
        if (edge === 0) { x = 0; y = Phaser.Math.Between(0, this.arenaHeight); }
        if (edge === 1) { x = this.arenaWidth; y = Phaser.Math.Between(0, this.arenaHeight); }
        if (edge === 2) { x = Phaser.Math.Between(0, this.arenaWidth); y = 0; }
        if (edge === 3) { x = Phaser.Math.Between(0, this.arenaWidth); y = this.arenaHeight; }
        const enemy = new Enemy(this, x, y, this.enemySize, this.enemySize, 0xfacc15);
        this.add.existing(enemy);
        this.enemies.push(enemy);
      }

      shieldExplosion(x: number, y: number) {
        // Visual effect: white circle that quickly expands and fades
        const explosion = this.add.circle(x, y, 30, 0xffffff, 0.5).setDepth(10);
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
        const explosion = this.add.circle(x, y, 40, 0xf59e42, 0.5).setDepth(10);
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
          const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
          if (dist < explosionRadius) {
            // Split this enemy (like a laser hit)
            for (let k = 0; k < 2; k++) {
              const angle = Math.random() * Math.PI * 2;
              const spawnDist = 18;
              const ex = enemy.x + Math.cos(angle) * spawnDist;
              const ey = enemy.y + Math.sin(angle) * spawnDist;
              const newEnemy = new Enemy(this, ex, ey, this.enemySize, this.enemySize, 0xfacc15);
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

      freezeEffect(x: number, y: number) {
        // Visual effect: blue circle that quickly expands and fades
        const freezeRadius = 120;
        const freezeDuration = 2; // seconds
        const freeze = this.add.circle(x, y, 30, 0x38bdf8, 0.4).setDepth(10);
        this.tweens.add({
          targets: freeze,
          radius: { from: 30, to: freezeRadius },
          alpha: { from: 0.4, to: 0 },
          duration: 350,
          onComplete: () => freeze.destroy(),
        });
        // Freeze all enemies in radius
        for (const enemy of this.enemies) {
          const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
          if (dist < freezeRadius) {
            enemy.freezeTimer = freezeDuration;
          }
        }
      }
    }

    let game: Phaser.Game | null = null;
    if (gameRef.current) {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 800,
        parent: gameRef.current,
        backgroundColor: '#1e293b', // Tailwind slate-800
        scene: MainScene,
      });
    }
    return () => {
      if (game) {
        game.destroy(true);
      }
    };
  }, []);

  return <div ref={gameRef} className="flex items-center justify-center w-full h-screen" />;
}

export default function App() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-slate-900">
      <PhaserGame />
    </div>
  );
}
