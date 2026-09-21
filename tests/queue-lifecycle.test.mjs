import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceLifecycle } from "../public/mole-kit/queue-lifecycle.js";

test("stopping mid-exit still recycles and finishes emergence", () => {
  const a = { s: 48, emerge: 2, exitAge: null };
  advanceLifecycle(a, 0.1, 1 / 60, 49);
  assert.equal(a.exitAge, 0);
  let recycled = 0;
  for (let i = 0; i < 180; i++)
    recycled += Number(advanceLifecycle(a, 0, 1 / 60, 49));
  assert.equal(recycled, 1);
  assert.equal(a.s, 0);
  assert.equal(a.exitAge, null);
  assert.equal(a.emerge, 2);
});

test("emergence cannot be restarted by catch-up and completes while stopped", () => {
  const a = { s: 0, emerge: 0, exitAge: null };
  for (let i = 0; i < 60; i++) advanceLifecycle(a, 0.5, 1 / 60, 49);
  assert.equal(a.s, 0);
  for (let i = 0; i < 90; i++) advanceLifecycle(a, 0, 1 / 60, 49);
  assert.equal(a.emerge, 2);
  advanceLifecycle(a, 0.2, 1 / 60, 49);
  assert.equal(a.s, 0.2);
});

test("many repeated arrivals each complete exactly once", () => {
  const a = { s: 0, emerge: 2, exitAge: null };
  let completed = 0;
  for (let i = 0; i < 36000; i++) {
    const moving = Math.floor(i / 180) % 2;
    completed += Number(advanceLifecycle(a, moving * 0.12, 1 / 60, 49));
    assert.ok(a.exitAge == null || a.exitAge < 0.85);
    assert.ok(a.emerge >= 0 && a.emerge <= 2);
  }
  assert.ok(completed > 20);
});
