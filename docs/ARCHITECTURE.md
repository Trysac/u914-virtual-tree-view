# Architecture

`@trysac/virtual-tree-view` decouples the hierarchical tree data structure from virtual window math and DOM rendering.

## Data Model & Indexing

- Input tree nodes are walked iteratively with an explicit stack to prevent stack overflow on deep trees.
- Node depths, sibling sets (`setSize`, `posInSet`), parent relationships, and pre-order ordinals are cached in flat internal arrays.
- The active visible list is represented as an array of ordinals. Expanding or collapsing a node performs array splicing of pre-order subtree indices.

## Virtualization & Window Math

- Total scrollable height is `visibleCount * rowHeight`.
- Visible index slice is computed from clamped `scrollTop` with overscan margins.
- Row recycling: The DOM renderer keeps a pool of `ceil(viewportHeight / rowHeight) + 2 * overscan` elements positioned using CSS `transform: translateY(...)`.
- Sub-millisecond scroll updates ensure deterministic work bounds and steady 60 fps rendering.

## Accessibility (WAI-ARIA APG)

- Container has `role="tree"` with `tabindex="0"`.
- Container tracks current focus with `aria-activedescendant` pointing to the row's DOM element ID.
- Rendered rows receive `role="treeitem"`, `aria-level`, `aria-setsize`, `aria-posinset`, and `aria-expanded` (for nodes with children).
