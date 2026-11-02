import * as Phaser from "phaser";
import { HEIGHT, WIDTH } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { RaceScene } from "./scenes/RaceScene";
import { GameOverScene } from "./scenes/GameOverScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: "#000000",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, RaceScene, GameOverScene],
  });
}
