import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createQueueLife,
  queueAdvances,
} from "../public/mole-kit/queue-life.js";

test("queue alternates bounded irregular stops and runs with smooth speed", () => {
  const values = [0.1, 0.9, 0.7, 0.2];
  let index = 0;
  const queue = createQueueLife(() => values[index++ % values.length]);
  let previous = 0,
    stopped = 0,
    moving = 0;
  const transitions = [];
  for (let f = 0; f < 3600; f++) {
    const state = queue.update(1 / 60);
    assert.ok(state.velocity >= 0 && state.velocity <= 1);
    assert.ok(Math.abs(state.velocity - previous) < 0.09);
    previous = state.velocity;
    if (state.changed) transitions.push(state);
    if (state.velocity === 0) stopped++;
    if (state.velocity > 0.95) moving++;
  }
  assert.ok(stopped > 120 && moving > 120);
  assert.ok(new Set(transitions.map((t) => t.remaining)).size > 2);
  transitions.forEach((t, i) => {
    if (i) assert.notEqual(t.moving, transitions[i - 1].moving);
    assert.ok(t.remaining >= 3 && t.remaining <= 8.5);
  });
});

test("a chat hold-up stops followers but not people ahead; recovery preserves spacing", () => {
  const actors = [0, 2, 4, 6].map((s) => ({ s, emerge: 2, burrow: null }));
  let result = queueAdvances(actors, 0.1, 4, 2);
  assert.equal(result.get(actors[2]), 0);
  assert.equal(result.get(actors[3]), 0.1);
  assert.ok(result.get(actors[1]) > 0, "followers close available space");
  assert.ok(actors[1].s + result.get(actors[1]) <= actors[2].s - 2 * 0.82);
  result = queueAdvances(actors, 0.1, -1, 2);
  assert.ok(actors.every((a) => result.get(a) >= 0.1));
  const wideGap = [
    { s: 0, emerge: 2 },
    { s: 6, emerge: 2 },
  ];
  const catchUp = queueAdvances(wideGap, 0.1, -1, 2);
  assert.ok(catchUp.get(wideGap[0]) > catchUp.get(wideGap[1]));
  actors[2].emerge = 0;
  result = queueAdvances(actors, 1, -1, 2);
  assert.equal(result.get(actors[2]), 0);
  assert.ok(actors[1].s + result.get(actors[1]) <= actors[2].s - 2 * 0.82);
  actors[2].burrow = {};
  result = queueAdvances(actors, 0.1, -1, 2);
  assert.equal(result.has(actors[2]), false);
});

test("varied personal gaps close even while forward motion is paused", () => {
  const actors = [
    { s: 0, emerge: 2, gap: 1.2 },
    { s: 4, emerge: 2, gap: 1.45 },
    { s: 8, emerge: 2, gap: 1.3 },
  ];
  for (let frame = 0; frame < 900; frame++) {
    const steps = queueAdvances(actors, 0, -1, 2, [], 1.4 / 60);
    for (const a of actors) a.s += steps.get(a);
  }
  assert.ok(Math.abs(actors[1].s - actors[0].s - 1.2) < 0.01);
  assert.ok(Math.abs(actors[2].s - actors[1].s - 1.45) < 0.01);
  assert.equal(actors[2].s, 8);
});
