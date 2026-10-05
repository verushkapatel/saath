/**
 * Past Saath AI conversations, kept on this device only (and only while "remember chat" is on). Each chat keeps its
 * own lines; the list is newest first and capped so storage stays small.
 */
export type SavedLine = { role: "user" | "saath"; text: string; retry?: string };
export type SavedChat<L extends SavedLine = SavedLine> = { id: string; title: string; at: string; lines: L[] };

export const HISTORY_KEY = "ai-chats";
export const CURRENT_ID_KEY = "ai-chat-id";
export const MAX_CHATS = 30;
export const MAX_LINES = 40;

export const newChatId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The chat's name in the list: its first question, without the attachment line, cut to a readable length. */
export function chatTitle(lines: SavedLine[]): string {
  const first = lines.find((line) => line.role === "user")?.text ?? "";
  const clean = first.split("\n")[0].replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 57).trimEnd()}…` : clean;
}

/** Puts this chat at the top of the list (replacing its older copy). Empty chats are not kept. */
export function upsertChat<L extends SavedLine>(list: SavedChat<L>[], id: string, lines: L[], at: string): SavedChat<L>[] {
  const kept = lines.filter((line) => !line.retry).slice(-MAX_LINES);
  const rest = list.filter((chat) => chat.id !== id);
  if (!kept.some((line) => line.role === "user")) return rest;
  return [{ id, title: chatTitle(kept), at, lines: kept }, ...rest].slice(0, MAX_CHATS);
}

export function removeChat<L extends SavedLine>(list: SavedChat<L>[], id: string): SavedChat<L>[] {
  return list.filter((chat) => chat.id !== id);
}

/** Groups for the list: today, yesterday, this week, older. */
export function chatGroup(at: string, now: Date): "today" | "yesterday" | "week" | "older" {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(now) - day(new Date(at))) / 86_400_000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 7) return "week";
  return "older";
}
