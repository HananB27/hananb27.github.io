# Hanan Bajramović — Neon Arcade portfolio

A playable 3D portfolio. Static site, no build step, hosted on GitHub Pages.

- **Desktop:** scroll-driven 3D website *plus* a third-person game. Hit **Play the game**, run around the floating island, collect five skill crystals, stomp five bugs and open the arcade cabinets (one per project).
- **Phones and tablets:** a 3D website. The camera and the island's spin follow your scroll, and everything glowing is tappable (laptop, crystals, bugs, cabinets, the avatar).
- **Avatar:** a low-poly, code-built character based on a reference photo: curly dark hair, tortoiseshell glasses, black headphones, light stubble, beige jacket with a corduroy collar over a waffle-knit sweater, holding a laptop with scrolling code. It is a stylised character, not a scan, and the photo is not in the repo.

## Run

```bash
npm run dev      # http://127.0.0.1:4173
npm run check    # syntax-check every module
npm test         # unit tests (game rules, scroll maths, content)
```

Open the site with `?debug` to expose `window.__world.debug` for QA.

## Controls (game mode)

| Key | Action |
| --- | --- |
| W A S D / arrows | move (camera-relative) |
| Space | jump; land on a bug to squash it |
| Shift | dash |
| E | open the nearest cabinet |
| Drag | turn the camera |
| M | mute, Esc exit |

Squash 5 bugs and unlock all 5 skills to "ship the release". Progress is shared between game mode and the scroll site (skills can also be unlocked from the Skills section, and bugs tapped on touch devices).

## Structure

```
index.html            content and landmarks (works without WebGL)
css/tokens.css        Neon Arcade palette: single source of truth
css/style.css         layout, components, responsive rules
js/main.js            boot, UI wiring, game enter/exit
js/ui.js              dialog, toast, win banner
js/data.js            projects and skills
js/rules.js           pure, unit-tested game and scroll rules
js/world/index.js     scene, loop, input, game state
js/world/avatar.js    the rigged avatar and laptop
js/world/island.js    island, trees, lamps, sky
js/world/props.js     cabinets, crystals, bugs, sprites
js/world/frames.js    scroll camera keyframes (wide / compact)
js/world/particles.js instanced confetti
js/world/sfx.js       WebAudio blips (game mode only)
vendor/               three.js r170 (minified, MIT)
tests/                node --test suites
```

## Palette

Defined once in `css/tokens.css`; the WebGL scene reads the same custom properties at runtime (`js/world/palette.js`), so editing a token recolours the page and the 3D world together.

| Token | Hex | Used for |
| --- | --- | --- |
| `--bg` / `--bg-2` / `--bg-3` | `#0d0a24` / `#171238` / `#221a52` | night sky, panels, grid |
| `--violet` | `#8b5cff` | home accent, Next.js |
| `--cyan` | `#2be4ff` | work accent, Search cabinet, React |
| `--lime` | `#b5ff4d` | primary buttons, Wiki cabinet, Django |
| `--amber` | `#ffc83d` | about accent, Auction cabinet, JavaScript |
| `--magenta` | `#ff4fb8` | contact accent, Mail cabinet, play button |
| `--coral` | `#ff6b5e` | bugs, Angular |

The section in view sets `--accent`, which tints the progress bar, nav, island rim and lights.

## Accessibility and resilience

Semantic HTML with skip link and landmarks; all content lives in the DOM and the canvas is `aria-hidden`. Focus is managed for the project dialog and game mode (page is `inert` while playing). `prefers-reduced-motion` disables scroll spin and ambient motion. If WebGL is missing or the context is lost the page falls back to plain content. Pixel ratio is capped, shadows are disabled on touch devices and hair, pebbles and particles are instanced.

Facts and links come from the original portfolio. No unverified employment or achievement claims were added.
