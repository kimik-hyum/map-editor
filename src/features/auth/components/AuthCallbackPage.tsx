import { useEffect, useRef } from "react";
import { notifyGoogleSignInPopup } from "../api/googleSignInPopup";
import { useAuth } from "../hooks/useAuth";
import { isGoogleUser } from "../model/googleIdentity";

export function AuthCallbackPage() {
  const { error, isLoading, user } = useAuth();
  const notifiedRef = useRef(false);
  const success = !error && isGoogleUser(user);

  useEffect(() => {
    if (isLoading || notifiedRef.current) {
      return;
    }
    notifiedRef.current = true;
    notifyGoogleSignInPopup(success);
    if (success) {
      window.close();
    }
  }, [isLoading, success]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <section className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-lg">
        <h1 className="text-xl font-black text-ink">
          {isLoading
            ? "로그인 확인 중…"
            : success
              ? "로그인 완료"
              : "로그인하지 못했습니다"}
        </h1>
        <p className="text-sm leading-6 text-ink-soft" role="status">
          {isLoading
            ? "잠시만 기다려주세요."
            : success
              ? "에디터로 돌아가세요. 기존 편집 내용은 그대로 유지됩니다."
              : "이 창을 닫고 에디터에서 다시 로그인해주세요. 편집 내용은 유지됩니다."}
        </p>
        {!isLoading ? (
          <button
            className="mt-3 rounded-lg bg-brand px-4 py-2 font-bold text-white"
            onClick={() => window.close()}
            type="button"
          >
            창 닫기
          </button>
        ) : null}
      </section>
    </main>
  );
}
