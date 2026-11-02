import * as Phaser from "phaser";
import {
  ACCEL,
  BIKE_WORLD_W,
  BRAKING,
  CAMERA_DEPTH,
  CAMERA_HEIGHT,
  CENTRIFUGAL,
  COLORS,
  DECEL,
  DRAW_DISTANCE,
  FOG_DENSITY,
  HEIGHT,
  LANES,
  LAPS,
  MAX_SPEED,
  OFF_ROAD_DECEL,
  OFF_ROAD_LIMIT,
  PLAYER_MAX_HP,
  PLAYER_Z,
  PUNCH_COOLDOWN,
  PUNCH_DAMAGE,
  PUNCH_REACH_X,
  PUNCH_REACH_Z,
  RIVAL_COUNT,
  RIVAL_MAX_HP,
  ROAD_WIDTH,
  SEGMENT_LENGTH,
  SegmentColors,
  WIDTH,
} from "../constants";
import { Track, Util } from "../road/Track";
import { Rival } from "../entities/Rival";
import { RIDER_SKINS } from "./BootScene";
import type { RaceResult } from "./GameOverScene";

const RIVAL_NAMES = ["Vex", "Mara", "Duke", "Rook", "Sable", "Jinx", "Bram", "Tess"];
const PLAYER_W = BIKE_WORLD_W / ROAD_WIDTH; // player width in road units

type Keys = {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  punchL: Phaser.Input.Keyboard.Key[];
  punchR: Phaser.Input.Keyboard.Key[];
  esc: Phaser.Input.Keyboard.Key;
};

export class RaceScene extends Phaser.Scene {
  private track!: Track;
  private trackLength = 0;

  // player state
  private position = 0; // camera z along the loop
  private speed = 0;
  private playerX = 0; // lateral offset, -1..1 is on the road
  private playerHp = PLAYER_MAX_HP;
  private distance = 0; // total distance (for laps / ranking)
  private crashTimer = 0;
  private punchCooldown = 0;
  private punchTimer = 0;
  private punchSide: -1 | 1 = 1;
  private steer = 0;
  private knockouts = 0;
  private raceTime = 0;
  private countdown = 3;
  private skyOffset = 0;
  private finished = false;

  private rivals: Rival[] = [];

  // rendering
  private bg!: Phaser.GameObjects.Graphics;
  private road!: Phaser.GameObjects.Graphics;
  private hudGfx!: Phaser.GameObjects.Graphics;
  private pool: Phaser.GameObjects.Image[] = [];
  private poolUsed = 0;
  private player!: Phaser.GameObjects.Image;
  private hudText!: Phaser.GameObjects.Text;
  private bigText!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text;
  private messageTimer = 0;
  private keys!: Keys;

