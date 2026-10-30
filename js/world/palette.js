/** Reads the Graphite & Mint palette from CSS custom properties (css/tokens.css). */
const FALLBACK = {
  bg: "#0a0c10",
  "bg-2": "#11141b",
  "bg-3": "#1a1f2a",
  text: "#eef1f6",
  muted: "#98a2b3",
  accent: "#5eead4",
  warm: "#ffb454",
  steel: "#8b98b0",
};

export function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const palette = {};
  for (const [key, fallback] of Object.entries(FALLBACK))
    palette[key] = style.getPropertyValue(`--${key}`).trim() || fallback;
  return palette;
}
