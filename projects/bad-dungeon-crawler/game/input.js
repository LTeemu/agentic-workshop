const keys = new Set();
const justPressed = new Set();
const GAME_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'e',
  'i',
  'r',
  ' ',
  'tab',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
]);

function handle(e, down) {
  const key = e.key.toLowerCase();

  if (GAME_KEYS.has(key)) {
    e.preventDefault();
  }

  if (down) {
    if (!keys.has(key)) justPressed.add(key);
    keys.add(key);
  } else {
    keys.delete(key);
  }
}

document.addEventListener('keydown', (e) => handle(e, true));
document.addEventListener('keyup', (e) => handle(e, false));

window.addEventListener('blur', () => {
  keys.clear();
  justPressed.clear();
});

export function isDown(key) {
  return keys.has(key);
}

export function wasPressed(key) {
  return justPressed.has(key);
}

export function clearFrame() {
  justPressed.clear();
}

export function init() {}
