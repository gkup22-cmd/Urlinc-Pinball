export const W = 500;
export const H = 900;
export const BALL_R = 10;
export const LEFT = 12;
export const RIGHT = 488;
export const LANE = 455;
export const ARC = { x: 250, y: 250, r: 238 };
export const PIVOTS = { left: { x: 150, y: 770 }, right: { x: 317, y: 770 } };
export const FLEN = 72;
export const FR0 = 11;
export const FR1 = 6;
export const REST = 0.5;
export const UP = -0.48;
export const PLUNGER_Y = 880;
export const BALL_START = { x: (LANE + RIGHT) / 2, y: PLUNGER_Y - BALL_R - 1 };

const SL = [[70, 580], [70, 660], [130, 705]];
export const SLINGS = {
  left: SL,
  right: SL.map(([x, y]) => [467 - x, y]),
};

const seg = (ax, ay, bx, by, extra = {}) => ({ ax, ay, bx, by, ...extra });

export function arcPoints(n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n;
    pts.push({ x: ARC.x + ARC.r * Math.cos(a), y: ARC.y + ARC.r * Math.sin(a) });
  }
  return pts;
}

export function buildWalls() {
  const s = [];
  const pts = arcPoints();
  for (let i = 1; i < pts.length; i++) s.push(seg(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y));
  s.push(seg(LEFT, 250, LEFT, 650));
  s.push(seg(RIGHT, 250, RIGHT, H + 40));
  s.push(seg(LANE, 300, LANE, H + 40));
  s.push(seg(LANE, PLUNGER_Y, RIGHT, PLUNGER_Y, { plunger: true }));
  s.push(seg(LEFT, 650, 146, 758));
  s.push(seg(LANE, 650, 321, 758));
  for (const side of ["left", "right"]) {
    const P = SLINGS[side];
    s.push(seg(P[0][0], P[0][1], P[1][0], P[1][1]));
    s.push(seg(P[1][0], P[1][1], P[2][0], P[2][1]));
    s.push(seg(P[0][0], P[0][1], P[2][0], P[2][1], { kick: side }));
  }
  s.push(seg(LANE, 300, RIGHT, 262, { gate: true }));
  return s;
}

export function closest(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + dx * t, y: ay + dy * t, t };
}

export function flipperDir(side, angle) {
  return side === "left" ? { x: Math.cos(angle), y: Math.sin(angle) } : { x: -Math.cos(angle), y: Math.sin(angle) };
}

export function targetEnds(t) {
  const hx = (Math.cos(t.angle || 0) * t.w) / 2;
  const hy = (Math.sin(t.angle || 0) * t.w) / 2;
  return { ax: t.x - hx, ay: t.y - hy, bx: t.x + hx, by: t.y + hy };
}

export const KINDS = ["bumpers", "targets", "rollovers", "ramps", "saucers", "rails"];

export function elementRadius(kind, el) {
  return { bumpers: el.r || 22, targets: (el.w || 30) / 2 + 4, rollovers: 14, ramps: 20, saucers: 16, rails: 18 }[kind];
}

export const railPoints = (r) => (r.pts || []).map(([dx, dy]) => [r.x + dx, r.y + dy]);

const INLANE_X = { left: 41, right: 426 };

export function habitrailPath(ramp) {
  const side = ramp.habitrail;
  if (side !== "left" && side !== "right") return null;
  const X = INLANE_X[side];
  const d = { x: Math.cos(ramp.angle), y: Math.sin(ramp.angle) };
  const p0 = [ramp.x, ramp.y];
  const p1 = [Math.max(70, Math.min(400, ramp.x + d.x * 120)), Math.max(115, ramp.y + d.y * 120)];
  const p2 = [side === "left" ? 60 : 405, 200];
  const p3 = [X, 588];
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, lens, total: lens[lens.length - 1] };
}

export function pointAt(path, dist) {
  const { pts, lens } = path;
  let i = 1;
  while (i < lens.length - 1 && lens[i] < dist) i++;
  const t = Math.min(1, Math.max(0, (dist - lens[i - 1]) / (lens[i] - lens[i - 1] || 1)));
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
}
