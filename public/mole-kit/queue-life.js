// Independent of rendering so queue timing can be tested deterministically.
export function createQueueLife(random = Math.random) {
  let remaining = 5.5,
    moving = false,
    velocity = 0;
  return {
    update(dt) {
      remaining -= dt;
      let changed = false;
      if (remaining <= 0) {
        moving = !moving;
        remaining = moving ? 3.5 + random() * 5 : 5 + random() * 3;
        changed = true;
      }
      velocity += ((moving ? 1 : 0) - velocity) * (1 - Math.exp(-dt * 5));
      if (!moving && velocity < 0.015) velocity = 0;
      return { moving, velocity, changed, remaining };
    },
  };
}

// Distances are computed front-to-back, so followers cannot pass a stopped mole.
export function queueAdvances(
  actors,
  distance,
  blockAt,
  spacing,
  blockers = [],
  settleDistance = 0,
) {
  const ordered = actors
    .filter((a) => !a.burrow)
    .slice()
    .sort((a, b) => b.s - a.s);
  const result = new Map();
  let ahead = Infinity;
  for (const a of ordered) {
    const desiredGap = a.gap ?? spacing * 0.82;
    const gap = ahead - a.s - desiredGap;
    const catchUp = Number.isFinite(gap)
      ? Math.min(1.4, Math.max(0, gap / spacing))
      : 0;
    const isBlocker = blockers.includes(a) || Math.abs(a.s - blockAt) < 0.00001;
    const wanted =
      !isBlocker && a.emerge >= 1.6
        ? distance * (1 + catchUp) +
          settleDistance *
            Math.min(1.5, Math.max(0, Number.isFinite(gap) ? gap : 0))
        : 0;
    const step = Math.max(0, Math.min(wanted, ahead - a.s - desiredGap));
    result.set(a, step);
    ahead = a.s + step;
  }
  return result;
}
