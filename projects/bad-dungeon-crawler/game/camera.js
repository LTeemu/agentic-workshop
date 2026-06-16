export function createCamera(canvas) {
  const cam = { x: 0, y: 0 };

  function follow(px, py) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    cam.x = Math.round(cx - px);
    cam.y = Math.round(cy - py);
  }

  function worldToScreen(wx, wy) {
    return { x: wx + cam.x, y: wy + cam.y };
  }

  return { cam, follow, worldToScreen };
}
