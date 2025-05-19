import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from './phaser/MainScene';

type Direction = 'up' | 'down' | 'left' | 'right';
interface Laser extends Phaser.GameObjects.Rectangle {
  direction: Direction;
}

function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
