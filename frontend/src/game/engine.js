import * as G from "./geometry";
import { buildStatic, drawFrame } from "./render";
import { play } from "./sound";

const SUB = 8;
const DT = 1 / 60 / SUB;
const MAX_V = 3200;

export class PinballGame {
  constructor(canvas, table, { preview = false, onState, onGameOver } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.preview = preview;
    this.onState = onState || (() => {});
    this.onGameOver = onGameOver || (() => {});
    this.walls = G.buildWalls();
    this.images = {};
    this.brandImgs = [];
    this.flippers = { left: { angle: G.REST, pressed: false, w: 0 }, right: { angle: G.REST, pressed: false, w: 0 } };
    this.balls = [];
    this.particles = [];
    this.fx = {};
    this.lit = {};
    this.down = {};
    this.time = 0;
    this.plungerCharge = 0;
    this.plungerHeld = false;
    this.selected = null;
    this.started = false;
    this.gameOver = false;
    this.setTable(table);
    this.resize();
    this.lastEmit = 0;
    this.running = true;
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  setTable(table) {
    this.table = table;
    this.rebuildStatic();
  }

  setImages(images, brandImgs) {
    this.images = images || {};
    this.brandImgs = brandImgs || [];
    this.rebuildStatic();
  }

  rebuildStatic() {
    this.staticLayer = buildStatic(this.table, this.images);
  }

  bumperImg(i) {
    const b = this.table.brand;
    if (!b?.enabled || !b.bumperCaps || !this.brandImgs.length) return null;
    return this.brandImgs[i % this.brandImgs.length];
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = G.W * dpr;
    this.canvas.height = G.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  // ---------- game flow ----------
  newGame() {
    const ph = this.table.physics;
    this.started = true;
    this.gameOver = false;
    this.score = 0;
    this.ballNum = 1;
    this.totalBalls = ph.balls || 3;
    this.extraAwarded = 0;
    this.missionIndex = 0;
    this.missionProgress = 0;
    this.level = 0;
    this.combo = 1;
    this.comboUntil = 0;
    this.lit = {};
    this.down = {};
    this.balls = [];
    this.message = { text: "GOOD LUCK", until: this.time + 2 };
    this.startBall();
    play("start");
    this.emit(true);
  }

  startBall() {
    this.bonusX = 1;
    this.bonus = 0;
    this.tilted = false;
    this.tiltMeter = 0;
    this.ballSaveUntil = 0;
    this.ballSaveArmed = true;
    this.spawnBall(false);
  }

  spawnBall(auto) {
    const b = { x: G.BALL_START.x, y: G.BALL_START.y, vx: 0, vy: auto ? -1700 : 0, inLane: true, captured: null, sensors: {} };
    this.balls.push(b);
    if (auto) play("launch");
  }

  msg(text, secs = 1.6) {
    this.message = { text, until: this.time + secs };
  }

  award(points, x, y, color) {
    if (this.tilted || !this.started || this.gameOver) return;
    const pts = Math.round(points * this.combo);
    this.score += pts;
    const eb = this.table.scoring.extraBallScore;
    if (eb && this.score >= eb * (this.extraAwarded + 1)) {
      this.extraAwarded++;
      this.totalBalls++;
      this.msg("EXTRA BALL!", 2.5);
      play("extra");
    }
    if (x !== undefined) this.burst(x, y, color || this.table.palette.accent, 10);
  }

  event(type) {
    if (this.tilted || !this.started || this.gameOver) return;
    if (["ramp", "saucer"].includes(type)) {
      const sc = this.table.scoring;
      this.combo = this.time < this.comboUntil ? Math.min(this.combo + 1, sc.comboMax || 4) : Math.max(this.combo, 1);
      this.comboUntil = this.time + 3;
      if (this.combo > 1) this.msg(`COMBO x${this.combo}`, 1.2);
    }
    if (["target", "ramp", "saucer"].includes(type)) this.bonus += 1000;
    const ms = this.table.missions;
    if (!ms?.length) return;
    const m = ms[this.missionIndex];
    if (m.event !== type) return;
    this.missionProgress++;
    const need = Math.ceil(m.count * (1 + this.level * 0.5));
    if (this.missionProgress >= need) {
      this.award(m.reward * (1 + this.level));
      this.msg(`${m.title.toUpperCase()} COMPLETE`, 2.5);
      play("mission");
      if (m.multiball) {
        this.msg("MULTIBALL!", 2.5);
        this.spawnBall(true);
        setTimeout(() => this.running && this.started && this.spawnBall(true), 600);
      }
      this.missionProgress = 0;
      this.missionIndex = (this.missionIndex + 1) % ms.length;
      if (this.missionIndex === 0) this.level++;
    }
  }

  drain(ball) {
    this.balls = this.balls.filter((b) => b !== ball);
    if (!this.started || this.gameOver) return;
    if (this.time < this.ballSaveUntil && this.balls.length === 0 && !this.tilted) {
      this.msg("BALL SAVED", 2);
      this.spawnBall(true);
      this.ballSaveUntil = this.time + 2;
      return;
    }
    if (this.balls.length > 0) return;
    play("drain");
    const bonus = this.tilted ? 0 : this.bonus * this.bonusX;
    this.score += bonus;
    if (this.ballNum >= this.totalBalls) {
      this.gameOver = true;
      this.started = false;
      this.msg("GAME OVER", 5);
      this.emit(true);
      this.onGameOver(this.score);
      return;
    }
    this.ballNum++;
    this.msg(bonus ? `BONUS ${bonus.toLocaleString()}` : "NEXT BALL", 2);
    setTimeout(() => this.running && !this.gameOver && this.startBall(), 900);
  }

  // ---------- input ----------
  setFlipper(side, pressed) {
    const f = this.flippers[side];
    if (f.pressed === pressed) return;
    f.pressed = pressed;
    if (pressed && !this.tilted) {
      play("flipper");
      const rs = this.table.rollovers || [];
      if (rs.length > 1) {
        const states = rs.map((r) => !!this.lit[r.id]);
        const rot = side === "left" ? [...states.slice(1), states[0]] : [states[states.length - 1], ...states.slice(0, -1)];
        rs.forEach((r, i) => (this.lit[r.id] = rot[i]));
      }
    }
  }

  setPlunger(held) {
    if (!this.started) {
      if (held) this.newGame();
      return;
    }
    if (this.plungerHeld && !held) {
      const b = this.balls.find((x) => x.inLane && x.y > G.PLUNGER_Y - 60);
      if (b) {
        b.vy = -(650 + this.plungerCharge * 1350);
        play("launch");
      }
      this.plungerCharge = 0;
    }
    this.plungerHeld = held;
  }

  nudge() {
    if (!this.started || this.tilted) return;
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.balls.forEach((b) => {
      if (!b.captured) {
        b.vx += dir * 140;
        b.vy -= 90;
      }
    });
    this.shake = 0.2;
    this.tiltMeter += 1;
    if (this.tiltMeter >= 3.2) {
      this.tilted = true;
      this.msg("TILT", 3);
      play("tilt");
    } else if (this.tiltMeter >= 2) {
      this.msg("DANGER", 1);
    }
  }

  // ---------- physics ----------
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 220;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, color });
    }
  }

  resolve(b, cx, cy, rad, e, vx0 = 0, vy0 = 0) {
    let nx = b.x - cx;
    let ny = b.y - cy;
    const d = Math.hypot(nx, ny);
    const min = G.BALL_R + rad;
    if (d >= min || d === 0) return null;
    nx /= d;
    ny /= d;
    b.x = cx + nx * min;
    b.y = cy + ny * min;
    const vn = (b.vx - vx0) * nx + (b.vy - vy0) * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
    }
    return { nx, ny, vn };
  }

  stepFlippers() {
    const power = this.table.physics.flipperPower || 1;
    for (const side of ["left", "right"]) {
      const f = this.flippers[side];
      const target = f.pressed && !this.tilted ? G.UP : G.REST;
      const speed = (f.pressed ? 32 * power : 20) * DT;
      const delta = Math.max(-speed, Math.min(speed, target - f.angle));
      f.angle += delta;
      f.w = (delta / DT) * (side === "left" ? 1 : -1);
    }
  }

  collideBall(b) {
    const t = this.table;
    const p = t.palette;
    const bounce = t.physics.bounce || 1;
    for (const s of this.walls) {
      if (s.gate && b.inLane) continue;
      const c = G.closest(b.x, b.y, s.ax, s.ay, s.bx, s.by);
      const hit = this.resolve(b, c.x, c.y, 0, s.kick ? 0.3 : 0.4);
      if (hit && s.kick && hit.vn < -120) {
        b.vx += hit.nx * 520 * bounce;
        b.vy += hit.ny * 520 * bounce;
        this.fx["sling-" + s.kick] = 0.12;
        this.award(t.scoring.slingPoints || 50, c.x, c.y, p.secondary);
        play("sling");
        this.event("sling");
      }
    }
    for (const side of ["left", "right"]) {
      const f = this.flippers[side];
      const pv = G.PIVOTS[side];
      const d = G.flipperDir(side, f.angle);
      const c = G.closest(b.x, b.y, pv.x, pv.y, pv.x + d.x * G.FLEN, pv.y + d.y * G.FLEN);
      const rad = G.FR0 + (G.FR1 - G.FR0) * c.t;
      const rx = c.x - pv.x;
      const ry = c.y - pv.y;
      this.resolve(b, c.x, c.y, rad, 0.25, -f.w * ry, f.w * rx);
    }
    for (const bm of t.bumpers || []) {
      const hit = this.resolve(b, bm.x, bm.y, bm.r + 3, 0.5);
      if (hit && (this.fx[bm.id] || 0) <= 0.02) {
        b.vx += hit.nx * 620 * bounce;
        b.vy += hit.ny * 620 * bounce;
        this.fx[bm.id] = 0.12;
        this.award(bm.points, bm.x + hit.nx * bm.r, bm.y + hit.ny * bm.r, p.secondary);
        play("bumper");
        this.event("bumper");
      }
    }
    for (const tg of t.targets || []) {
      if (this.down[tg.id]) continue;
      const e = G.targetEnds(tg);
      const c = G.closest(b.x, b.y, e.ax, e.ay, e.bx, e.by);
      const hit = this.resolve(b, c.x, c.y, 5, 0.45);
      if (hit && hit.vn < -80) {
        this.down[tg.id] = true;
        this.fx[tg.id] = 0.15;
        this.award(tg.points, tg.x, tg.y, p.accent);
        play("target");
        this.event("target");
        const all = t.targets.every((x) => this.down[x.id]);
        if (all) {
          this.award(t.scoring.targetBankBonus || 25000);
          this.msg("TARGET BANK!", 2);
          play("bank");
          setTimeout(() => (this.down = {}), 1200);
        }
      }
    }
    for (const r of t.rollovers || []) {
      const inside = Math.hypot(b.x - r.x, b.y - r.y) < 16;
      if (inside && !b.sensors[r.id]) {
        this.lit[r.id] = true;
        this.award(r.points, r.x, r.y, p.glow);
        play("rollover");
        this.event("rollover");
        if (t.rollovers.every((x) => this.lit[x.id])) {
          this.bonusX = Math.min(this.bonusX + 1, 10);
          this.award(t.scoring.rolloverBonus || 10000);
          this.msg(`BONUS x${this.bonusX}`, 2);
          play("bank");
          setTimeout(() => (this.lit = {}), 600);
        }
      }
      b.sensors[r.id] = inside;
    }
    for (const r of t.ramps || []) {
      const inside = Math.hypot(b.x - r.x, b.y - r.y) < 22;
      const dir = { x: Math.cos(r.angle), y: Math.sin(r.angle) };
      if (inside && !b.sensors[r.id] && b.vx * dir.x + b.vy * dir.y > 250) {
        b.sensors[r.id] = true;
        this.fx[r.id] = 0.5;
        this.award(r.points, r.x, r.y, p.accent);
        play("ramp");
        this.event("ramp");
        b.vx += dir.x * 250;
        b.vy += dir.y * 250;
      }
      if (!inside) b.sensors[r.id] = false;
    }
    for (const s of t.saucers || []) {
      if (b.captured || b.sensors[s.id]) {
        if (b.sensors[s.id] && Math.hypot(b.x - s.x, b.y - s.y) > 30) b.sensors[s.id] = false;
        continue;
      }
      if (Math.hypot(b.x - s.x, b.y - s.y) < 13 && Math.hypot(b.vx, b.vy) < 1400) {
        b.captured = { s, until: this.time + 1.1 };
        b.sensors[s.id] = true;
        this.fx[s.id] = 1.1;
        this.award(s.points, s.x, s.y, p.accent);
        play("saucer");
        this.event("saucer");
      }
    }
  }

  collideBalls() {
    const bs = this.balls;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i];
        const b = bs[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d === 0 || d >= G.BALL_R * 2) continue;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = (G.BALL_R * 2 - d) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          a.vx += vn * nx;
          a.vy += vn * ny;
          b.vx -= vn * nx;
          b.vy -= vn * ny;
        }
      }
    }
  }

  step() {
    const gravity = 1100 * (this.table.physics.gravity || 1);
    this.stepFlippers();
    for (const b of [...this.balls]) {
      if (b.captured) {
        const { s, until } = b.captured;
        b.x = s.x;
        b.y = s.y;
        b.vx = 0;
        b.vy = 0;
        if (this.time >= until) {
          b.captured = null;
          b.vx = Math.cos(s.angle) * 900;
          b.vy = Math.sin(s.angle) * 900;
        }
        continue;
      }
      b.vy += gravity * DT;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_V) {
        b.vx *= MAX_V / sp;
        b.vy *= MAX_V / sp;
      }
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      if (b.inLane && b.x < G.LANE - G.BALL_R - 2) {
        b.inLane = false;
        if (this.ballSaveArmed) {
          this.ballSaveArmed = false;
          this.ballSaveUntil = this.time + (this.table.physics.ballSave ?? 8);
        }
      }
      this.collideBall(b);
      if (b.y > G.H + 30 || b.x < -50 || b.x > G.W + 50) this.drain(b);
    }
    if (this.balls.length > 1) this.collideBalls();
  }

  update(dt) {
    this.time += dt;
    if (!this.preview) {
      if (this.plungerHeld) this.plungerCharge = Math.min(1, this.plungerCharge + dt * 1.2);
      this.acc = Math.min((this.acc || 0) + dt, DT * SUB * 3);
      while (this.acc >= DT) {
        this.step();
        this.acc -= DT;
      }
      this.tiltMeter = Math.max(0, (this.tiltMeter || 0) - dt * 0.5);
      if (this.combo > 1 && this.time > this.comboUntil) this.combo = 1;
    }
    for (const k in this.fx) this.fx[k] -= dt;
    this.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.shake) this.shake = Math.max(0, this.shake - dt);
  }

  emit(force) {
    if (this.preview) return;
    if (!force && this.time - this.lastEmit < 0.1) return;
    this.lastEmit = this.time;
    const ms = this.table.missions || [];
    const m = ms[this.missionIndex || 0];
    this.onState({
      started: this.started,
      gameOver: this.gameOver,
      score: this.score || 0,
      ballNum: this.ballNum || 0,
      totalBalls: this.totalBalls || this.table.physics.balls,
      combo: this.combo || 1,
      bonusX: this.bonusX || 1,
      tilted: !!this.tilted,
      ballSave: this.started && this.time < (this.ballSaveUntil || 0),
      balls: this.balls.length,
      message: this.message && this.time < this.message.until ? this.message.text : null,
      mission: m ? { ...m, index: this.missionIndex || 0, progress: this.missionProgress || 0, need: Math.ceil(m.count * (1 + (this.level || 0) * 0.5)) } : null,
      level: this.level || 0,
    });
  }

  loop(ts) {
    if (!this.running) return;
    const dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 1 / 60;
    this.last = ts;
    this.update(dt);
    this.ctx.save();
    if (this.shake) this.ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4);
    drawFrame(this.ctx, this);
    this.ctx.restore();
    this.emit(false);
    this.raf = requestAnimationFrame(this.loop);
  }
}
