/**
 * Pure enemy obstacle/AI decisions, extracted so the state machines in
 * PatrolEnemy and FreeroamEnemy stay thin and the logic is unit-testable.
 *
 * Returns the action an enemy should take given its sensor states.
 */

/**
 * Decide how to handle a wall directly ahead (all values are the enemy's
 * current sensor states).
 *
 * Caller must guard with `onGround` before calling — wall-tier decisions are
 * only meaningful while grounded (airborne sensors are unreliable).
 *
 * @param {object} s
 * @param {boolean} s.wallAhead       Wall detected straight ahead.
 * @param {boolean} s.clearanceBlocked Top clearance blocked → 3+ tile wall.
 * @param {boolean} s.stepUpBlocked    Step-up blocked → 2+ tile wall.
 * @returns {'turn'|'jump'|'step'|'none'} Action to take ('none' = keep walking).
 */
export function obstacleDecision({ wallAhead, clearanceBlocked, stepUpBlocked }) {
  if (!wallAhead) return 'none';
  if (clearanceBlocked) return 'turn';
  if (stepUpBlocked) return 'jump';
  return 'step';
}

/**
 * Decide whether an enemy should reverse to avoid an edge/pit ahead.
 *
 * @param {object} s
 * @param {boolean} s.onGround  On solid ground (drop sensor decisions only matter then).
 * @param {boolean} s.edgeAhead Leading drop sensor sees no ground (pit ahead).
 * @returns {boolean} True to turn around.
 */
export function shouldTurnForEdge({ onGround, edgeAhead }) {
  return onGround && edgeAhead;
}
