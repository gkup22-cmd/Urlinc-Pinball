import {
  W, H, LEFT, RIGHT, LANE, PIVOTS, FLEN, FR0, FR1, SLINGS, PLUNGER_Y, BALL_R,
  arcPoints, flipperDir, targetEnds, railPoints, habitrailPath,
} from "./geometry";

const SCALE = 2;
const METALS = {
  chrome: ["#fbfcfe", "#7c8595", "#e6eaf1", "#3c424e"],
  gold: ["#fff3c4", "#c08417", "#ffe08a", "#5e3a05"],
  copper: ["#ffd8be", "#a9542a", "#f2a477", "#46200e"],
  crystal: ["#f2fdff", "#6ccff6", "#ffffff", "#24607f"],
};

export function hexA(hex, a) {
  const n = parseInt((hex || "#ffffff").slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const metalStops = (g, m) => { m.forEach((c, i) => g.addColorStop(i / (m.length - 1), c)); return g; };

function metal(table) {
  const m = table.style?.material || "chrome";
  if (m === "neon") return null;
  return METALS[m] || METALS.chrome;
}

function drawCover(ctx, img, x, y, w, h) {
  const r = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * r) / 2, y + (h - img.height * r) / 2, img.width * r, img.height * r);
}

function drawContain(ctx, img, cx, cy, maxW, maxH) {
  const r = Math.min(maxW / img.width, maxH / img.height);
  ctx.drawImage(img, cx - (img.width * r) / 2, cy - (img.height * r) / 2, img.width * r, img.height * r);
}

function outline(ctx) {
  ctx.beginPath();
  ctx.moveTo(LEFT, H);
  ctx.lineTo(LEFT, 250);
  arcPoints().forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(RIGHT, H);
  ctx.closePath();
}

