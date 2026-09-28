// Tunable settings for the site. Safe to edit, but unlike config.js these may
// be rewritten when you update the app, so keep your keys out of this file.

// Shown in the sidebar and used as the base of every page title.
export const SITE_TITLE = "Integrative Transcriptomics";

// Heading printed on the taped title strip of the sticky-notes page.
export const BOARD_TITLE = "Sticky Notes";

// Each visit reads up to this many notes from the free daily quota.
export const MAX_NOTES_SHOWN = 60;

// How long one browser waits between notes.
export const COOLDOWN_SECONDS = 30;

// Longest note the board accepts.
export const MAX_LENGTH = 500;

// --- Owner replies -------------------------------------------------------
// Only the signed-in owner can reply; everyone can read replies.

// How many replies are read per visit, across the whole board.
export const MAX_REPLIES_SHOWN = 100;

// Longest reply the board accepts. If you change this, change the matching
// size() check in the /replies rules block too, or the write is refused.
export const REPLY_MAX_LENGTH = 300;

// How a reply is signed on the board.
export const OWNER_REPLY_LABEL = "Board owner";
