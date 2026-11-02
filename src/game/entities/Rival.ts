import { MAX_SPEED, RIVAL_MAX_HP, SEGMENT_LENGTH } from "../constants";

export type RivalState = "riding" | "down";

/** An AI rider. Pure data + simple logic; rendering happens in RaceScene. */
export class Rival {
  name: string;
  texture: string;
  offset: number; // lateral, road-width units
  z: number; // position along the track loop
  distance = 0; // total distance travelled (for race ranking)
  speed: number;
  baseSpeed: number;
  hp = RIVAL_MAX_HP;
  state: RivalState = "riding";
  downTimer = 0;
  attackCooldown = 0;
  punchTimer = 0; // > 0 while showing a punch frame
  punchSide: -1 | 1 = 1;
  aggression: number; // 0..1 chance-ish of starting a fight

  constructor(opts: { name: string; texture: string; z: number; offset: number; skill: number }) {
    this.name = opts.name;
    this.texture = opts.texture;
    this.z = opts.z;
    this.distance = opts.z;
    this.offset = opts.offset;
    this.baseSpeed = MAX_SPEED * (0.55 + opts.skill * 0.25);
    this.speed = 0; // standing start, like the player
    this.aggression = 0.3 + Math.random() * 0.5;
  }

  knockDown() {
    this.state = "down";
    this.downTimer = 3;
    this.speed = 0;
    this.hp = 0;
  }

  update(dt: number, trackLength: number) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.punchTimer = Math.max(0, this.punchTimer - dt);

    if (this.state === "down") {
      this.downTimer -= dt;
      if (this.downTimer <= 0) {
        this.state = "riding";
        this.hp = Math.round(RIVAL_MAX_HP * 0.6);
        this.offset = Math.max(-0.8, Math.min(0.8, this.offset));
      }
      return;
    }

    // Accelerate back to cruising speed (after a crash or slowdown)
    this.speed = Math.min(this.baseSpeed, this.speed + (MAX_SPEED / 6) * dt);

    // Gentle lane wandering
    if (Math.random() < 0.01) this.offset += (Math.random() - 0.5) * 0.3;
    this.offset = Math.max(-0.85, Math.min(0.85, this.offset));

    const dz = this.speed * dt;
    this.z = (this.z + dz) % trackLength;
    this.distance += dz;
  }

  /** Segment index this rider currently occupies. */
  segmentIndex(segmentCount: number) {
    return Math.floor(this.z / SEGMENT_LENGTH) % segmentCount;
  }
}
