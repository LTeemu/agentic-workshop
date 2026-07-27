# 2D Phaser Platformer — Ground Enemy AI Test

Small test project built with Phaser 3 + Matter.js. Focused on movement mechanics and ground-based enemy patrol/AI.

## Controls

| Key       | Action              |
| --------- | ------------------- |
| W / SPACE | Jump                |
| A / D     | Walk                |
| SHIFT     | Dash                |
| LMB       | Mine (break blocks) |

## Enemies

Two enemy types demonstrate reactive sensor-based AI (no pathfinding):

- **PatrolEnemy** — walks between two X bounds, detects edges (turns at pits), climbs 1-tile steps, jumps 2-tile walls, and reverses at 3+ tile walls.
- **FreeroamEnemy** — same obstacle logic but no patrol bounds; roams freely until blocked by terrain or edges.
