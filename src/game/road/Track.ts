import {
  CAMERA_DEPTH,
  COLORS,
  HEIGHT,
  ROAD_WIDTH,
  RUMBLE_LENGTH,
  SEGMENT_LENGTH,
  SegmentColors,
  SIGN_WORLD_W,
  TREE_WORLD_W,
  WIDTH,
} from "../constants";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface ProjectedPoint {
  world: { x: number; y: number; z: number };
  camera: { x: number; y: number; z: number };
  screen: { x: number; y: number; w: number; scale: number };
}

export interface RoadsideSprite {
  texture: string;
  offset: number; // lateral position in road-width units (-1..1 is on road)
  worldW: number;
}

export interface Segment {
  index: number;
  p1: ProjectedPoint;
  p2: ProjectedPoint;
  curve: number;
  color: SegmentColors;
  sprites: RoadsideSprite[];
  clip: number; // screen y below which this segment is hidden by a hill
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

export const Util = {
  increase(start: number, increment: number, max: number) {
    let result = start + increment;
    while (result >= max) result -= max;
    while (result < 0) result += max;
    return result;
  },
  accelerate: (v: number, accel: number, dt: number) => v + accel * dt,
  limit: (v: number, min: number, max: number) => Math.max(min, Math.min(v, max)),
  interpolate: (a: number, b: number, percent: number) => a + (b - a) * percent,
  percentRemaining: (n: number, total: number) => (n % total) / total,
  easeIn: (a: number, b: number, p: number) => a + (b - a) * Math.pow(p, 2),
  easeInOut: (a: number, b: number, p: number) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5),
  exponentialFog: (distance: number, density: number) =>
    1 / Math.pow(Math.E, distance * distance * density),
  overlap(x1: number, w1: number, x2: number, w2: number, percent = 1) {
    const half = percent / 2;
    const min1 = x1 - w1 * half;
    const max1 = x1 + w1 * half;
    const min2 = x2 - w2 * half;
    const max2 = x2 + w2 * half;
    return !(max1 < min2 || min1 > max2);
  },
  /** World → camera → screen projection (the heart of a pseudo-3D racer). */
  project(p: ProjectedPoint, camX: number, camY: number, camZ: number) {
    p.camera.x = (p.world.x || 0) - camX;
    p.camera.y = (p.world.y || 0) - camY;
    p.camera.z = (p.world.z || 0) - camZ;
    p.screen.scale = CAMERA_DEPTH / p.camera.z;
    p.screen.x = Math.round(WIDTH / 2 + (p.screen.scale * p.camera.x * WIDTH) / 2);
    p.screen.y = Math.round(HEIGHT / 2 - (p.screen.scale * p.camera.y * HEIGHT) / 2);
    p.screen.w = Math.round((p.screen.scale * ROAD_WIDTH * WIDTH) / 2);
  },
};

// ---------------------------------------------------------------------------
// Track builder
// ---------------------------------------------------------------------------

const LENGTH = { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 };
const CURVE = { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 };
const HILL = { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 };

function makePoint(y: number, z: number): ProjectedPoint {
  return {
    world: { x: 0, y, z },
    camera: { x: 0, y: 0, z: 0 },
    screen: { x: 0, y: 0, w: 0, scale: 0 },
  };
}

export class Track {
  segments: Segment[] = [];

  get length() {
    return this.segments.length * SEGMENT_LENGTH;
  }

  private lastY() {
    return this.segments.length === 0 ? 0 : this.segments[this.segments.length - 1].p2.world.y;
  }

  private addSegment(curve: number, y: number) {
    const n = this.segments.length;
    const dark = Math.floor(n / RUMBLE_LENGTH) % 2 === 1;
    this.segments.push({
      index: n,
      p1: makePoint(this.lastY(), n * SEGMENT_LENGTH),
      p2: makePoint(y, (n + 1) * SEGMENT_LENGTH),
      curve,
      color: dark ? COLORS.dark : COLORS.light,
      sprites: [],
      clip: 0,
    });
  }

