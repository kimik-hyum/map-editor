import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient, isE2eAuthBypassed } from "./api/supabaseClient";
import { authContext } from "./model/authContext";
import { signInWithGooglePopup } from "./api/googleSignInPopup";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const bypassed = isE2eAuthBypassed();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(!bypassed);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bypassed) {
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = getSupabaseClient();
      void supabase.auth
        .getSession()
        .then(({ data, error: sessionError }) => {
          if (!active) {
            return;
          }
          setSession(data.session);
          setError(sessionError ? "로그인 세션을 확인하지 못했습니다." : null);
          setIsLoading(false);
        })
        .catch(() => {
          if (active) {
            setError("로그인 세션을 확인하지 못했습니다.");
            setIsLoading(false);
          }
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (active) {
          setSession(nextSession);
          setError(null);
          setIsLoading(false);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // 인증 설정/서비스 오류가 비로그인 편집기까지 막아서는 안 됩니다.
      setError("로그인 서비스를 사용할 수 없습니다.");
      setIsLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [bypassed]);

  const value = useMemo(
    () => ({
      error,
      isLoading,
      session,
      user: session?.user ?? null,
      signInWithGoogle: async (signal?: AbortSignal) => {
        setError(null);
        try {
          const nextSession = await signInWithGooglePopup(getSupabaseClient(), signal);
          if (!nextSession || signal?.aborted) {
            return false;
          }
          setSession(nextSession);
          return true;
        } catch (signInError) {
          if (!signal?.aborted) {
            setError(
              signInError instanceof Error
                ? signInError.message
                : "Google 로그인을 시작하지 못했습니다.",
            );
          }
          return false;
        }
      },
      signOut: async () => {
        setError(null);
        const { error: signOutError } = await getSupabaseClient().auth.signOut();
        if (signOutError) {
          setError("로그아웃하지 못했습니다.");
        }
      },
    }),
    [error, isLoading, session],
  );

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}
