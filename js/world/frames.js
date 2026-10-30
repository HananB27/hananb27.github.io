/**
 * Camera keyframes for the scroll-driven “3D website” (phones, tablets and the
 * desktop classic view), one per page section: home, work, skills, about,
 * contact. `fitW`/`fitH` are the world-space width and height the camera must
 * keep in view, so one set of numbers frames the scene on any aspect ratio.
 * `rot` is the island's spin in radians.
 */
const TURN = Math.PI * 2;

export const FRAMES = {
  wide: [
    { look: [0, 1.5, 0], az: 0.28, el: 0.1, fitW: 4.6, fitH: 5.0, rot: 0, shiftX: 0.2, shiftY: 0 },
    { look: [0, 0.9, -1.4], az: 0, el: 0.36, fitW: 12.5, fitH: 6.4, rot: TURN, shiftX: 0.2, shiftY: 0 },
    { look: [0, 1.1, 0.4], az: -0.22, el: 0.3, fitW: 8.6, fitH: 5.4, rot: TURN + 0.5, shiftX: 0.2, shiftY: 0 },
    { look: [0, 1.8, 0], az: -0.32, el: 0.04, fitW: 4.2, fitH: 3.9, rot: TURN * 2, shiftX: 0.24, shiftY: 0 },
    { look: [0, 1.5, 0], az: 0.32, el: 0.12, fitW: 5.0, fitH: 5.0, rot: TURN * 3, shiftX: 0.2, shiftY: 0 },
  ],
  compact: [
    { look: [0, 1.5, 0], az: 0.2, el: 0.1, fitW: 4.0, fitH: 7.0, rot: 0, shiftX: 0, shiftY: 0.17 },
    { look: [0, 1.0, -2.2], az: 0, el: 0.42, fitW: 7.6, fitH: 7.2, rot: TURN, shiftX: 0, shiftY: 0.2 },
    { look: [0, 1.1, 0.6], az: -0.2, el: 0.3, fitW: 7.2, fitH: 5.6, rot: TURN + 0.5, shiftX: 0, shiftY: 0.2 },
    { look: [0, 1.75, 0], az: -0.3, el: 0.04, fitW: 3.4, fitH: 4.8, rot: TURN * 2, shiftX: 0, shiftY: 0.24 },
    { look: [0, 1.5, 0], az: 0.3, el: 0.12, fitW: 4.2, fitH: 5.4, rot: TURN * 3, shiftX: 0, shiftY: 0.18 },
  ],
};

/** Blend two frames by t ∈ [0,1]. */
export function mixFrames(a, b, t) {
  const m = (x, y) => x + (y - x) * t;
  return {
    look: a.look.map((v, i) => m(v, b.look[i])),
    az: m(a.az, b.az),
    el: m(a.el, b.el),
    fitW: m(a.fitW, b.fitW),
    fitH: m(a.fitH, b.fitH),
    rot: m(a.rot, b.rot),
    shiftX: m(a.shiftX, b.shiftX),
    shiftY: m(a.shiftY, b.shiftY),
  };
}
