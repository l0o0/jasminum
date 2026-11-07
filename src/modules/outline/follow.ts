import { ICONS } from "./style";

/** Find the nearest preceding chapter without depending on manual tree order. */
export function outlineIndexForPage(pages: number[], page: number): number {
  let index = -1;
  let best = -Infinity;
  for (let i = 0; i < pages.length; i++) {
    if (
      Number.isInteger(pages[i]) &&
      pages[i] > 0 &&
      pages[i] <= page &&
      pages[i] >= best
    ) {
      best = pages[i];
      index = i;
    }
  }
  return index;
}

const cleanups = new Set<() => void>();
/** Scroll only the outline viewport, leaving the PDF and keyboard focus alone. */
export function revealOutlineNode(viewport: HTMLElement, node: HTMLElement) {
  const bounds = viewport.getBoundingClientRect();
  const row = node.getBoundingClientRect();
  const top = bounds.top + viewport.clientTop;
  const bottom = top + viewport.clientHeight;
  if (row.top < top) viewport.scrollTop += row.top - top;
  else if (row.bottom > bottom) viewport.scrollTop += row.bottom - bottom;
}

export function stopOutlineFollowing() {
  for (const cleanup of [...cleanups]) cleanup();
}

type PDFView = {
  _iframeWindow?: Window & {
    PDFViewerApplication?: { pdfViewer?: { currentPageNumber: number } };
  };
};

export function followOutlinePages(
  reader: _ZoteroTypes.ReaderInstance,
  doc: Document,
) {
  const internal = reader._internalReader as unknown as {
    _primaryView?: PDFView;
    _secondaryView?: PDFView;
    _lastView?: PDFView;
  };
  const win = doc.defaultView!;
  const bound = new Map<Element, EventListener>();
  let timer: number | undefined;
  let last: HTMLElement | undefined;
  let disposed = false;
  const update = () => {
    timer = undefined;
    if (disposed || !doc.getElementById("root-list")) return;
    const panel = doc.getElementById("jasminum-outline");
    if (!panel || panel.classList.contains("hidden")) return;
    // Do not interrupt an edit or drag, or alter the user's editing selection.
    if (doc.querySelector("#root-list input, #root-list .dragging")) return;
    const view = internal._lastView || internal._primaryView;
    const page =
      view?._iframeWindow?.PDFViewerApplication?.pdfViewer?.currentPageNumber;
    if (!page) return;
    const nodes = Array.from(
      doc.querySelectorAll("#root-list .tree-node"),
    ) as HTMLElement[];
    const index = outlineIndexForPage(
      nodes.map((n) => Number(n.getAttribute("page"))),
      page,
    );
    const current = nodes[index];
    const viewport = doc.getElementById("j-outline-viewer");
    if (last === current) {
      if (current && viewport) revealOutlineNode(viewport, current);
      return;
    }
    for (const node of nodes) node.classList.remove("outline-reading-current");
    last = current;
    if (!current) return;
    current.classList.add("outline-reading-current");
    let owner = current.closest("li")?.parentElement?.closest("li");
    while (owner) {
      owner.classList.remove("collapsed");
      const expander = owner.querySelector(".expander");
      if (expander) expander.innerHTML = ICONS.down;
      owner = owner.parentElement?.closest("li") ?? null;
    }
    if (viewport) revealOutlineNode(viewport, current);
  };
  const schedule = () => {
    if (!disposed && timer === undefined) timer = win.setTimeout(update, 120);
  };
  const bindViews = () => {
    for (const [container, listener] of bound) {
      if (!container.isConnected) {
        container.removeEventListener("scroll", listener);
        bound.delete(container);
      }
    }
    for (const view of [internal._primaryView, internal._secondaryView]) {
      const container =
        view?._iframeWindow?.document.getElementById("viewerContainer");
      if (!container || bound.has(container)) continue;
      const listener: EventListener = () => schedule();
      container.addEventListener("scroll", listener, { passive: true });
      bound.set(container, listener);
    }
  };
  const onClick = (event: Event) => {
    bindViews();
    if ((event.target as Element).closest("#j-outline-button"))
      last = undefined;
    schedule();
  };
  // Split views and their frames may be created after the sidebar initializes.
  const observer = new win.MutationObserver(() => {
    bindViews();
    schedule();
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  doc.addEventListener("click", onClick);
  doc.addEventListener("load", bindViews, true);
  const cleanup = () => {
    disposed = true;
    if (timer !== undefined) win.clearTimeout(timer);
    observer.disconnect();
    for (const [container, listener] of bound)
      container.removeEventListener("scroll", listener);
    bound.clear();
    doc.removeEventListener("click", onClick);
    doc.removeEventListener("load", bindViews, true);
    win.removeEventListener("unload", cleanup);
    cleanups.delete(cleanup);
  };
  cleanups.add(cleanup);
  win.addEventListener("unload", cleanup, { once: true });
  bindViews();
  schedule();
}
