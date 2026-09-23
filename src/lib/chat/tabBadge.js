/**
 * Unread badge in the browser tab: "(N) 4v4 Chat" plus a favicon with a
 * red dot. applyTabBadge(0) restores the title and icon that were there
 * before the first badge.
 */

const BASE_TITLE = "4v4 Chat";
const ICON = "/favicon.svg";
const ICON_UNREAD = "/favicon-unread.svg";

let saved = null; // { title, href } captured before the first badge

function iconLink() {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = ICON;
    document.head.appendChild(link);
  }
  return link;
}

export function applyTabBadge(count) {
  if (typeof document === "undefined") return;
  if (count > 0) {
    const link = iconLink();
    if (!saved) saved = { title: document.title, href: link.getAttribute("href") || ICON };
    document.title = `(${count > 99 ? "99+" : count}) ${BASE_TITLE}`;
    if (link.getAttribute("href") !== ICON_UNREAD) link.setAttribute("href", ICON_UNREAD);
  } else if (saved) {
    document.title = saved.title;
    iconLink().setAttribute("href", saved.href);
    saved = null;
  }
}

export function clearTabBadge() {
  applyTabBadge(0);
}
