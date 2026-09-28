// Owner replies.
//
// Replies live in their own top-level "replies" collection, so note documents
// keep exactly the shape your existing rules expect. One document per reply:
// { noteId, text, uid, createdAt }.
//
// Anyone can read replies. Only the signed-in owner can write or remove them,
// which the /replies rules block enforces (see REPORT.md) — the code here only
// decides what to put on screen.

import { MAX_REPLIES_SHOWN, OWNER_REPLY_LABEL, REPLY_MAX_LENGTH } from "./settings.js";
import { buildTimeElement, toDate } from "./time.js";

/**
 * @param fb             the merged Firestore + Auth namespace
 * @param db             the Firestore instance
 * @param onChange       called when replies arrive, so the board can re-render
 * @param onProblem      called with a message when replies cannot be loaded ("" clears it)
 * @param onBoardError   called with a ready-made message to show on the compose card
 * @param describeError  turns a Firestore error into a sentence
 * @param getUid         current uid, or null
 */
export function createReplies({ fb, db, onChange, onProblem, onBoardError, describeError, getUid }) {
  const collectionRef = fb.collection(db, "replies");

  let byNote = new Map();

  // Survives the full re-render that every snapshot triggers, so the owner
  // never loses a half-typed reply.
  const draft = { noteId: null, text: "", focused: false, caret: 0 };

  function start() {
    const recent = fb.query(collectionRef, fb.orderBy("createdAt", "desc"), fb.limit(MAX_REPLIES_SHOWN));

    fb.onSnapshot(
      recent,
      (snapshot) => {
        const next = new Map();
        for (const doc of snapshot.docs) {
          const data = doc.data({ serverTimestamps: "estimate" });
          if (typeof data.noteId !== "string" || !data.noteId) continue;
          if (!next.has(data.noteId)) next.set(data.noteId, []);
          next.get(data.noteId).push({ id: doc.id, data });
        }
        // The query is newest-first; a thread reads better oldest-first.
        for (const thread of next.values()) thread.reverse();
        byNote = next;
        onProblem("");
        onChange();
      },
      (error) => {
        // Notes still work without replies, so say so and carry on.
        byNote = new Map();
        onProblem(`Replies can't be loaded right now. ${describeError(error)}`);
        onChange();
      }
    );
  }

  /** True while a reply is being written, so timer re-renders can hold off. */
  function isDrafting() {
    return draft.noteId !== null;
  }

  /** Called just before the board is wiped, to put the caret back afterwards. */
  function captureFocus() {
    const active = document.activeElement;
    const isReplyInput = Boolean(active && active.dataset && active.dataset.replyFor === draft.noteId);
    draft.focused = isReplyInput;
    if (isReplyInput) draft.caret = active.selectionStart;
  }

  function clearDraft() {
    draft.noteId = null;
    draft.text = "";
    draft.focused = false;
    draft.caret = 0;
  }

  function deleteReply(replyId) {
    return fb.deleteDoc(fb.doc(db, "replies", replyId));
  }

  /**
   * Delete the replies we know about for a note. Owner-only: a visitor
   * removing their own note cannot touch replies, and the rules would refuse.
   * Replies older than the listener's window are not seen here, so they can
   * outlive their note — they simply never render again.
   */
  function removeForNote(noteId) {
    const thread = byNote.get(noteId) || [];
    return Promise.all(thread.map(({ id }) => deleteReply(id)));
  }

  function buildReply({ id, data }, { isOwner }) {
    const item = document.createElement("li");
    item.className = "reply";

    const text = document.createElement("p");
    text.className = "reply-text";
    text.textContent = typeof data.text === "string" ? data.text : "";

    const meta = document.createElement("p");
    meta.className = "reply-meta";

    const author = document.createElement("span");
    author.className = "reply-author";
    author.textContent = OWNER_REPLY_LABEL;

    meta.append(author, buildTimeElement(toDate(data.createdAt)));

    if (isOwner) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", async () => {
        if (!window.confirm("Remove this reply? This can't be undone.")) return;
        removeButton.disabled = true;
        try {
          await deleteReply(id);
        } catch (error) {
          removeButton.disabled = false;
          onBoardError(`Couldn't remove the reply. ${describeError(error)}`);
        }
      });
      meta.append(removeButton);
    }

    item.append(text, meta);
    return item;
  }

  function buildForm(noteId) {
    const form = document.createElement("form");
    form.className = "reply-form";
    form.id = `reply-form-${noteId}`;
    form.hidden = draft.noteId !== noteId;

    const label = document.createElement("label");
    label.className = "visually-hidden";
    label.htmlFor = `reply-input-${noteId}`;
    label.textContent = "Your reply to this note";

    const input = document.createElement("textarea");
    input.id = `reply-input-${noteId}`;
    input.className = "reply-input";
    input.rows = 2;
    input.maxLength = REPLY_MAX_LENGTH;
    input.placeholder = "Reply as the owner…";
    input.dataset.replyFor = noteId;
    if (draft.noteId === noteId) input.value = draft.text;
    input.addEventListener("input", () => { draft.text = input.value; });

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "small-button";
    submit.textContent = "Post reply";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "link-button";
    cancel.textContent = "Cancel";

    const actions = document.createElement("div");
    actions.className = "reply-actions";
    actions.append(submit, cancel);

    const status = document.createElement("p");
    status.className = "reply-status";
    status.setAttribute("role", "status");

    form.append(label, input, actions, status);

    cancel.addEventListener("click", () => {
      clearDraft();
      onChange();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const text = input.value.trim();
      if (!text) {
        status.classList.add("is-error");
        status.textContent = "Write a reply first.";
        input.focus();
        return;
      }

      submit.disabled = true;
      status.classList.remove("is-error");
      status.textContent = "Posting…";

      try {
        await fb.addDoc(collectionRef, {
          noteId,
          text: text.slice(0, REPLY_MAX_LENGTH),
          uid: getUid(),
          createdAt: fb.serverTimestamp()
        });
        clearDraft();
        // The snapshot that follows re-renders the thread.
      } catch (error) {
        submit.disabled = false;
        status.classList.add("is-error");
        status.textContent = describeError(error);
      }
    });

    return { form, input };
  }

  /**
   * The replies block for one note, or null when there is nothing to show
   * (no replies, and the viewer is not the owner).
   */
  function buildSection(noteId, { isOwner }) {
    const thread = byNote.get(noteId) || [];
    if (!thread.length && !isOwner) return null;

    const section = document.createElement("div");
    section.className = "note-replies";

    if (thread.length) {
      const heading = document.createElement("h3");
      heading.className = "visually-hidden";
      heading.textContent = `Replies to this note (${thread.length})`;

      const list = document.createElement("ul");
      list.className = "reply-list";
      for (const reply of thread) list.append(buildReply(reply, { isOwner }));

      section.append(heading, list);
    }

    if (isOwner) {
      const { form, input } = buildForm(noteId);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "reply-toggle";
      toggle.textContent = thread.length ? "Add a reply" : "Reply";
      toggle.setAttribute("aria-expanded", String(draft.noteId === noteId));
      toggle.setAttribute("aria-controls", form.id);
      toggle.hidden = draft.noteId === noteId;

      toggle.addEventListener("click", () => {
        draft.noteId = noteId;
        draft.text = "";
        toggle.hidden = true;
        toggle.setAttribute("aria-expanded", "true");
        form.hidden = false;
        input.focus();
      });

      section.append(toggle, form);

      // Put the caret back where it was before the last re-render.
      if (draft.noteId === noteId && draft.focused) {
        queueMicrotask(() => {
          input.focus();
          const caret = Math.min(draft.caret, input.value.length);
          input.setSelectionRange(caret, caret);
        });
      }
    }

    return section;
  }

  return { start, buildSection, removeForNote, isDrafting, captureFocus };
}
