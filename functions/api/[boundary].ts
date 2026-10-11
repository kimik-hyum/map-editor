type GatewayContext = {
  request: Request & { cf?: { country?: string | null } };
  env: { REGION_GATEWAY_SECRET?: string };
  params: { boundary?: string | string[] };
};

const allowedOrigins = new Set([
  "https://maps-editor.pages.dev",
  "https://google-sso-preview.maps-editor.pages.dev",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
]);
const upstreamBase = "https://wmfidaawutwavlwvqauh.supabase.co/functions/v1/";

// Cloudflare가 확인한 접속 국가만 사용합니다. 요청 헤더의 국가/IP는 신뢰하지 않습니다.
export async function onRequest({ request, env, params }: GatewayContext) {
  const origin = request.headers.get("Origin") ?? "";
  const headers = new Headers({ "Cache-Control": "private, no-store", Vary: "Origin" });
  if (allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "authorization, apikey, content-type, x-client-info",
    );
    headers.set(
      "Access-Control-Expose-Headers",
      "Server-Timing, X-Request-Id, X-Region-Cache, X-Region-Version",
    );
  }
  const error = (status: number, code: string, message: string) =>
    Response.json({ code, error: message }, { status, headers });
  if (request.cf?.country !== "KR")
    return error(
      403,
      "REGION_COUNTRY_BLOCKED",
      "경계 데이터는 한국에서만 이용할 수 있습니다.",
    );
  if (!allowedOrigins.has(origin))
    return error(403, "REGION_ORIGIN_BLOCKED", "허용되지 않은 Origin입니다.");
  const name = params.boundary;
  if (name !== "regions" && name !== "region-search")
    return error(404, "NOT_FOUND", "존재하지 않는 경계 API입니다.");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST")
    return error(405, "METHOD_NOT_ALLOWED", "지원하지 않는 메서드입니다.");
  if (!env.REGION_GATEWAY_SECRET || env.REGION_GATEWAY_SECRET.length < 32)
    return error(
      503,
      "REGION_GATEWAY_UNAVAILABLE",
      "경계 서비스를 사용할 수 없습니다.",
    );

  // 길이 헤더가 없는 요청도 4KB를 넘으면 원본 서버에 전달하지 않습니다.
  if (Number(request.headers.get("Content-Length")) > 4096)
    return error(413, "BODY_TOO_LARGE", "요청 본문이 너무 큽니다.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return error(413, "BODY_TOO_LARGE", "요청 본문이 너무 큽니다.");
      }
      chunks.push(value);
    }
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const upstream = await fetch(`${upstreamBase}${name}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: origin,
        Authorization: request.headers.get("Authorization") ?? "",
        apikey: request.headers.get("apikey") ?? "",
        "Content-Type": "application/json",
        "X-Region-Gateway": env.REGION_GATEWAY_SECRET,
        "X-Region-Country": "KR",
        "x-region": "ap-northeast-2",
      },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    // 다른 호스트로 인증 정보를 재전송하거나 브라우저를 우회 경로로 보내지 않습니다.
    if (upstream.status >= 300 && upstream.status < 400) {
      await upstream.body?.cancel();
      return error(
        502,
        "REGION_UPSTREAM_UNAVAILABLE",
        "경계 서버에 연결하지 못했습니다.",
      );
    }
    for (const name of [
      "Content-Type",
      "Server-Timing",
      "X-Request-Id",
      "X-Region-Cache",
      "X-Region-Version",
    ]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return error(
      502,
      "REGION_UPSTREAM_UNAVAILABLE",
      "경계 서버에 연결하지 못했습니다.",
    );
  }
}
