// Relative timestamps ("3 minutes ago"), shared by notes and replies.

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];

export function timeAgo(date) {
  if (!date) return "just now";
  const seconds = (date.getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.trunc(seconds / size), unit);
  }
  return "just now";
}

/** Firestore timestamp -> Date, or null if it hasn't reached the server yet. */
export function toDate(value) {
  return value && typeof value.toDate === "function" ? value.toDate() : null;
}

/** A <time> element carrying both the machine date and the friendly label. */
export function buildTimeElement(date) {
  const time = document.createElement("time");
  if (date) {
    time.dateTime = date.toISOString();
    time.title = date.toLocaleString();
  }
  time.textContent = timeAgo(date);
  return time;
}
