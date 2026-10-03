"use client";

import { createContext, useContext } from "react";
import type { Account } from "@/lib/account";

type Session = { account: Account; logOut: () => void };

export const SessionCtx = createContext<Session | null>(null);

export function useSession(): Session {
  const value = useContext(SessionCtx);
  if (!value) throw new Error("session");
  return value;
}
