import {
  isUsBoundaryObject,
  isUsBoundaryOriginalObject,
  US_BOUNDARY_ORIGINAL_VERSION,
  US_BOUNDARY_VERSION,
} from "../../src/shared/config/usBoundaries";

type StoredObject = {
  body: ReadableStream<Uint8Array<ArrayBuffer>>;
  httpEtag: string;
  writeHttpMetadata: (headers: Headers) => void;
};
type Context = {
  request: Request;
  env: { US_BOUNDARIES?: { get: (key: string) => Promise<StoredObject | null> } };
  waitUntil: (promise: Promise<unknown>) => void;
};

// 고정한 Census 표시본과 연결된 원본만 읽습니다. 버킷 목록·다른 버전은 노출하지 않습니다.
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
  const version = url.searchParams.get("version") ?? "";
  if (
    !(
      (version === US_BOUNDARY_VERSION && isUsBoundaryObject(key)) ||
      (version === US_BOUNDARY_ORIGINAL_VERSION && isUsBoundaryOriginalObject(key))
    )
  )
    return error(404, "존재하지 않는 미국 경계 파일입니다.");
  if (!env.US_BOUNDARIES) return error(503, "미국 경계 저장소에 연결하지 못했습니다.");
  const cache = (globalThis.caches as (CacheStorage & { default?: Cache }) | undefined)
    ?.default;
  url.search = new URLSearchParams({
    version,
    file: key,
    representation: "json-v1",
  }).toString();
  const cacheKey = new Request(url.toString());
  try {
    const cached = await cache?.match(cacheKey);
    if (cached) {
      if (request.headers.get("If-None-Match") === cached.headers.get("ETag"))
        return new Response(null, { status: 304, headers: cached.headers });
      return request.method === "HEAD"
        ? new Response(null, { headers: cached.headers })
        : cached;
    }
    const object = await env.US_BOUNDARIES.get(`us/${version}/${key}`);
    if (!object) return error(404, "미국 경계 파일을 찾지 못했습니다.");
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    const gzipped = headers.get("Content-Encoding") === "gzip";
    headers.delete("Content-Encoding");
    headers.delete("Content-Length");
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    const etag = `W/${object.httpEtag}`;
    headers.set("ETag", etag);
    headers.set("X-Content-Type-Options", "nosniff");
    if (request.headers.get("If-None-Match") === etag) {
      await object.body.cancel();
      return new Response(null, { status: 304, headers });
    }
    if (request.method === "HEAD") {
      await object.body.cancel();
      return new Response(null, { headers });
    }
    // Pages/Cache API의 응답 래핑과 Brotli 협상에서 gzip이 중복 적용되지 않도록
    // 저장본을 스트리밍으로 풀고, 실제 전송 압축은 Cloudflare에 맡깁니다.
    const body = gzipped
      ? object.body.pipeThrough(new DecompressionStream("gzip"))
      : object.body;
    const response = new Response(body, { headers });
    if (cache) waitUntil(cache.put(cacheKey, response.clone()).catch(() => undefined));
    return response;
  } catch {
    return error(503, "미국 경계를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
}
