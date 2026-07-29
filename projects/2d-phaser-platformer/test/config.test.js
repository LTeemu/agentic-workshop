import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  PLAYER_SPEED,
  PLAYER_JUMP,
  PLAYER_DASH_SPEED,
  PLAYER_DASH_DURATION,
  ENEMY_SPEED,
  ENEMY_JUMP,
  CAT,
  COLORS,
} from '../src/config.js';
import { SpriteGenerator } from '../src/generators/SpriteGenerator.js';

describe('config', () => {
  it('has expected dimensions', () => {
    assert.equal(GAME_WIDTH, 800);
    assert.equal(GAME_HEIGHT, 600);
    assert.equal(TILE_SIZE, 16);
  });

  it('has collision categories as bitmasks', () => {
    assert.equal(CAT.GROUND, 0x0001);
    assert.equal(CAT.PLAYER, 0x0002);
    assert.equal(CAT.ENEMY, 0x0004);
  });

  it('has player physics constants', () => {
    assert.equal(PLAYER_SPEED, 2);
    assert.equal(PLAYER_JUMP, -5.5);
    assert.equal(PLAYER_DASH_SPEED, 6);
    assert.equal(PLAYER_DASH_DURATION, 200);
  });

  it('has enemy physics constants', () => {
    assert.equal(ENEMY_SPEED, 1.5);
    assert.equal(ENEMY_JUMP, -5.5);
  });

  it('has COLORS as an object with numeric values', () => {
    assert.equal(typeof COLORS, 'object');
    assert.equal(COLORS.BG_DARK, 0x0a0a1a);
    assert.equal(COLORS.SKELETON_BONE, 0xe8e0d0);
    assert.equal(COLORS.FLOWER_A, 0xff4466);
  });
});

describe('SpriteGenerator.hexToRgba', () => {
  it('converts a hex color to rgba string', () => {
    const result = SpriteGenerator.hexToRgba(0x88ccff, 0.5);
    assert.equal(result, 'rgba(136,204,255,0.5)');
  });

  it('handles dark colors', () => {
    const result = SpriteGenerator.hexToRgba(0x0a0a1a, 0.8);
    assert.equal(result, 'rgba(10,10,26,0.8)');
  });

  it('handles zero alpha', () => {
    const result = SpriteGenerator.hexToRgba(0xffffff, 0);
    assert.equal(result, 'rgba(255,255,255,0)');
  });

  it('handles full alpha', () => {
    const result = SpriteGenerator.hexToRgba(0x000000, 1);
    assert.equal(result, 'rgba(0,0,0,1)');
  });
});
