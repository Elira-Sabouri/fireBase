// Everything the noticeboard page does: live notes, pinning, removing, and
// owner sign-in. Loaded only by pages/noticeboard.html, so the other pages
// never touch Firebase.

import { BOARD_TITLE, COOLDOWN_SECONDS, MAX_LENGTH, MAX_NOTES_SHOWN, SITE_TITLE } from "./settings.js";
import { connectFirebase, OWNER_UID } from "./firebase.js";
import { createReplies } from "./replies.js";
import { buildTimeElement, toDate } from "./time.js";

const COLORS = ["yellow", "blue", "pink", "green"];
const PINS = ["#c62f2f", "#2f5fa8", "#2f7a3b", "#d69a12", "#7a3fa0"];
const COOLDOWN_KEY = "noticeboard:last-pinned";

const pinboard = document.getElementById("pinboard");
const form = document.getElementById("compose");
const messageInput = document.getElementById("message");
const authorInput = document.getElementById("author");
const charCount = document.getElementById("char-count");
const statusLine = document.getElementById("status");
const pinButton = document.getElementById("pin-button");
const boardMessage = document.getElementById("board-message");
const boardTitle = document.getElementById("board-title");
const repliesNotice = document.getElementById("replies-notice");
const ownerToggle = document.getElementById("owner-toggle");
const ownerFields = document.getElementById("owner-fields");
const ownerEmail = document.getElementById("owner-email");
const ownerPassword = document.getElementById("owner-password");
const ownerSignIn = document.getElementById("owner-signin");
const ownerSignedIn = document.getElementById("owner-signed-in");
const ownerSignOut = document.getElementById("owner-signout");
const ownerStatus = document.getElementById("owner-status");

boardTitle.textContent = BOARD_TITLE;
document.title = `${SITE_TITLE} — ${BOARD_TITLE}`;
messageInput.maxLength = MAX_LENGTH;
charCount.textContent = `0 / ${MAX_LENGTH}`;

let fb = null;
let db = null;
let auth = null;
let notesRef = null;
let currentUid = null;
let isOwner = false;
let signingIn = false;
let latestDocs = [];
let firstSnapshot = true;
let replies = null;
const seenIds = new Set();

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function setStatus(text, isError = false) {
  statusLine.textContent = text;
  statusLine.classList.toggle("is-error", isError);
}

function showBoardMessage(text) {
  boardMessage.textContent = text;
  boardMessage.hidden = !text;
}

function showRepliesNotice(text) {
  repliesNotice.textContent = text;
  repliesNotice.hidden = !text;
}

function canRemove(data) {
  if (!currentUid) return false;
  return isOwner || data.uid === currentUid;
}

function buildNote(id, data) {
  const color = COLORS.includes(data.color) ? data.color : "yellow";
  const h = hash(id);

  const note = document.createElement("article");
  note.className = `note pinned paper-${color}`;
  note.style.setProperty("--tilt", `${((h % 51) / 10 - 2.5).toFixed(1)}deg`);
  note.style.setProperty("--pin", PINS[(h >>> 8) % PINS.length]);

  const text = document.createElement("p");
  text.className = "note-text";
  text.textContent = typeof data.text === "string" ? data.text : "";

  const footer = document.createElement("footer");
  const author = document.createElement("span");
  author.className = "note-author";
  author.textContent = (typeof data.author === "string" && data.author.trim()) || "Anonymous";

  footer.append(author, buildTimeElement(toDate(data.createdAt)));

  if (canRemove(data)) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeNote(id, remove));
    footer.append(remove);
  }

  note.append(text, footer);

  const replySection = replies && replies.buildSection(id, { isOwner });
  if (replySection) note.append(replySection);

  return note;
}

async function removeNote(id, button) {
  if (!window.confirm("Remove this note? This can't be undone.")) return;
  button.disabled = true;
  try {
    await fb.deleteDoc(fb.doc(db, "notes", id));
  } catch (error) {
    button.disabled = false;
    setStatus(`Couldn't remove the note. ${describeError(error)}`, true);
    return;
  }

  // Only the owner may delete replies, so only the owner tidies up after a
  // note. A visitor deleting their own note leaves replies behind in the
  // database; with no parent note left, they never render.
  if (isOwner && replies) {
    try {
      await replies.removeForNote(id);
    } catch (error) {
      setStatus(`The note is gone, but its replies couldn't be removed. ${describeError(error)}`, true);
    }
  }
}

function render(animateIds = new Set()) {
  // Rebuilding the board throws away the owner's open reply box, so note where
  // the caret was; buildSection puts the text and the caret back.
  if (replies) replies.captureFocus();

  pinboard.querySelectorAll("article.note").forEach((el) => el.remove());
  const fragment = document.createDocumentFragment();
  for (const { id, data } of latestDocs) {
    const note = buildNote(id, data);
    if (animateIds.has(id)) note.classList.add("just-pinned");
    fragment.append(note);
  }
  pinboard.append(fragment);
  showBoardMessage(latestDocs.length ? "" : "Nothing pinned yet. Write the first note.");
}

