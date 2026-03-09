export const MESSAGE_SELECTOR = "div[data-message-id]";

export function findChatContainer(doc: Document): Element | null {
  // Strategy 1: aria-live polite region with child messages
  const liveRegions = doc.querySelectorAll('[aria-live="polite"]');
  for (const region of liveRegions) {
    if (region.children.length > 0) {
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

export function extractText(element: Element): string {
  // Meet messages: text lives inside [jsname="dTKtvb"] > div children
  const textContainer = element.querySelector('[jsname="dTKtvb"]');
  if (!textContainer) return "";

  return Array.from(textContainer.children)
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}
