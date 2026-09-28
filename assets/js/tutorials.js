// The practical sessions, defined once.
//
// This array drives three things at the same time:
//   * the topic list that unfolds under "Tutorial" in the sidebar
//   * the big card on the tutorial page
//   * the "Good to know" card beside it
//
// To add a session: append an entry. To reorder them: move the entry.
//
// `notebook` is a path from the site root. Drop the matching .ipynb into
// assets/notebooks/ and the page picks it up; leave the file out and the card
// says the notebook isn't published yet. Nothing breaks either way.
//
// Everything below the id is placeholder text for you to replace.

export const TOPICS = [
  {
    id: "A00",
    title: "Getting set up",
    summary: "Install R, VS Code and the R extension, then check that the three of them talk to each other. Do this before the first session — it is the only one that needs nothing but a laptop.",
    // This body is the template. Every block type the page understands is used
    // once here; copy the ones you need into the other sessions and delete the
    // rest. Inside "text", "note", list items and captions you can write
    // **bold**, *italic*, `code` and [links](https://example.org).
    body: [
      { type: "text", value: "By the end of this session you should be able to open a notebook, run a cell, and see a number come back. Nothing else in the course works until that does." },

      { type: "heading", value: "What you need" },
      { type: "list", items: [
        "**R** — the language itself, version 4.2 or newer.",
        "**VS Code** — the editor we use in class.",
        "The **R extension** for VS Code, plus the `languageserver` package."
      ] },

      { type: "heading", value: "Installing the R packages" },
      { type: "text", value: "Open R and run this. It takes a few minutes the first time." },
      { type: "code", language: "r", value: "install.packages(\"languageserver\")\ninstall.packages(\"IRkernel\")\nIRkernel::installspec()", caption: "Run once. `installspec()` is what makes R show up as a notebook kernel." },

      { type: "note", value: "On Windows you may need **Rtools** before any package will compile. Install it first if you see a compiler error." },

      { type: "heading", value: "Checking it worked" },
      { type: "text", value: "Open the notebook below, run the first cell, and you should see the version print out." },
      { type: "image", src: "assets/img/tutorials/A00-vscode.png", alt: "VS Code with an R notebook open and a cell showing the R version", caption: "What a working set-up looks like." },

      { type: "text", value: "If it does not, pin a note on [Sticky Notes](pages/noticeboard.html) with the error text and we will sort it out." }
    ],
    goodToKnow: [
      { type: "heading", value: "Dates" },
      { type: "list", items: [
        "Handout: **00.00.0000**",
        "**Tutorial:** Tue 20.10.26, 10:00–12:00, Seminar room C215"
      ] },
      { type: "note", value: "Ask on the **ILIAS forum** first — others likely have the same question." },
      { type: "text", value: "Contact ***** via [*****@uni-tuebingen.de](mailto:*****@uni-tuebingen.de)" }
    ]

  },
  { id: "A01", title: "First steps in R" },
  { id: "A02", title: "Reading and tidying count data" },
  { id: "A03", title: "Exploring an expression matrix" },
  { id: "A04", title: "Practical A04" },
  { id: "A05", title: "Practical A05" },
  { id: "A06", title: "Practical A06" },
  { id: "A07", title: "Practical A07" },
  { id: "A08", title: "Practical A08" },
  { id: "A09", title: "Practical A09" },
  { id: "A10", title: "Practical A10" },
  { id: "A11", title: "Practical A11" },
  { id: "A12", title: "Practical A12" },
  { id: "A13", title: "Practical A13" }
].map(withDefaults);

/** Fills in the parts you have not written yet, so a bare { id, title } works. */
function withDefaults(topic) {
  return {
    label: topic.id,
    summary: `Placeholder for ${topic.id}. Replace this in assets/js/tutorials.js — a sentence or two on what the session covers and what students should have ready before they start.`,
    body: [],
    goodToKnow: [
      "Replace these tips in assets/js/tutorials.js.",
      "Anything students always trip over in this session belongs here.",
      "Keep it to three or four lines so the card stays readable."
    ],
    notebook: `assets/notebooks/${topic.id}.ipynb`,
    ...topic
  };
}

export const DEFAULT_TOPIC = TOPICS[0].id;

/** Look a topic up by id, case-insensitively; null when there is no match. */
export function findTopic(id) {
  if (!id) return null;
  const wanted = String(id).trim().toUpperCase();
  return TOPICS.find((topic) => topic.id.toUpperCase() === wanted) || null;
}
