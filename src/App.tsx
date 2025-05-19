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

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number) {
    super(scene, x, y, w, h, color);
    if (scene.physics) {
      scene.physics.add.existing(this);
    }
  }

  update(target: Phaser.GameObjects.Rectangle, allEnemies: Enemy[]) {
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
        const force = (this.repulsionRadius - odist) / this.repulsionRadius * this.repulsionStrength;
        this.vx += (ox / odist) * force;
        this.vy += (oy / odist) * force;
      }
    }
    // Moved
    this.x += this.vx;
    this.y += this.vy;
    // Clamp to arena
    this.x = Phaser.Math.Clamp(this.x, 18, 400 - 18);
    this.y = Phaser.Math.Clamp(this.y, 18, 400 - 18);
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
      enemySpeed = 1.5; // Start slow
      enemySize = 36;

      constructor() {
        super('MainScene');
      }

      create() {
        this.rect = this.add.rectangle(200, 200, 50, 50, 0x38bdf8);
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
        // Spawn one enemy at a random edge
        const edge = Phaser.Math.Between(0, 3);
        let x = 0, y = 0;
        if (edge === 0) { x = 0; y = Phaser.Math.Between(0, 400); }
        if (edge === 1) { x = 400; y = Phaser.Math.Between(0, 400); }
        if (edge === 2) { x = Phaser.Math.Between(0, 400); y = 0; }
        if (edge === 3) { x = Phaser.Math.Between(0, 400); y = 400; }
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
        const laser = this.add.rectangle(this.rect.x, this.rect.y, laserWidth, laserHeight, 0xef4444) as Laser;
        laser.direction = direction;
        this.lasers.push(laser);
      }

      update() {
        if (!this.rect || !this.cursors || !this.wasd) return;
        let dx = 0, dy = 0;
        if (this.wasd.left.isDown) dx = -this.speed;
        if (this.wasd.right.isDown) dx = this.speed;
        if (this.wasd.up.isDown) dy = -this.speed;
        if (this.wasd.down.isDown) dy = this.speed;
        this.rect.x = Phaser.Math.Clamp(this.rect.x + dx, 25, 375);
        this.rect.y = Phaser.Math.Clamp(this.rect.y + dy, 25, 375);

        this.lasers = this.lasers.filter(laser => {
          if (laser.direction === 'left') laser.x -= this.laserSpeed;
          if (laser.direction === 'right') laser.x += this.laserSpeed;
          if (laser.direction === 'up') laser.y -= this.laserSpeed;
          if (laser.direction === 'down') laser.y += this.laserSpeed;
          return laser.x >= -20 && laser.x <= 420 && laser.y >= -20 && laser.y <= 420;
        });

        // Enemy update
        if (this.rect) {
          for (let i = 0; i < this.enemies.length; i++) {
            this.enemies[i].update(this.rect, this.enemies);
          }
        }
      }

      shutdown() {
        Object.keys(this.shootingDirections).forEach(dir => {
          this.stopShooting(dir as Direction);
        });
      }
    }

    let game: Phaser.Game | null = null;
    if (gameRef.current) {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 400,
        height: 400,
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
