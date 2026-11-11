# Project record: virtual-tree-view

## Objective

To provide a high-performance, virtualized tree view component capable of managing 100,000+ nodes. It is designed for developers building file explorers, outline panes, or hierarchical UI components who require full WAI-ARIA accessibility (keyboard navigation and screen reader support) without the performance overhead of traditional DOM trees.

## Scope

- Public API for controller and renderer.
- Virtual window math and row recycling logic.
- WAI-ARIA-compliant DOM structure and attribute management.
- Keyboard event handling as defined by the WAI-ARIA APG Tree View pattern.
- Robust error handling for tree structure constraints (nesting, node counts, duplicate IDs).

## Out of Scope

- Variable row heights (fixed height only).
- Multi-select capability.
- Drag-and-drop operations.
- Lazy async children loading.
- Horizontal virtualization.
- Specific framework bindings (React/Vue/Angular).

## Timeline

| Date | Milestone |
|---|---|
| 2026 | Repository created from the factory utility template. |

## Effort metrics

| Metric | Value | Source |
|---|---|---|
| Tokens (input / output) | 3125678 / 26676 | factory ledger |
| Hours (human) | pending measurement | time log |
| Cost (USD) | 0.9208 | factory ledger |

## Factory run u914 (measured from API usage)

| Phase | Model | Batch | Input | Output | Cache write | Cache read | Cost (USD) |
|---|---|---|---|---|---|---|---|
| generation | google/gemini-3.8-flash | yes | 6055 | 14311 | 0 | 0 | 0.0582 |
| fix-1 | google/gemini-3.8-flash | no | 285988 | 3677 | 0 | 758130 | 0.2851 |
| fix-2 | google/gemini-3.8-flash | no | 355180 | 5654 | 0 | 823944 | 0.3494 |
| fix-3 | google/gemini-3.8-flash | no | 210570 | 1244 | 0 | 322514 | 0.1868 |
| audit | google/gemini-3.1-flash-lite | no | 112148 | 274 | 0 | 232251 | 0.0343 |
| docs | google/gemini-3.1-flash-lite | no | 18898 | 1516 | 0 | 0 | 0.0070 |

Total: $0.9208. Prices: vertex line, as measured by its adapter.
