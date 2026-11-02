# Throttle Brawl

A lightweight pseudo-3D motorcycle combat racer: Next.js (App Router) + Phaser 4.

```bash
npm run dev     # http://localhost:3000
npm run build
```

## Controls
| Action | Keys |
|---|---|
| Throttle / Brake | ↑ / ↓ or W / S |
| Steer | ← → or A / D |
| Punch left / right | Z / X or J / K |
| Quit to menu | ESC |

## Structure
```
src/
  app/page.tsx              server component, renders <GameClient/>
  components/GameClient.tsx "use client" + next/dynamic({ ssr:false })
  components/PhaserGame.tsx creates/destroys Phaser.Game in useEffect
  game/
    main.ts                 Phaser config + scene list
    constants.ts            all tuning knobs (speed, FOV, damage, colours)
    road/Track.ts           segment model, projection math, track builder
    entities/Rival.ts       AI rider state/logic
    scenes/BootScene.ts     procedurally generated placeholder textures
    scenes/MenuScene.ts
    scenes/RaceScene.ts     physics, combat, road + sprite rendering, HUD
    scenes/GameOverScene.ts
```

## How the road works
The road is a list of short segments, each with a `curve` and a `y` height.
Every frame, segments ahead of the camera are projected world→screen
(`Util.project`) and drawn as trapezoids front-to-back; `maxy` clips segments
hidden behind hills. Curves are faked by accumulating a horizontal `dx` offset.
Sprites (trees, riders) are then drawn back-to-front, scaled by the
segment's projection scale and cropped behind hills.

## Next steps
- Real art: put sprites in `public/assets/`, load them in `BootScene.preload()`.
- Audio: engine loop pitched by speed, hit/crash SFX (`this.sound`).
- More tracks: add builders in `Track.build()` (roadside themes, tunnels).
- Weapons pickup, police rider, cash/upgrade shop between races.
- Mobile: on-screen touch buttons.
