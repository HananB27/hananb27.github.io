import { skills } from "./data.js";
import { ui } from "./ui.js";

const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;
const desktop = matchMedia("(min-width: 900px) and (pointer: fine)");

ui.init();
$("#year").textContent = new Date().getFullYear();

// ---- skills grid (built from data so 2D and 3D always agree) ----------------------------------------------
const skillGrid = $("#skill-grid");
skills.forEach((skill, i) => {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skill";
  button.style.setProperty("--c", `var(--${skill.color})`);
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `<img src="${skill.icon}" alt="" width="34" height="34" /><span>${skill.name}<small>Locked</small></span>`;
  button.dataset.index = i;
  li.append(button);
  skillGrid.append(li);
});

// ---- scroll progress + nav state ---------------------------------------------------------------------------------
const sections = [...document.querySelectorAll("[data-scene]")];
const dots = [...document.querySelectorAll("[data-dot]")];
const navLinks = [...document.querySelectorAll(".site-nav a")];
const progress = $("#progress");
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

function setSection(index) {
  dots.forEach((d, i) => (i === index ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
  navLinks.forEach((a) => {
    const active = a.getAttribute("href") === `#${sections[index]?.id}`;
    if (active) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}
setSection(0);
// Fallback section tracking (also used when WebGL is unavailable).
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) if (entry.isIntersecting) setSection(sections.indexOf(entry.target));
  },
  { rootMargin: "-45% 0px -45% 0px" },
);
sections.forEach((s) => sectionObserver.observe(s));

// ---- 3D world --------------------------------------------------------------------------------------------------------
let world = null;
const play = [$("#play"), $("#play-hero")];

function updatePlayButtons() {
  play.forEach((button) => (button.hidden = !(world && desktop.matches)));
  $("#hint").textContent = desktop.matches
    ? "Drag to spin me · Scroll to travel · Click anything that glows"
    : "Drag to spin me · Scroll to travel · Tap anything that glows";
}
desktop.addEventListener("change", updatePlayButtons);
updatePlayButtons();

function renderState(state) {
  $("#pill-skills").textContent = state.skillCount;
  $("#pill-bugs").textContent = Math.min(state.bugs, state.bugsTotal);
  $("#hud-skills").textContent = state.skillCount;
  $("#hud-bugs").textContent = Math.min(state.bugs, state.bugsTotal);
  $("#score-pill").setAttribute(
    "aria-label",
    `Progress: ${state.skillCount} of ${state.skillTotal} skills, ${Math.min(state.bugs, state.bugsTotal)} of ${state.bugsTotal} bugs`,
  );
  $("#score-pill").classList.remove("bump");
  void $("#score-pill").offsetWidth;
  $("#score-pill").classList.add("bump");
  skillGrid.querySelectorAll(".skill").forEach((button, i) => {
    button.setAttribute("aria-pressed", String(state.skills[i]));
    button.querySelector("small").textContent = state.skills[i] ? "Unlocked ✓" : "Locked";
  });
}

async function boot() {
  try {
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("WebGL unavailable");
    const { createWorld } = await import("./world/index.js");
    world = createWorld({
      container: $("#stage"),
      sections,
      hooks: {
        onProject: ui.openProject,
        onToast: ui.toast,
        onState: renderState,
        onSection: setSection,
        onAccent: (hex) => root.style.setProperty("--accent", hex),
        onWin: () => ui.showWin(),
        onExit: exitGame,
        isModalOpen: ui.isModalOpen,
        onContextLost: () => {
          exitGame();
          root.classList.add("no-webgl");
          ui.toast("3D paused. Everything is still available below.");
        },
      },
    });
    if (new URLSearchParams(location.search).has("debug")) window.__world = world;
    $("#stage-loading")?.remove();
    play.forEach((b) => (b.disabled = false));
    updatePlayButtons();
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
    if (!world.state.skills[i]) return;
    ui.toast(`${skills[i].name} unlocked · ${world.state.skillCount} of ${skills.length}`);
  });

  // Project cards drive the 3D cabinets: hover highlights, scrolling focuses.
  const cards = [...document.querySelectorAll(".project")];
  cards.forEach((card) => {
    const i = Number(card.dataset.index);
    card.addEventListener("pointerenter", () => world.highlightStation(i));
    card.addEventListener("pointerleave", () => world.highlightStation(-1));
    card.addEventListener("focusin", () => world.highlightStation(i));
    card.addEventListener("focusout", () => world.highlightStation(-1));
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
  const work = $("#work");
  new IntersectionObserver(([entry]) => !entry.isIntersecting && world.focusStation(-1)).observe(work);

  // Game mode
  play.forEach((button) => button.addEventListener("click", enterGame));
  $("#exit").addEventListener("click", exitGame);
  $("#restart").addEventListener("click", () => {
    world.restart();
    ui.hideWin();
    ui.toast("Fresh build. Go find those crystals.");
  });
  $("#win-close").addEventListener("click", ui.hideWin);
  const mute = $("#mute");
  const syncMute = () => {
    mute.textContent = world.muted ? "Sound off" : "Sound on";
    mute.setAttribute("aria-pressed", String(world.muted));
  };
  syncMute();
  mute.addEventListener("click", () => {
    world.setMuted(!world.muted);
    syncMute();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#win").hidden) ui.hideWin();
    if (e.key.toLowerCase() === "m" && world.mode === "play" && !ui.isModalOpen()) mute.click();
  });
}

let returnFocus = null;
function enterGame() {
  if (!world?.start()) return;
  returnFocus = document.activeElement;
  document.body.classList.add("playing");
  $("#hud").hidden = false;
  [...document.querySelectorAll("header.site-header, main, .dots")].forEach((el) => (el.inert = true));
  $("#exit").focus({ preventScroll: true });
}
function exitGame() {
  if (!world || world.mode !== "play") return;
  world.exit();
  document.body.classList.remove("playing");
  $("#hud").hidden = true;
  ui.hideWin();
  [...document.querySelectorAll("header.site-header, main, .dots")].forEach((el) => (el.inert = false));
  returnFocus?.focus({ preventScroll: true });
}

boot();
