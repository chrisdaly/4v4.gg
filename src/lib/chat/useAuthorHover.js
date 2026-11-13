import { useCallback, useRef } from "react";

/**
 * Hover a name in the stream and every group by that author lights up, so
 * a reply three groups down reads as part of the same exchange.
 *
 * DOM only, on purpose: the rows are memoized against a context object and
 * a hover state in that object would re-render every visible group twice
 * per hover. Instead the list element gets delegated mouse handlers that
 * toggle HOT_ATTR on the matching groups directly, and the groups' CSS does
 * the rest.
 *
 *   AUTHOR_ATTR       on a group: its author's battleTag
 *   AUTHOR_NAME_ATTR  on the name element inside the group
 *   HOT_ATTR          set on every group by the hovered author
 *
 * Returns { onMouseOver, onMouseOut } for the list element.
 */
export const AUTHOR_ATTR = "data-author";
export const AUTHOR_NAME_ATTR = "data-author-name";
export const HOT_ATTR = "data-author-hot";

export default function useAuthorHover() {
  const hotRef = useRef({ tag: null, nodes: [] });

  const clear = useCallback(() => {
    for (const node of hotRef.current.nodes) node.removeAttribute(HOT_ATTR);
    hotRef.current = { tag: null, nodes: [] };
  }, []);

  const light = useCallback((list, tag) => {
    clear();
    const nodes = [];
    for (const node of list.querySelectorAll(`[${AUTHOR_ATTR}]`)) {
      if (node.getAttribute(AUTHOR_ATTR) !== tag) continue;
      node.setAttribute(HOT_ATTR, "true");
      nodes.push(node);
    }
    hotRef.current = { tag, nodes };
  }, [clear]);

  const onMouseOver = useCallback((e) => {
    const name = e.target.closest?.(`[${AUTHOR_NAME_ATTR}]`);
    if (!name) return;
    const tag = name.closest(`[${AUTHOR_ATTR}]`)?.getAttribute(AUTHOR_ATTR);
    if (!tag || tag === hotRef.current.tag) return;
    light(e.currentTarget, tag);
  }, [light]);

  const onMouseOut = useCallback((e) => {
    if (!hotRef.current.tag) return;
    const name = e.target.closest?.(`[${AUTHOR_NAME_ATTR}]`);
    if (!name) return;
    // still inside the name (its hover card, a child span)
    if (e.relatedTarget && name.contains(e.relatedTarget)) return;
    clear();
  }, [clear]);

  return { onMouseOver, onMouseOut };
}
