// Draws the launcher cards on the home page from the same NAV_ITEMS array the
// sidebar uses, so a new page shows up here without touching this file.

import { NAV_ITEMS, currentPage, resolveHref } from "./nav.js";

const PAPERS = ["yellow", "blue", "pink", "green"];
const TILTS = [-1.6, 1.1, -0.8, 1.7, -1.2, 0.9];

const launcher = document.getElementById("launcher");

if (launcher) {
  const here = currentPage();
  const destinations = NAV_ITEMS.filter((item) => item.id !== here);

  launcher.textContent = "";

  destinations.forEach((item, index) => {
    const card = document.createElement("li");
    card.className = `launcher-card pinned paper-${PAPERS[index % PAPERS.length]}`;
    card.style.setProperty("--tilt", `${TILTS[index % TILTS.length]}deg`);

    const heading = document.createElement("h3");
    heading.className = "launcher-title";

    const link = document.createElement("a");
    link.className = "launcher-link";
    link.href = resolveHref(item.href);
    link.textContent = item.label;
    heading.append(link);

    const blurb = document.createElement("p");
    blurb.className = "launcher-blurb";
    blurb.textContent = item.blurb;

    card.append(heading, blurb);
    launcher.append(card);
  });
}
