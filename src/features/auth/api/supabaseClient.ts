import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseBrowserConfig = {
  publishableKey: string;
  url: string;
};

let client: SupabaseClient | null = null;

export function getSupabaseBrowserConfig(): SupabaseBrowserConfig {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase 설정(VITE_SUPABASE_URL/PUBLISHABLE_KEY)이 없습니다.");
  }

  return { publishableKey, url: url.replace(/\/$/, "") };
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const { publishableKey, url } = getSupabaseBrowserConfig();
    client = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
      },
    });
  }

  return client;
}

export function isE2eAuthBypassed(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_E2E_AUTH_BYPASS === "true";
}

export async function getAuthenticatedFunctionRequest(): Promise<{
  headers: Record<string, string>;
  url: string;
}> {
  const { publishableKey, url } = getSupabaseBrowserConfig();

  if (isE2eAuthBypassed()) {
    return {
      url: `${url}/functions/v1/regions`,
      headers: {
        apikey: publishableKey,
        Authorization: "Bearer e2e-auth-bypass",
        "Content-Type": "application/json",
      },
    };
  }

  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) {
    throw new Error("로그인 세션을 확인하지 못했습니다.");
  }
  if (!data.session) {
    throw new Error("Google 로그인이 필요합니다.");
  }

  return {
    url: `${url}/functions/v1/regions`,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
  };
}
