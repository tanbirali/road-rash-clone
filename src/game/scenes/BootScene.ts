import * as Phaser from "phaser";

export const RIDER_TEX_W = 96;
export const RIDER_TEX_H = 80;

/** Jacket / helmet colour per rider skin. Index 0 is the player. */
export const RIDER_SKINS = [
  { key: "player", jacket: 0x1e5bd8, helmet: 0xffd400 },
  { key: "rival_0", jacket: 0xc62828, helmet: 0x222222 },
  { key: "rival_1", jacket: 0x2e7d32, helmet: 0xeeeeee },
  { key: "rival_2", jacket: 0x6a1b9a, helmet: 0xff7043 },
  { key: "rival_3", jacket: 0xef6c00, helmet: 0x263238 },
];

/**
 * Generates every texture procedurally so the scaffold runs with zero asset
 * files. Replace with `this.load.image(...)` / spritesheets in `preload()`
 * once you have real art in /public/assets.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Example once you have art:
    // this.load.spritesheet("player", "/assets/player.png", { frameWidth: 96, frameHeight: 80 });
  }

  create() {
    const g = this.add.graphics();

    for (const skin of RIDER_SKINS) {
      this.makeRider(g, `${skin.key}`, skin.jacket, skin.helmet, 0);
      this.makeRider(g, `${skin.key}_pl`, skin.jacket, skin.helmet, -1);
      this.makeRider(g, `${skin.key}_pr`, skin.jacket, skin.helmet, 1);
      this.makeDownedRider(g, `${skin.key}_down`, skin.jacket, skin.helmet);
    }
    this.makeTree(g);
    this.makeRock(g);
    this.makeSign(g);

    g.destroy();
    this.scene.start("Menu");
  }

  /** Rear view of a rider on a bike. punch: -1 left arm out, 1 right arm out. */
  private makeRider(g: Phaser.GameObjects.Graphics, key: string, jacket: number, helmet: number, punch: -1 | 0 | 1) {
    g.clear();
    const cx = RIDER_TEX_W / 2;

    // rear tyre
    g.fillStyle(0x111111).fillRoundedRect(cx - 7, 54, 14, 26, 5);
    // bike tail / fender
    g.fillStyle(0x333333).fillRect(cx - 13, 46, 26, 14);
    g.fillStyle(0xff2222).fillRect(cx - 5, 49, 10, 4); // tail light
    // handlebar
    g.lineStyle(3, 0x555555).lineBetween(cx - 24, 42, cx + 24, 42);
    // legs
    g.fillStyle(0x222244).fillRect(cx - 16, 44, 8, 16).fillRect(cx + 8, 44, 8, 16);
    // torso (trapezoid)
    g.fillStyle(jacket);
    g.beginPath();
    g.moveTo(cx - 14, 48);
    g.lineTo(cx + 14, 48);
    g.lineTo(cx + 16, 20);
    g.lineTo(cx - 16, 20);
    g.closePath();
    g.fillPath();

    // arms
    const arm = (side: -1 | 1) => {
      g.fillStyle(jacket);
      if (punch === side) {
        // extended punching arm
        const x0 = side < 0 ? 4 : cx + 14;
        g.fillRect(x0, 22, cx - 18, 8);
        g.fillStyle(0xf1c27d).fillCircle(side < 0 ? 6 : RIDER_TEX_W - 6, 26, 6);
      } else {
        g.fillRect(side < 0 ? cx - 24 : cx + 16, 22, 8, 20);
        g.fillStyle(0x222222).fillCircle(side < 0 ? cx - 20 : cx + 20, 43, 4); // glove on bar
      }
    };
    arm(-1);
    arm(1);

    // helmet
    g.fillStyle(helmet).fillCircle(cx, 13, 12);
    g.fillStyle(0x000000, 0.35).fillRect(cx - 10, 12, 20, 3);

    g.generateTexture(key, RIDER_TEX_W, RIDER_TEX_H);
  }

  private makeDownedRider(g: Phaser.GameObjects.Graphics, key: string, jacket: number, helmet: number) {
    g.clear();
    // bike on its side
    g.fillStyle(0x333333).fillRect(8, 56, 70, 12);
    g.fillStyle(0x111111).fillCircle(14, 70, 9).fillCircle(72, 70, 9);
    // rider sprawled
    g.fillStyle(jacket).fillRect(30, 70, 40, 9);
    g.fillStyle(0x222244).fillRect(66, 72, 24, 6);
    g.fillStyle(helmet).fillCircle(26, 73, 7);
    g.generateTexture(key, RIDER_TEX_W, RIDER_TEX_H);
  }

  private makeTree(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(0x6d4c41).fillRect(70, 140, 20, 80);
    g.fillStyle(0x1b5e20).fillCircle(80, 90, 60);
    g.fillStyle(0x2e7d32).fillCircle(55, 110, 40).fillCircle(105, 110, 40);
    g.fillStyle(0x388e3c).fillCircle(80, 55, 38);
    g.generateTexture("tree", 160, 220);
  }

  private makeRock(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(0x757575).fillEllipse(60, 45, 116, 50);
    g.fillStyle(0x9e9e9e).fillEllipse(50, 36, 70, 26);
    g.generateTexture("rock", 120, 70);
  }

  private makeSign(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(0x9e9e9e).fillRect(46, 50, 8, 70);
    g.fillStyle(0xffc107).fillRect(4, 4, 92, 50);
    g.fillStyle(0x000000).fillTriangle(30, 29, 66, 12, 66, 46);
    g.generateTexture("sign", 100, 120);
  }
}
