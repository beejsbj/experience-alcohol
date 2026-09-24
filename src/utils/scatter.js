// Deterministic "dried ink" jitter — seeded so layout never dances between renders.

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scatterRand(seed) {
  return mulberry32(hashSeed(String(seed)));
}

/**
 * Seeded scatter transform. r = max |rotation| deg, x/y = max |offset| px.
 */
export function scatter(seed, { r = 2.5, x = 4, y = 3 } = {}) {
  const rand = scatterRand(seed);
  const rot = (rand() * 2 - 1) * r;
  const dx = (rand() * 2 - 1) * x;
  const dy = (rand() * 2 - 1) * y;
  return {
    transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`,
  };
}
