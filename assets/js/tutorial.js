// Drives the tutorial page. The topic lives in the address bar
// (pages/tutorial.html#A03) so every session is linkable and the back button
// works, without needing fourteen HTML files.

import { SITE_TITLE } from "./settings.js";
import { DEFAULT_TOPIC, findTopic, TOPICS } from "./tutorials.js";
import { currentTopic, resolveHref } from "./nav.js";
import { loadNotebook, NotebookMissing } from "./notebook.js";
import { inline, renderBlocks } from "./content.js";

const heading = document.getElementById("tutorial-title");
const tagline = document.getElementById("tutorial-tagline");
const code = document.getElementById("practical-code");
const title = document.getElementById("practical-title");
const summary = document.getElementById("practical-summary");
const body = document.getElementById("practical-body");
const notebookBox = document.getElementById("practical-notebook");
const goodBox = document.getElementById("good-to-know");
const stepper = document.getElementById("topic-stepper");

// Bumped on every topic change; a late notebook response for a topic the
// reader has already left is dropped instead of overwriting the new one.
let renderToken = 0;

function selectedTopic() {
  return findTopic(currentTopic()) || findTopic(DEFAULT_TOPIC) || TOPICS[0];
}

function setText(node, text) {
  node.textContent = text;
}

/**
 * "Good to know" takes either shape:
 *   a list of strings  -> bullets, with **bold** / `code` / [links] honoured
 *   a list of blocks   -> the same blocks the write-up uses, so the card can
 *                         carry headings and callouts, not just bullets
 */
function renderGoodToKnow(topic) {
  const entries = Array.isArray(topic.goodToKnow) ? topic.goodToKnow : [];
  goodBox.textContent = "";

  if (!entries.length) return;

  if (entries.every((entry) => typeof entry === "string")) {
    goodBox.className = "facts-box";
    const list = document.createElement("ul");
    list.className = "facts";
    for (const fact of entries) {
      const li = document.createElement("li");
      inline(fact, li);
      list.append(li);
    }
    goodBox.append(list);
    return;
  }

  goodBox.className = "facts-box post";
  renderBlocks(entries, goodBox);
}

function renderStepper(topic) {
  stepper.textContent = "";
  const index = TOPICS.findIndex((t) => t.id === topic.id);

  const make = (target, label, rel) => {
    if (!target) {
      const span = document.createElement("span");
      span.className = "step-link is-disabled";
      span.textContent = label;
      return span;
    }
    const link = document.createElement("a");
    link.className = "step-link";
    link.href = `#${target.id}`;
    link.rel = rel;
    link.textContent = label;
    return link;
  };

  const position = document.createElement("span");
  position.className = "step-position";
  position.textContent = `${index + 1} of ${TOPICS.length}`;

  stepper.append(
    make(TOPICS[index - 1], "← Previous", "prev"),
    position,
    make(TOPICS[index + 1], "Next →", "next")
  );
}

function notebookLinks(href) {
  const actions = document.createElement("p");
  actions.className = "notebook-actions";

  const open = document.createElement("a");
  open.className = "notebook-link";
  open.href = href;
  open.textContent = "Download the notebook";
  open.setAttribute("download", "");

  actions.append(open);
  return actions;
}

function renderOutline(info) {
  if (!info.outline.length) return null;

  const wrap = document.createElement("div");
  wrap.className = "notebook-outline";

  const label = document.createElement("h3");
  label.textContent = "What's inside";

  const list = document.createElement("ol");
  list.className = "outline-list";
  for (const entry of info.outline) {
    const li = document.createElement("li");
    li.className = `outline-level-${entry.level}`;
    li.textContent = entry.text;
    list.append(li);
  }

  wrap.append(label, list);
  return wrap;
}

async function renderNotebook(topic, token) {
  notebookBox.textContent = "";

  if (!topic.notebook) {
    setText(notebookBox, "No notebook is linked to this session yet.");
    return;
  }

  const href = resolveHref(topic.notebook);

  const loading = document.createElement("p");
  loading.className = "notebook-status";
  loading.textContent = "Looking for the notebook…";
  notebookBox.append(loading);

  let info;
  try {
    info = await loadNotebook(href);
  } catch (error) {
    if (token !== renderToken) return;
    notebookBox.textContent = "";

    const message = document.createElement("p");
    message.className = "notebook-status is-missing";
    message.textContent = error instanceof NotebookMissing
      ? `The notebook for ${topic.id} isn't published yet. Add ${topic.notebook} to the repository and it will appear here.`
      : error.message;
    notebookBox.append(message);
    return;
  }

  if (token !== renderToken) return;
  notebookBox.textContent = "";

  const facts = [
    info.language ? `${info.language} notebook` : "Notebook",
    `${info.cellCount} cells`,
    `${info.codeCells} of them code`
  ].join(" · ");

  const meta = document.createElement("p");
  meta.className = "notebook-status";
  meta.textContent = facts;

  notebookBox.append(meta, notebookLinks(href));

  const outline = renderOutline(info);
  if (outline) notebookBox.append(outline);
}

function render() {
  const topic = selectedTopic();
  const token = ++renderToken;

  document.title = `${SITE_TITLE} — ${topic.id} ${topic.title}`;
  setText(heading, topic.id);
  setText(tagline, topic.title);
  setText(code, topic.id);
  setText(title, topic.title);
  setText(summary, topic.summary);

  renderBlocks(topic.body, body);
  renderGoodToKnow(topic);
  renderStepper(topic);
  renderNotebook(topic, token);
}

window.addEventListener("hashchange", render);
render();
