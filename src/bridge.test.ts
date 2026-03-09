import { beforeEach, describe, expect, it, vi } from "vitest";
import { addBounded, NicoMeetsBridge } from "./bridge";

describe("NicoMeetsBridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("send", () => {
    it("POSTs text to the configured endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("msg-1", "hello");

      expect(fetchMock).toHaveBeenCalledWith("http://localhost:29292/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      });
    });

    it("truncates text longer than 255 characters", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      const longText = "あ".repeat(300);
      await bridge.send("msg-1", longText);

      const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect([...sentBody.text].length).toBe(255);
    });

    it("does not send empty text", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("msg-1", "");

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("deduplicates by message ID", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("msg-1", "hello");
      await bridge.send("msg-1", "hello");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("deduplicates short numeric ID and full-path ID", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("1773035015853231", "test");
      await bridge.send("spaces/4BEMZ/messages/1773035015853231", "test");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("sends identical text with different IDs", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("msg-1", "test");
      await bridge.send("msg-2", "test");
      await bridge.send("msg-3", "test");

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("warns on fetch failure without throwing", async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValue(new Error("connection refused"));
      vi.stubGlobal("fetch", fetchMock);
      const warnMock = vi.spyOn(console, "warn").mockImplementation(() => {});

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      await bridge.send("msg-1", "hello");

      expect(warnMock).toHaveBeenCalled();
    });

    it("does not send pre-marked IDs", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      bridge.markSeen("msg-1");
      await bridge.send("msg-1", "hello");

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("markSeen normalizes full-path IDs", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const bridge = new NicoMeetsBridge({ host: "localhost", port: 29292 });
      bridge.markSeen("spaces/X/messages/123");
      await bridge.send("123", "hello");

      expect(fetchMock).not.toHaveBeenCalled();
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
