# Testing

## Suites

- `test/index.test.ts`: Covers core acceptance criteria, including navigation, ARIA attributes, keyboard interaction, window calculations, work-bound performance verification, and error handling.
- `test/conformance.conformance.test.ts`: CI-only suite using `axe-core` and `playwright` to ensure the rendered output complies with WCAG 2.0 A/AA standards.

## Coverage

- Maintained at >80% via `vitest`.
- Tests are deterministic, relying on `jsdom` for DOM manipulation and simulated event dispatching.

## Rules

- Each bug fix must be accompanied by a regression test in `test/index.test.ts`.
- Conformance tests check DOM nodes directly after simulated scroll and interaction cycles.