function railStroke(ctx, t, width = 5) {
  const p = t.palette;
  const m = metal(t);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (!m) {
    ctx.strokeStyle = p.primary;
    ctx.lineWidth = width;
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = 14;
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = width + 4;
    ctx.stroke();
    ctx.shadowColor = hexA(p.primary, 0.6);
    ctx.shadowBlur = 10;
    ctx.strokeStyle = metalStops(ctx.createLinearGradient(0, 0, W, H), [m[1], m[0], m[3], m[2], m[1]]);
    ctx.lineWidth = width;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();
}

function procedural(ctx, t, fonts) {
  const p = t.palette;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(240, 260, 20, 240, 260, 420);
  g.addColorStop(0, hexA(p.primary, 0.32));
  g.addColorStop(1, hexA(p.primary, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(240, 720, 10, 240, 720, 360);
  g.addColorStop(0, hexA(p.secondary, 0.28));
  g.addColorStop(1, hexA(p.secondary, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = hexA(p.secondary, 0.07);
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - H * 0.6, H);
    ctx.stroke();
  }
  // sunburst behind the lower playfield
  ctx.save();
  ctx.translate(233, 640);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.fillStyle = hexA(i % 2 ? p.primary : p.accent, 0.05);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, -420);
    ctx.lineTo(14, -420);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(233, 470);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `900 60px "${fonts.display}", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = hexA(p.accent, 0.08);
  ctx.fillText((t.name || "").toUpperCase().slice(0, 16), 0, 20);
  ctx.restore();
}

export function buildStatic(t, images, fonts) {
  const c = document.createElement("canvas");
  c.width = W * SCALE;
  c.height = H * SCALE;
  const ctx = c.getContext("2d");
  ctx.scale(SCALE, SCALE);
  const p = t.palette;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  outline(ctx);
  ctx.clip();
  if (images.playfield) {
    drawCover(ctx, images.playfield, 0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, W, H);
  } else {
    procedural(ctx, t, fonts);
  }
  // lacquer sheen
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, "rgba(255,255,255,0.07)");
  sheen.addColorStop(0.35, "rgba(255,255,255,0)");
  sheen.addColorStop(0.7, "rgba(255,255,255,0.03)");
  sheen.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(LANE, 0, RIGHT - LANE, H);
  for (const poly of [[[LEFT, 650], [146, 758], [146, H], [LEFT, H]], [[LANE, 650], [321, 758], [321, H], [LANE, H]]]) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 650, 0, H);
    g.addColorStop(0, "#11131d");
    g.addColorStop(1, "#05060a");
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.fillStyle = "#04050a";
  ctx.fillRect(146, 840, 175, 60);
  if (images.apronLogo) {
    drawContain(ctx, images.apronLogo, 70, 840, 90, 70);
    drawContain(ctx, images.apronLogo, 395, 840, 90, 70);
  } else {
    ctx.font = `700 13px "${fonts.display}", sans-serif`;
    ctx.fillStyle = hexA(p.accent, 0.85);
    ctx.textAlign = "center";
    ctx.fillText((t.name || "").toUpperCase().slice(0, 14), 75, 860);
    ctx.fillText("PINBALL FORGE", 392, 860);
  }
  ctx.restore();
  outline(ctx);
  railStroke(ctx, t, 6);
  for (const [a, b] of [[[LANE, 300], [LANE, H]], [[LEFT, 650], [146, 758]], [[LANE, 650], [321, 758]]]) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    railStroke(ctx, t, 5);
  }
  const m = metal(t) || METALS.chrome;
  for (const side of ["left", "right"]) {
    const P = SLINGS[side];
    ctx.beginPath();
    P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(P[0][0], P[0][1], P[2][0], P[2][1]);
    g.addColorStop(0, hexA(p.secondary, 0.55));
    g.addColorStop(1, hexA(p.bg, 0.9));
    ctx.fillStyle = g;
    ctx.fill();
    railStroke(ctx, t, 3);
    for (const [x, y] of P) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = metalStops(ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 4), [m[0], m[1], m[3]]);
      ctx.fill();
    }
  }
  ctx.fillStyle = hexA(p.accent, 0.4);
  for (const [x, y, s] of [[45, 690, 1], [422, 690, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10 * s, y + 18);
    ctx.lineTo(x - 2 * s, y + 18);
    ctx.fill();
  }
  // guide rails
  for (const r of t.rails || []) drawWireform(ctx, railPoints(r), t, false);
  return c;
}

function drawWireform(ctx, pts, t, elevated) {
  if (pts.length < 2) return;
  const m = metal(t) || METALS.chrome;
  const p = t.palette;
  const off = elevated ? 8 : 0;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const path = (dx, dy, o) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const [ax, ay] = pts[Math.max(0, i - 1)];
      const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const nx = (-(by - ay) / l) * o;
      const ny = ((bx - ax) / l) * o;
      i ? ctx.lineTo(x + nx + dx, y + ny + dy) : ctx.moveTo(x + nx + dx, y + ny + dy);
    });
  };
  if (elevated) {
    for (const o of [-7, 7]) {
      path(10, 14, o);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    for (let i = 2; i < pts.length - 1; i += 3) {
      const [x, y] = pts[i];
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x + 7, y);
      ctx.stroke();
    }
  }
  const grad = metalStops(ctx.createLinearGradient(0, 0, W, H * 0.6), [m[1], m[0], m[3], m[2], m[1], m[0]]);
  for (const o of elevated ? [-7, 7] : [0]) {
    path(0, 0, o);
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = elevated ? 5 : 7;
    ctx.stroke();
    ctx.strokeStyle = grad;
    ctx.shadowColor = hexA(p.primary, 0.5);
    ctx.shadowBlur = 8;
    ctx.lineWidth = elevated ? 3 : 4.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  if (!elevated || off) {
    const posts = elevated ? [pts[0], pts[pts.length - 1]] : pts;
    for (const [x, y] of posts) {
      ctx.beginPath();
      ctx.arc(x, y, elevated ? 4 : 5, 0, Math.PI * 2);
      ctx.fillStyle = metalStops(ctx.createRadialGradient(x - 1.5, y - 1.5, 0, x, y, 5), [m[0], m[1], m[3]]);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBumper(ctx, b, t, flash, img, time, fonts) {
  const p = t.palette;
  const m = metal(t);
  ctx.save();
  // drop shadow
  ctx.beginPath();
  ctx.ellipse(b.x + 4, b.y + 7, b.r + 9, b.r + 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();
  // metal skirt
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r + 8, 0, Math.PI * 2);
  ctx.fillStyle = m
    ? metalStops(ctx.createLinearGradient(b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r), [m[0], m[1], m[2], m[3]])
    : hexA(p.secondary, 0.4);
  ctx.fill();
  // LED ring
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
  ctx.fillStyle = "#0a0a0f";
  ctx.fill();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const on = flash > 0 || (Math.floor(time * 8) + i) % 4 !== 0;
    ctx.beginPath();
    ctx.arc(b.x + Math.cos(a) * (b.r + 4), b.y + Math.sin(a) * (b.r + 4), 1.8, 0, Math.PI * 2);
    ctx.fillStyle = flash > 0 ? "#ffffff" : on ? p.secondary : hexA(p.secondary, 0.25);
    ctx.shadowColor = p.secondary;
    ctx.shadowBlur = flash > 0 ? 16 : on ? 8 : 0;
    ctx.fill();
  }
  ctx.shadowBlur = flash > 0 ? 34 : 0;
  ctx.shadowColor = p.secondary;
  // cap rim
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r + 1, 0, Math.PI * 2);
  ctx.fillStyle = m ? metalStops(ctx.createLinearGradient(b.x, b.y - b.r, b.x, b.y + b.r), [m[2], m[1], m[3]]) : p.primary;
  ctx.fill();
  ctx.shadowBlur = 0;
  // cap dome
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r - 1.5, 0, Math.PI * 2);
  if (img) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#000";
    ctx.fill();
    drawContain(ctx, img, b.x, b.y, b.r * 2.25, b.r * 2.25);
    ctx.restore();
  } else {
    const g = ctx.createRadialGradient(b.x - b.r / 3, b.y - b.r / 3, 1, b.x, b.y, b.r);
    g.addColorStop(0, flash > 0 ? "#ffffff" : hexA(p.primary, 1));
    g.addColorStop(0.55, hexA(p.primary, 0.75));
    g.addColorStop(1, hexA(p.bg, 1));
    ctx.fillStyle = g;
    ctx.fill();
    if (b.label) {
      ctx.font = `700 ${Math.max(8, b.r / 2.3)}px "${fonts.body}", sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(b.label.toUpperCase().slice(0, 9), b.x, b.y + 1);
      ctx.shadowBlur = 0;
    }
  }
  // gloss
  ctx.beginPath();
  ctx.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.42, b.r * 0.55, b.r * 0.28, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fill();
  ctx.restore();
}

