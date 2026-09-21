import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextStop,nearestStop} from '../src/scripts/scroll-guide.mjs';
const anchors=[1000,1900,2800];
test('one gesture advances exactly one session',()=>{assert.equal(nextStop(1000,1,anchors,500,3700),1900);assert.equal(nextStop(2800,-1,anchors,500,3700),1900);});
test('between sessions resolves in intended direction',()=>{assert.equal(nextStop(1400,1,anchors,500,3700),1900);assert.equal(nextStop(1400,-1,anchors,500,3700),1000);});
test('first and last sessions have exits',()=>{assert.equal(nextStop(1000,-1,anchors,500,3700),500);assert.equal(nextStop(2800,1,anchors,500,3700),3700);});
test('fractional scroll positions do not repeat a session',()=>assert.equal(nextStop(1899.5,1,anchors,500,3700),2800));
test('scrollbar release settles to closest session',()=>assert.equal(nearestStop(2351,anchors),2800));
