/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import type { TreeController } from "./controller.js";
import type { RenderTreeOptions, RenderTreeStats, TreeRenderer } from "./types.js";

interface PooledRowElement {
  element: HTMLElement;
  lastIndex: number;
  lastId: string;
  lastLabel: string;
  lastLevel: number;
  lastSetSize: number;
  lastPosInSet: number;
  lastHasChildren: boolean;
  lastExpanded: boolean;
  lastSelected: boolean | null;
  lastTranslateY: number;
}

/**
 * Mounts and renders virtual tree rows into an HTML container element.
 */
export function renderTree(
  container: HTMLElement,
  controller: TreeController,
  opts: RenderTreeOptions = {},
): TreeRenderer {
  const idPrefix = opts.idPrefix !== undefined ? opts.idPrefix : "vt";
  const indentPx = opts.indentPx !== undefined ? opts.indentPx : 16;
  const label = opts.label !== undefined ? opts.label : "Tree";

  container.setAttribute("role", "tree");
  container.setAttribute("tabindex", "0");
  container.setAttribute("aria-label", label);
  container.style.overflow = "auto";
  container.style.position = "relative";

  const spacer = container.ownerDocument.createElement("div");
  spacer.setAttribute("aria-hidden", "true");
  spacer.style.width = "100%";
  spacer.style.pointerEvents = "none";
  spacer.style.position = "absolute";
  spacer.style.top = "0";
  spacer.style.left = "0";
  container.appendChild(spacer);

  let rowsCreated = 0;
  let rowsUpdated = 0;

  const pool: PooledRowElement[] = [];

  function getRowId(index: number): string {
    return `${idPrefix}-${index}`;
  }

  function syncActiveDescendant(): void {
    const focusedIndex = controller.focusedIndex;
    if (focusedIndex !== -1) {
      container.setAttribute("aria-activedescendant", getRowId(focusedIndex));
    } else {
      container.removeAttribute("aria-activedescendant");
    }
  }

  function update(scrollTop: number): void {
    const win = controller.window(scrollTop);
    spacer.style.height = `${win.totalHeight}px`;

    const neededCount = win.end - win.start;

    // Create elements if pool is smaller than needed
    while (pool.length < neededCount) {
      const el = container.ownerDocument.createElement("div");
      el.setAttribute("role", "treeitem");
      el.setAttribute("aria-selected", "false");
      el.style.position = "absolute";
      el.style.left = "0";
      el.style.right = "0";
      el.style.height = `${controller.rowHeight}px`;
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.boxSizing = "border-box";
      container.appendChild(el);
      rowsCreated++;
      pool.push({
        element: el,
        lastIndex: -1,
        lastId: "",
        lastLabel: "",
        lastLevel: -1,
        lastSetSize: -1,
        lastPosInSet: -1,
        lastHasChildren: false,
        lastExpanded: false,
        lastSelected: false,
        lastTranslateY: -1,
      });
    }

    // Update active rows
    for (let i = 0; i < neededCount; i++) {
      const rowIndex = win.start + i;
      const row = controller.rowAt(rowIndex);
      const poolItem = pool[i];
      if (!poolItem) continue;
      const el = poolItem.element;
      const rowDomId = getRowId(rowIndex);
      const isSelected = controller.selectedId === row.id;
      const translateY = rowIndex * controller.rowHeight;

      let changed = false;

      if (el.id !== rowDomId) {
        el.id = rowDomId;
        changed = true;
      }

      if (poolItem.lastTranslateY !== translateY) {
        el.style.transform = `translateY(${translateY}px)`;
        poolItem.lastTranslateY = translateY;
        changed = true;
      }

      if (poolItem.lastLevel !== row.level) {
        el.setAttribute("aria-level", String(row.level));
        el.style.paddingLeft = `${(row.level - 1) * indentPx + 8}px`;
        poolItem.lastLevel = row.level;
        changed = true;
      }

      if (poolItem.lastSetSize !== row.setSize) {
        el.setAttribute("aria-setsize", String(row.setSize));
        poolItem.lastSetSize = row.setSize;
        changed = true;
      }

      if (poolItem.lastPosInSet !== row.posInSet) {
        el.setAttribute("aria-posinset", String(row.posInSet));
        poolItem.lastPosInSet = row.posInSet;
        changed = true;
      }

      if (poolItem.lastSelected !== isSelected) {
        el.setAttribute("aria-selected", isSelected ? "true" : "false");
        poolItem.lastSelected = isSelected;
        changed = true;
      }

      if (poolItem.lastHasChildren !== row.hasChildren || poolItem.lastExpanded !== row.expanded) {
        if (row.hasChildren) {
          el.setAttribute("aria-expanded", row.expanded ? "true" : "false");
        } else {
          el.removeAttribute("aria-expanded");
        }
        poolItem.lastHasChildren = row.hasChildren;
        poolItem.lastExpanded = row.expanded;
        changed = true;
      }

      if (poolItem.lastLabel !== row.label) {
        el.textContent = row.label;
        poolItem.lastLabel = row.label;
        changed = true;
      }

      if (el.style.display === "none") {
        el.style.display = "flex";
        changed = true;
      }

      poolItem.lastIndex = rowIndex;
      poolItem.lastId = row.id;

      if (changed) {
        rowsUpdated++;
      }
    }

    // Hide unused pool elements
    for (let i = neededCount; i < pool.length; i++) {
      const unused = pool[i];
      if (unused && unused.element.style.display !== "none") {
        unused.element.style.display = "none";
        unused.lastIndex = -1;
      }
    }

    syncActiveDescendant();
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    const handled = controller.handleKey(event.key);
    if (handled) {
      event.preventDefault();
      const targetScroll = controller.scrollTopFor(container.scrollTop);
      container.scrollTop = targetScroll;
      update(targetScroll);
    }
  };

  const onScroll = (): void => {
    update(container.scrollTop);
  };

  container.addEventListener("keydown", onKeyDown);
  container.addEventListener("scroll", onScroll);

  // Initial render
  update(container.scrollTop || 0);

  return {
    update,
    destroy(): void {
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("scroll", onScroll);
      container.removeAttribute("role");
      container.removeAttribute("tabindex");
      container.removeAttribute("aria-label");
      container.removeAttribute("aria-activedescendant");
      container.innerHTML = "";
    },
    stats(): RenderTreeStats {
      return { rowsCreated, rowsUpdated };
    },
  };
}
