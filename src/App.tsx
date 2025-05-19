import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    class MainScene extends Phaser.Scene {
      rect: Phaser.GameObjects.Rectangle | null = null;
      cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
      wasd: Record<string, Phaser.Input.Keyboard.Key> | null = null;
      speed = 4;

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
      }

      update() {
        if (!this.rect || !this.cursors || !this.wasd) return;
        let dx = 0, dy = 0;
        if (
          (this.cursors && this.cursors.left && this.cursors.left.isDown) ||
          (this.wasd && this.wasd.left && this.wasd.left.isDown)
        ) dx = -this.speed;
        if (
          (this.cursors && this.cursors.right && this.cursors.right.isDown) ||
          (this.wasd && this.wasd.right && this.wasd.right.isDown)
        ) dx = this.speed;
        if (
          (this.cursors && this.cursors.up && this.cursors.up.isDown) ||
          (this.wasd && this.wasd.up && this.wasd.up.isDown)
        ) dy = -this.speed;
        if (
          (this.cursors && this.cursors.down && this.cursors.down.isDown) ||
          (this.wasd && this.wasd.down && this.wasd.down.isDown)
        ) dy = this.speed;
        this.rect.x = Phaser.Math.Clamp(this.rect.x + dx, 50, 350);
        this.rect.y = Phaser.Math.Clamp(this.rect.y + dy, 50, 350);
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
