"use client";

import { createContext, useContext } from "react";
import type { Account } from "@/lib/account";
import type { Profile } from "@/lib/profile";

export type ProfileView = "main" | "join" | "pin" | "erase";

type Session = {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  /** Kept for older screens that open the profile. It now goes to Settings. */
  openProfile: (view?: ProfileView) => void;
  /** The logged-in account. Null only on the partner and print pages, which need no login. */
  account: Account | null;
  logout: () => void;
};

export const SessionCtx = createContext<Session | null>(null);

export function useSession(): Session {
  const value = useContext(SessionCtx);
  if (!value) throw new Error("session");
  return value;
}
