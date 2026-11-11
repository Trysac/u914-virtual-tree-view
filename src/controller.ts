import { TreeError } from "./errors.js";
import type { Row, TreeControllerOptions, TreeNode, VirtualWindow } from "./types.js";

interface InternalNode {
  id: string;
  label: string;
  level: number; // 1-based
  setSize: number;
  posInSet: number; // 1-based
  hasChildren: boolean;
  parentOrdinal: number; // -1 for root
  childOrdinals: number[];
  siblingOrdinals: number[];
}

/**
 * Headless virtual tree controller managing hierarchy, visibility,
 * ARIA tree navigation, and virtual window calculations.
 */
export class TreeController {
  readonly rowHeight: number;
  viewportHeight: number;
  readonly overscan: number;
  private readonly onActivate?: ((id: string) => void) | undefined;

  private readonly nodes: InternalNode[] = [];
  private readonly idToOrdinal: Map<string, number> = new Map();
  private readonly expandedSet: Set<number> = new Set();
  private visibleOrdinals: number[] = [];
  private visibleLookup: Map<number, number> = new Map(); // ordinal -> index in visibleOrdinals

  private _focusedId: string | null = null;
  private _selectedId: string | null = null;

  constructor(data: TreeNode[], opts: TreeControllerOptions) {
    if (!opts || typeof opts !== "object") {
      throw new TreeError("invalid_option", "Options must be provided");
    }
    if (
      typeof opts.rowHeight !== "number" ||
      opts.rowHeight <= 0 ||
      !Number.isFinite(opts.rowHeight)
    ) {
      throw new TreeError("invalid_option", "rowHeight must be a positive number");
    }
    if (
      typeof opts.viewportHeight !== "number" ||
      opts.viewportHeight < 0 ||
      !Number.isFinite(opts.viewportHeight)
    ) {
      throw new TreeError("invalid_option", "viewportHeight must be a non-negative number");
    }

    this.rowHeight = opts.rowHeight;
    this.viewportHeight = opts.viewportHeight;
    this.overscan = opts.overscan !== undefined ? opts.overscan : 5;
    if (this.overscan < 0 || !Number.isFinite(this.overscan)) {
      throw new TreeError("invalid_option", "overscan must be a non-negative number");
    }

    const maxNodes = opts.maxNodes !== undefined ? opts.maxNodes : 1_000_000;
    const maxDepth = opts.maxDepth !== undefined ? opts.maxDepth : 256;
    this.onActivate = opts.onActivate;

    this.buildIndex(data, maxNodes, maxDepth);

    if (opts.expanded) {
      for (const id of opts.expanded) {
        const ord = this.idToOrdinal.get(id);
        if (ord !== undefined) {
          const node = this.getNode(ord);
          if (node.hasChildren) {
            this.expandedSet.add(ord);
          }
        }
      }
    }

    this.rebuildVisibleList();

    if (this.visibleOrdinals.length > 0) {
      const firstOrd = this.getVisibleOrdinal(0);
      this._focusedId = this.getNode(firstOrd).id;
    }
  }

  private getNode(ordinal: number): InternalNode {
    const node = this.nodes[ordinal];
    if (!node) {
      throw new TreeError("unknown_id", `Invalid node ordinal: ${ordinal}`);
    }
    return node;
  }

  private getVisibleOrdinal(index: number): number {
    const ord = this.visibleOrdinals[index];
    if (ord === undefined) {
      throw new TreeError("invalid_option", `Index ${index} out of bounds`);
    }
    return ord;
  }

