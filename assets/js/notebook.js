// Reads a Jupyter notebook that sits in the repo and pulls out enough to
// describe it on the page: the language, how much is in it, and the headings
// of its markdown cells as a contents list.
//
// Nothing here renders the notebook itself — students open or download it.
// Keeping it to a summary means no markdown engine, no syntax highlighter and
// no third-party script on the page.

export class NotebookMissing extends Error {
  constructor(url) {
    super(`No notebook published at ${url}`);
    this.name = "NotebookMissing";
  }
}

const LANGUAGE_NAMES = { r: "R", python: "Python", julia: "Julia" };

/** Strip the HTML that notebook headings often carry, leaving plain text. */
function plainText(markdown) {
  return markdown
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function cellSource(cell) {
  const source = cell && cell.source;
  return Array.isArray(source) ? source.join("") : (source || "");
}

/**
 * Fetch and summarise a notebook.
 * Rejects with NotebookMissing when the file is not in the repo (404), and
 * with a plain Error when it is there but unreadable.
 */
export async function loadNotebook(url) {
  let response;
  try {
    response = await fetch(url, { cache: "no-cache" });
  } catch (cause) {
    throw new Error("Couldn't reach the notebook. Check your internet connection.");
  }

  if (response.status === 404) throw new NotebookMissing(url);
  if (!response.ok) throw new Error(`The notebook couldn't be loaded (HTTP ${response.status}).`);

  let notebook;
  try {
    notebook = await response.json();
  } catch (cause) {
    throw new Error("That file is not a readable .ipynb notebook.");
  }

  return summarise(notebook);
}

function summarise(notebook) {
  const cells = Array.isArray(notebook.cells) ? notebook.cells : [];
  const info = notebook.metadata && notebook.metadata.language_info;
  const raw = (info && info.name) || "";
  const language = LANGUAGE_NAMES[raw.toLowerCase()] || (raw ? raw : "");

  let markdownCells = 0;
  let codeCells = 0;
  const outline = [];

  for (const cell of cells) {
    if (cell.cell_type === "code") {
      codeCells += 1;
      continue;
    }
    if (cell.cell_type !== "markdown") continue;
    markdownCells += 1;

    for (const line of cellSource(cell).split("\n")) {
      const heading = /^(#{1,3})\s+(.*)$/.exec(line.trim());
      if (!heading) continue;
      const text = plainText(heading[2]);
      if (text) outline.push({ level: heading[1].length, text });
    }
  }

  return { language, cellCount: cells.length, codeCells, markdownCells, outline };
}
