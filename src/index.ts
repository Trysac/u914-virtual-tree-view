/**
 * @trysac/virtual-tree-view
 *
 * Enterprise-grade virtualized tree view for 100,000+ nodes with complete
 * WAI-ARIA APG keyboard navigation, aria-activedescendant focus, and recycled DOM rows.
 */

export { TreeController } from "./controller.js";
export { TreeError, type TreeErrorCode } from "./errors.js";
export { renderTree } from "./renderer.js";
export type {
  RenderTreeOptions,
  RenderTreeStats,
  Row,
  TreeControllerOptions,
  TreeNode,
  TreeRenderer,
  VirtualWindow,
} from "./types.js";
