export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const TILE_SIZE = 16;
// Matter.js velocity = pixels PER STEP (at 60fps ≈ px/16ms)
// To convert from arcade px/s: divide by 60
export const PLAYER_SPEED = 2; // ≈ 120 px/s
export const PLAYER_JUMP = -5.5; // ≈ -330 px/s
export const PLAYER_DASH_SPEED = 6; // ≈ 360 px/s
export const PLAYER_DASH_DURATION = 200;
export const ENEMY_SPEED = 1.5; // ≈ 90 px/s (player is 2.0)
export const ENEMY_JUMP = -5.5; // upward velocity to clear a 1-tile wall (matches player)
// Matter collision categories (bitmasks)
export const CAT = {
  GROUND: 0x0001, // level geometry + world bounds
  PLAYER: 0x0002,
  ENEMY: 0x0004,
};

export const COLORS = {
  // Background layers (darkest to lightest)
  BG_DARK: 0x0a0a1a,
  BG_MID: 0x1a2a3a,
  BG_SKY: 0x2a3a5a,
  BG_MOUNTAIN: 0x1a1a2e,
  BG_HILL: 0x1e2a2a,

  // Terrain
  PLATFORM: 0x2a2a3a,
  PLATFORM_TOP: 0x3a3a5a,
  GROUND_DIRT: 0x5a3a28,
  GROUND_GRASS: 0x3a6a2a,
  GROUND_GRASS_LIGHT: 0x4a8a3a,
  WOOD_DARK: 0x4a2a1a,
  WOOD_MID: 0x6b4423,
  WOOD_LIGHT: 0x8a5a3a,
  LEAF_DARK: 0x2a4a1a,
  LEAF_MID: 0x3a6a2a,
  LEAF_LIGHT: 0x5a9a3a,
  ROOF_TILE: 0x6a3a2a,

  // Decorative
  BUSH: 0x2a5a1a,
  FLOWER_A: 0xff4466,
  FLOWER_B: 0xffaa44,
  FLOWER_C: 0xcc88ff,

  // Characters
  SKELETON_BONE: 0xe8e0d0,
  SKELETON_DARK: 0x6a5a4a,
  SKELETON_GLOW: 0x88ccff,
  ENEMY_BONE: 0xc0b0a0,
  ENEMY_GLOW: 0xff6644,

  // Effects
  PARTICLE: 0x88ccff,
  FIREFLY: 0xccff66,
  MIST: 0x88aacc,
  SHADOW: 0x000011,
};
