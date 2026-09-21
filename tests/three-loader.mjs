// Resolve the browser's pinned Three.js import map for Node rig tests.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../public/mole-kit/vendor/three.module.js', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
}
