import { W, H, LEFT, RIGHT, LANE, PIVOTS, FLEN, FR0, FR1, SLINGS, PLUNGER_Y, BALL_R, arcPoints, flipperDir, targetEnds } from "./geometry";

const SCALE = 2;

function hexA(hex, a) {
  const n = parseInt((hex || "#ffffff").slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawCover(ctx, img, x, y, w, h) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r;
  const ih = img.height * r;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function drawContain(ctx, img, cx, cy, maxW, maxH) {
  const r = Math.min(maxW / img.width, maxH / img.height);
  ctx.drawImage(img, cx - (img.width * r) / 2, cy - (img.height * r) / 2, img.width * r, img.height * r);
}

function outline(ctx) {
  const pts = arcPoints();
  ctx.beginPath();
  ctx.moveTo(LEFT, H);
  ctx.lineTo(LEFT, 250);
  pts.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(RIGHT, H);
  ctx.closePath();
}

function glowStroke(ctx, color, glow, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function procedural(ctx, t) {
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
  ctx.save();
  ctx.translate(233, 470);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "900 64px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = hexA(p.accent, 0.07);
  ctx.fillText((t.name || "").toUpperCase().slice(0, 16), 0, 20);
  ctx.restore();
  // decorative inserts
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(233, 640 - i * 22, 6, 0, Math.PI * 2);
    ctx.fillStyle = hexA(i % 2 ? p.accent : p.glow, 0.25);
    ctx.fill();
  }
}

export function buildStatic(t, images) {
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
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, 0, W, H);
  } else {
    procedural(ctx, t);
  }
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(LANE, 0, RIGHT - LANE, H);
  // aprons
  for (const poly of [[[LEFT, 650], [146, 758], [146, H], [LEFT, H]], [[LANE, 650], [321, 758], [321, H], [LANE, H]]]) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 650, 0, H);
    g.addColorStop(0, "#0d0f18");
    g.addColorStop(1, "#05060a");
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.fillStyle = "#04050a";
  ctx.fillRect(146, 840, 175, 60);
  const logo = images.apronLogo;
  if (logo) {
    drawContain(ctx, logo, 70, 840, 90, 70);
    drawContain(ctx, logo, 395, 840, 90, 70);
  } else {
    ctx.font = "700 11px Orbitron, sans-serif";
    ctx.fillStyle = hexA(p.accent, 0.8);
    ctx.textAlign = "center";
    ctx.fillText((t.name || "").toUpperCase().slice(0, 14), 75, 860);
    ctx.fillText("PINBALL FORGE", 392, 860);
  }
  ctx.restore();
  // walls
  outline(ctx);
  glowStroke(ctx, p.primary, p.glow, 5);
  for (const [a, b] of [[[LANE, 300], [LANE, H]], [[LEFT, 650], [146, 758]], [[LANE, 650], [321, 758]]]) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    glowStroke(ctx, p.primary, p.glow, 5);
  }
  for (const side of ["left", "right"]) {
    const P = SLINGS[side];
    ctx.beginPath();
    P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = hexA(p.secondary, 0.3);
    ctx.fill();
    glowStroke(ctx, p.secondary, p.secondary, 3);
  }
  // inlane arrows
  ctx.fillStyle = hexA(p.accent, 0.35);
  for (const [x, y, s] of [[45, 690, 1], [422, 690, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10 * s, y + 18);
    ctx.lineTo(x - 2 * s, y + 18);
    ctx.fill();
  }
  return c;
}

