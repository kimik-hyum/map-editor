import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { isBrowserSessionExpired } from "../model/browserSessionLifetime";

const pendingSignOuts = new WeakMap<SupabaseClient, Promise<void>>();

export async function getBrowserSession(
  client: SupabaseClient,
): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session || !isBrowserSessionExpired(data.session)) return data.session;

  let pending = pendingSignOuts.get(client);
  if (!pending) {
    pending = (async () => {
      // 다른 기기까지 로그아웃하지 않고 현재 브라우저 세션만 종료합니다.
      const { error: signOutError } = await client.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
    })();
    pendingSignOuts.set(client, pending);
  }
  try {
    await pending;
  } finally {
    if (pendingSignOuts.get(client) === pending) pendingSignOuts.delete(client);
  }
  return null;
}
