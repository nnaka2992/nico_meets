import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { extractText, findChatContainer } from "./dom";

describe("DOM helpers", () => {
  let document: Document;

  describe("findChatContainer", () => {
    it("finds container by aria-live polite", () => {
      const dom = new JSDOM(`
        <div>
          <div aria-live="polite">
            <div data-message-id="1">message</div>
          </div>
        </div>
      `);
      document = dom.window.document;

      const container = findChatContainer(document);
      expect(container).not.toBeNull();
      expect(container?.getAttribute("aria-live")).toBe("polite");
    });

    it("finds container by data-message-id parent", () => {
      const dom = new JSDOM(`
        <div>
          <div class="chat-list">
            <div data-message-id="1">message</div>
          </div>
        </div>
      `);
      document = dom.window.document;

      const container = findChatContainer(document);
      expect(container).not.toBeNull();
    });

    it("returns null when no chat container found", () => {
      const dom = new JSDOM(`<div><p>no chat here</p></div>`);
      document = dom.window.document;

      const container = findChatContainer(document);
      expect(container).toBeNull();
    });
  });

  describe("extractText", () => {
    it("extracts message text skipping sender name", () => {
      const dom = new JSDOM(`
        <div data-message-id="1">
          <div class="sender">Alice</div>
          <div class="body">Hello everyone</div>
        </div>
      `);
      document = dom.window.document;

      const msgEl = document.querySelector("[data-message-id]") as Element;
      const text = extractText(msgEl);
      expect(text).toBe("Hello everyone");
    });

    it("extracts text from message with multiple body elements", () => {
      const dom = new JSDOM(`
        <div data-message-id="2">
          <div class="sender">Bob</div>
          <div class="body">Line one</div>
          <div class="body">Line two</div>
        </div>
      `);
      document = dom.window.document;

      const msgEl = document.querySelector("[data-message-id]") as Element;
      const text = extractText(msgEl);
      expect(text).toBe("Line one Line two");
    });

    it("returns empty string for element with only sender", () => {
      const dom = new JSDOM(`
        <div data-message-id="3">
          <div class="sender">Charlie</div>
        </div>
      `);
      document = dom.window.document;

      const msgEl = document.querySelector("[data-message-id]") as Element;
      const text = extractText(msgEl);
      expect(text).toBe("");
    });
  });
});