function drawBumper(ctx, b, p, flash, img) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(b.x, b.y + 3, b.r + 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2);
  ctx.fillStyle = flash > 0 ? "#ffffff" : p.secondary;
  ctx.shadowColor = flash > 0 ? "#ffffff" : p.secondary;
  ctx.shadowBlur = flash > 0 ? 30 : 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r - 1, 0, Math.PI * 2);
  if (img) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#000";
    ctx.fill();
    drawContain(ctx, img, b.x, b.y, b.r * 2.3, b.r * 2.3);
    ctx.restore();
  } else {
    const g = ctx.createRadialGradient(b.x - b.r / 3, b.y - b.r / 3, 2, b.x, b.y, b.r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.25, p.primary);
    g.addColorStop(1, hexA(p.primary, 0.6));
    ctx.fillStyle = g;
    ctx.fill();
    if (b.label) {
      ctx.font = `700 ${Math.max(7, b.r / 2.6)}px Orbitron, sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.label.toUpperCase().slice(0, 8), b.x, b.y + 1);
    }
  }
  ctx.restore();
}

function drawArrow(ctx, r, p, lit) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate((r.angle ?? -1.57) + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(14, 4);
  ctx.lineTo(6, 4);
  ctx.lineTo(6, 16);
  ctx.lineTo(-6, 16);
  ctx.lineTo(-6, 4);
  ctx.lineTo(-14, 4);
  ctx.closePath();
  ctx.fillStyle = lit ? p.accent : hexA(p.accent, 0.3);
  ctx.shadowColor = p.accent;
  ctx.shadowBlur = lit ? 22 : 6;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, color, size = 8) {
  if (!text) return;
  ctx.font = `700 ${size}px Orbitron, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillText(text.toUpperCase(), x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text.toUpperCase(), x, y);
}

export function drawFlipper(ctx, side, angle, color) {
  const pv = PIVOTS[side];
  const d = flipperDir(side, angle);
  const tx = pv.x + d.x * FLEN;
  const ty = pv.y + d.y * FLEN;
  const nx = -d.y;
  const ny = d.x;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pv.x + nx * FR0, pv.y + ny * FR0);
  ctx.lineTo(tx + nx * FR1, ty + ny * FR1);
  ctx.arc(tx, ty, FR1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
  ctx.lineTo(pv.x - nx * FR0, pv.y - ny * FR0);
  ctx.arc(pv.x, pv.y, FR0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pv.x, pv.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#222";
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx, b) {
  const g = ctx.createRadialGradient(b.x - 3, b.y - 4, 1, b.x, b.y, BALL_R);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, "#d8dde6");
  g.addColorStop(1, "#4a505c");
  ctx.beginPath();
  ctx.arc(b.x, b.y + 3, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

export function drawElements(ctx, g) {
  const t = g.table;
  const p = t.palette;
  const fx = g.fx;
  (t.rollovers || []).forEach((r) => {
    const lit = g.lit[r.id];
    ctx.save();
    ctx.beginPath();
    ctx.arc(r.x, r.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = lit ? p.glow : "rgba(0,0,0,0.55)";
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = lit ? 24 : 0;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.glow;
    ctx.stroke();
    ctx.restore();
    label(ctx, r.label?.slice(0, 3), r.x, r.y, lit ? "#000" : p.glow, 9);
  });
  (t.ramps || []).forEach((r) => {
    drawArrow(ctx, r, p, (fx[r.id] || 0) > 0 || Math.floor(g.time * 2) % 2 === 0);
    label(ctx, r.label, r.x, r.y + 30, "#fff", 7);
  });
  (t.saucers || []).forEach((s) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = (fx[s.id] || 0) > 0 ? 30 : 10;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = p.accent;
    ctx.stroke();
    ctx.restore();
    label(ctx, s.label, s.x, s.y + 26, p.accent, 7);
  });
  (t.targets || []).forEach((tg) => {
    const down = g.down[tg.id];
    const e = targetEnds(tg);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(e.ax, e.ay);
    ctx.lineTo(e.bx, e.by);
    ctx.lineCap = "round";
    ctx.lineWidth = down ? 3 : 10;
    ctx.strokeStyle = down ? "rgba(255,255,255,0.18)" : (fx[tg.id] || 0) > 0 ? "#fff" : p.accent;
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = down ? 0 : 12;
    ctx.stroke();
    ctx.restore();
    const nx = -Math.sin(tg.angle || 0);
    const ny = Math.cos(tg.angle || 0);
    label(ctx, tg.label, tg.x + nx * 15, tg.y + ny * 15, down ? "rgba(255,255,255,0.35)" : "#fff", 7);
  });
  (t.bumpers || []).forEach((b, i) => drawBumper(ctx, b, p, fx[b.id] || 0, g.bumperImg(i)));
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
  // gate
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(LANE, 300);
  ctx.lineTo(RIGHT, 262);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.restore();
  // plunger
  const pull = g.plungerCharge * 30;
  ctx.fillStyle = "#c9ced8";
  ctx.fillRect(LANE + 8, PLUNGER_Y + pull, RIGHT - LANE - 16, 6);
  ctx.fillStyle = g.table.palette.accent;
  ctx.fillRect(LANE + 13, PLUNGER_Y + 6 + pull, RIGHT - LANE - 26, 14);
  drawFlipper(ctx, "left", g.flippers.left.angle, g.table.palette.accent);
  drawFlipper(ctx, "right", g.flippers.right.angle, g.table.palette.accent);
  g.balls.forEach((b) => drawBall(ctx, b));
  g.particles.forEach((pt) => {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
  });
  ctx.globalAlpha = 1;
  if (g.selected) {
    const el = (g.table[g.selected.kind] || []).find((e) => e.id === g.selected.id);
    if (el) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(el.x, el.y, (el.r || el.w / 2 || 16) + 10, 0, Math.PI * 2);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  if (g.tilted) {
    ctx.font = "900 56px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,40,40,0.85)";
    ctx.fillText("TILT", 233, 450);
  }
}
