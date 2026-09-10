import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthContextValue = {
  error: string | null;
  isLoading: boolean;
  session: Session | null;
  signInWithGoogle: (signal?: AbortSignal) => Promise<boolean>;
  signOut: () => Promise<void>;
  user: User | null;
};

export const authContext = createContext<AuthContextValue | undefined>(undefined);
