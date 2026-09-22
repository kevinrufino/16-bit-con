import assert from 'node:assert/strict';
import { test } from 'node:test';
import { queuePoint, QUEUE_LENGTH, QUEUE_CORNERS } from '../public/mole-kit/queue-path.js';
test('queue bends are continuous and preserve walking speed',()=>{
  const ds=.0001;
  for(let s=.001;s<QUEUE_LENGTH-.001;s+=.017){
    const a=queuePoint(s),b=queuePoint(s+ds);
    assert.ok(Math.abs(Math.hypot(b.x-a.x,b.z-a.z)/ds-1)<.001);
    assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw),Math.cos(a.yaw)))<=Math.PI);
  }
  for(const corner of QUEUE_CORNERS){
    const a=queuePoint(corner-ds),b=queuePoint(corner+ds);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<ds*2.01);
  }
});
test('queue can recycle positions consistently',()=>{
  for(let s=.1;s<QUEUE_LENGTH;s+=.37){
    const a=queuePoint(s),b=queuePoint(s+QUEUE_LENGTH),c=queuePoint(s-QUEUE_LENGTH);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-10);
    assert.ok(Math.hypot(a.x-c.x,a.z-c.z)<1e-10);
  }
});
