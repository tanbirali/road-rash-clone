// Global tuning knobs. Tweak these first when the game "feels" wrong.

export const WIDTH = 960;
export const HEIGHT = 540;
export const FPS = 60;
export const STEP = 1 / FPS;

// --- Pseudo-3D road ---------------------------------------------------------
export const SEGMENT_LENGTH = 200; // world units per road segment
export const RUMBLE_LENGTH = 3; // segments per alternating colour stripe
export const ROAD_WIDTH = 2000; // half-width actually: road spans -ROAD_WIDTH..+ROAD_WIDTH
export const LANES = 3;
export const FIELD_OF_VIEW = 100; // degrees
export const CAMERA_HEIGHT = 1000;
export const CAMERA_DEPTH = 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180);
export const DRAW_DISTANCE = 250; // segments drawn ahead
export const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH; // player distance in front of camera
export const FOG_DENSITY = 4;

// --- Bike physics -----------------------------------------------------------
export const MAX_SPEED = SEGMENT_LENGTH / STEP; // one segment per frame
export const ACCEL = MAX_SPEED / 5;
export const BRAKING = -MAX_SPEED;
export const DECEL = -MAX_SPEED / 5;
export const OFF_ROAD_DECEL = -MAX_SPEED / 2;
export const OFF_ROAD_LIMIT = MAX_SPEED / 4;
export const CENTRIFUGAL = 0.3;

// --- Race / combat ----------------------------------------------------------
export const LAPS = 2;
export const RIVAL_COUNT = 7;
export const PLAYER_MAX_HP = 100;
export const RIVAL_MAX_HP = 60;
export const PUNCH_DAMAGE = 20;
export const PUNCH_COOLDOWN = 0.35; // seconds
export const PUNCH_REACH_Z = SEGMENT_LENGTH * 1.5; // how far ahead/behind you can hit
export const PUNCH_REACH_X = 0.45; // lateral reach in road-width units

// Sprite world sizes (world units; converted to px by projection scale)
export const BIKE_WORLD_W = 260;
export const TREE_WORLD_W = 1100;
export const SIGN_WORLD_W = 500;

export const COLORS = {
  sky: 0x72d7ee,
  skyBottom: 0xbfeeff,
  fog: 0x9ecfdd,
  hillsFar: 0x6aa36a,
  hillsNear: 0x3f7f3f,
  light: { road: 0x6b6b6b, grass: 0x10aa10, rumble: 0xdddddd, lane: 0xcccccc },
  dark: { road: 0x696969, grass: 0x009a00, rumble: 0xbb2222, lane: -1 },
  start: { road: 0xffffff, grass: 0x10aa10, rumble: 0xffffff, lane: -1 },
  finish: { road: 0x111111, grass: 0x10aa10, rumble: 0x111111, lane: -1 },
} as const;

export type SegmentColors = { road: number; grass: number; rumble: number; lane: number };
