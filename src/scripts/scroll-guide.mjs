/** A gesture advances exactly one boundary; positions between stops resolve in its direction. */
export function nextStop(y, direction, anchors, before, after) {
  const tolerance=3;
  if(direction>0) return anchors.find(value=>value>y+tolerance) ?? after;
  return [...anchors].reverse().find(value=>value<y-tolerance) ?? before;
}
export function nearestStop(y, anchors) {
  return anchors.reduce((best,value)=>Math.abs(value-y)<Math.abs(best-y)?value:best,anchors[0]);
}
