import * as Phaser from "phaser";
import { HEIGHT, LAPS, WIDTH } from "../constants";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    this.cameras.main.setBackgroundColor("#101820");

    this.add
      .text(WIDTH / 2, 120, "THROTTLE BRAWL", {
        fontFamily: "Impact, Arial Black, sans-serif",
        fontSize: "72px",
        color: "#ffcc00",
        stroke: "#000",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(
        WIDTH / 2,
        280,
        [
          `${LAPS} laps. Finish first. Punch your way through.`,
          "",
          "↑ / W  throttle      ↓ / S  brake",
          "← → / A D  steer",
          "Z / J  punch left    X / K  punch right",
          "ESC  quit to menu",
        ].join("\n"),
        { fontFamily: "monospace", fontSize: "20px", color: "#e0e0e0", align: "center" },
      )
      .setOrigin(0.5);

    const prompt = this.add
      .text(WIDTH / 2, HEIGHT - 70, "PRESS SPACE / ENTER / CLICK TO RIDE", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    const start = () => this.scene.start("Race");
    this.input.keyboard?.once("keydown-SPACE", start);
    this.input.keyboard?.once("keydown-ENTER", start);
    this.input.once("pointerdown", start);
  }
}
