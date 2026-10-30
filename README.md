# Hanan Bajramović — interactive 3D portfolio

A static site (no build step, GitHub Pages) where the portfolio *is* a small 3D game on desktop and a scroll-driven 3D website on phones.

- **Desktop:** you land straight in the world. Walk the avatar around a floating island, collect the five skill crystals, walk up to a cabinet (one per project) or a kiosk (About, Contact) and press **E** to open it. The header links fast-travel the avatar. **Classic view** in the header switches to the regular scrolling page; the choice is remembered.
- **Phones and tablets:** a 3D website. The camera and the island's spin follow your scroll; the laptop, crystals, cabinets and kiosks are tappable.
- **Avatar:** a low-poly character built in code from a reference photo: curly dark hair, round tortoiseshell glasses, black headphones, beige jacket with a corduroy collar over a waffle knit, jeans, white sneakers, laptop with scrolling code. It is stylised, not a scan, and the photo is not in the repo.

## Run

```bash
npm run dev      # http://127.0.0.1:4173
npm run check    # syntax-check every module
npm test         # unit tests: game rules, scroll maths, content, palette
```

Open the site with `?debug` to expose `window.__world.debug` for QA.

## Controls (desktop)

| Key | Action |
| --- | --- |
| W A S D / arrows | move (camera-relative) |
| Space | jump |
| Shift | dash |
| E | open the nearest cabinet or kiosk (clicking one works too) |
| Drag | turn the camera |

## Structure

```
index.html            all content and landmarks (works without WebGL)
css/tokens.css        Graphite & Mint palette: single source of truth
css/style.css         layout, components, responsive rules
js/main.js            boot, view switching, UI wiring
js/ui.js              dialog panels and toast
js/data.js            projects, skills, kiosks, profile
js/rules.js           pure, unit-tested game and scroll rules
js/world/index.js     scene, loop, input, game state, camera modes
js/world/avatar.js    the rigged avatar and laptop
js/world/island.js    island and scenery
js/world/props.js     cabinets/kiosks, crystals, label sprites
js/world/frames.js    scroll camera keyframes (wide / compact)
js/world/particles.js instanced sparkles
vendor/               three.js r170 (minified, MIT)
tests/                node --test suites
```

## Palette

Defined once in `css/tokens.css`; the WebGL scene reads the same custom properties at runtime (`js/world/palette.js`), so editing a token recolours the page and the 3D world together. One accent, one warm signal, neutrals.

| Token | Hex | Used for |
| --- | --- | --- |
| `--bg` / `--bg-2` / `--bg-3` | `#0a0c10` / `#11141b` / `#1a1f2a` | background, surfaces, code panels |
| `--text` / `--muted` | `#eef1f6` / `#98a2b3` | text |
| `--accent` | `#5eead4` | primary buttons, focus, island rim, crystals, cabinet trim |
| `--warm` | `#ffb454` | rare highlight inside the laptop's code |
| `--steel` | `#8b98b0` | grid, hairlines, secondary UI |

## Accessibility and resilience

Semantic HTML with a skip link and landmarks; all content lives in the DOM and the canvas is `aria-hidden`. Game view hides the long-form page, so the **Classic view** button is the first tool in the header. Panels are native `<dialog>`s with focus return. `prefers-reduced-motion` disables scroll spin and ambient motion. If WebGL is missing or the context is lost the page falls back to plain content. Pixel ratio is capped, shadows are off on touch devices, hair and pebbles are instanced.

Facts and links come from the original portfolio. No unverified employment or achievement claims were added.
