# Birthday World

A hand-drawn-style 3D third-person browser game (three.js + Vite).

    npm install
    npm run dev       # dev server
    npm run build     # static build in dist/ (host anywhere)

Controls: WASD/arrows to move, mouse to look (click to lock the pointer), Space to jump, Shift to run, mouse wheel to zoom.

## Files
- `src/sketch.js`: the hand-drawn look (vertex boil, toon shading, pencil hatching, ink outlines)
- `src/postfx.js`: full-screen image wobble and paper grain
- `src/world.js`: terrain, trees, rocks, clouds, collisions
- `src/player.js`: character model, movement, procedural animation
- `src/thirdPersonCamera.js`: orbit and follow camera
