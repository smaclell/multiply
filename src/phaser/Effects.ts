import Phaser from 'phaser';
import * as config from './config';
import { Enemy } from './Enemy';

export class Effects {
  static shieldExplosion(scene: Phaser.Scene, x: number, y: number) {
    // Visual effect: white circle that quickly expands and fades
    const explosion = scene.add.circle(x, y, 30, config.SHIELD_EXPLOSION_COLOR, 0.5).setDepth(10);
    scene.tweens.add({
      targets: explosion,
      radius: { from: 30, to: 100 },
      alpha: { from: 0.5, to: 0 },
      duration: 350,
      onComplete: () => explosion.destroy(),
    });
  }

  static explosionEffect(scene: Phaser.Scene, x: number, y: number, enemies: Enemy[], enemySize: number): number {
    // Visual effect: orange circle that quickly expands and fades
    const explosionRadius = 180;
    const explosion = scene.add.circle(x, y, 40, config.EXPLOSION_COLOR, 0.5).setDepth(10);
    scene.tweens.add({
      targets: explosion,
      radius: { from: 40, to: explosionRadius },
      alpha: { from: 0.5, to: 0 },
      duration: 400,
      onComplete: () => explosion.destroy(),
    });
    // Affect all enemies in radius
    let destroyedCount = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i] as Enemy;
      if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= explosionRadius + enemySize / 2) {
        // Split this enemy (like a laser hit)
        for (let k = 0; k < 2; k++) {
          const angle = Math.random() * Math.PI * 2;
          const spawnDist = 18;
          const ex = enemy.x + Math.cos(angle) * spawnDist;
          const ey = enemy.y + Math.sin(angle) * spawnDist;
          const newEnemy = new Enemy(scene, ex, ey, enemySize, enemySize, config.ENEMY_COLOR);
          // Knockback velocity
          const knockback = 6 + Math.random() * 2;
          newEnemy.vx = Math.cos(angle) * knockback;
          newEnemy.vy = Math.sin(angle) * knockback;
          scene.add.existing(newEnemy);
          enemies.push(newEnemy);
        }
        // Push back the original enemy and then destroy it
        const pushAngle = Math.atan2(enemy.y - y, enemy.x - x);
        enemy.vx += Math.cos(pushAngle) * 12;
        enemy.vy += Math.sin(pushAngle) * 12;
        enemy.destroy();
        enemies.splice(i, 1);
        destroyedCount++;
      }
    }
    return destroyedCount;
  }
}