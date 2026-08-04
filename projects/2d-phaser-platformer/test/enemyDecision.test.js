import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { obstacleDecision, shouldTurnForEdge } from '../src/logic/enemyDecision.js';

describe('obstacleDecision', () => {
  const cases = [
    // No wall ahead → keep walking (precedence: sensors ignored when no wall)
    { name: 'no wall → walk', s: { wallAhead: false }, expected: 'none' },
    {
      name: 'no wall but clearance blocked → none',
      s: { wallAhead: false, clearanceBlocked: true, stepUpBlocked: false },
      expected: 'none',
    },
    {
      name: 'no wall but step-up blocked → none',
      s: { wallAhead: false, clearanceBlocked: false, stepUpBlocked: true },
      expected: 'none',
    },
    {
      name: 'no wall, everything cleared → none',
      s: { wallAhead: false, clearanceBlocked: false, stepUpBlocked: false },
      expected: 'none',
    },
    // 3+ tile wall (clearance blocked) always wins, regardless of step-up
    {
      name: '3+ tile wall (both blocked) → turn',
      s: { wallAhead: true, clearanceBlocked: true, stepUpBlocked: true },
      expected: 'turn',
    },
    {
      name: '3+ tile wall (clearance only) → turn',
      s: { wallAhead: true, clearanceBlocked: true, stepUpBlocked: false },
      expected: 'turn',
    },
    // 2-tile wall (clearance clear, step-up blocked) → jump
    {
      name: '2-tile wall → jump',
      s: { wallAhead: true, clearanceBlocked: false, stepUpBlocked: true },
      expected: 'jump',
    },
    // 1-tile wall (clearance & step-up clear) → step
    {
      name: '1-tile wall → step',
      s: { wallAhead: true, clearanceBlocked: false, stepUpBlocked: false },
      expected: 'step',
    },
  ];

  for (const { name, s, expected } of cases) {
    it(name, () => {
      assert.equal(obstacleDecision(s), expected);
    });
  }
});

describe('shouldTurnForEdge', () => {
  it('turns when on ground with a pit ahead', () => {
    assert.equal(shouldTurnForEdge({ onGround: true, edgeAhead: true }), true);
  });
  it('stays when grounded and no pit ahead', () => {
    assert.equal(shouldTurnForEdge({ onGround: true, edgeAhead: false }), false);
  });
  // Edge decision is only meaningful on the ground — airborne drop sensors are unreliable
  it('does not turn in mid-air even if edge sensor reads true', () => {
    assert.equal(shouldTurnForEdge({ onGround: false, edgeAhead: true }), false);
  });
  it('does not turn mid-air with no pit ahead', () => {
    assert.equal(shouldTurnForEdge({ onGround: false, edgeAhead: false }), false);
  });
});
