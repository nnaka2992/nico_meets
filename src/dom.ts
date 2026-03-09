export function findChatContainer(doc: Document): Element | null {
  // Strategy 1: aria-live polite region with child messages
  const liveRegions = doc.querySelectorAll('[aria-live="polite"]');
  for (const region of liveRegions) {
    if (region.children.length > 0) {
      return region;
    }
  }

  // Strategy 2: parent of data-message-id elements
  const msgEl = doc.querySelector("[data-message-id]");
  if (msgEl?.parentElement) {
    return msgEl.parentElement;
  }

  return null;
}

export function extractText(element: Element): string {
  const children = Array.from(element.children);
  // Skip first child (sender name), concatenate rest
  return children
    .slice(1)
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}