  constructor() {
    super("Race");
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  create() {
    this.track = new Track().build();
    this.trackLength = this.track.length;

    // Scenes are reused on restart, so reset every field explicitly.
    this.position = 0;
    this.speed = 0;
    this.playerX = 0;
    this.playerHp = PLAYER_MAX_HP;
    this.distance = PLAYER_Z;
    this.crashTimer = 0;
    this.punchCooldown = 0;
    this.punchTimer = 0;
    this.steer = 0;
    this.knockouts = 0;
    this.raceTime = 0;
    this.countdown = 3;
    this.skyOffset = 0;
    this.finished = false;
    this.pool = [];

    // Rivals start on a grid ahead of the player (you start at the back).
    this.rivals = [];
    for (let i = 0; i < RIVAL_COUNT; i++) {
      const skin = RIDER_SKINS[1 + (i % (RIDER_SKINS.length - 1))];
      this.rivals.push(
        new Rival({
          name: RIVAL_NAMES[i % RIVAL_NAMES.length],
          texture: skin.key,
          z: PLAYER_Z + SEGMENT_LENGTH * (4 + i * 3),
          offset: [-0.5, 0, 0.5][i % 3],
          skill: i / RIVAL_COUNT, // riders further up the grid are faster
        }),
      );
    }

    this.bg = this.add.graphics().setDepth(0);
    this.road = this.add.graphics().setDepth(1);
    this.player = this.add.image(WIDTH / 2, HEIGHT, "player").setOrigin(0.5, 1).setDepth(10_000);
    this.hudGfx = this.add.graphics().setDepth(20_000);

    this.hudText = this.add
      .text(16, 12, "", { fontFamily: "monospace", fontSize: "20px", color: "#fff", stroke: "#000", strokeThickness: 4 })
      .setDepth(20_001);
    this.targetText = this.add
      .text(WIDTH - 16, 12, "", { fontFamily: "monospace", fontSize: "18px", color: "#fff", stroke: "#000", strokeThickness: 4, align: "right" })
      .setOrigin(1, 0)
      .setDepth(20_001);
    this.bigText = this.add
      .text(WIDTH / 2, HEIGHT / 3, "", {
        fontFamily: "Impact, Arial Black, sans-serif",
        fontSize: "64px",
        color: "#ffcc00",
        stroke: "#000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(20_001);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const k = (code: number) => kb.addKey(code);
    this.keys = {
      up: [k(K.UP), k(K.W)],
      down: [k(K.DOWN), k(K.S)],
      left: [k(K.LEFT), k(K.A)],
      right: [k(K.RIGHT), k(K.D)],
      punchL: [k(K.Z), k(K.J)],
      punchR: [k(K.X), k(K.K)],
      esc: k(K.ESC),
    };
  }

  // -------------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------------

  update(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 1 / 20); // clamp big frame gaps

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.scene.start("Menu");
      return;
    }

    if (this.countdown > 0) {
      this.countdown -= dt;
      const now = Math.ceil(this.countdown);
      if (now > 0) this.bigText.setText(String(now));
      else this.flash("GO!", 0.8);
    } else if (!this.finished) {
      this.raceTime += dt;
      this.updatePlayer(dt);
      for (const r of this.rivals) r.update(dt, this.trackLength);
      this.updateCombat(dt);
      this.checkFinish();
    }

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.bigText.setText("");
    }

    this.render();
    this.renderHud();
  }

  private down(keys: Phaser.Input.Keyboard.Key[]) {
    return keys.some((k) => k.isDown);
  }
  private justDown(keys: Phaser.Input.Keyboard.Key[]) {
    return keys.some((k) => Phaser.Input.Keyboard.JustDown(k));
  }

  // -------------------------------------------------------------------------
  // Player physics
  // -------------------------------------------------------------------------

