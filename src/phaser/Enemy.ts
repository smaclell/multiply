import Phaser from 'phaser';

export class Enemy extends Phaser.GameObjects.Rectangle {
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
        if ((other as Enemy).freezeTimer > 0) {
          force *= 2.5;
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