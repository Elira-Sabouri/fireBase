// The site map, defined once.
//
// To add a page: append one entry to NAV_ITEMS below and copy an existing file
// in pages/. Nothing else needs editing — the sidebar on every page and the
// launcher on the home page both read this array.
//
// `href` is always written relative to the site root. resolveHref() rewrites it
// for whichever page is asking, using the data-base attribute on <body>, so the
// site works from a GitHub Pages sub-path without any absolute URLs.

import { SITE_TITLE } from "./settings.js";

export const NAV_ITEMS = [
  {
    id: "home",
    label: "Home",
    href: "index.html",
    blurb: "What this place is, and where to go next."
  },
  {
    id: "noticeboard",
    label: "Noticeboard",
    href: "pages/noticeboard.html",
    blurb: "Read what people have pinned, and pin a note of your own."
  },
  {
    id: "tutorial",
    label: "Tutorial",
    href: "pages/tutorial.html",
    blurb: "How to write, colour, and take down a note."
  },
  {
    id: "contact",
    label: "Contact",
    href: "pages/contact.html",
    blurb: "How to reach the person who looks after the board."
  }
];

const DESKTOP = "(min-width: 820px)";

/** Current page id, e.g. "noticeboard". */
export function currentPage() {
  return document.body.dataset.page || "";
}

/** Path from the site root to the page that is asking, e.g. "." or "..". */
export function baseHref() {
  return document.body.dataset.base || ".";
}

/** Turn a root-relative href into one the current page can follow. */
export function resolveHref(href, base = baseHref()) {
  const prefix = base.replace(/\/+$/, "");
  return prefix === "" || prefix === "." ? href : `${prefix}/${href}`;
}

function buildSidebar(host) {
  const base = baseHref();
  const current = currentPage();

  host.textContent = "";

  const head = document.createElement("div");
  head.className = "sidebar-head";

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = resolveHref("index.html", base);

  const brandPin = document.createElement("span");
  brandPin.className = "brand-pin";
  brandPin.setAttribute("aria-hidden", "true");

  const brandName = document.createElement("span");
  brandName.className = "brand-name";
  brandName.textContent = SITE_TITLE;

  brand.append(brandPin, brandName);

  const nav = document.createElement("nav");
  nav.className = "site-nav";
  nav.id = "site-nav";
  nav.setAttribute("aria-label", "Main");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "nav-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", nav.id);

  const toggleIcon = document.createElement("span");
  toggleIcon.className = "nav-toggle-icon";
  toggleIcon.setAttribute("aria-hidden", "true");

  const toggleLabel = document.createElement("span");
  toggleLabel.textContent = "Menu";

  toggle.append(toggleIcon, toggleLabel);
  head.append(brand, toggle);

  const list = document.createElement("ul");
  list.className = "nav-list";

  for (const item of NAV_ITEMS) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.className = "nav-link";
    link.href = resolveHref(item.href, base);
    link.textContent = item.label;
    if (item.id === current) {
      link.classList.add("is-current");
      link.setAttribute("aria-current", "page");
    }
    li.append(link);
    list.append(li);
  }

  nav.append(list);
  host.append(head, nav);

  wireToggle(host, toggle);
}

function wireToggle(host, toggle) {
  const setOpen = (open) => {
    host.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => {
    setOpen(!host.classList.contains("is-open"));
  });

  host.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !host.classList.contains("is-open")) return;
    setOpen(false);
    toggle.focus();
  });

  // Widening past the breakpoint shows the full list again; drop the
  // collapsed state so the button is not left claiming to be expanded.
  const desktop = window.matchMedia(DESKTOP);
  desktop.addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}

/** Draw the sidebar into every [data-site-sidebar] host on the page. */
export function renderSidebar() {
  document.querySelectorAll("[data-site-sidebar]").forEach(buildSidebar);
}

renderSidebar();
