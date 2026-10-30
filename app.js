import { projects } from "./data.js";
const play = document.querySelector("#play");
const dialog = document.querySelector("#project-dialog");
let previousFocus;
export function openProject(index) {
  const project = projects[index];
  previousFocus = document.activeElement;
  document.querySelector("#dialog-kind").textContent = project.kind;
  document.querySelector("#dialog-title").textContent = project.name;
  document.querySelector("#dialog-description").textContent =
    project.description;
  document.querySelector("#dialog-link").href = project.url;
  if (!dialog.open) dialog.showModal();
}
document.querySelector("#close-dialog").onclick = () => dialog.close();
dialog.addEventListener("close", () => previousFocus?.focus());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
document.querySelector("#year").textContent = new Date().getFullYear();
let toastTimer;
export function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 4500);
}
const mobile = matchMedia("(max-width:900px), (pointer:coarse)");
function updateDevice() {
  play.hidden = mobile.matches;
  document.querySelector("#device-note").textContent = mobile.matches
    ? "Scroll to turn the world. Tap a station to explore."
    : "A tiny adventure for your keyboard. No download needed.";
}
mobile.addEventListener("change", updateDevice);
updateDevice();
try {
  const { createWorld } = await import("./world.js");
  const world = createWorld({ openProject, toast });
  document.querySelector("#loading").remove();
  play.disabled = false;
  document.querySelector("#wave").hidden = false;
  document.querySelector("#wave").onclick = () => world.wave();
  play.onclick = () => world.start();
  document.querySelector("#exit").onclick = () => world.exit();
  document.querySelector("#restart").onclick = () => world.restart();
} catch (error) {
  console.error("3D world unavailable:", error);
  document.querySelector("#loading").innerHTML =
    "This world needs WebGL.<br><small>All projects and contact details are available below.</small>";
  play.hidden = true;
  document.querySelector("#world-hint").textContent =
    "Keep scrolling to explore the portfolio ↓";
}
