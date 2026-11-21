// The Pulse city: a night skyline made the same way every time. Each person has one fixed window (their "slot").
// Pure drawing data, shared by the website and the phone app.

export const SCENE = { w: 720, h: 300, ground: 278 } as const;
export const WIN = { w: 6, h: 8 } as const;

export type Win = { x: number; y: number };
export type Building = { x: number; y: number; w: number; h: number; wins: Win[]; roof: "flat" | "antenna" | "tank" | "step" };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function row(rand: () => number, minH: number, maxH: number, minW: number, maxW: number, windows: boolean): Building[] {
  const out: Building[] = [];
  let x = -6;
  while (x < SCENE.w) {
    const w = Math.round(minW + rand() * (maxW - minW));
    const h = Math.round(minH + rand() * (maxH - minH));
    const y = SCENE.ground - h;
    const wins: Win[] = [];
    if (windows) {
      const cols = Math.max(2, Math.floor((w - 8) / 10));
      const rows = Math.floor((h - 18) / 13);
      const left = x + (w - (cols * 10 - 4)) / 2;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) wins.push({ x: left + c * 10, y: y + 10 + r * 13 });
    }
    const pick = rand();
    out.push({ x, y, w, h, wins, roof: pick < 0.3 ? "antenna" : pick < 0.5 ? "tank" : pick < 0.7 ? "step" : "flat" });
    x += w + Math.round(1 + rand() * 5);
  }
  return out;
}

export function buildCity() {
  const rand = rng(20261122);
  const back = row(rand, 90, 240, 30, 56, false);
  const front = row(rand, 70, 215, 36, 62, true);
  // spread people around the city: windows are numbered in a fixed shuffled order, not left to right
  const all: Win[] = front.flatMap((b) => b.wins);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const stars = Array.from({ length: 46 }, () => ({ x: rand() * SCENE.w, y: rand() * 120, r: 0.5 + rand() * 0.9, o: 0.3 + rand() * 0.6 }));
  const lamps = Array.from({ length: 9 }, (_, i) => 40 + i * 80 + Math.round(rand() * 20));
  return { back, front, slots: all, stars, lamps };
}

export const CITY = buildCity();
/** Where window number `slot` is. Wraps around if the city has fewer windows than the server hands out. */
export const windowAt = (slot: number): Win => CITY.slots[slot % CITY.slots.length];
