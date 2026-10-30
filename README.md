# Hanan’s little world

A colorful, accessible portfolio with a lightweight Three.js floating island.

## Run

Run `npm run dev` and open http://127.0.0.1:4173. No install or build is required. GitHub Pages serves the root directly. Three.js 0.170.0 is vendored with its MIT license; the optional Manrope font falls back to Arial if Google Fonts is unavailable.

## Explore

- Desktop: **Enter my world**, move with WASD or arrows, jump with Space, collect five skill crystals, and press E near a project station. Click stations to open their details. Escape or Exit returns to the portfolio. Restart resets the collection.
- Mobile or touch: scroll the page to rotate the 3D world, drag horizontally to orbit, and tap a project station. All portfolio content remains ordinary, scrollable HTML.
- **Make Hanan say hi** animates the avatar. The code-authored stylized avatar references the supplied photo’s curly brown hair, glasses, headphones, and light jacket, and holds a laptop. It is not a reconstructed scan. The original personal photo is not published.
- Reduced motion disables decorative motion and scroll rotation. A WebGL failure leaves projects, résumé, and contact available. Rendering pauses when offscreen or the tab is hidden. Pixel ratio is capped for mobile GPU load.

## Source

`world.js` owns 3D rendering, `game.js` owns tested movement and collection rules, `data.js` owns station content, `app.js` owns dialogs and initialization, and `style.css` owns the responsive palette and layout. Color roles: lilac world, mint craft, coral commerce, yellow connection, dark plum text.

Facts and links come from the original portfolio: Hanan Bajramovic, full stack development, International University of Sarajevo software engineering background, Django, React, Next.js, Angular, JavaScript, and four original projects. No unverified employment, graduation date, or achievement claims were added.

## Verify

`npm run check` and `npm test`. Browser QA should cover desktop gameplay, project dialog/keyboard focus, reset/exit, mobile widths, scroll rotation, reduced motion, and WebGL fallback. No analytics, account system, or server required.
