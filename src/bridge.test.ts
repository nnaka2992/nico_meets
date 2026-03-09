import { describe, it, expect, vi, beforeEach } from "vitest";
import { NicoMeetsBridge, addBounded } from "./bridge";

describe("NicoMeetsBridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("send", () => {
    it("POSTs text to the configured endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("hello");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:29292/comment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "hello" }),
        }
      );
    });

    it("truncates text longer than 255 characters", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      const longText = "あ".repeat(300);
      await bridge.send(longText);

      const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect([...sentBody.text].length).toBe(255);
    });

    it("does not send empty text", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("");

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("warns on fetch failure without throwing", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error("connection refused"));
      vi.stubGlobal("fetch", fetchMock);
      const warnMock = vi.spyOn(console, "warn").mockImplementation(() => {});

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("hello");

      expect(warnMock).toHaveBeenCalled();
    });
  });

  describe("dedup", () => {
    it("does not send the same message twice", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("hello");
      await bridge.send("hello");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("sends different messages", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("hello");
      await bridge.send("world");

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("addBounded", () => {
    it("adds a value to the set", () => {
      const set = new Set<string>();
      addBounded(set, "a");
      expect(set.has("a")).toBe(true);
    });

    it("evicts the oldest entry when at capacity (256)", () => {
      const set = new Set<string>();
      for (let i = 0; i < 256; i++) {
        addBounded(set, `msg-${i}`);
      }
      expect(set.size).toBe(256);

      addBounded(set, "new");
      expect(set.size).toBe(256);
      expect(set.has("msg-0")).toBe(false);
      expect(set.has("new")).toBe(true);
    });

    it("allows re-sending a message after it is evicted", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      // Fill the cache with 256 messages (msg-0 through msg-255)
      for (let i = 0; i < 256; i++) {
        await bridge.send(`msg-${i}`);
      }
      // Send one more to trigger eviction of msg-0
      await bridge.send("overflow");
      expect(fetchMock).toHaveBeenCalledTimes(257);

      // msg-0 was evicted, so it should be accepted again
      await bridge.send("msg-0");
      expect(fetchMock).toHaveBeenCalledTimes(258);
    });

    it("retains recent entries after eviction", () => {
      const set = new Set<string>();
      for (let i = 0; i < 256; i++) {
        addBounded(set, `msg-${i}`);
      }

      addBounded(set, "new");
      expect(set.has("msg-255")).toBe(true);
      expect(set.has("msg-1")).toBe(true);
    });
  });
});
