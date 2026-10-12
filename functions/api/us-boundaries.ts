import {
  isUsBoundaryObject,
  US_BOUNDARY_VERSION,
} from "../../src/shared/config/usBoundaries";

type StoredObject = {
  body: ReadableStream<Uint8Array>;
  httpEtag: string;
  writeHttpMetadata: (headers: Headers) => void;
};
type Context = {
  request: Request;
  env: { US_BOUNDARIES?: { get: (key: string) => Promise<StoredObject | null> } };
  waitUntil: (promise: Promise<unknown>) => void;
};

// 공개 Census 표시본만 읽습니다. 버킷 목록/원본/다른 버전은 이 경로로 노출하지 않습니다.
export async function onRequest({ request, env, waitUntil }: Context) {
  const error = (status: number, message: string) =>
    Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (request.method !== "GET" && request.method !== "HEAD")
    return error(405, "지원하지 않는 메서드입니다.");
  const url = new URL(request.url);
  const key = url.searchParams.get("file") ?? "";
  if (
    url.searchParams.get("version") !== US_BOUNDARY_VERSION ||
    !isUsBoundaryObject(key)
  )
    return error(404, "존재하지 않는 미국 경계 파일입니다.");
  if (!env.US_BOUNDARIES) return error(503, "미국 경계 저장소에 연결하지 못했습니다.");
  const cache = (globalThis.caches as (CacheStorage & { default?: Cache }) | undefined)
    ?.default;
  url.search = new URLSearchParams({
    version: US_BOUNDARY_VERSION,
    file: key,
  }).toString();
  const cacheKey = new Request(url.toString());
  try {
    const cached = await cache?.match(cacheKey);
    if (cached) {
      if (request.headers.get("If-None-Match") === cached.headers.get("ETag"))
        return new Response(null, { status: 304, headers: cached.headers });
      return request.method === "HEAD"
        ? new Response(null, { headers: cached.headers })
        : new Response(cached.body, {
            headers: cached.headers,
            encodeBody: "manual",
          } as ResponseInit & { encodeBody: "manual" });
    }
    const object = await env.US_BOUNDARIES.get(`us/${US_BOUNDARY_VERSION}/${key}`);
    if (!object) return error(404, "미국 경계 파일을 찾지 못했습니다.");
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("ETag", object.httpEtag);
    headers.set("X-Content-Type-Options", "nosniff");
    if (request.headers.get("If-None-Match") === object.httpEtag) {
      await object.body.cancel();
      return new Response(null, { status: 304, headers });
    }
    if (request.method === "HEAD") {
      await object.body.cancel();
      return new Response(null, { headers });
    }
    // R2의 gzip 바이트를 그대로 전송합니다. Workers의 이중 압축을 방지합니다.
    const init: ResponseInit & { encodeBody: "manual" } = {
      headers,
      encodeBody: "manual",
    };
    const response = new Response(object.body, init);
    if (cache) waitUntil(cache.put(cacheKey, response.clone()).catch(() => undefined));
    return response;
  } catch {
    return error(503, "미국 경계를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
}
