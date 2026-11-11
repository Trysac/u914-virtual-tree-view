# @trysac/virtual-tree-view

Virtualized tree view for 100,000+ nodes with the full WAI-ARIA tree keyboard pattern, `aria-activedescendant` focus, and recycled DOM rows.

## The Problem

File explorers and outline panes with tens of thousands of nodes freeze when every node becomes a DOM element, and virtualized lists usually break screen readers and the tree keyboard pattern. A tree needs a flattened visible model, a window of recycled rows, and the ARIA attributes that describe level and position even when most rows are not in the DOM.

## Installation

```bash
npm install @trysac/virtual-tree-view
```

## Usage

```typescript
import { TreeController, renderTree } from '@trysac/virtual-tree-view';

const controller = new TreeController([
  { id: '1', label: 'Documents', children: [{ id: '1.1', label: 'Report.pdf' }] },
], { rowHeight: 24, viewportHeight: 600 });
const renderer = renderTree(document.getElementById('tree')!, controller);
```

## API Summary

### `TreeController`
- `constructor(data: TreeNode[], opts: TreeControllerOptions)`: Initializes state. Throws `TreeError` for invalid opts, exceeding `maxNodes` (1,000,000) or `maxDepth` (256).
- `visibleIds(): string[]`: Returns current visible node IDs.
- `rowAt(index: number): Row`: Returns metadata for a visible row.
- `focusedId`, `selectedId`: Getters for current focus/selection.
- `expand(id)`, `collapse(id)`, `toggle(id)`, `expandAll()`: Modifies visibility state.
- `handleKey(key: string): boolean`: Processes ARIA keyboard interactions (Arrow, Home, End, Enter, Space, *, single-char typeahead).
- `window(scrollTop: number): VirtualWindow`: Computes viewport slice.
- `scrollTopFor(currentScrollTop: number): number`: Calculates scroll position to keep focused row in view.

### `renderTree`
- `renderTree(container, controller, opts?)`: Binds controller to DOM. Sets `role="tree"`, `tabindex="0"`, `aria-activedescendant`.

## Why not nested-DOM trees?

Nested DOM trees with tens of thousands of elements crash the browser and break ARIA hierarchy. This library uses a constant DOM size with correct `aria-level`, `aria-setsize`, and `aria-posinset` on flat rows, ensuring screen readers receive accurate metadata even when only a tiny window of rows is rendered.

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for limits and threat model.