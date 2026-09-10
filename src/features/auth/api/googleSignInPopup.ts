import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { isGoogleUser } from "../model/googleIdentity";

const REQUEST_STORAGE_KEY = "maps-editor-google-popup-request";
const CHANNEL_PREFIX = "maps-editor-google-popup:";
const LOGIN_TIMEOUT_MS = 180_000;
export const AUTH_CALLBACK_PATH = "/auth/callback";

// OAuth 팝업에는 scene이나 호스트 정보 대신 일회성 요청 ID만 전달합니다.
export function notifyGoogleSignInPopup(success: boolean): void {
  const requestId = window.sessionStorage.getItem(REQUEST_STORAGE_KEY);
  window.sessionStorage.removeItem(REQUEST_STORAGE_KEY);
  if (!requestId || !/^[a-f0-9-]{36}$/.test(requestId)) {
    return;
  }
  const channel = new BroadcastChannel(`${CHANNEL_PREFIX}${requestId}`);
  channel.postMessage({ success });
  channel.close();
}

// 에디터 창을 navigate/reload하지 않아 opener 연결, scene, undo/sketch가 유지됩니다.
// window.open은 OAuth URL 생성의 await보다 먼저 실행해야 팝업 차단을 피할 수 있습니다.
export async function signInWithGooglePopup(
  client: SupabaseClient,
  signal?: AbortSignal,
): Promise<Session | null> {
  if (signal?.aborted) {
    return null;
  }
  const requestId = crypto.randomUUID();
  const popup = window.open(
    "about:blank",
    `maps-editor-google-${requestId}`,
    "popup,width=520,height=720",
  );
  if (!popup) {
    throw new Error(
      "로그인 팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.",
    );
  }

  try {
    popup.sessionStorage.setItem(REQUEST_STORAGE_KEY, requestId);
  } catch {
    popup.close();
    throw new Error(
      "로그인 창을 준비하지 못했습니다. 브라우저 저장소 설정을 확인해주세요.",
    );
  }

  return new Promise<Session | null>((resolve, reject) => {
    let finished = false;
    let checkingSession = false;
    const channel = new BroadcastChannel(`${CHANNEL_PREFIX}${requestId}`);
    const closePopup = () => {
      // Google의 창 격리 정책으로 WindowProxy가 분리될 수 있으므로 closed를 폴링하지 않습니다.
      // 정상 완료한 callback도 자신의 창을 닫습니다.
      try {
        popup.close();
      } catch {
        // 이미 분리/종료된 팝업은 에디터 상태에 영향을 주지 않습니다.
      }
    };
    const finish = (session: Session | null, error?: Error) => {
      if (finished) {
        return;
      }
      finished = true;
      window.clearTimeout(timeout);
      window.clearInterval(sessionTimer);
      signal?.removeEventListener("abort", onAbort);
      channel.close();
      closePopup();
      if (error) {
        reject(error);
      } else {
        resolve(session);
      }
    };
    const onAbort = () => finish(null);
    const checkSession = async () => {
      if (finished || checkingSession) {
        return;
      }
      checkingSession = true;
      try {
        const { data, error } = await client.auth.getSession();
        if (!error && isGoogleUser(data.session?.user ?? null)) {
          finish(data.session);
        }
      } catch {
        finish(
          null,
          new Error("로그인 세션을 확인하지 못했습니다. 다시 시도해주세요."),
        );
      } finally {
        checkingSession = false;
      }
    };
    const timeout = window.setTimeout(
      () =>
        finish(null, new Error("로그인 대기 시간이 지났습니다. 다시 시도해주세요.")),
      LOGIN_TIMEOUT_MS,
    );
    // 토큰은 직접 postMessage하지 않고 Supabase의 동일 origin 세션 저장소에서 읽습니다.
    const sessionTimer = window.setInterval(() => void checkSession(), 1000);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (
        typeof event.data !== "object" ||
        event.data === null ||
        !("success" in event.data)
      ) {
        return;
      }
      if (event.data.success === false) {
        finish(null, new Error("Google 로그인이 취소되었거나 완료되지 않았습니다."));
      } else if (event.data.success === true) {
        void checkSession();
      }
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    void client.auth
      .signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${AUTH_CALLBACK_PATH}`,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      })
      .then(({ data, error }) => {
        if (finished) {
          return;
        }
        if (error || !data.url) {
          finish(null, new Error("Google 로그인을 시작하지 못했습니다."));
          return;
        }
        popup.location.replace(data.url);
      })
      .catch(() => finish(null, new Error("Google 로그인 창을 열지 못했습니다.")));
  });
}
