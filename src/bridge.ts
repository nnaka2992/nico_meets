export interface BridgeOptions {
  host: string;
  port: number;
}

const MAX_RUNES = 255;
const MAX_SEEN = 256;

export function addBounded(set: Set<string>, value: string): void {
  if (set.size >= MAX_SEEN) {
    const { value: first } = set.values().next();
    if (first !== undefined) set.delete(first);
  }
  set.add(value);
}

// Meet assigns IDs in two phases: first a short numeric ID on optimistic
// render (e.g. "1773035015853231"), then the full path once the server
// confirms (e.g. "spaces/4BEMZ.../messages/1773035015853231"). Both appear
// as separate MutationObserver additions, so we normalize to the trailing
// segment for dedup.
function normalizeId(id: string): string {
  const slash = id.lastIndexOf("/");
  return slash === -1 ? id : id.slice(slash + 1);
}

export class NicoMeetsBridge {
  private endpoint: string;
  private seenIds = new Set<string>();

  constructor(options: BridgeOptions) {
    this.endpoint = `http://${options.host}:${options.port}/comment`;
  }

  markSeen(id: string): void {
    addBounded(this.seenIds, normalizeId(id));
  }

  async send(id: string, text: string): Promise<void> {
    if (!text) return;
    const key = normalizeId(id);
    if (this.seenIds.has(key)) return;
    addBounded(this.seenIds, key);

    const runes = [...text];
    const truncated =
      runes.length <= MAX_RUNES ? text : runes.slice(0, MAX_RUNES).join("");

    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: truncated }),
      });
    } catch (e) {
      console.warn(
        "[nico_meets] Could not reach nico_monitor:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }
}
