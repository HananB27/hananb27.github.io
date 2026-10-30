import { projects } from "./data.js";

const $ = (selector) => document.querySelector(selector);

let dialog;
let previousFocus = null;
let toastTimer;

/** Dialog, toast and win-banner helpers shared by the page and the 3D world. */
export const ui = {
  init() {
    dialog = $("#project-dialog");
    $("#close-dialog").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => previousFocus?.focus?.({ preventScroll: true }));
    // Close on backdrop click.
    dialog.addEventListener("click", (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
  },

  openProject(index) {
    const project = projects[index];
    if (!project) return;
    previousFocus = document.activeElement;
    dialog.style.setProperty("--accent", `var(--${project.color})`);
    $("#dialog-kind").textContent = project.kind;
    $("#dialog-title").textContent = project.name;
    $("#dialog-description").textContent = project.description;
    $("#dialog-link").href = project.url;
    $("#dialog-tags").replaceChildren(
      ...project.tags.map((tag) => Object.assign(document.createElement("li"), { textContent: tag })),
    );
    if (!dialog.open) dialog.showModal();
  },

  isModalOpen: () => Boolean(dialog?.open) || !$("#win").hidden,

  toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("visible"), 3800);
  },

  showWin() {
    $("#win").hidden = false;
    $("#win .btn").focus({ preventScroll: true });
  },
  hideWin() {
    $("#win").hidden = true;
  },
};
