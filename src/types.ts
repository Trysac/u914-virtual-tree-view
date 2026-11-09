/**
 * Input tree node specification.
 */
export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

/**
 * Flattened row representation for virtual rendering and ARIA attributes.
 */
export interface Row {
  id: string;
  label: string;
  /** 1-based level in hierarchy */
  level: number;
  /** Sibling group size */
  setSize: number;
  /** 1-based index within sibling group */
  posInSet: number;
  hasChildren: boolean;
  expanded: boolean;
}

/**
 * Options for initializing TreeController.
 */
export interface TreeControllerOptions {
  rowHeight: number;
  viewportHeight: number;
  overscan?: number; // default: 5
  expanded?: Iterable<string>;
  maxNodes?: number; // default: 1_000_000
  maxDepth?: number; // default: 256
  onActivate?: (id: string) => void;
}

/**
 * Computed virtual window metrics.
 */
export interface VirtualWindow {
  start: number;
  end: number;
  offsetTop: number;
  totalHeight: number;
}

/**
 * Options for DOM renderer.
 */
export interface RenderTreeOptions {
  idPrefix?: string; // default: 'vt'
  label?: string;
  indentPx?: number; // default: 16
}

/**
 * Performance and allocation statistics for the renderer.
 */
export interface RenderTreeStats {
  rowsCreated: number;
  rowsUpdated: number;
}

/**
 * Renderer handle returned by renderTree.
 */
export interface TreeRenderer {
  update(scrollTop: number): void;
  destroy(): void;
  stats(): RenderTreeStats;
}
