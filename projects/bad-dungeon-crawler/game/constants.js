export const TILE = 28;
export const COLS = 70;
export const ROWS = 50;
export const FOV = { w: 29, h: 21 };

export const T = {
  WALL: 0,
  FLOOR: 1,
  CORRIDOR: 2,
  STAIRS: 3,
};

export const COLORS = {
  // dungeon tiles
  wall: '#14141c',
  wallLight: '#1a1a24',
  wallShadow: '#0e0e14',
  floor: '#282832',
  floorAlt: '#24242e',
  corridor: '#1c1c24',
  corridorAlt: '#1a1a22',
  stairs: '#fbbf24',
  stairsGlow: 'rgba(251, 191, 36, 0.12)',
  grid: 'rgba(255, 255, 255, 0.02)',

  // entities
  player: '#38bdf8',
  playerGlow: 'rgba(56, 189, 248, 0.12)',
  playerCore: '#7dd3fc',

  // vignette
  vignette: 'rgba(5, 5, 8, 0.45)',
};

export const BSP = {
  minLeaf: 8,
  maxDepth: 5,
  roomPad: 1,
  corridorW: 2,
};
