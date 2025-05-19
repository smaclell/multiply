import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Phaser.Game | null = null;
    if (gameRef.current) {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 400,
        height: 400,
        parent: gameRef.current,
        backgroundColor: '#1e293b', // Tailwind slate-800
        scene: {
          create() {
            this.add.rectangle(200, 200, 100, 100, 0x38bdf8); // Tailwind sky-400
          },
        },
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
