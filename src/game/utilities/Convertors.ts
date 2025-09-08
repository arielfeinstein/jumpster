// utils/coords.ts
import Phaser from "phaser";

type Point = { x: number; y: number };

/**
 * Convert a page (client) coordinate to both Phaser "screen" (canvas) coords
 * and world coords (camera-aware).
 */

//todo: uncomment camera when it's set up
export function pageToPhaser(
  client: Point,
  game: Phaser.Game,
  camera: Phaser.Cameras.Scene2D.Camera
) {
  // 1) Where is the canvas on the page right now?
  const rect = game.canvas.getBoundingClientRect();

  // 2) Convert page coords -> coords relative to the canvas DOM rect
  const relX = client.x - rect.left;
  const relY = client.y - rect.top;

  // 3) Normalize to [0..1] inside the rect (handles CSS scaling)
  const nx = relX / rect.width;
  const ny = relY / rect.height;

  // 4) Map to Phaser's internal "screen" size (game pixels, before camera)
  //    This accounts for resolution/zoom managed by Phaser's Scale Manager.
  const screenX = nx * game.scale.width;
  const screenY = ny * game.scale.height;

  // 5) Convert to world space (respects camera scroll/zoom/rotation)
  const worldPoint = camera.getWorldPoint(screenX, screenY);

  return {
    canvas: { x: screenX, y: screenY }, // Phaser "screen" coords
    world: { x: worldPoint.x, y: worldPoint.y }, // camera/world coords
  };
}