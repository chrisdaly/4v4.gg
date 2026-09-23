/**
 * Gate for the live message cap in useChatStream.
 *
 * Trimming the head of the list while the reader is scrolled up shrinks or
 * removes the row the viewport is anchored to, and the list jumps by that
 * amount on every new message. The chat panel pauses the trim whenever the
 * viewport leaves the bottom (Virtuoso's atBottomStateChange) and resumes it
 * on return; useChatStream trims on the next append once resumed.
 *
 * A module-level flag rather than state: the stream hook and the panel are
 * far apart in the tree, and the gate must be readable synchronously inside
 * a setState updater.
 */
let paused = false;

export function setTrimPaused(value) {
  paused = Boolean(value);
}

export function isTrimPaused() {
  return paused;
}
