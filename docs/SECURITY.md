# Security practices

## Threat Model

### Defended
- **Memory/DoS Exhaustion**: Tree structures are validated against `maxNodes` (default 1,000,000) and `maxDepth` (default 256) during construction. This prevents stack overflows from deep recursion and OOM crashes from excessive node counts.
- **Input Sanitization**: Callers are restricted by `TreeControllerOptions` and `TreeNode` types. Invalid configurations (e.g., negative `rowHeight`, duplicate IDs) trigger synchronous `TreeError` exceptions to prevent undefined state.
- **Keyboard Hijacking**: The library uses `event.preventDefault()` specifically for handled tree navigation keys, ensuring that unhandled keys do not incorrectly suppress default browser behavior.

### Not Defended
- **DOM Injection**: If raw strings passed into the `TreeNode.label` contain malicious content, the `renderTree` function applies them directly to `textContent`. This is safe against HTML injection (as it is not `innerHTML`), but consumers should sanitize labels if they are sourced from untrusted remote APIs.
