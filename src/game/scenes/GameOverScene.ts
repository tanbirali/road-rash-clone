import * as Phaser from "phaser";
import { HEIGHT, RIVAL_COUNT, WIDTH } from "../constants";

export interface RaceResult {
  rank: number;
  time: number;
  knockouts: number;
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  create(result: RaceResult) {
    this.cameras.main.setBackgroundColor("#101820");
    const won = result.rank === 1;

    this.add
      .text(WIDTH / 2, 130, won ? "YOU WIN!" : `FINISHED ${ordinal(result.rank).toUpperCase()}`, {
        fontFamily: "Impact, Arial Black, sans-serif",
        fontSize: "64px",
        color: won ? "#ffcc00" : "#ffffff",
        stroke: "#000",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(
        WIDTH / 2,
        270,
        [
          `Position   ${result.rank} / ${RIVAL_COUNT + 1}`,
          `Time       ${result.time.toFixed(2)}s`,
          `Knockouts  ${result.knockouts}`,
        ].join("\n"),
        { fontFamily: "monospace", fontSize: "26px", color: "#e0e0e0" },
      )
      .setOrigin(0.5);

    this.add
      .text(WIDTH / 2, HEIGHT - 80, "SPACE: race again    M: menu", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Race"));
    this.input.keyboard?.once("keydown-M", () => this.scene.start("Menu"));
  }
}