function describeError(error) {
  switch (error && error.code) {
    case "permission-denied":
      return "The database refused the request. Check that your Firestore security rules are published.";
    case "resource-exhausted":
      return "The board reached today's free usage limit. It resets at midnight Pacific time.";
    case "unavailable":
      return "The database can't be reached. Check your internet connection.";
    default:
      return (error && error.message) || "Something went wrong.";
  }
}

function secondsUntilNextPin() {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY)) || 0;
    return Math.max(0, Math.ceil((last + COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

function rememberPin() {
  try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch { /* storage unavailable */ }
}

messageInput.addEventListener("input", () => {
  charCount.textContent = `${messageInput.value.length} / ${MAX_LENGTH}`;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!notesRef) return;

  const text = messageInput.value.trim();
  if (!text) {
    setStatus("Write a message before pinning.", true);
    messageInput.focus();
    return;
  }

  const wait = secondsUntilNextPin();
  if (wait > 0) {
    setStatus(`You can pin another note in ${wait} seconds.`, true);
    return;
  }

  if (!currentUid) {
    setStatus("Still connecting to the board. Try again in a moment.", true);
    return;
  }

  pinButton.disabled = true;
  pinButton.textContent = "Pinning…";
  setStatus("");

  try {
    await fb.addDoc(notesRef, {
      text: text.slice(0, MAX_LENGTH),
      author: authorInput.value.trim().slice(0, 40),
      color: COLORS.includes(form.elements.color.value) ? form.elements.color.value : "yellow",
      uid: currentUid,
      createdAt: fb.serverTimestamp()
    });
    rememberPin();
    messageInput.value = "";
    charCount.textContent = `0 / ${MAX_LENGTH}`;
    setStatus("Pinned.");
  } catch (error) {
    setStatus(`Couldn't pin your note. ${describeError(error)}`, true);
  } finally {
    pinButton.disabled = false;
    pinButton.textContent = "Pin note";
  }
});

function updateOwnerBar() {
  ownerSignedIn.hidden = !isOwner;
  ownerToggle.hidden = isOwner;
  if (isOwner) ownerFields.hidden = true;
}

ownerToggle.addEventListener("click", () => {
  ownerFields.hidden = !ownerFields.hidden;
  if (!ownerFields.hidden) ownerEmail.focus();
});

ownerSignIn.addEventListener("click", async () => {
  if (!auth) return;
  ownerStatus.textContent = "Signing in…";
  try {
    await fb.signInWithEmailAndPassword(auth, ownerEmail.value.trim(), ownerPassword.value);
    ownerPassword.value = "";
    ownerStatus.textContent = "";
  } catch (error) {
    ownerStatus.textContent = "That email and password didn't work.";
  }
});

ownerSignOut.addEventListener("click", async () => {
  if (!auth) return;
  ownerStatus.textContent = "";
  await fb.signOut(auth);
});

async function connect() {
  // connectFirebase() reports "not set up yet", "offline" and "bad settings"
  // with a message fit to show on the board, so one branch covers all three.
  let connection;
  try {
    connection = await connectFirebase();
  } catch (error) {
    pinButton.disabled = true;
    showBoardMessage(error.message || "The board is unavailable right now. Try reloading the page.");
    return;
  }

  ({ fb, db, auth } = connection);

  replies = createReplies({
    fb,
    db,
    onChange: () => render(),
    onProblem: showRepliesNotice,
    onBoardError: (message) => setStatus(message, true),
    describeError,
    getUid: () => currentUid
  });

  fb.onAuthStateChanged(auth, (user) => {
    if (!user) {
      currentUid = null;
      isOwner = false;
      if (!signingIn) {
        signingIn = true;
        fb.signInAnonymously(auth)
          .catch(() => setStatus("Couldn't connect to the board. Check that Anonymous sign-in is enabled in Firebase.", true))
          .finally(() => { signingIn = false; });
      }
    } else {
      currentUid = user.uid;
      isOwner = !user.isAnonymous && user.uid === OWNER_UID;
    }
    updateOwnerBar();
    if (latestDocs.length) render();
  });

  notesRef = fb.collection(db, "notes");
  const recent = fb.query(notesRef, fb.orderBy("createdAt", "desc"), fb.limit(MAX_NOTES_SHOWN));

  fb.onSnapshot(
    recent,
    (snapshot) => {
      latestDocs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data({ serverTimestamps: "estimate" }) }));
      const fresh = new Set();
      for (const { id } of latestDocs) {
        if (!firstSnapshot && !seenIds.has(id)) fresh.add(id);
        seenIds.add(id);
      }
      firstSnapshot = false;
      render(fresh);
    },
    (error) => {
      showBoardMessage(`Couldn't load notes. ${describeError(error)}`);
    }
  );

  replies.start();
}

// Keep "5 minutes ago" labels current. Mid-reply the labels can wait a minute;
// rebuilding the board under the owner's cursor is worse than a stale label.
setInterval(() => {
  if (!latestDocs.length) return;
  if (replies && replies.isDrafting()) return;
  render();
}, 60000);

connect();
