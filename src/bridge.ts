export type BridgeOptions = {
  host: string;
  port: number;
};

// nico_monitor rejects messages longer than 255 runes
const MAX_RUNES = 255;
// Cap dedup set to prevent unbounded growth in long sessions
const MAX_SEEN = 255;

// If value already exists, skip eviction — set.add is a no-op for
// existing entries, so evicting would shrink the set for no reason.
export function addBounded(set: Set<string>, value: string): void {
  if (set.has(value)) return;
  if (set.size >= MAX_SEEN) {
    // Set iterates in insertion order per ES2015 — first value is oldest
    const { value: first } = set.values().next();
    if (first !== undefined) set.delete(first);
  }
  set.add(value);
}

export class NicoMeetsBridge {
  private endpoint: string;
  private seenIds = new Set<string>();

  constructor(options: BridgeOptions) {
    this.endpoint = `http://${options.host}:${options.port}/comment`;
  }

  markSeen(id: string): void {
    addBounded(this.seenIds, id);
  }

  async send(id: string, text: string): Promise<void> {
    if (!text) return;
    if (this.seenIds.has(id)) return;
    addBounded(this.seenIds, id);

    const runes = [...text];
    const truncated =
      runes.length <= MAX_RUNES ? text : runes.slice(0, MAX_RUNES).join("");

    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: truncated }),
      });
      if (!res.ok) {
        console.warn(`[nico_meets] nico_monitor responded ${res.status}`);
      }
    } catch (e) {
      console.warn(
        "[nico_meets] Could not reach nico_monitor:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }
}
