// Three straights connected by two semicircular turns. Arc length parameterization
// keeps walking speed constant through the bends.
export const QUEUE_LENGTH = 42 + 2 * Math.PI * 1.2;
export function queuePoint(distance) {
  let s = ((distance % QUEUE_LENGTH) + QUEUE_LENGTH) % QUEUE_LENGTH;
  if (s < 14) return { x: -7 + s, z: -2.4, yaw: Math.PI / 2 };
  s -= 14;
  if (s < Math.PI * 1.2) {
    const t = s / 1.2;
    return {
      x: 7 + 1.2 * Math.sin(t),
      z: -1.2 - 1.2 * Math.cos(t),
      yaw: Math.atan2(Math.cos(t), Math.sin(t)),
    };
  }
  s -= Math.PI * 1.2;
  if (s < 14) return { x: 7 - s, z: 0, yaw: -Math.PI / 2 };
  s -= 14;
  if (s < Math.PI * 1.2) {
    const t = s / 1.2;
    return {
      x: -7 - 1.2 * Math.sin(t),
      z: 1.2 - 1.2 * Math.cos(t),
      yaw: Math.atan2(-Math.cos(t), Math.sin(t)),
    };
  }
  s -= Math.PI * 1.2;
  return { x: -7 + s, z: 2.4, yaw: Math.PI / 2 };
}
