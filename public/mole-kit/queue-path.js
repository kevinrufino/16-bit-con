// A serpentine of straight rows joined by semicircular U-turns. Rows share a
// right edge and step in from the left as they go back, so the line reads as
// shorter runs stacked behind the front of the queue. Arc length
// parameterization keeps walking speed constant through the bends.
const RADIUS = 1.2; // half the gap between rows, so turns meet them tangentially
const RIGHT = 7;

// Back of the queue first. Each row's `to` is the next row's `from`.
const ROWS = [
  { z: -7.2, from: -0.5, to: RIGHT },
  { z: -4.8, from: RIGHT, to: -4 },
  { z: -2.4, from: -4, to: RIGHT },
  { z: 0, from: RIGHT, to: -RIGHT },
  { z: 2.4, from: -RIGHT, to: RIGHT },
];

const segments = [];
let total = 0;
ROWS.forEach((row, i) => {
  const direction = Math.sign(row.to - row.from);
  segments.push({
    turn: false,
    start: total,
    length: Math.abs(row.to - row.from),
    z: row.z,
    from: row.from,
    direction,
  });
  total += segments.at(-1).length;
  const next = ROWS[i + 1];
  if (!next) return;
  segments.push({
    turn: true,
    start: total,
    length: Math.PI * RADIUS,
    // The bend wraps the end the row finishes on, bulging away from the rows.
    x: row.to,
    cz: (row.z + next.z) / 2,
    zFrom: row.z,
    sign: direction,
  });
  total += segments.at(-1).length;
});

export const QUEUE_LENGTH = total;
/** Corner distances, for tests and for anything that needs to skip a bend. */
export const QUEUE_CORNERS = segments
  .filter((s) => s.turn)
  .flatMap((s) => [s.start, s.start + s.length]);

export function queuePoint(distance) {
  const s = ((distance % QUEUE_LENGTH) + QUEUE_LENGTH) % QUEUE_LENGTH;
  let segment = segments[0];
  for (const candidate of segments) {
    if (s >= candidate.start) segment = candidate;
    else break;
  }
  const local = s - segment.start;
  if (!segment.turn)
    return {
      x: segment.from + segment.direction * local,
      z: segment.z,
      yaw: segment.direction > 0 ? Math.PI / 2 : -Math.PI / 2,
    };
  const t = local / RADIUS;
  return {
    x: segment.x + segment.sign * RADIUS * Math.sin(t),
    z: segment.cz + (segment.zFrom - segment.cz) * Math.cos(t),
    yaw: Math.atan2(segment.sign * Math.cos(t), Math.sin(t)),
  };
}
