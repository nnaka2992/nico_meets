export interface BridgeOptions {
  host: string;
  port: number;
}

const MAX_RUNES = 255;
const MAX_SEEN = 256;

export function addBounded(set: Set<string>, value: string): void {
  if (set.size >= MAX_SEEN) {
    const first = set.values().next().value!;
    set.delete(first);
  }
  set.add(value);
}

export class NicoMeetsBridge {
  private endpoint: string;
  private seen = new Set<string>();

  constructor(options: BridgeOptions) {
    this.endpoint = `http://${options.host}:${options.port}/comment`;
  }

  async send(text: string): Promise<void> {
    if (!text) return;
    if (this.seen.has(text)) return;
    addBounded(this.seen, text);

    const truncated = [...text].slice(0, MAX_RUNES).join("");

    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: truncated }),
      });
    } catch (e) {
      console.warn("[nico_meets] Could not reach nico_monitor:", e instanceof Error ? e.message : String(e));
    }
  }
}
