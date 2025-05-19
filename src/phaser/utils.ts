// Utility functions for Phaser game
import Phaser from 'phaser';

/**
 * Checks if two circles (or rectangles with radius) are colliding based on their centers and radii.
 */
export function isCircleColliding(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  return Phaser.Math.Distance.Between(x1, y1, x2, y2) < r1 + r2;
}

/**
 * Returns a random spawn position on the edge of a rectangle (arena).
 * Returns { x, y }.
 */
export function randomEdgePosition(width: number, height: number): { x: number, y: number } {
  const edge = Phaser.Math.Between(0, 3);
  let x = 0, y = 0;
  if (edge === 0) { x = 0; y = Phaser.Math.Between(0, height); }
  if (edge === 1) { x = width; y = Phaser.Math.Between(0, height); }
  if (edge === 2) { x = Phaser.Math.Between(0, width); y = 0; }
  if (edge === 3) { x = Phaser.Math.Between(0, width); y = height; }
  return { x, y };
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}