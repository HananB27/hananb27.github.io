import { projects, profile } from "./data.js";

const $ = (selector) => document.querySelector(selector);

let dialog;
let previousFocus = null;
let toastTimer;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
const tags = (list) => el("ul", { className: "tags" }, ...list.map((t) => el("li", { textContent: t })));
const button = (label, href, { external = false, ghost = false, download = false } = {}) => {
  const a = el("a", { className: `btn${ghost ? " btn-ghost" : ""}`, href, textContent: label });
  if (external) Object.assign(a, { target: "_blank", rel: "noopener noreferrer" });
  if (download) a.download = "";
  return a;
};
const linkRow = (label, value, href, external = true) => {
  const a = el("a", { href }, el("strong", { textContent: label }), el("span", { textContent: value }));
  if (external) Object.assign(a, { target: "_blank", rel: "noopener noreferrer" });
  return a;
};

/** Dialog, toast and panel content shared by the page and the 3D world. */
export const ui = {
  init() {
    dialog = $("#panel");
    $("#close-panel").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => previousFocus?.focus?.({ preventScroll: true }));
    dialog.addEventListener("click", (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
  },

  /** Opens the panel for a project cabinet, the About kiosk or the Contact kiosk. */
  open({ kind, index }) {
    const body = $("#panel-body");
    if (kind === "project") {
      const p = projects[index];
      $("#panel-kind").textContent = p.kind;
      $("#panel-title").textContent = p.name;
      body.replaceChildren(
        el("p", { textContent: p.description }),
        tags(p.tags),
        button("View on GitHub ↗", p.url, { external: true }),
      );
    } else if (kind === "about") {
      $("#panel-kind").textContent = "About";
      $("#panel-title").textContent = "Code is my craft. Curiosity is my compass.";
      body.replaceChildren(
        el("p", { className: "large", textContent: profile.intro }),
        ...profile.about.map((text) => el("p", { textContent: text })),
        button("Download résumé ↓", profile.resume, { download: true }),
      );
    } else {
      $("#panel-kind").textContent = "Contact";
      $("#panel-title").textContent = "Got an idea? Let’s give it a world.";
      body.replaceChildren(
        el(
          "div",
          { className: "link-list" },
          linkRow("Email", profile.email, `mailto:${profile.email}`, false),
          linkRow("GitHub", "HananB27", profile.github),
          linkRow("LinkedIn", "hananb27", profile.linkedin),
          linkRow("Phone", profile.phone, `tel:${profile.phone}`, false),
        ),
      );
    }
    previousFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
  },

  isModalOpen: () => Boolean(dialog?.open),

  toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("visible"), 3200);
  },
};
