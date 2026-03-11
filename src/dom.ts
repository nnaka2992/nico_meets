// "div" prefix excludes pin buttons (<button data-message-id="...">) that
// Meet renders inside each message element with the same ID.
export const MESSAGE_SELECTOR = "div[data-message-id]";

export function findChatContainer(doc: Document): Element | null {
  // Strategy 1: aria-live polite region containing chat messages
  // Meet has multiple aria-live regions (toasts, participant list, etc.),
  // so we require a [data-message-id] child to avoid matching the wrong one.
  const liveRegions = doc.querySelectorAll('[aria-live="polite"]');
  for (const region of liveRegions) {
    if (region.querySelector(MESSAGE_SELECTOR)) {
      return region;
    }
  }

  // Strategy 2: parent of data-message-id elements
  const msgEl = doc.querySelector(MESSAGE_SELECTOR);
  if (msgEl?.parentElement) {
    return msgEl.parentElement;
  }

  return null;
}

// Meet renders messages in two phases: first with a short optimistic numeric
// ID (e.g. "1773204291724"), then replaces the element with a server-confirmed
// ID (e.g. "spaces/XskKQZXdF6cB/messages/1773204322789583"). The two IDs are
// completely unrelated, so we skip optimistic renders and only forward
// server-confirmed messages.
export function isConfirmedMessage(id: string): boolean {
  return id.startsWith("spaces/");
}

export function extractText(element: Element): string {
  // Meet messages: text lives inside [jsname="dTKtvb"] > div children
  const textContainer = element.querySelector('[jsname="dTKtvb"]');
  if (!textContainer) return "";

  return Array.from(textContainer.children)
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}
