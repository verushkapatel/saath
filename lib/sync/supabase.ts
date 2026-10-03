import { createClient, type User } from "@supabase/supabase-js";
import type { SyncProvider, SyncUser, VaultRow } from "./provider";

const TABLE = "saath_vault";

function toUser(user: User | null | undefined): SyncUser | null {
  if (!user) return null;
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  return { id: user.id, email: user.email ?? null, name: meta?.full_name ?? meta?.name ?? null };
}

export function createSupabaseProvider(url: string, key: string): SyncProvider {
  const client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
  });

  async function userId(): Promise<string | null> {
    const { data } = await client.auth.getSession();
    return data.session?.user.id ?? null;
  }

  return {
    available: true,
    async getUser() {
      const { data } = await client.auth.getSession();
      return toUser(data.session?.user);
    },
    onUser(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => listener(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },
    async signInWithEmail(email, redirectTo) {
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      return !error;
    },
    async signInWithGoogle(redirectTo) {
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      return !error;
    },
    async signOut() {
      await client.auth.signOut();
    },
    async pull() {
      const id = await userId();
      if (!id) return null;
      const { data, error } = await client.from(TABLE).select("salt, iv, data, updated_at").eq("user_id", id).maybeSingle();
      if (error || !data) return null;
      return { salt: data.salt, iv: data.iv, data: data.data, updatedAt: data.updated_at } satisfies VaultRow;
    },
    async push(row) {
      const id = await userId();
      if (!id) return false;
      const { error } = await client.from(TABLE).upsert({
        user_id: id,
        salt: row.salt,
        iv: row.iv,
        data: row.data,
        updated_at: new Date().toISOString(),
      });
      return !error;
    },
    async deleteAccount() {
      const { error } = await client.rpc("saath_delete_account");
      if (error) return false;
      await client.auth.signOut();
      return true;
    },
  };
}
