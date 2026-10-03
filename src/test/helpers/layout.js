import { fireEvent } from '@testing-library/react';

/**
 * Layout for a scroller, in a DOM that has none.
 *
 * happy-dom reports every box as 0px, so anything that reads offsetTop,
 * clientHeight or getBoundingClientRect to decide where the reader is gets
 * the same answer no matter what the page is doing. That blind spot is how a
 * scroll listener that was never attached passed a full suite: with no
 * geometry, "at the end" and "at the top" look identical.
 *
 * The geometry goes on HTMLElement.prototype rather than onto specific
 * elements, because the interesting moments are the ones where an element
 * arrives later - a stream that scrolls to a row which only exists after an
 * await, a panel whose scroller replaces a skeleton. A stub applied at a
 * fixed moment misses exactly those. Anything that is not a row or the
 * scroller keeps the real (zero) answers.
 *
 *   installLayout({ scroller, list, row, rowHeight, viewport, heights })
 *
 * `heights` is optional and may be an array or a function returning one, for
 * tests that vary row heights; without it every row is `rowHeight` tall.
 *
 * The three selectors say which elements are which; the defaults match the
 * /chat stream. Call it in beforeEach and restoreLayout in afterEach.
 */
export function installLayout({
  scroller = '[data-chat-scroller]',
  list = '[data-chat-list]',
  row = '[data-row-key]',
  rowHeight = 100,
  viewport = 200,
  heights = null,
} = {}) {
  // A function, when the test reassigns its heights array rather than
  // mutating it - holding the array itself would silently freeze the
  // geometry at whatever it was when the harness was installed
  const heightsOf = () => (typeof heights === 'function' ? heights() : heights);
  const proto = window.HTMLElement.prototype;
  const patched = [];

  const rowsOf = () => Array.from(document.querySelectorAll(`${list} > ${row}`));
  const scrollerEl = () => document.querySelector(scroller);
  const isScroller = (el) => el.matches?.(scroller);
  const heightOf = (i) => heightsOf()?.[i] ?? rowHeight;
  const offsetOf = (i) => {
    const hs = heightsOf();
    if (!hs) return i * rowHeight;
    let sum = 0;
    for (let n = 0; n < i; n += 1) sum += hs[n] ?? rowHeight;
    return sum;
  };
  const totalHeight = () => offsetOf(rowsOf().length);
  const rect = (top, bottom) => ({
    top, bottom, height: bottom - top, left: 0, right: 0, width: 100, x: 0, y: top,
  });

  // Each override answers for the elements it knows and defers otherwise, so
  // unrelated components in the same test file are untouched
  const define = (name, mine) => {
    const original = Object.getOwnPropertyDescriptor(proto, name);
    patched.push([name, original]);
    Object.defineProperty(proto, name, {
      configurable: true,
      get() {
        const value = mine.call(this);
        if (value !== undefined) return value;
        return original?.get ? original.get.call(this) : 0;
      },
    });
  };

  define('offsetTop', function () {
    const i = rowsOf().indexOf(this);
    return i === -1 ? undefined : offsetOf(i);
  });
  define('offsetHeight', function () {
    const i = rowsOf().indexOf(this);
    return i === -1 ? undefined : heightOf(i);
  });
  define('clientHeight', function () {
    return isScroller(this) ? viewport : undefined;
  });
  define('scrollHeight', function () {
    return isScroller(this) ? totalHeight() : undefined;
  });

  const originalRect = proto.getBoundingClientRect;
  patched.push(['getBoundingClientRect', { value: originalRect }]);
  proto.getBoundingClientRect = function () {
    if (isScroller(this)) return rect(0, viewport);
    const i = rowsOf().indexOf(this);
    if (i === -1) return originalRect.call(this);
    const top = offsetOf(i) - (scrollerEl()?.scrollTop || 0);
    return rect(top, top + heightOf(i));
  };

  const originalScrollTo = proto.scrollTo;
  patched.push(['scrollTo', { value: originalScrollTo }]);
  proto.scrollTo = function (opts) {
    if (!isScroller(this)) return originalScrollTo?.call(this, opts);
    this.scrollTop = opts?.top ?? 0;
    fireEvent.scroll(this);
    return undefined;
  };

  installLayout.patched = patched;
  return scrollerEl();
}

export function restoreLayout() {
  const proto = window.HTMLElement.prototype;
  const patched = installLayout.patched || [];
  while (patched.length) {
    const [name, original] = patched.pop();
    if (original) Object.defineProperty(proto, name, { configurable: true, ...original });
    else delete proto[name];
  }
}

/**
 * A ResizeObserver whose callbacks a test can fire by hand, for the height
 * changes that have no React render behind them (a card landing, an image
 * decoding). Returns a function that runs every observer's callback.
 */
export function installResizeObserver() {
  const callbacks = [];
  globalThis.ResizeObserver = class {
    constructor(cb) { callbacks.push(cb); }
    observe() {}
    disconnect() {}
  };
  return () => callbacks.forEach((cb) => cb());
}
