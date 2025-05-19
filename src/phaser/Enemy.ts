import Phaser from 'phaser';
import * as config from './config';

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
    // Reset freezeSpread when thawed
    if (this.freezeTimer <= 0) {
      this.freezeSpread = false;
      this.freezeSpreadCount = 0;
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

  static spreadFreeze(enemies: Enemy[], freezeDuration: number) {
    for (let i = 0; i < enemies.length; i++) {
      const e1 = enemies[i];
      if (e1.freezeTimer > 0 && !e1.freezeSpread && e1.freezeSpreadCount < 2) {
        for (let j = 0; j < enemies.length; j++) {
          if (i === j) continue;
          const e2 = enemies[j];
          if (e2.freezeTimer <= 0) {
            const d = Phaser.Math.Distance.Between(e1.x, e1.y, e2.x, e2.y);
            if (d < e1.width) { // use enemy size for spread radius
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
    }
  }

  splitAndKnockback(direction: 'left' | 'right' | 'up' | 'down'): Enemy[] {
    let angle = 0;
    if (direction === 'left') angle = Math.PI;
    if (direction === 'right') angle = 0;
    if (direction === 'up') angle = -Math.PI / 2;
    if (direction === 'down') angle = Math.PI / 2;
    const newEnemies: Enemy[] = [];
    for (let k = 0; k < 2; k++) {
      const offsetAngle = angle + (Math.random() - 0.5) * 0.5; // Slight random spread
      const spawnDist = 18;
      const ex = this.x + Math.cos(offsetAngle) * spawnDist;
      const ey = this.y + Math.sin(offsetAngle) * spawnDist;
      const newEnemy = new Enemy(this.scene, ex, ey, config.ENEMY_SIZE, config.ENEMY_SIZE, config.ENEMY_COLOR);
      // Knockback velocity
      const knockback = 6 + Math.random() * 2;
      newEnemy.vx = Math.cos(offsetAngle) * knockback;
      newEnemy.vy = Math.sin(offsetAngle) * knockback;
      (this.scene as Phaser.Scene).add.existing(newEnemy);
      newEnemies.push(newEnemy);
    }
    return newEnemies;
  }
}