  private addRoad(enter: number, hold: number, leave: number, curve: number, hill: number) {
    const startY = this.lastY();
    const endY = startY + Math.round(hill) * SEGMENT_LENGTH;
    const total = enter + hold + leave;
    for (let n = 0; n < enter; n++)
      this.addSegment(Util.easeIn(0, curve, n / enter), Util.easeInOut(startY, endY, n / total));
    for (let n = 0; n < hold; n++)
      this.addSegment(curve, Util.easeInOut(startY, endY, (enter + n) / total));
    for (let n = 0; n < leave; n++)
      this.addSegment(
        Util.easeInOut(curve, 0, n / leave),
        Util.easeInOut(startY, endY, (enter + hold + n) / total),
      );
  }

  private straight(len = LENGTH.MEDIUM) {
    this.addRoad(len, len, len, 0, 0);
  }
  private hill(len = LENGTH.MEDIUM, height = HILL.MEDIUM) {
    this.addRoad(len, len, len, 0, height);
  }
  private curve(len = LENGTH.MEDIUM, curve = CURVE.MEDIUM, height = HILL.NONE) {
    this.addRoad(len, len, len, curve, height);
  }
  private sCurves() {
    this.addRoad(LENGTH.MEDIUM, LENGTH.MEDIUM, LENGTH.MEDIUM, -CURVE.EASY, HILL.NONE);
    this.addRoad(LENGTH.MEDIUM, LENGTH.MEDIUM, LENGTH.MEDIUM, CURVE.MEDIUM, HILL.MEDIUM);
    this.addRoad(LENGTH.MEDIUM, LENGTH.MEDIUM, LENGTH.MEDIUM, CURVE.EASY, -HILL.LOW);
    this.addRoad(LENGTH.MEDIUM, LENGTH.MEDIUM, LENGTH.MEDIUM, -CURVE.EASY, HILL.MEDIUM);
    this.addRoad(LENGTH.MEDIUM, LENGTH.MEDIUM, LENGTH.MEDIUM, -CURVE.MEDIUM, -HILL.MEDIUM);
  }
  private downhillToEnd(len = 200) {
    this.addRoad(len, len, len, -CURVE.EASY, -this.lastY() / SEGMENT_LENGTH);
  }

  /** Builds an original loop course. Edit this to design new tracks. */
  build() {
    this.segments = [];
    this.straight(LENGTH.SHORT);
    this.hill(LENGTH.SHORT, HILL.LOW);
    this.curve(LENGTH.MEDIUM, CURVE.MEDIUM, HILL.LOW);
    this.straight(LENGTH.MEDIUM);
    this.sCurves();
    this.curve(LENGTH.LONG, -CURVE.MEDIUM, HILL.MEDIUM);
    this.hill(LENGTH.MEDIUM, -HILL.HIGH);
    this.curve(LENGTH.LONG, CURVE.HARD, HILL.NONE);
    this.straight(LENGTH.LONG);
    this.downhillToEnd();

    this.decorate();

    // start / finish stripes
    for (let i = 0; i < RUMBLE_LENGTH; i++) {
      this.segments[2 + i].color = COLORS.start;
      this.segments[this.segments.length - 1 - i].color = COLORS.finish;
    }
    return this;
  }

  /** Scatter roadside props. Hitting them while off-road = crash. */
  private decorate() {
    const add = (n: number, s: RoadsideSprite) => this.segments[n]?.sprites.push(s);
    for (let n = 20; n < this.segments.length - 20; n += 6 + Math.floor(Math.random() * 6)) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const isTree = Math.random() < 0.8;
      add(n, {
        texture: isTree ? "tree" : "rock",
        offset: side * (1.4 + Math.random() * 2.5),
        worldW: isTree ? TREE_WORLD_W * (0.7 + Math.random() * 0.5) : TREE_WORLD_W * 0.4,
      });
    }
    for (let n = 60; n < this.segments.length; n += 120) {
      add(n, { texture: "sign", offset: -1.25, worldW: SIGN_WORLD_W });
      add(n, { texture: "sign", offset: 1.25, worldW: SIGN_WORLD_W });
    }
  }

  findSegment(z: number): Segment {
    return this.segments[Math.floor(z / SEGMENT_LENGTH) % this.segments.length];
  }
}