  private updatePlayer(dt: number) {
    const playerSegment = this.track.findSegment(this.position + PLAYER_Z);
    const speedPercent = this.speed / MAX_SPEED;
    const dx = dt * 2 * speedPercent;
    const startPosition = this.position;

    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.punchTimer = Math.max(0, this.punchTimer - dt);

    if (this.crashTimer > 0) {
      // Thrown off the bike: skid to a stop, then get back on.
      this.crashTimer -= dt;
      this.speed = Math.max(0, this.speed - MAX_SPEED * 1.5 * dt);
      this.steer = 0;
      if (this.crashTimer <= 0) {
        this.playerX = Util.limit(this.playerX, -0.8, 0.8);
        if (this.playerHp <= 0) this.playerHp = Math.round(PLAYER_MAX_HP * 0.6);
      }
    } else {
      const left = this.down(this.keys.left);
      const right = this.down(this.keys.right);
      if (left) this.playerX -= dx;
      else if (right) this.playerX += dx;
      this.steer = Util.interpolate(this.steer, left ? -1 : right ? 1 : 0, Math.min(1, dt * 10));

      // Curves push you outward.
      this.playerX -= dx * speedPercent * playerSegment.curve * CENTRIFUGAL;

      if (this.down(this.keys.up)) this.speed = Util.accelerate(this.speed, ACCEL, dt);
      else if (this.down(this.keys.down)) this.speed = Util.accelerate(this.speed, BRAKING, dt);
      else this.speed = Util.accelerate(this.speed, DECEL, dt);

      const offRoad = this.playerX < -1 || this.playerX > 1;
      if (offRoad) {
        if (this.speed > OFF_ROAD_LIMIT) this.speed = Util.accelerate(this.speed, OFF_ROAD_DECEL, dt);
        // Hitting a roadside prop throws you off the bike.
        for (const s of playerSegment.sprites) {
          if (Util.overlap(this.playerX, PLAYER_W, s.offset, (s.worldW / ROAD_WIDTH) * 0.5)) {
            this.crash(s.texture === "tree" ? "TREE!" : "WIPEOUT!");
            break;
          }
        }
      }

      // Rear-ending a rival slows you down.
      for (const r of this.rivals) {
        if (r.state !== "riding" || r.segmentIndex(this.track.segments.length) !== playerSegment.index) continue;
        if (this.speed > r.speed && Util.overlap(this.playerX, PLAYER_W, r.offset, PLAYER_W, 0.8)) {
          this.speed = r.speed * (r.speed / this.speed) * 0.9;
          this.position = Util.increase(r.z, -PLAYER_Z - 1, this.trackLength);
          break;
        }
      }
    }

    this.playerX = Util.limit(this.playerX, -3, 3);
    this.speed = Util.limit(this.speed, 0, MAX_SPEED);

    const travelled = dt * this.speed;
    this.position = Util.increase(this.position, travelled, this.trackLength);
    this.distance += travelled;

    // Parallax background follows the road's curvature.
    const segmentsMoved = (this.position - startPosition) / SEGMENT_LENGTH;
    if (segmentsMoved > 0) this.skyOffset = Util.increase(this.skyOffset, 0.002 * playerSegment.curve * segmentsMoved, 1);
  }

  private crash(message: string) {
    if (this.crashTimer > 0) return;
    this.crashTimer = 2;
    this.speed *= 0.3;
    this.cameras.main.shake(250, 0.012);
    this.flash(message, 1.2);
  }

  // -------------------------------------------------------------------------
  // Combat
  // -------------------------------------------------------------------------

  /** Signed z distance from player to rival, wrapped around the loop. */
  private dzTo(r: Rival) {
    let dz = r.z - Util.increase(this.position, PLAYER_Z, this.trackLength);
    if (dz > this.trackLength / 2) dz -= this.trackLength;
    if (dz < -this.trackLength / 2) dz += this.trackLength;
    return dz;
  }

  private inReach(r: Rival) {
    return r.state === "riding" && Math.abs(this.dzTo(r)) < PUNCH_REACH_Z && Math.abs(r.offset - this.playerX) < PUNCH_REACH_X;
  }

