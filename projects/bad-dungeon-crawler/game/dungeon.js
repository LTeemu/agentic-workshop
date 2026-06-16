import { COLS, ROWS, T, BSP } from './constants.js';

class BSPNode {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.left = null;
    this.right = null;
    this.room = null;
  }

  split() {
    if (this.left) return false;
    const isWide = this.w / this.h >= 1.25;
    const isTall = this.h / this.w >= 1.25;
    const vert = isWide ? false : isTall ? true : Math.random() < 0.5;
    const max = (vert ? this.h : this.w) - BSP.minLeaf * 2;
    if (max < BSP.minLeaf) return false;
    const split = BSP.minLeaf + Math.floor(Math.random() * max);
    if (vert) {
      this.left = new BSPNode(this.x, this.y, this.w, split);
      this.right = new BSPNode(this.x, this.y + split, this.w, this.h - split);
    } else {
      this.left = new BSPNode(this.x, this.y, split, this.h);
      this.right = new BSPNode(this.x + split, this.y, this.w - split, this.h);
    }
    return true;
  }

  isLeaf() {
    return !this.left;
  }
}

function makeRoom(x, y, w, h) {
  const pad = BSP.roomPad;
  const rw = w - pad * 2 - 1;
  const rh = h - pad * 2 - 1;
  if (rw < 3 || rh < 3) return null;
  const rx = x + pad + Math.floor(Math.random() * (w - pad * 2 - rw));
  const ry = y + pad + Math.floor(Math.random() * (h - pad * 2 - rh));
  return { x: rx, y: ry, w: rw, h: rh };
}

function carveRoom(map, room) {
  for (let r = room.y; r < room.y + room.h; r++)
    for (let c = room.x; c < room.x + room.w; c++)
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) map[r][c] = T.FLOOR;
}

function hCorridor(map, x1, x2, y) {
  const from = Math.min(x1, x2);
  const to = Math.max(x1, x2);
  for (let x = from; x <= to; x++)
    for (let d = 0; d < BSP.corridorW; d++)
      if (y + d < ROWS && x < COLS && map[y + d][x] === T.WALL) map[y + d][x] = T.CORRIDOR;
}

function vCorridor(map, y1, y2, x) {
  const from = Math.min(y1, y2);
  const to = Math.max(y1, y2);
  for (let y = from; y <= to; y++)
    for (let d = 0; d < BSP.corridorW; d++)
      if (y < ROWS && x + d < COLS && map[y][x + d] === T.WALL) map[y][x + d] = T.CORRIDOR;
}

function roomCenter(r) {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function connectRooms(map, a, b) {
  const ca = roomCenter(a),
    cb = roomCenter(b);
  if (Math.random() < 0.5) {
    hCorridor(map, ca.x, cb.x, ca.y);
    vCorridor(map, ca.y, cb.y, cb.x);
  } else {
    vCorridor(map, ca.y, cb.y, ca.x);
    hCorridor(map, ca.x, cb.x, cb.y);
  }
}

function buildTree(node, depth) {
  if (depth >= BSP.maxDepth || !node.split()) return;
  buildTree(node.left, depth + 1);
  buildTree(node.right, depth + 1);
}

function carveTree(node) {
  if (node.isLeaf()) {
    node.room = makeRoom(node.x, node.y, node.w, node.h);
    return node.room;
  }
  const a = carveTree(node.left);
  const b = carveTree(node.right);
  if (a && b) connectRooms(map, a, b);
  node.room = a || b;
  return node.room;
}

export let map = [];
let rooms = [];

export { T };

export function generate() {
  map = Array.from({ length: ROWS }, () => Array(COLS).fill(T.WALL));
  rooms = [];

  const root = new BSPNode(0, 0, COLS, ROWS);
  buildTree(root, 0);
  carveTree(root);

  collectRooms(root);
  placeStairs();
  return { map, rooms };
}

function collectRooms(node) {
  if (!node) return;
  if (node.isLeaf() && node.room) rooms.push(node.room);
  collectRooms(node.left);
  collectRooms(node.right);
}

function placeStairs() {
  const last = rooms[rooms.length - 1];
  if (!last) return;
  const c = roomCenter(last);
  if (c.y < ROWS && c.x < COLS) map[c.y][c.x] = T.STAIRS;
}

export function getSpawn() {
  if (!rooms.length) return { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
  const c = roomCenter(rooms[0]);
  return { x: c.x, y: c.y };
}

export function isWalkable(col, row) {
  if (Number.isNaN(col) || Number.isNaN(row)) return false;
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  return map[row][col] !== T.WALL;
}

export function getRooms() {
  return rooms;
}