function drawArrow(ctx, r, p, lit) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate((r.angle ?? -1.57) + Math.PI / 2);
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(0, -20 + k * 11);
    ctx.lineTo(13, -8 + k * 11);
    ctx.lineTo(13, -3 + k * 11);
    ctx.lineTo(0, -15 + k * 11);
    ctx.lineTo(-13, -3 + k * 11);
    ctx.lineTo(-13, -8 + k * 11);
    ctx.closePath();
    ctx.fillStyle = lit === k || lit === true ? p.accent : hexA(p.accent, 0.28);
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = lit === k || lit === true ? 20 : 4;
    ctx.fill();
  }
  ctx.restore();
}

function label(ctx, text, x, y, color, size, font) {
  if (!text) return;
  ctx.font = `700 ${size}px "${font}", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillText(text.toUpperCase(), x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text.toUpperCase(), x, y);
}

function drawTarget(ctx, tg, g) {
  const t = g.table;
  const p = t.palette;
  const m = metal(t) || METALS.chrome;
  const down = g.down[tg.id];
  const fall = Math.max(0, g.fx["fall-" + tg.id] || 0) / 0.3;
  const k = down ? fall : 1;
  const hit = (g.fx[tg.id] || 0) > 0;
  const style = tg.style || t.style?.targetStyle || "drop";
  const ang = tg.angle || 0;
  ctx.save();
  ctx.translate(tg.x, tg.y);
  ctx.rotate(ang);
  if (down && k <= 0) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(-tg.w / 2, -2, tg.w, 4);
    if (style === "flag") {
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = m[1];
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.scale(1, Math.max(0.1, k));
  ctx.shadowColor = p.accent;
  ctx.shadowBlur = hit ? 26 : 10;
  if (style === "flag") {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(-tg.w / 2 + 3, 2, tg.w, 4);
    const wave = (i) => Math.sin(g.time * 6 + i * 0.6 + tg.x) * 3;
    ctx.beginPath();
    ctx.moveTo(-tg.w / 2, -14);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-tg.w / 2 + (i / 6) * tg.w, -14 + wave(i) * (i / 6));
    for (let i = 6; i >= 0; i--) ctx.lineTo(-tg.w / 2 + (i / 6) * tg.w, -1 + wave(i) * (i / 6) - (i / 6) * 4);
    ctx.closePath();
    ctx.fillStyle = hit ? "#fff" : p.accent;
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = metalStops(ctx.createLinearGradient(-tg.w / 2 - 2, 0, -tg.w / 2 + 2, 0), [m[0], m[1], m[3]]);
    ctx.fillRect(-tg.w / 2 - 2, -18, 4, 22);
    ctx.beginPath();
    ctx.arc(-tg.w / 2, -18, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.glow;
    ctx.fill();
  } else if (style === "shield") {
    const w = tg.w / 2;
    ctx.beginPath();
    ctx.moveTo(-w, -8);
    ctx.lineTo(w, -8);
    ctx.lineTo(w, 0);
    ctx.quadraticCurveTo(w * 0.7, 8, 0, 11);
    ctx.quadraticCurveTo(-w * 0.7, 8, -w, 0);
    ctx.closePath();
    ctx.fillStyle = hit ? "#fff" : p.accent;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = metalStops(ctx.createLinearGradient(-w, -8, w, 8), [m[0], m[1], m[2], m[3]]);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-1.5, -6, 3, 14);
    ctx.fillRect(-w + 4, -2, tg.w - 8, 3);
  } else if (style === "gem") {
    const w = tg.w / 2;
    ctx.beginPath();
    ctx.moveTo(-w, -2);
    ctx.lineTo(-w * 0.55, -8);
    ctx.lineTo(w * 0.55, -8);
    ctx.lineTo(w, -2);
    ctx.lineTo(0, 9);
    ctx.closePath();
    const gg = ctx.createLinearGradient(-w, -8, w, 9);
    gg.addColorStop(0, "#ffffff");
    gg.addColorStop(0.4, hit ? "#fff" : p.accent);
    gg.addColorStop(1, hexA(p.primary, 1));
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-w, -2);
    ctx.lineTo(w, -2);
    ctx.moveTo(-w * 0.55, -8);
    ctx.lineTo(0, 9);
    ctx.lineTo(w * 0.55, -8);
    ctx.stroke();
    const tw = (Math.sin(g.time * 4 + tg.x) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${tw})`;
    ctx.fillRect(w * 0.2, -6, 2, 2);
  } else if (style === "post") {
    const n = Math.max(2, Math.round(tg.w / 14));
    for (let i = 0; i < n; i++) {
      const x = -tg.w / 2 + 5 + (i / (n - 1)) * (tg.w - 10);
      ctx.beginPath();
      ctx.arc(x, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = metalStops(ctx.createRadialGradient(x - 2, -2, 0, x, 0, 6), [m[0], m[1], m[3]]);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = hit ? "#fff" : p.accent;
      ctx.fill();
    }
  } else {
    ctx.fillStyle = hit ? "#fff" : p.accent;
    ctx.fillRect(-tg.w / 2, -5, tg.w, 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(-tg.w / 2, -5, tg.w, 2.5);
    ctx.strokeStyle = metalStops(ctx.createLinearGradient(-tg.w / 2, 0, tg.w / 2, 0), [m[0], m[1], m[2], m[3]]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-tg.w / 2, -5, tg.w, 10);
  }
  ctx.restore();
}

export function drawFlipper(ctx, side, angle, t) {
  const color = t.palette.accent;
  const m = metal(t) || METALS.chrome;
  const pv = PIVOTS[side];
  const d = flipperDir(side, angle);
  const tx = pv.x + d.x * FLEN;
  const ty = pv.y + d.y * FLEN;
  const nx = -d.y;
  const ny = d.x;
  const shape = (ox, oy) => {
    ctx.beginPath();
    ctx.moveTo(pv.x + nx * FR0 + ox, pv.y + ny * FR0 + oy);
    ctx.lineTo(tx + nx * FR1 + ox, ty + ny * FR1 + oy);
    ctx.arc(tx + ox, ty + oy, FR1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
    ctx.lineTo(pv.x - nx * FR0 + ox, pv.y - ny * FR0 + oy);
    ctx.arc(pv.x + ox, pv.y + oy, FR0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
    ctx.closePath();
  };
  ctx.save();
  shape(3, 6);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fill();
  shape(0, 0);
  const g = ctx.createLinearGradient(pv.x + nx * FR0, pv.y + ny * FR0, pv.x - nx * FR0, pv.y - ny * FR0);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.3, color);
  g.addColorStop(1, hexA(color, 0.75));
  ctx.fillStyle = g;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#111";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pv.x, pv.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = metalStops(ctx.createRadialGradient(pv.x - 1, pv.y - 1, 0, pv.x, pv.y, 4), [m[0], m[1], m[3]]);
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx, b) {
  const s = b.ride ? 1.25 : 1;
  const r = BALL_R * s;
  const off = b.ride ? 12 : 3;
  ctx.beginPath();
  ctx.arc(b.x + off * 0.6, b.y + off, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();
  const g = ctx.createRadialGradient(b.x - 3 * s, b.y - 4 * s, 1, b.x, b.y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.3, "#dfe3ea");
  g.addColorStop(0.7, "#7b828f");
  g.addColorStop(1, "#2a2e36");
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(b.x + 2 * s, b.y + 4 * s, r * 0.5, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
}

function drawElements(ctx, g) {
  const t = g.table;
  const p = t.palette;
  const fx = g.fx;
  const fonts = g.fonts;
  const chase = Math.floor(g.time * 6) % 3;
  (t.rollovers || []).forEach((r) => {
    const lit = g.lit[r.id];
    ctx.save();
    ctx.beginPath();
    ctx.arc(r.x, r.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = lit ? p.glow : "rgba(0,0,0,0.6)";
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = lit ? 24 : 0;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.glow;
    ctx.stroke();
    ctx.restore();
    label(ctx, r.label?.slice(0, 3), r.x, r.y, lit ? "#000" : p.glow, 10, fonts.body);
  });
  (t.ramps || []).forEach((r) => {
    drawArrow(ctx, r, p, (fx[r.id] || 0) > 0 || g.flash ? true : chase);
    label(ctx, r.label, r.x, r.y + 30, "#fff", 9, fonts.body);
  });
  (t.saucers || []).forEach((s) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, 17, 0, Math.PI * 2);
    const m = metal(t) || METALS.chrome;
    ctx.fillStyle = metalStops(ctx.createLinearGradient(s.x - 17, s.y - 17, s.x + 17, s.y + 17), m);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x, s.y, 13, 0, Math.PI * 2);
    const hg = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 13);
    hg.addColorStop(0, "#000");
    hg.addColorStop(1, hexA(p.accent, (fx[s.id] || 0) > 0 ? 0.9 : 0.35));
    ctx.fillStyle = hg;
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = (fx[s.id] || 0) > 0 ? 30 : 8;
    ctx.fill();
    ctx.restore();
    label(ctx, s.label, s.x, s.y + 28, p.accent, 9, fonts.body);
  });
  (t.targets || []).forEach((tg) => {
    drawTarget(ctx, tg, g);
    const nx = -Math.sin(tg.angle || 0);
    const ny = Math.cos(tg.angle || 0);
    label(ctx, tg.label, tg.x + nx * 17, tg.y + ny * 17, g.down[tg.id] ? "rgba(255,255,255,0.35)" : "#fff", 8, fonts.body);
  });
  (t.bumpers || []).forEach((b, i) => drawBumper(ctx, b, t, fx[b.id] || 0, g.bumperImg(i), g.time, fonts));
  for (const side of ["left", "right"]) {
    if ((fx["sling-" + side] || 0) > 0) {
      const P = SLINGS[side];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(P[0][0], P[0][1]);
      ctx.lineTo(P[2][0], P[2][1]);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#fff";
      ctx.shadowColor = p.secondary;
      ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function drawFrame(ctx, g) {
  ctx.clearRect(0, 0, W, H);
  if (g.staticLayer) ctx.drawImage(g.staticLayer, 0, 0, W, H);
  drawElements(ctx, g);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(LANE, 300);
  ctx.lineTo(RIGHT, 262);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.restore();
  const pull = g.plungerCharge * 30;
  ctx.fillStyle = "#c9ced8";
  ctx.fillRect(LANE + 8, PLUNGER_Y + pull, RIGHT - LANE - 16, 6);
  ctx.fillStyle = g.table.palette.accent;
  ctx.fillRect(LANE + 13, PLUNGER_Y + 6 + pull, RIGHT - LANE - 26, 14);
  drawFlipper(ctx, "left", g.flippers.left.angle, g.table);
  drawFlipper(ctx, "right", g.flippers.right.angle, g.table);
  g.balls.filter((b) => !b.ride).forEach((b) => drawBall(ctx, b));
  g.ambient?.draw(ctx, g.table.palette, g.time);
  (g.table.ramps || []).forEach((r) => {
    const path = g.habitrails?.[r.id] || habitrailPath(r);
    if (path) drawWireform(ctx, path.pts, g.table, true);
  });
  g.balls.filter((b) => b.ride).forEach((b) => drawBall(ctx, b));
  g.particles.forEach((pt) => {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
  });
  ctx.globalAlpha = 1;
  if (g.flash) {
    ctx.fillStyle = hexA(g.flash.color, Math.max(0, g.flash.life) * 0.35);
    ctx.fillRect(0, 0, W, H);
  }
  if (g.selected) {
    const el = (g.table[g.selected.kind] || []).find((e) => e.id === g.selected.id);
    if (el) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(el.x, el.y, (el.r || el.w / 2 || 16) + 12, 0, Math.PI * 2);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  if (g.tilted) {
    ctx.font = `900 56px "${g.fonts.display}", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,40,40,0.85)";
    ctx.fillText("TILT", 233, 450);
  }
}
