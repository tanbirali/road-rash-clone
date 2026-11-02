"use client";

import dynamic from "next/dynamic";

// Phaser touches `window`/`document` at import time, so it must never be
// prerendered on the server. `ssr: false` is only allowed inside a client component.
const PhaserGame = dynamic(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => <div style={{ padding: 24 }}>Loading engine…</div>,
});

export default function GameClient() {
  return <PhaserGame />;
}
