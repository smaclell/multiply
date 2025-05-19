# Multiply: A Phaser Arcade Game

Multiply is a fast-paced arcade game built with Phaser, TypeScript, and React. Survive as long as possible by splitting multiplying enemies, collecting power-ups, and maximizing your score!

## Gameplay
- **Move** your player around the arena to avoid and split enemies.
- **Shoot lasers** in four directions to split enemies. Each split creates two new enemies.
- **Collect power-ups** for special effects and advantages.
- **Survive** as long as possible and aim for a high score!

### Controls
- **Move:** WASD keys
- **Shoot:** Arrow keys (hold to fire repeatedly)
- **Restart:** Spacebar (after game over)

### Power-Ups
- **Shield:** Grants a shield that blocks one enemy hit (pressing into an enemy with a shield triggers a shield explosion, pushing enemies away).
- **Explosion:** Your next laser triggers a large explosion, splitting all enemies in a radius for big points.
- **Freeze:** Your next laser freezes the two split enemies, and frozen enemies can spread freeze to others on contact.
- **Speed:** Increases your movement speed (up to a maximum).

### Scoring
- +1 point for each enemy split
- +2 points for shattering a frozen enemy
- +3 points for each enemy destroyed by an explosion
- Your high score is saved locally in your browser

## How to Run
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the development server:**
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack
- [Phaser 3](https://phaser.io/) (game engine)
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) (UI and build tooling)
- [TypeScript](https://www.typescriptlang.org/)

## Project Structure
- `src/phaser/` — Game logic (scenes, player, enemies, power-ups, effects)
- `src/App.tsx` — Embeds the Phaser game in a React component
- `src/main.tsx` — App entry point

## Customization
Game parameters (arena size, speeds, colors, etc.) can be tweaked in `src/phaser/config.ts`.

---

Enjoy the challenge and see how high you can score!
