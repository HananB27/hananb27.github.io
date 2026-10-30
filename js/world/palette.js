/** Reads the Neon Arcade palette from CSS custom properties (css/tokens.css). */
const FALLBACK = {
  bg: "#0d0a24",
  "bg-2": "#171238",
  "bg-3": "#221a52",
  text: "#f6f3ff",
  muted: "#bdb5e6",
  violet: "#8b5cff",
  magenta: "#ff4fb8",
  cyan: "#2be4ff",
  lime: "#b5ff4d",
  amber: "#ffc83d",
  coral: "#ff6b5e",
};

export function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const palette = {};
  for (const [key, fallback] of Object.entries(FALLBACK))
    palette[key] = style.getPropertyValue(`--${key}`).trim() || fallback;
  return palette;
}
