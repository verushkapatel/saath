/**
 * Everything Saath needs from an account service.
 * The app talks only to this interface, so Supabase can be swapped without touching a screen.
 */

export type SyncUser = { id: string; email: string | null; name: string | null };

/** One locked row per user. The server never sees what is inside `data`. */
export type VaultRow = { salt: string; iv: string; data: string; updatedAt: string };

export interface SyncProvider {
  /** False when no keys are set. The app then stays local-only. */
  readonly available: boolean;
  getUser(): Promise<SyncUser | null>;
  onUser(listener: (user: SyncUser | null) => void): () => void;
  signInWithEmail(email: string, redirectTo: string): Promise<boolean>;
  signInWithGoogle(redirectTo: string): Promise<boolean>;
  signOut(): Promise<void>;
  pull(): Promise<VaultRow | null>;
  push(row: Omit<VaultRow, "updatedAt">): Promise<boolean>;
  /** Removes the vault row and the account itself. */
  deleteAccount(): Promise<boolean>;
}

export const localOnly: SyncProvider = {
  available: false,
  getUser: async () => null,
  onUser: () => () => undefined,
  signInWithEmail: async () => false,
  signInWithGoogle: async () => false,
  signOut: async () => undefined,
  pull: async () => null,
  push: async () => false,
  deleteAccount: async () => false,
};

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SYNC_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

let loading: Promise<SyncProvider> | null = null;

/** Loads the Supabase code only when keys are set, so a local-only build never downloads it. */
export function getProvider(): Promise<SyncProvider> {
  if (!SYNC_CONFIGURED) return Promise.resolve(localOnly);
  loading ??= import("./supabase")
    .then((module) => module.createSupabaseProvider(SUPABASE_URL, SUPABASE_KEY))
    .catch(() => localOnly);
  return loading;
}

/** True when this browser may already hold a session, or is returning from a sign-in link. */
export function mayHaveSession(): boolean {
  if (!SYNC_CONFIGURED || typeof window === "undefined") return false;
  try {
    if (/[?#&](code|access_token|error_description)=/.test(window.location.href)) return true;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    }
  } catch {
    return false;
  }
  return false;
}