  private updateCombat(dt: number) {
    // Player attacks
    if (this.crashTimer <= 0 && this.punchCooldown <= 0) {
      const side = this.justDown(this.keys.punchL) ? -1 : this.justDown(this.keys.punchR) ? 1 : 0;
      if (side !== 0) {
        this.punchSide = side;
        this.punchTimer = 0.2;
        this.punchCooldown = PUNCH_COOLDOWN;

        const target = this.rivals
          .filter((r) => this.inReach(r))
          .filter((r) => Math.sign(r.offset - this.playerX) === side || Math.abs(r.offset - this.playerX) < 0.08)
          .sort((a, b) => Math.abs(this.dzTo(a)) - Math.abs(this.dzTo(b)))[0];

        if (target) {
          target.hp -= PUNCH_DAMAGE;
          target.offset += side * 0.08;
          target.speed *= 0.9;
          this.cameras.main.shake(80, 0.004);
          if (target.hp <= 0) {
            target.knockDown();
            this.knockouts++;
            this.flash(`${target.name.toUpperCase()} DOWN!`, 1);
          }
        }
      }
    }

    // Rivals attack / chase the player
    for (const r of this.rivals) {
      if (r.state !== "riding") continue;
      const dz = this.dzTo(r);

      // Drift toward the player when close: they want a fight.
      if (Math.abs(dz) < SEGMENT_LENGTH * 4) {
        r.offset += Math.sign(this.playerX - r.offset) * 0.25 * r.aggression * dt;
        // Match the player's pace a bit so fights last longer.
        if (dz > 0 && this.speed < r.speed) r.speed = Math.max(this.speed, r.speed - MAX_SPEED * 0.1 * dt);
      }

      if (this.crashTimer <= 0 && this.inReach(r) && r.attackCooldown <= 0 && Math.random() < r.aggression * dt * 3) {
        r.punchTimer = 0.25;
        r.punchSide = this.playerX < r.offset ? -1 : 1;
        r.attackCooldown = 1.2 + Math.random();
        this.playerHp -= 8 + Math.floor(Math.random() * 7);
        this.cameras.main.shake(100, 0.006);
        if (this.playerHp <= 0) {
          this.playerHp = 0;
          this.crash(`${r.name.toUpperCase()} GOT YOU!`);
        }
      }
    }
  }

  private rank() {
    return 1 + this.rivals.filter((r) => r.distance > this.distance).length;
  }

  private checkFinish() {
    if (this.distance < LAPS * this.trackLength) return;
    this.finished = true;
    const result: RaceResult = { rank: this.rank(), time: this.raceTime, knockouts: this.knockouts };
    this.flash("FINISH!", 2);
    this.time.delayedCall(1500, () => this.scene.start("GameOver", result));
  }

  private flash(msg: string, seconds: number) {
    this.bigText.setText(msg);
    this.messageTimer = seconds;
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private render() {
    const segments = this.track.segments;
    const baseSegment = this.track.findSegment(this.position);
    const basePercent = Util.percentRemaining(this.position, SEGMENT_LENGTH);
    const playerSegment = this.track.findSegment(this.position + PLAYER_Z);
    const playerPercent = Util.percentRemaining(this.position + PLAYER_Z, SEGMENT_LENGTH);
    const playerY = Util.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);

    this.drawBackground(playerY);

    const g = this.road;
    g.clear();

    let maxy = HEIGHT;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);

    // Pass 1: road, front to back, with hill clipping via maxy.
    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const segment = segments[(baseSegment.index + n) % segments.length];
      const looped = segment.index < baseSegment.index;
      const camZ = this.position - (looped ? this.trackLength : 0);
      const fog = Util.exponentialFog(n / DRAW_DISTANCE, FOG_DENSITY);
      segment.clip = maxy;

      Util.project(segment.p1, this.playerX * ROAD_WIDTH - x, playerY + CAMERA_HEIGHT, camZ);
      Util.project(segment.p2, this.playerX * ROAD_WIDTH - x - dx, playerY + CAMERA_HEIGHT, camZ);
      x += dx;
      dx += segment.curve;

      if (
        segment.p1.camera.z <= CAMERA_DEPTH ||
        segment.p2.screen.y >= segment.p1.screen.y ||
        segment.p2.screen.y >= maxy
      )
        continue;

