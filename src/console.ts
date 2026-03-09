import { NicoMeetsBridge } from "./bridge";
import { extractText, findChatContainer, MESSAGE_SELECTOR } from "./dom";

declare global {
  interface Window {
    __nicoMeets?: { stop: () => void };
  }
}

// ---- Configuration (edit before pasting) ----
const NICO_MEETS_HOST = "localhost";
const NICO_MEETS_PORT = 29292;
// ---------------------------------------------

(() => {
  if (window.__nicoMeets) {
    console.warn("[nico_meets] Already running. Use __nicoMeets.stop() first.");
    return;
  }

  const bridge = new NicoMeetsBridge({
    host: NICO_MEETS_HOST,
    port: NICO_MEETS_PORT,
  });

  let observer: MutationObserver | null = null;

  function start() {
    const container = findChatContainer(document);
    if (!container) {
      console.warn(
        "[nico_meets] Chat panel not found. Open the chat first, then run again.",
      );
      return;
    }

    // Snapshot existing message IDs so we only forward new ones
    const existing = container.querySelectorAll(MESSAGE_SELECTOR);
    for (const msg of existing) {
      const id = msg.getAttribute("data-message-id");
      if (id) bridge.markSeen(id);
    }

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;

          const messages = node.matches(MESSAGE_SELECTOR)
            ? [node]
            : Array.from(node.querySelectorAll(MESSAGE_SELECTOR));

          for (const msg of messages) {
            const id = msg.getAttribute("data-message-id");
            if (!id) continue;

            const text = extractText(msg);
            if (text) bridge.send(id, text);
          }
        }
      }
    });

    observer.observe(container, { childList: true, subtree: true });
    console.log(
      `[nico_meets] Started. Watching for new chat messages. Sending to http://${NICO_MEETS_HOST}:${NICO_MEETS_PORT}/comment`,
    );
  }

  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    window.__nicoMeets = undefined;
    console.log("[nico_meets] Stopped.");
  }

  window.__nicoMeets = { stop };
  start();
})();
