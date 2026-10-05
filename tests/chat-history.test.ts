import { describe, expect, it } from "vitest";
import { chatGroup, chatTitle, MAX_CHATS, removeChat, upsertChat, type SavedLine } from "@/lib/chat-history";

const q = (text: string): SavedLine => ({ role: "user", text });
const a = (text: string): SavedLine => ({ role: "saath", text });

describe("chat history", () => {
  it("names a chat after its first question, without the attachment line", () => {
    expect(chatTitle([q("What is a premium?\n📎 Policy.pdf"), a("It is…")])).toBe("What is a premium?");
    expect(chatTitle([q("x".repeat(80))]).length).toBeLessThanOrEqual(58);
  });

  it("moves an updated chat to the top and replaces its old copy", () => {
    let list = upsertChat([], "a", [q("one")], "2026-10-01T10:00:00Z");
    list = upsertChat(list, "b", [q("two")], "2026-10-02T10:00:00Z");
    list = upsertChat(list, "a", [q("one"), a("ans")], "2026-10-03T10:00:00Z");
    expect(list.map((chat) => chat.id)).toEqual(["a", "b"]);
    expect(list[0].lines).toHaveLength(2);
  });

  it("does not keep empty chats or failed-answer lines, and caps the list", () => {
    expect(upsertChat([], "a", [], "2026-10-01T10:00:00Z")).toEqual([]);
    const withRetry = upsertChat([], "a", [q("hi"), { role: "saath", text: "offline", retry: "hi" }], "2026-10-01T10:00:00Z");
    expect(withRetry[0].lines).toHaveLength(1);
    let list = upsertChat([], "x0", [q("0")], "2026-10-01T10:00:00Z");
    for (let i = 1; i < MAX_CHATS + 5; i++) list = upsertChat(list, `x${i}`, [q(String(i))], "2026-10-01T10:00:00Z");
    expect(list).toHaveLength(MAX_CHATS);
    expect(removeChat(list, list[0].id)).toHaveLength(MAX_CHATS - 1);
  });

  it("groups chats by day", () => {
    const now = new Date(2026, 9, 5, 12);
    expect(chatGroup(new Date(2026, 9, 5, 8).toISOString(), now)).toBe("today");
    expect(chatGroup(new Date(2026, 9, 4, 23).toISOString(), now)).toBe("yesterday");
    expect(chatGroup(new Date(2026, 9, 1).toISOString(), now)).toBe("week");
    expect(chatGroup(new Date(2026, 8, 1).toISOString(), now)).toBe("older");
  });
});