      this.drawSegment(g, segment.p1.screen, segment.p2.screen, fog, segment.color);
      maxy = segment.p2.screen.y;
    }

    // Pass 2: sprites, back to front, so near things overlap far things.
    this.poolUsed = 0;
    let depth = 10;
    const rivalsBySeg = new Map<number, Rival[]>();
    for (const r of this.rivals) {
      const idx = r.segmentIndex(segments.length);
      const list = rivalsBySeg.get(idx);
      if (list) list.push(r);
      else rivalsBySeg.set(idx, [r]);
    }

    for (let n = DRAW_DISTANCE - 1; n > 0; n--) {
      const segment = segments[(baseSegment.index + n) % segments.length];
      if (segment.p1.camera.z <= CAMERA_DEPTH) continue;

      for (const s of segment.sprites) {
        const scale = segment.p1.screen.scale;
        const sx = segment.p1.screen.x + (scale * s.offset * ROAD_WIDTH * WIDTH) / 2;
        this.drawSprite(s.texture, scale, sx, segment.p1.screen.y, s.worldW, segment.clip, depth++);
      }

      const riders = rivalsBySeg.get(segment.index);
      if (riders) {
        for (const r of riders) {
          const p = Util.percentRemaining(r.z, SEGMENT_LENGTH);
          const scale = Util.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, p);
          const sx =
            Util.interpolate(segment.p1.screen.x, segment.p2.screen.x, p) + (scale * r.offset * ROAD_WIDTH * WIDTH) / 2;
          const sy = Util.interpolate(segment.p1.screen.y, segment.p2.screen.y, p);
          const tex =
            r.state === "down" ? `${r.texture}_down` : r.punchTimer > 0 ? `${r.texture}_${r.punchSide < 0 ? "pl" : "pr"}` : r.texture;
          this.drawSprite(tex, scale, sx, sy, BIKE_WORLD_W, segment.clip, depth++);
        }
      }
    }

    for (let i = this.poolUsed; i < this.pool.length; i++) this.pool[i].setVisible(false);

    // Player bike: always bottom-centre; the world moves around it.
    const bounce = this.speed > 0 && this.crashTimer <= 0 ? Math.round(Math.random() * (this.playerX < -1 || this.playerX > 1 ? 4 : 1.5)) : 0;
    const tex =
      this.crashTimer > 0 ? "player_down" : this.punchTimer > 0 ? `player_${this.punchSide < 0 ? "pl" : "pr"}` : "player";
    const pw = (CAMERA_DEPTH / PLAYER_Z) * BIKE_WORLD_W * (WIDTH / 2);
    this.player
      .setTexture(tex)
      .setDisplaySize(pw, pw * (this.player.height / this.player.width))
      .setPosition(WIDTH / 2, HEIGHT - 6 - bounce)
      .setAngle(this.steer * 10);
  }

  private drawBackground(playerY: number) {
    const g = this.bg;
    g.clear();
    g.fillGradientStyle(COLORS.sky, COLORS.sky, COLORS.skyBottom, COLORS.skyBottom, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    const lift = -playerY * 0.002; // hills shift slightly with elevation
    this.drawHills(g, COLORS.hillsFar, HEIGHT * 0.5 + lift, 70, 0.006, this.skyOffset * WIDTH * 1.5);
    this.drawHills(g, COLORS.hillsNear, HEIGHT * 0.56 + lift * 2, 50, 0.011, this.skyOffset * WIDTH * 3);
  }

  private drawHills(g: Phaser.GameObjects.Graphics, color: number, baseY: number, amp: number, freq: number, offset: number) {
    g.fillStyle(color);
    g.beginPath();
    g.moveTo(0, HEIGHT);
    for (let x = 0; x <= WIDTH; x += 16) {
      const t = (x + offset) * freq;
      const y = baseY - amp * (0.6 + 0.4 * Math.sin(t) * Math.sin(t * 0.37 + 1.3));
      g.lineTo(x, y);
    }
    g.lineTo(WIDTH, HEIGHT);
    g.closePath();
    g.fillPath();
  }

  private quad(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: number) {
    g.fillStyle(color);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.lineTo(x4, y4);
    g.closePath();
    g.fillPath();
  }

  private drawSegment(
    g: Phaser.GameObjects.Graphics,
    s1: { x: number; y: number; w: number },
    s2: { x: number; y: number; w: number },
    fog: number,
    color: SegmentColors,
  ) {
    const { x: x1, y: y1, w: w1 } = s1;
    const { x: x2, y: y2, w: w2 } = s2;
    const r1 = w1 / Math.max(6, 2 * LANES);
    const r2 = w2 / Math.max(6, 2 * LANES);
    const l1 = w1 / Math.max(32, 8 * LANES);
    const l2 = w2 / Math.max(32, 8 * LANES);

    g.fillStyle(color.grass);
    g.fillRect(0, y2, WIDTH, y1 - y2);

    this.quad(g, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble);
    this.quad(g, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble);
    this.quad(g, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);

    if (color.lane >= 0) {
      const laneW1 = (w1 * 2) / LANES;
      const laneW2 = (w2 * 2) / LANES;
      let lx1 = x1 - w1 + laneW1;
      let lx2 = x2 - w2 + laneW2;
      for (let lane = 1; lane < LANES; lane++, lx1 += laneW1, lx2 += laneW2) {
        this.quad(g, lx1 - l1 / 2, y1, lx1 + l1 / 2, y1, lx2 + l2 / 2, y2, lx2 - l2 / 2, y2, color.lane);
      }
    }

    if (fog < 1) {
      g.fillStyle(COLORS.fog, 1 - fog);
      g.fillRect(0, y2, WIDTH, y1 - y2);
    }
  }

  /** Places a pooled Image at a projected position, cropping it behind hills. */
  private drawSprite(texture: string, scale: number, x: number, y: number, worldW: number, clipY: number, depth: number) {
    const destW = (scale * worldW * WIDTH) / 2;
    if (destW < 1 || destW > WIDTH * 3) return;

    let img = this.pool[this.poolUsed];
    if (!img) {
      img = this.add.image(0, 0, texture).setOrigin(0.5, 1);
      this.pool.push(img);
    }
    this.poolUsed++;

    img.setTexture(texture);
    const fw = img.frame.width;
    const fh = img.frame.height;
    const destH = destW * (fh / fw);
    const top = y - destH;

    if (clipY < y) {
      const visible = clipY - top;
      if (visible <= 0) {
        img.setVisible(false);
        return;
      }
      img.setCrop(0, 0, fw, fh * (visible / destH));
    } else {
      img.setCrop();
    }

    img.setVisible(true).setDepth(depth).setPosition(x, y).setDisplaySize(destW, destH);
  }

  private renderHud() {
    const lap = Math.min(LAPS, Math.floor(this.distance / this.trackLength) + 1);
    const kmh = Math.round((this.speed / MAX_SPEED) * 220);
    this.hudText.setText(
      `SPEED ${String(kmh).padStart(3)} km/h\nLAP   ${lap}/${LAPS}\nPOS   ${this.rank()}/${RIVAL_COUNT + 1}\nTIME  ${this.raceTime.toFixed(1)}s`,
    );

    const g = this.hudGfx;
    g.clear();
    this.bar(g, 16, 112, 200, this.playerHp / PLAYER_MAX_HP, 0x43a047);

    // Show the HP of the nearest rival within reach.
    const near = this.rivals
      .filter((r) => r.state === "riding" && Math.abs(this.dzTo(r)) < PUNCH_REACH_Z * 2)
      .sort((a, b) => Math.abs(this.dzTo(a)) - Math.abs(this.dzTo(b)))[0];
    if (near) {
      this.targetText.setText(near.name.toUpperCase());
      this.bar(g, WIDTH - 216, 40, 200, Math.max(0, near.hp) / RIVAL_MAX_HP, 0xe53935);
    } else {
      this.targetText.setText("");
    }
  }

  private bar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, pct: number, color: number) {
    g.fillStyle(0x000000, 0.6).fillRect(x - 2, y - 2, w + 4, 16);
    g.fillStyle(color).fillRect(x, y, w * Util.limit(pct, 0, 1), 12);
  }
}
