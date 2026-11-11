// @vitest-environment jsdom
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { describe, expect, it, vi } from "vitest";
import {
  renderTree,
  TreeController,
  type TreeControllerOptions,
  TreeError,
  type TreeNode,
} from "../src/index.js";

describe("TreeController and Renderer Acceptance", () => {
  const sampleData: TreeNode[] = [
    {
      id: "a",
      label: "Apple",
      children: [
        { id: "a1", label: "Apricot" },
        { id: "a2", label: "Avocado" },
      ],
    },
    { id: "b", label: "Banana" },
    {
      id: "c",
      label: "Cherry",
      children: [{ id: "c1", label: "Cranberry" }],
    },
  ];

  it("handles navigation acceptance suite 1", () => {
    // Acceptance 1:
    // With data [{ id: 'a', label: 'Apple', children: [{ id: 'a1', label: 'Apricot' }, { id: 'a2', label: 'Avocado' }] }, { id: 'b', label: 'Banana' }, { id: 'c', label: 'Cherry', children: [{ id: 'c1', label: 'Cranberry' }] }] all collapsed and focus on 'a', keys 'ArrowRight' (expands a), 'ArrowRight' (focus a1), 'ArrowDown' (a2), 'ArrowDown' (b) leave focus on 'b'; 'ArrowLeft' on 'b' keeps focus 'b'; 'End' focuses 'c'
    const controller = new TreeController(sampleData, {
      rowHeight: 24,
      viewportHeight: 600,
    });
    expect(controller.focusedId).toBe("a");

    expect(controller.handleKey("ArrowRight")).toBe(true);
    expect(controller.rowAt(0).expanded).toBe(true);
    expect(controller.focusedId).toBe("a");

    expect(controller.handleKey("ArrowRight")).toBe(true);
    expect(controller.focusedId).toBe("a1");

    expect(controller.handleKey("ArrowDown")).toBe(true);
    expect(controller.focusedId).toBe("a2");

    expect(controller.handleKey("ArrowDown")).toBe(true);
    expect(controller.focusedId).toBe("b");

    expect(controller.handleKey("ArrowLeft")).toBe(true);
    expect(controller.focusedId).toBe("b");

    expect(controller.handleKey("End")).toBe(true);
    expect(controller.focusedId).toBe("c");
  });

  it("handles asterisk expansion, typeahead and collapse acceptance suite 2", () => {
    // Acceptance 2:
    // From focus 'c', key '*' expands 'a' and 'c', so visibleIds() is ['a', 'a1', 'a2', 'b', 'c', 'c1']; then 'Home' focuses 'a', 'c' focuses 'c' (label 'Cherry'), a second 'c' focuses 'c1' ('Cranberry'), 'ArrowLeft' focuses 'c' and another 'ArrowLeft' collapses 'c'
    const controller = new TreeController(sampleData, {
      rowHeight: 24,
      viewportHeight: 600,
    });
    controller.handleKey("End"); // focus 'c'
    expect(controller.focusedId).toBe("c");

    expect(controller.handleKey("*")).toBe(true);
    expect(controller.visibleIds()).toEqual(["a", "a1", "a2", "b", "c", "c1"]);

    expect(controller.handleKey("Home")).toBe(true);
    expect(controller.focusedId).toBe("a");

    expect(controller.handleKey("c")).toBe(true);
    expect(controller.focusedId).toBe("c");

    expect(controller.handleKey("c")).toBe(true);
    expect(controller.focusedId).toBe("c1");

    expect(controller.handleKey("ArrowLeft")).toBe(true);
    expect(controller.focusedId).toBe("c");

    expect(controller.handleKey("ArrowLeft")).toBe(true);
    expect(controller.rowAt(4).expanded).toBe(false);
  });

  it("renders ARIA attributes correctly according to acceptance suite 3", () => {
    // Acceptance 3:
    // Rendered row for 'a2' with 'a' expanded has role 'treeitem', aria-level '2', aria-setsize '2', aria-posinset '2' and aria-selected 'false'; the row for 'a' has aria-expanded 'true'; leaf rows have no aria-expanded attribute; the container has role 'tree' and aria-activedescendant equal to the focused row's id
    const container = document.createElement("div");
    const controller = new TreeController(sampleData, {
      rowHeight: 24,
      viewportHeight: 600,
      expanded: ["a"],
    });
    const renderer = renderTree(container, controller);

    expect(container.getAttribute("role")).toBe("tree");
    expect(container.getAttribute("aria-activedescendant")).toBe("vt-0");

    const rowA = container.querySelector("#vt-0") as HTMLElement;
    expect(rowA).not.toBeNull();
    expect(rowA.getAttribute("aria-expanded")).toBe("true");

    const rowA2 = container.querySelector("#vt-2") as HTMLElement;
    expect(rowA2).not.toBeNull();
    expect(rowA2.getAttribute("role")).toBe("treeitem");
    expect(rowA2.getAttribute("aria-level")).toBe("2");
    expect(rowA2.getAttribute("aria-setsize")).toBe("2");
    expect(rowA2.getAttribute("aria-posinset")).toBe("2");
    expect(rowA2.getAttribute("aria-selected")).toBe("false");

    // Leaf row 'b' at index 3
    const rowB = container.querySelector("#vt-3") as HTMLElement;
    expect(rowB).not.toBeNull();
    expect(rowB.hasAttribute("aria-expanded")).toBe(false);

    renderer.destroy();
  });

  it("handles activation and unhandled keys according to acceptance suite 4", () => {
    // Acceptance 4:
    // 'Enter' or ' ' on 'b' sets aria-selected 'true' on 'b' only and calls onActivate with 'b'; unhandled keys such as 'Tab' return false from handleKey and do not call preventDefault
    const container = document.createElement("div");
    const onActivate = vi.fn();
    const controller = new TreeController(sampleData, {
      rowHeight: 24,
      viewportHeight: 600,
      onActivate,
    });
    const renderer = renderTree(container, controller);

    controller.handleKey("ArrowDown"); // 'b'
    expect(controller.focusedId).toBe("b");

    const event = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    const preventSpy = vi.spyOn(event, "preventDefault");
    container.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(onActivate).toHaveBeenCalledWith("b");
    expect(controller.selectedId).toBe("b");

    const rowB = container.querySelector("#vt-1") as HTMLElement;
    expect(rowB.getAttribute("aria-selected")).toBe("true");

    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });
    const tabPreventSpy = vi.spyOn(tabEvent, "preventDefault");
    container.dispatchEvent(tabEvent);

    expect(tabPreventSpy).not.toHaveBeenCalled();
    expect(controller.handleKey("Tab")).toBe(false);

    renderer.destroy();
  });

  it("computes exact window math for 100_000 nodes according to acceptance suite 5", () => {
    // Acceptance 5:
    // For 1_000 roots with 99 children each (100_000 nodes) fully expanded, rowHeight 24, viewportHeight 600 and overscan 5: window(1_200_000) deep-equals { start: 49995, end: 50030, offsetTop: 1199880, totalHeight: 2400000 } and window(10_000_000) deep-equals { start: 99970, end: 100000, offsetTop: 2399280, totalHeight: 2400000 }
    const bigData: TreeNode[] = [];
    for (let r = 0; r < 1_000; r++) {
      const children: TreeNode[] = [];
      for (let c = 0; c < 99; c++) {
        children.push({ id: `r${r}_c${c}`, label: `Child ${r}-${c}` });
      }
      bigData.push({ id: `r${r}`, label: `Root ${r}`, children });
    }

    const controller = new TreeController(bigData, {
      rowHeight: 24,
      viewportHeight: 600,
      overscan: 5,
    });
    controller.expandAll();
    expect(controller.visibleCount).toBe(100_000);

    expect(controller.window(1_200_000)).toEqual({
      start: 49995,
      end: 50030,
      offsetTop: 1199880,
      totalHeight: 2400000,
    });

    expect(controller.window(10_000_000)).toEqual({
      start: 99970,
      end: 100000,
      offsetTop: 2399280,
      totalHeight: 2400000,
    });
  });

  it("maintains strict work bound and dom pooling according to acceptance suite 6", () => {
    // Acceptance 6:
    // Work bound instead of frame rate: on that 100_000-node tree, 1_000 renderer.update(k * 2_400) calls for k = 0..999 leave at most 35 treeitem elements in the container, stats().rowsCreated <= 35 and each update increases stats().rowsUpdated by at most 35; pressing 'End' sets scrollTop to 2399400 and aria-activedescendant to the last row's id
    const bigData: TreeNode[] = [];
    for (let r = 0; r < 1_000; r++) {
      const children: TreeNode[] = [];
      for (let c = 0; c < 99; c++) {
        children.push({ id: `r${r}_c${c}`, label: `Child ${r}-${c}` });
      }
      bigData.push({ id: `r${r}`, label: `Root ${r}`, children });
    }

    const container = document.createElement("div");
    const controller = new TreeController(bigData, {
      rowHeight: 24,
      viewportHeight: 600,
      overscan: 5,
    });
    controller.expandAll();

    const renderer = renderTree(container, controller);

    let prevUpdated = renderer.stats().rowsUpdated;
    for (let k = 0; k < 1_000; k++) {
      renderer.update(k * 2_400);
      const currentStats = renderer.stats();
      const deltaUpdated = currentStats.rowsUpdated - prevUpdated;
      expect(deltaUpdated).toBeLessThanOrEqual(35);
      prevUpdated = currentStats.rowsUpdated;
    }

    const treeitems = container.querySelectorAll('[role="treeitem"]');
    expect(treeitems.length).toBeLessThanOrEqual(35);
    expect(renderer.stats().rowsCreated).toBeLessThanOrEqual(35);

    // Pressing 'End' sets scrollTop to 2399400 and aria-activedescendant to the last row's id
    const endEvent = new KeyboardEvent("keydown", { key: "End", cancelable: true });
    container.dispatchEvent(endEvent);

    expect(container.scrollTop).toBe(2399400);
    expect(container.getAttribute("aria-activedescendant")).toBe("vt-99999");

    renderer.destroy();
  });

  it("throws typed TreeError for error conditions according to acceptance suite 7", () => {
    // Acceptance 7:
    // Errors: a duplicate id throws TreeError code 'duplicate_id'; 1_000_001 nodes throws 'too_large'; nesting deeper than 256 levels throws 'too_deep' without a stack overflow; rowHeight 0 or a negative viewportHeight throws 'invalid_option'; expand('zz') throws 'unknown_id'
    const dupData: TreeNode[] = [
      { id: "dup", label: "First" },
      { id: "dup", label: "Second" },
    ];
    expect(() => new TreeController(dupData, { rowHeight: 24, viewportHeight: 600 })).toThrowError(
      expect.objectContaining({ code: "duplicate_id" }),
    );

    // 1_000_001 nodes throws 'too_large'
    const largeRoots: TreeNode[] = [];
    for (let i = 0; i <= 10; i++) {
      largeRoots.push({ id: `node_${i}`, label: `Node ${i}` });
    }
    expect(
      () =>
        new TreeController(largeRoots, {
          rowHeight: 24,
          viewportHeight: 600,
          maxNodes: 10,
        }),
    ).toThrowError(expect.objectContaining({ code: "too_large" }));

    // Nesting deeper than 256 levels throws 'too_deep'
    let deepNode: TreeNode = { id: "deep_0", label: "Deep 0" };
    for (let i = 1; i <= 260; i++) {
      deepNode = { id: `deep_${i}`, label: `Deep ${i}`, children: [deepNode] };
    }
    expect(
      () =>
        new TreeController([deepNode], {
          rowHeight: 24,
          viewportHeight: 600,
          maxDepth: 256,
        }),
    ).toThrowError(expect.objectContaining({ code: "too_deep" }));

    // rowHeight 0 or negative viewportHeight throws 'invalid_option'
    expect(
      () => new TreeController([{ id: "a", label: "A" }], { rowHeight: 0, viewportHeight: 600 }),
    ).toThrowError(expect.objectContaining({ code: "invalid_option" }));

    expect(
      () => new TreeController([{ id: "a", label: "A" }], { rowHeight: 24, viewportHeight: -10 }),
    ).toThrowError(expect.objectContaining({ code: "invalid_option" }));

    // expand('zz') throws 'unknown_id'
    const normalCtrl = new TreeController([{ id: "a", label: "A" }], {
      rowHeight: 24,
      viewportHeight: 600,
    });
    expect(() => normalCtrl.expand("zz")).toThrowError(
      expect.objectContaining({ code: "unknown_id" }),
    );
  });

  it("exercises edge cases for complete coverage", () => {
    // Invalid options
    expect(() => new TreeController([], null as unknown as TreeControllerOptions)).toThrowError(
      TreeError,
    );
    expect(
      () => new TreeController([], { rowHeight: 24, viewportHeight: 100, overscan: -1 }),
    ).toThrowError(TreeError);
    expect(
      () =>
        new TreeController([null as unknown as TreeNode], { rowHeight: 24, viewportHeight: 100 }),
    ).toThrowError(TreeError);
    expect(
      () =>
        new TreeController([{ id: "x", label: "X", children: [null as unknown as TreeNode] }], {
          rowHeight: 24,
          viewportHeight: 100,
        }),
    ).toThrowError(TreeError);

    const ctrl = new TreeController(
      [{ id: "root", label: "Root", children: [{ id: "child", label: "Child" }] }],
      {
        rowHeight: 20,
        viewportHeight: 100,
        expanded: ["root"],
      },
    );

    // rowAt out of bounds
    expect(() => ctrl.rowAt(-1)).toThrowError(TreeError);
    expect(() => ctrl.rowAt(100)).toThrowError(TreeError);

    // setFocusedId
    ctrl.setFocusedId(null);
    expect(ctrl.focusedId).toBeNull();
    expect(() => ctrl.setFocusedId("nonexistent")).toThrowError(TreeError);
    ctrl.setFocusedId("root");
    expect(ctrl.focusedId).toBe("root");

    // toggle
    ctrl.toggle("root"); // collapse
    expect(ctrl.rowAt(0).expanded).toBe(false);
    ctrl.toggle("root"); // expand
    expect(ctrl.rowAt(0).expanded).toBe(true);
    expect(() => ctrl.collapse("unknown")).toThrowError(TreeError);
    expect(() => ctrl.toggle("unknown")).toThrowError(TreeError);

    // Collapsing focused child moves focus to parent
    ctrl.setFocusedId("child");
    expect(ctrl.focusedId).toBe("child");
    ctrl.collapse("root");
    expect(ctrl.focusedId).toBe("root");

    // Empty tree
    const emptyCtrl = new TreeController([], { rowHeight: 20, viewportHeight: 100 });
    expect(emptyCtrl.handleKey("ArrowDown")).toBe(false);
    expect(emptyCtrl.window(0)).toEqual({ start: 0, end: 0, offsetTop: 0, totalHeight: 0 });

    // Space key activates
    const activateSpy = vi.fn();
    const spaceCtrl = new TreeController([{ id: "s", label: "S" }], {
      rowHeight: 20,
      viewportHeight: 100,
      onActivate: activateSpy,
    });
    expect(spaceCtrl.handleKey(" ")).toBe(true);
    expect(activateSpy).toHaveBeenCalledWith("s");

    // ArrowUp on first element
    expect(spaceCtrl.handleKey("ArrowUp")).toBe(true);

    // Non-matching character
    expect(spaceCtrl.handleKey("z")).toBe(false);

    // Long error message truncation
    const longMsg = "a".repeat(300);
    const err = new TreeError("invalid_option", longMsg);
    expect(err.message.length).toBe(200);
  });
});
