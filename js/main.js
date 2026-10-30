import { skills } from "./data.js";
import { ui } from "./ui.js";

const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;
const desktop = matchMedia("(min-width: 900px) and (pointer: fine)");
const CLASSIC_KEY = "hb-classic";

ui.init();
$("#year").textContent = new Date().getFullYear();

// ---- skills (built from data so page and 3D scene agree) -------------------------------------------------------
const skillGrid = $("#skill-grid");
const pips = $("#toolkit-pips");
skills.forEach((skill, i) => {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skill";
  button.dataset.index = i;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `<img src="${skill.icon}" alt="" width="30" height="30" /><span>${skill.name}<small>Locked</small></span>`;
  li.append(button);
  skillGrid.append(li);
  pips.append(document.createElement("i"));
});

// ---- scroll progress and nav state (scroll layout) ---------------------------------------------------------------
const sections = [...document.querySelectorAll("[data-scene]")];
const dots = [...document.querySelectorAll("[data-dot]")];
const navLinks = [...document.querySelectorAll(".site-nav a")];
const progress = $("#progress");
addEventListener(
  "scroll",
  () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
  },
  { passive: true },
);
function setSection(index) {
  dots.forEach((d, i) => (i === index ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
  navLinks.forEach((a) => {
    if (root.classList.contains("mode-game")) return;
    if (a.getAttribute("href") === `#${sections[index]?.id}`) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}
setSection(0);
const sectionObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && setSection(sections.indexOf(e.target))),
  { rootMargin: "-45% 0px -45% 0px" },
);
sections.forEach((s) => sectionObserver.observe(s));

// ---- 3D world ----------------------------------------------------------------------------------------------------------
let world = null;
let classic = false;
try {
  classic = localStorage.getItem(CLASSIC_KEY) === "1";
} catch {
  /* storage blocked: default to the game view */
}
const wantsGame = () => Boolean(world) && desktop.matches && !classic;

function applyView() {
  const game = wantsGame();
  root.classList.toggle("mode-game", game);
  $("#game-ui").hidden = !game;
  const toggle = $("#view-toggle");
  toggle.hidden = !(world && desktop.matches);
  toggle.textContent = game ? "Classic view" : "Game view";
  toggle.setAttribute("aria-pressed", String(!game));
  navLinks.forEach((a) => a.removeAttribute("aria-current"));
  if (world) {
    world.setMode(game ? "play" : "scroll");
    if (game) scrollTo(0, 0);
    world.measure();
  }
  $("#hint").textContent = desktop.matches
    ? "Drag to spin · Scroll to travel · Click what glows"
    : "Drag to spin · Scroll to travel · Tap what glows";
}
desktop.addEventListener("change", applyView);
$("#view-toggle").addEventListener("click", () => {
  classic = wantsGame();
  try {
    localStorage.setItem(CLASSIC_KEY, classic ? "1" : "0");
  } catch {
    /* ignore */
  }
  applyView();
});

// In game view the nav fast-travels the avatar; elsewhere it scrolls as usual.
document.querySelectorAll("[data-travel]").forEach((link) =>
  link.addEventListener("click", (e) => {
    if (!root.classList.contains("mode-game")) return;
    e.preventDefault();
    const target = link.dataset.travel;
    if (target !== "home") world.travel(target);
  }),
);

function renderState(state) {
  $("#pill-skills").textContent = state.skillCount;
  $("#hud-skills").textContent = state.skillCount;
  $("#score-pill").setAttribute("aria-label", `Skills unlocked: ${state.skillCount} of ${state.skillTotal}`);
  $("#score-pill").classList.remove("bump");
  void $("#score-pill").offsetWidth;
  $("#score-pill").classList.add("bump");
  skillGrid.querySelectorAll(".skill").forEach((button, i) => {
    button.setAttribute("aria-pressed", String(state.skills[i]));
    button.querySelector("small").textContent = state.skills[i] ? "Unlocked ✓" : "Locked";
  });
  [...pips.children].forEach((pip, i) => pip.classList.toggle("on", state.skills[i]));
}

async function boot() {
  try {
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("WebGL unavailable");
    const { createWorld } = await import("./world/index.js");
    world = createWorld({
      container: $("#stage"),
      sections,
      mode: desktop.matches && !classic ? "play" : "scroll",
      hooks: {
        onOpen: ui.open,
        onToast: ui.toast,
        onState: renderState,
        onSection: setSection,
        isModalOpen: ui.isModalOpen,
        onFirstMove: () => $("#controls").classList.add("quiet"),
        onComplete: () => ui.toast("Toolkit complete. The contact kiosk is open for business."),
        onContextLost: () => {
          root.classList.add("no-webgl");
          root.classList.remove("mode-game");
          $("#game-ui").hidden = true;
          ui.toast("3D paused. Everything is still available on the page.");
        },
      },
    });
    if (new URLSearchParams(location.search).has("debug")) window.__world = world;
    applyView();
    bindWorldUi();
  } catch (error) {
    console.error("3D world unavailable:", error);
    root.classList.add("no-webgl");
  }
}

function bindWorldUi() {
  skillGrid.addEventListener("click", (e) => {
    const button = e.target.closest(".skill");
    if (!button) return;
    const i = Number(button.dataset.index);
    world.collectSkill(i);
    if (world.state.skills[i]) ui.toast(`${skills[i].name} unlocked · ${world.state.skillCount} of ${skills.length}`);
  });

  // Project cards drive the 3D cabinets in the scroll layout.
  const cards = [...document.querySelectorAll(".project")];
  cards.forEach((card) => {
    const i = Number(card.dataset.index);
    card.addEventListener("pointerenter", () => world.highlightProject(i));
    card.addEventListener("pointerleave", () => world.highlightProject(-1));
    card.addEventListener("focusin", () => world.highlightProject(i));
    card.addEventListener("focusout", () => world.highlightProject(-1));
  });
  const cardObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("active", entry.isIntersecting);
        if (entry.isIntersecting) world.focusStation(Number(entry.target.dataset.index));
      }
    },
    { rootMargin: "-40% 0px -40% 0px" },
  );
  cards.forEach((c) => cardObserver.observe(c));
  new IntersectionObserver(([entry]) => !entry.isIntersecting && world.focusStation(-1)).observe($("#work"));
}

boot();
