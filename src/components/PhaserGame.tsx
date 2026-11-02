"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { createGame } from "@/game/main";

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    gameRef.current = createGame(containerRef.current);

    // React StrictMode mounts → unmounts → mounts in dev; destroying here
    // guarantees we never end up with two canvases.
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="game-root" ref={containerRef} />;
}
