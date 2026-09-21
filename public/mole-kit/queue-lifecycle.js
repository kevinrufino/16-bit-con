// Queue stops must never freeze an attendee halfway through the ground.
export function advanceLifecycle(actor, step, dt, length, held = false) {
  actor.emerge = Math.min(2, actor.emerge + dt);
  if (held) {
    actor.exitAge = null;
    actor.s = (actor.s + step) % length;
    return false;
  }
  if (actor.exitAge != null) {
    actor.exitAge += dt;
    if (actor.exitAge >= 0.85) {
      actor.s = 0;
      actor.emerge = 0;
      actor.exitAge = null;
      return true;
    }
    return false;
  }
  // Never move an emerging actor; finish emerging before advancing again.
  if (actor.emerge < 1.6) return false;
  actor.s = Math.min(length - 0.01, actor.s + step);
  if (actor.s >= length - 1.3) actor.exitAge = 0;
  return false;
}
