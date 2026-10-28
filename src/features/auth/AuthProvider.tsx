import { t } from "@/shared/i18n/i18n";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient, isE2eAuthBypassed } from "./api/supabaseClient";
import { authContext } from "./model/authContext";
import { signInWithGooglePopup } from "./api/googleSignInPopup";
import { getBrowserSession } from "./api/browserSession";
import { getBrowserSessionExpiresAt } from "./model/browserSessionLifetime";

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
    let expirationTimer: ReturnType<typeof setTimeout> | undefined;
    let currentSession: Session | null = null;
    let revision = 0;
    let recheckSession = () => {};

    try {
      const supabase = getSupabaseClient();
      const readSession = async () => {
        const previousRevision = revision;
        try {
          const nextSession = await getBrowserSession(supabase);
          if (active && revision === previousRevision) applySession(nextSession);
        } catch {
          if (active && revision === previousRevision) {
            setError(t("로그인 세션을 확인하지 못했습니다."));
            setIsLoading(false);
          }
        }
      };
      const applySession = (nextSession: Session | null) => {
        if (!active) return;
        revision += 1;
        currentSession = nextSession;
        clearTimeout(expirationTimer);
        const remaining = nextSession
          ? getBrowserSessionExpiresAt(nextSession) - Date.now()
          : 0;
        setSession(nextSession && remaining > 0 ? nextSession : null);
        setError(null);
        setIsLoading(false);
        if (nextSession) {
          // 인증 이벤트에서 SDK를 await하지 않고 잠금이 풀린 뒤 만료를 처리합니다.
          expirationTimer = setTimeout(
            () => {
              if (
                currentSession &&
                Date.now() >= getBrowserSessionExpiresAt(currentSession)
              ) {
                setSession(null);
              }
              void readSession();
            },
            Math.max(0, Math.min(remaining, 60_000)),
          );
        }
      };
      recheckSession = () => applySession(currentSession);
      window.addEventListener("focus", recheckSession);
      window.addEventListener("pageshow", recheckSession);
      document.addEventListener("visibilitychange", recheckSession);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) =>
        applySession(nextSession),
      );
      unsubscribe = () => subscription.unsubscribe();
      void readSession();
    } catch {
      // 인증 설정/서비스 오류가 비로그인 편집기까지 막아서는 안 됩니다.
      setError(t("로그인 서비스를 사용할 수 없습니다."));
      setIsLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
      clearTimeout(expirationTimer);
      window.removeEventListener("focus", recheckSession);
      window.removeEventListener("pageshow", recheckSession);
      document.removeEventListener("visibilitychange", recheckSession);
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
                : t("Google 로그인을 시작하지 못했습니다."),
            );
          }
          return false;
        }
      },
      signOut: async () => {
        setError(null);
        const { error: signOutError } = await getSupabaseClient().auth.signOut();
        if (signOutError) {
          setError(t("로그아웃하지 못했습니다."));
        }
      },
    }),
    [error, isLoading, session],
  );

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}