  private buildIndex(roots: TreeNode[], maxNodes: number, maxDepth: number): void {
    interface StackItem {
      node: TreeNode;
      parentOrdinal: number;
      level: number;
      siblingIndex: number;
      siblingCount: number;
      siblingGroup: number[];
    }

    let count = 0;
    const stack: StackItem[] = [];

    const rootCount = roots.length;
    const rootGroup: number[] = [];
    for (let i = rootCount - 1; i >= 0; i--) {
      const item = roots[i];
      if (!item || typeof item.id !== "string" || typeof item.label !== "string") {
        throw new TreeError("invalid_node", "Node must have valid id and label");
      }
      stack.push({
        node: item,
        parentOrdinal: -1,
        level: 1,
        siblingIndex: i,
        siblingCount: rootCount,
        siblingGroup: rootGroup,
      });
    }

    while (stack.length > 0) {
      const top = stack.pop();
      if (!top) break;
      const node = top.node;

      if (top.level > maxDepth) {
        throw new TreeError("too_deep", `Tree nesting depth exceeded limit of ${maxDepth}`);
      }

      if (count >= maxNodes) {
        throw new TreeError("too_large", `Node count exceeded limit of ${maxNodes}`);
      }

      if (this.idToOrdinal.has(node.id)) {
        throw new TreeError("duplicate_id", `Duplicate node id encountered: ${node.id}`);
      }

      const ordinal = count++;
      this.idToOrdinal.set(node.id, ordinal);
      top.siblingGroup[top.siblingIndex] = ordinal;

      const children = node.children || [];
      const hasChildren = children.length > 0;
      const childOrdinals: number[] = [];

      const internal: InternalNode = {
        id: node.id,
        label: node.label,
        level: top.level,
        setSize: top.siblingCount,
        posInSet: top.siblingIndex + 1,
        hasChildren,
        parentOrdinal: top.parentOrdinal,
        childOrdinals,
        siblingOrdinals: top.siblingGroup,
      };

      this.nodes.push(internal);

      if (top.parentOrdinal !== -1) {
        const parentNode = this.getNode(top.parentOrdinal);
        parentNode.childOrdinals.push(ordinal);
      }

      if (hasChildren) {
        const childGroup: number[] = [];
        for (let j = children.length - 1; j >= 0; j--) {
          const childNode = children[j];
          if (
            !childNode ||
            typeof childNode.id !== "string" ||
            typeof childNode.label !== "string"
          ) {
            throw new TreeError("invalid_node", "Node must have valid id and label");
          }
          stack.push({
            node: childNode,
            parentOrdinal: ordinal,
            level: top.level + 1,
            siblingIndex: j,
            siblingCount: children.length,
            siblingGroup: childGroup,
          });
        }
      }
    }
  }

  private rebuildVisibleList(): void {
    const visible: number[] = [];
    const stack: number[] = [];

    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.getNode(i);
      if (node.parentOrdinal === -1) {
        stack.push(i);
      }
    }

    while (stack.length > 0) {
      const ord = stack.pop();
      if (ord === undefined) break;
      visible.push(ord);
      if (this.expandedSet.has(ord)) {
        const children = this.getNode(ord).childOrdinals;
        for (let i = children.length - 1; i >= 0; i--) {
          const childOrd = children[i];
          if (childOrd !== undefined) {
            stack.push(childOrd);
          }
        }
      }
    }

