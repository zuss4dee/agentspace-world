/** Tiny hash noise for terrain, foliage, and material variation. */

export function hash2(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function fbm(x: number, y: number) {
  return hash2(x, y) * 0.51 + hash2(x * 2.13, y * 2.27) * 0.27 + hash2(x * 4.07, y * 4.31) * 0.14 + hash2(x * 8.3, y * 7.9) * 0.08;
}

export function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const m = (s: number, e: number) => Math.round(s + (e - s) * t);
  const r = m((pa >> 16) & 255, (pb >> 16) & 255);
  const g = m((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = m(pa & 255, pb & 255);
  return `rgb(${r},${g},${bl})`;
}
