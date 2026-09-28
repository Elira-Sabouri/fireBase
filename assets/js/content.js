// Turns the `body` array of a practical into a page.
//
// Each entry is a block. Write them in assets/js/tutorials.js:
//
//   { type: "text",    value: "A paragraph. **bold**, *italic*, `code`, [a link](https://…)" }
//   { type: "heading", value: "A sub-heading", level: 3 }
//   { type: "list",    items: ["first", "second"], ordered: false }
//   { type: "code",    value: "x <- 1\nprint(x)", language: "r", caption: "optional" }
//   { type: "image",   src: "assets/img/tutorials/A03-volcano.png",
//                      alt: "What the picture shows", caption: "optional" }
//   { type: "note",    value: "A highlighted aside." }
//
// Paths in `src` and in links are relative to the site root, the same as
// everywhere else. Anything starting with http, mailto: or # is left alone.

import { resolveHref } from "./nav.js";

// **bold** | *italic* | `code` | [text](href)
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function isExternal(href) {
  return /^(https?:|mailto:|#)/.test(href);
}

function link(href) {
  return isExternal(href) ? href : resolveHref(href);
}

/** Append `text` to `host`, turning the small markup above into elements. */
export function inline(text, host) {
  for (const piece of String(text).split(INLINE)) {
    if (!piece) continue;

    if (piece.startsWith("**") && piece.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = piece.slice(2, -2);
      host.append(strong);
    } else if (piece.startsWith("`") && piece.endsWith("`")) {
      const code = document.createElement("code");
      code.textContent = piece.slice(1, -1);
      host.append(code);
    } else if (piece.startsWith("*") && piece.endsWith("*")) {
      const em = document.createElement("em");
      em.textContent = piece.slice(1, -1);
      host.append(em);
    } else {
      const match = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(piece);
      if (match) {
        const anchor = document.createElement("a");
        anchor.href = link(match[2]);
        anchor.textContent = match[1];
        if (isExternal(match[2]) && match[2].startsWith("http")) {
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
        }
        host.append(anchor);
      } else {
        host.append(document.createTextNode(piece));
      }
    }
  }
  return host;
}

function textBlock(block) {
  const p = document.createElement("p");
  return inline(block.value, p);
}

function headingBlock(block) {
  const level = Math.min(Math.max(Number(block.level) || 3, 3), 4);
  const heading = document.createElement(`h${level}`);
  heading.textContent = block.value;
  return heading;
}

function listBlock(block) {
  const list = document.createElement(block.ordered ? "ol" : "ul");
  list.className = "post-list";
  for (const item of block.items || []) {
    const li = document.createElement("li");
    inline(item, li);
    list.append(li);
  }
  return list;
}

function codeBlock(block) {
  const figure = document.createElement("figure");
  figure.className = "post-code";

  const head = document.createElement("div");
  head.className = "post-code-head";

  const language = document.createElement("span");
  language.className = "post-code-language";
  language.textContent = block.language || "code";
  head.append(language);

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = block.value || "";
  pre.append(code);

  // Students are meant to run this, so make it grabbable — where the browser
  // allows it. No clipboard API, no button, nothing broken.
  if (navigator.clipboard && navigator.clipboard.writeText) {
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "post-code-copy";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Press Ctrl+C";
      }
      setTimeout(() => { copy.textContent = "Copy"; }, 2000);
    });
    head.append(copy);
  }

  figure.append(head, pre);

  if (block.caption) {
    const caption = document.createElement("figcaption");
    inline(block.caption, caption);
    figure.append(caption);
  }

  return figure;
}

function imageBlock(block) {
  const figure = document.createElement("figure");
  figure.className = "post-figure";

  const img = document.createElement("img");
  img.src = link(block.src);
  img.alt = block.alt || "";
  img.loading = "lazy";

  // Same rule as the notebooks: say the picture is missing rather than
  // showing a broken-image icon.
  img.addEventListener("error", () => {
    const missing = document.createElement("p");
    missing.className = "post-figure-missing";
    missing.textContent = `Picture not added yet — put it at ${block.src}`;
    img.replaceWith(missing);
  });

  figure.append(img);

  if (block.caption) {
    const caption = document.createElement("figcaption");
    inline(block.caption, caption);
    figure.append(caption);
  }

  return figure;
}

function noteBlock(block) {
  const aside = document.createElement("aside");
  aside.className = "post-note";
  const p = document.createElement("p");
  inline(block.value, p);
  aside.append(p);
  return aside;
}

const BUILDERS = {
  text: textBlock,
  heading: headingBlock,
  list: listBlock,
  code: codeBlock,
  image: imageBlock,
  note: noteBlock
};

/** Replace everything in `host` with the rendered blocks. */
export function renderBlocks(blocks, host) {
  host.textContent = "";

  if (!Array.isArray(blocks) || !blocks.length) {
    const empty = document.createElement("p");
    empty.className = "post-empty";
    empty.textContent = "No write-up for this session yet. Add a body array to this topic in assets/js/tutorials.js.";
    host.append(empty);
    return;
  }

  for (const block of blocks) {
    const build = BUILDERS[block && block.type];
    if (build) host.append(build(block));
  }
}
