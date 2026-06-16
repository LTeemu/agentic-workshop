export function rand(min, max) {
  if (max < min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}
