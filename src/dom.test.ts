import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { extractText, findChatContainer, MESSAGE_SELECTOR } from "./dom";

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
    it("extracts text from real Meet message structure", () => {
      const dom = new JSDOM(`
        <div class="RLrADb" data-message-id="spaces/abc/messages/123">
          <div class="jO4O1">
            <div class="ptNLrf">
              <div jsname="dTKtvb"><div>Hello everyone</div></div>
              <div class="UaaITe">tooltip</div>
              <div class="Sd72u"><button>pin</button></div>
            </div>
          </div>
        </div>
      `);
      document = dom.window.document;

      const msgEl = document.querySelector("[data-message-id]") as Element;
      const text = extractText(msgEl);
      expect(text).toBe("Hello everyone");
    });

    it("extracts multiline message text", () => {
      const dom = new JSDOM(`
        <div class="RLrADb" data-message-id="spaces/abc/messages/456">
          <div class="jO4O1">
            <div class="ptNLrf">
              <div jsname="dTKtvb"><div>Line one</div><div>Line two</div></div>
              <div class="Sd72u"><button>pin</button></div>
            </div>
          </div>
        </div>
      `);
      document = dom.window.document;

      const msgEl = document.querySelector("[data-message-id]") as Element;
      const text = extractText(msgEl);
      expect(text).toBe("Line one Line two");
    });

    it("does not match pin button as a message element", () => {
      const dom = new JSDOM(`
        <div aria-live="polite">
          <div class="RLrADb" data-message-id="spaces/abc/messages/123">
            <div class="jO4O1"><div class="ptNLrf">
              <div jsname="dTKtvb"><div>test</div></div>
              <div class="Sd72u"><span data-is-tooltip-wrapper="true">
                <button data-message-id="spaces/abc/messages/123">pin</button>
              </span></div>
            </div></div>
          </div>
        </div>
      `);
      document = dom.window.document;

      const container = findChatContainer(document) as Element;
      const messages = container.querySelectorAll(MESSAGE_SELECTOR);
      expect(messages.length).toBe(1);
    });

    it("returns empty string when no dTKtvb element found", () => {
      const dom = new JSDOM(`
        <div class="RLrADb" data-message-id="spaces/abc/messages/789">
          <div class="jO4O1">
            <div class="ptNLrf">
              <div class="Sd72u"><button>pin</button></div>
            </div>
          </div>
        </div>
      `);
      document = dom.window.document;

      const msgEl = document.querySelector("[data-message-id]") as Element;
      const text = extractText(msgEl);
      expect(text).toBe("");
    });
  });
});
