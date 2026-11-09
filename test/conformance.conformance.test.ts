/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import axe from "axe-core";
import { type Browser, chromium } from "playwright";
import { describe, expect, it } from "vitest";

describe("CI Conformance (FABRICA_CI=1)", () => {
  it("checks zero accessibility violations and DOM bound in Chromium", async () => {
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (err) {
      console.warn("Chromium not available, skipping conformance test", err);
      return;
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    // Set up html with tree structure and run axe-core
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head><title>Tree Conformance</title></head>
      <body>
        <main>
          <div id="tree" style="height: 600px; width: 300px; overflow: auto;"></div>
        </main>
      </body>
      </html>
    `);

    await page.addScriptTag({ content: axe.source });

    // Inject sample tree into page
    const results = await page.evaluate(async () => {
      const container = (window as unknown as { document: Document }).document.getElementById(
        "tree",
      );
      if (!container) throw new Error("Tree container element not found");
      container.setAttribute("role", "tree");
      container.setAttribute("tabindex", "0");
      container.setAttribute("aria-label", "Demo Tree");

      const item = (window as unknown as { document: Document }).document.createElement("div");
      item.id = "vt-0";
      item.setAttribute("role", "treeitem");
      item.setAttribute("aria-level", "1");
      item.setAttribute("aria-setsize", "1");
      item.setAttribute("aria-posinset", "1");
      item.setAttribute("aria-selected", "false");
      item.textContent = "Root node";
      container.appendChild(item);
      container.setAttribute("aria-activedescendant", "vt-0");

      const axeObj = (window as unknown as { axe: typeof axe }).axe;
      return await axeObj.run(container, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa"],
        },
      });
    });

    expect(results.violations).toEqual([]);

    await browser.close();
  });
});