    this.visibleOrdinals = visible;
    this.updateVisibleLookup();
  }

  private updateVisibleLookup(): void {
    this.visibleLookup.clear();
    for (let i = 0; i < this.visibleOrdinals.length; i++) {
      const ord = this.visibleOrdinals[i];
      if (ord !== undefined) {
        this.visibleLookup.set(ord, i);
      }
    }
  }

  get focusedId(): string | null {
    return this._focusedId;
  }

  get focusedIndex(): number {
    if (this._focusedId === null) return -1;
    const ord = this.idToOrdinal.get(this._focusedId);
    if (ord === undefined) return -1;
    const index = this.visibleLookup.get(ord);
    return index !== undefined ? index : -1;
  }

  get selectedId(): string | null {
    return this._selectedId;
  }

  setFocusedId(id: string | null): void {
    if (id === null) {
      this._focusedId = null;
      return;
    }
    const ord = this.idToOrdinal.get(id);
    if (ord === undefined || !this.visibleLookup.has(ord)) {
      throw new TreeError("unknown_id", `Node ${id} is unknown or not visible`);
    }
    this._focusedId = id;
  }

  visibleIds(): string[] {
    return this.visibleOrdinals.map((ord) => this.getNode(ord).id);
  }

  get visibleCount(): number {
    return this.visibleOrdinals.length;
  }

  rowAt(index: number): Row {
    if (index < 0 || index >= this.visibleOrdinals.length) {
      throw new TreeError(
        "invalid_option",
        `Index ${index} out of bounds [0, ${this.visibleOrdinals.length})`,
      );
    }
    const ord = this.getVisibleOrdinal(index);
    const node = this.getNode(ord);
    return {
      id: node.id,
      label: node.label,
      level: node.level,
      setSize: node.setSize,
      posInSet: node.posInSet,
      hasChildren: node.hasChildren,
      expanded: this.expandedSet.has(ord),
    };
  }

  private collectSubtreeOrdinals(rootOrd: number, out: number[]): void {
    if (!this.expandedSet.has(rootOrd)) return;
    const node = this.getNode(rootOrd);
    for (const childOrd of node.childOrdinals) {
      out.push(childOrd);
      this.collectSubtreeOrdinals(childOrd, out);
    }
  }

  expand(id: string): void {
    const ord = this.idToOrdinal.get(id);
    if (ord === undefined) {
      throw new TreeError("unknown_id", `Cannot expand unknown id: ${id}`);
    }
    const node = this.getNode(ord);
    if (!node.hasChildren || this.expandedSet.has(ord)) {
      return;
    }

    this.expandedSet.add(ord);
    const parentVisibleIdx = this.visibleLookup.get(ord);
    if (parentVisibleIdx !== undefined) {
      const inserted: number[] = [];
      this.collectSubtreeOrdinals(ord, inserted);
      this.visibleOrdinals.splice(parentVisibleIdx + 1, 0, ...inserted);
      this.updateVisibleLookup();
    }
  }

  collapse(id: string): void {
    const ord = this.idToOrdinal.get(id);
    if (ord === undefined) {
      throw new TreeError("unknown_id", `Cannot collapse unknown id: ${id}`);
    }
    const node = this.getNode(ord);
    if (!node.hasChildren || !this.expandedSet.has(ord)) {
      return;
    }

    const subtree: number[] = [];
    this.collectSubtreeOrdinals(ord, subtree);
    this.expandedSet.delete(ord);

    // If focused item was in the collapsed subtree, move focus to this node
    if (this._focusedId !== null) {
      const focusedOrd = this.idToOrdinal.get(this._focusedId);
      if (focusedOrd !== undefined && subtree.includes(focusedOrd)) {
        this._focusedId = id;
      }
    }

    const parentVisibleIdx = this.visibleLookup.get(ord);
    if (parentVisibleIdx !== undefined) {
      this.visibleOrdinals.splice(parentVisibleIdx + 1, subtree.length);
      this.updateVisibleLookup();
    }
  }

  toggle(id: string): void {
    const ord = this.idToOrdinal.get(id);
    if (ord === undefined) {
      throw new TreeError("unknown_id", `Cannot toggle unknown id: ${id}`);
    }
    if (this.expandedSet.has(ord)) {
      this.collapse(id);
    } else {
      this.expand(id);
    }
  }

  expandAll(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node?.hasChildren) {
        this.expandedSet.add(i);
      }
    }
    this.rebuildVisibleList();
  }

  window(scrollTop: number): VirtualWindow {
    const totalHeight = this.visibleOrdinals.length * this.rowHeight;
    const maxScroll = Math.max(0, totalHeight - this.viewportHeight);
    const clampedScroll = Math.max(0, Math.min(scrollTop, maxScroll));

    if (this.visibleOrdinals.length === 0) {
      return { start: 0, end: 0, offsetTop: 0, totalHeight: 0 };
    }

    const first = Math.floor(clampedScroll / this.rowHeight);
    const start = Math.max(0, first - this.overscan);
    const end = Math.min(
      this.visibleOrdinals.length,
      first + Math.ceil(this.viewportHeight / this.rowHeight) + this.overscan,
    );
    const offsetTop = start * this.rowHeight;

    return {
      start,
      end,
      offsetTop,
      totalHeight,
    };
  }

  scrollTopFor(currentScrollTop: number): number {
    if (this._focusedId === null) {
      return currentScrollTop;
    }
    const ord = this.idToOrdinal.get(this._focusedId);
    if (ord === undefined) return currentScrollTop;
    const index = this.visibleLookup.get(ord);
    if (index === undefined) return currentScrollTop;

    const rowTop = index * this.rowHeight;
    const rowBottom = (index + 1) * this.rowHeight;
    const totalHeight = this.visibleOrdinals.length * this.rowHeight;
    const maxScroll = Math.max(0, totalHeight - this.viewportHeight);
    const clampedCurrent = Math.max(0, Math.min(currentScrollTop, maxScroll));

    if (rowTop < clampedCurrent) {
      return rowTop;
    }
    if (rowBottom > clampedCurrent + this.viewportHeight) {
      return Math.min(maxScroll, Math.max(0, rowBottom - this.viewportHeight));
    }
    return clampedCurrent;
  }

  handleKey(key: string): boolean {
    if (this.visibleOrdinals.length === 0) {
      return false;
    }

    if (this._focusedId === null) {
      const firstOrd = this.getVisibleOrdinal(0);
      this._focusedId = this.getNode(firstOrd).id;
    }

    const currentOrd = this.idToOrdinal.get(this._focusedId);
    if (currentOrd === undefined) return false;
    const currentIdx = this.visibleLookup.get(currentOrd);
    if (currentIdx === undefined) return false;
    const currentNode = this.getNode(currentOrd);
    const isExpanded = this.expandedSet.has(currentOrd);

    switch (key) {
      case "ArrowDown": {
        if (currentIdx + 1 < this.visibleOrdinals.length) {
          const nextOrd = this.getVisibleOrdinal(currentIdx + 1);
          this._focusedId = this.getNode(nextOrd).id;
          return true;
        }
        return true;
      }
      case "ArrowUp": {
        if (currentIdx > 0) {
          const prevOrd = this.getVisibleOrdinal(currentIdx - 1);
          this._focusedId = this.getNode(prevOrd).id;
          return true;
        }
        return true;
      }
      case "ArrowRight": {
        if (currentNode.hasChildren) {
          if (!isExpanded) {
            this.expand(currentNode.id);
            return true;
          }
          // if open, move to first child
          if (currentIdx + 1 < this.visibleOrdinals.length) {
            const nextOrd = this.getVisibleOrdinal(currentIdx + 1);
            if (this.getNode(nextOrd).parentOrdinal === currentOrd) {
              this._focusedId = this.getNode(nextOrd).id;
              return true;
            }
          }
        }
        return true; // does nothing on leaf or already open with children
      }
      case "ArrowLeft": {
        if (currentNode.hasChildren && isExpanded) {
          this.collapse(currentNode.id);
          return true;
        }
        if (currentNode.parentOrdinal !== -1) {
          this._focusedId = this.getNode(currentNode.parentOrdinal).id;
          return true;
        }
        return true; // does nothing at root leaf/collapsed
      }
      case "Home": {
        const firstOrd = this.getVisibleOrdinal(0);
        this._focusedId = this.getNode(firstOrd).id;
        return true;
      }
      case "End": {
        const lastOrd = this.getVisibleOrdinal(this.visibleOrdinals.length - 1);
        this._focusedId = this.getNode(lastOrd).id;
        return true;
      }
      case "Enter":
      case " ": {
        this._selectedId = currentNode.id;
        if (this.onActivate) {
          this.onActivate(currentNode.id);
        }
        return true;
      }
      case "*": {
        // Expand all siblings of the focused node
        for (const sibOrd of currentNode.siblingOrdinals) {
          const sibNode = this.getNode(sibOrd);
          if (sibNode.hasChildren) {
            this.expand(sibNode.id);
          }
        }
        return true;
      }
      default: {
        if (key.length === 1 && key.trim() !== "") {
          const searchChar = key.toLowerCase();
          const count = this.visibleOrdinals.length;
          for (let offset = 1; offset <= count; offset++) {
            const checkIdx = (currentIdx + offset) % count;
            const checkOrd = this.getVisibleOrdinal(checkIdx);
            const checkNode = this.getNode(checkOrd);
            if (checkNode.label.toLowerCase().startsWith(searchChar)) {
              this._focusedId = checkNode.id;
              return true;
            }
          }
          return false;
        }
        return false;
      }
    }
  }
}
