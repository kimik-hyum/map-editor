import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../../../functions/api/us-boundaries";
import {
  isUsBoundaryObject,
  usBoundaryObjectUrl,
  US_BOUNDARY_VERSION,
} from "./usBoundaries";

afterEach(() => vi.unstubAllGlobals());
const makeContext = (file = "manifest.json", init?: RequestInit) => ({
  request: new Request(
    `https://preview.maps-editor.pages.dev${usBoundaryObjectUrl(file)}`,
    init,
  ),
  env: {
    US_BOUNDARIES: {
      get: vi.fn(async () => ({
        body: new Blob([new Uint8Array(gzipSync('{"ok":true}'))]).stream(),
        httpEtag: '"test-etag"',
        writeHttpMetadata: (headers: Headers) =>
          headers.set("Content-Encoding", "gzip"),
      })),
    },
  },
  waitUntil: vi.fn(),
});
describe("미국 R2 읽기 경로", () => {
  it.each([
    "../manifest.json",
    "originals/state/0001.json",
    "z14/state/0001.json",
    "indexes/private.json",
    "z15-plus/state/0001.json/extra",
  ])("허용하지 않은 경로 %s는 R2에 전달하지 않는다", async (file) => {
    const c = makeContext(file);
    expect(isUsBoundaryObject(file)).toBe(false);
    expect((await onRequest(c)).status).toBe(404);
    expect(c.env.US_BOUNDARIES.get).not.toHaveBeenCalled();
  });
  it("고정한 버전의 표시본만 JSON 스트림과 ETag/cache 헤더로 전달한다", async () => {
    const c = makeContext("z15-plus/county/0001.json");
    const r = await onRequest(c);
    expect(c.env.US_BOUNDARIES.get).toHaveBeenCalledWith(
      `us/${US_BOUNDARY_VERSION}/z15-plus/county/0001.json`,
    );
    expect(r.headers.get("Content-Encoding")).toBeNull();
    expect(r.headers.get("Cache-Control")).toContain("immutable");
    expect(r.headers.get("ETag")).toBe('W/"test-etag"');
    expect(await r.json()).toEqual({ ok: true });
  });
  it("다른 버전과 쓰기 요청을 차단하고 조건부 요청을 처리한다", async () => {
    const c = makeContext();
    c.request = new Request(c.request.url.replace(US_BOUNDARY_VERSION, "old-version"));
    expect((await onRequest(c)).status).toBe(404);
    expect(
      (await onRequest(makeContext("manifest.json", { method: "POST" }))).status,
    ).toBe(405);
    const notModified = await onRequest(
      makeContext("manifest.json", { headers: { "If-None-Match": 'W/"test-etag"' } }),
    );
    expect(notModified.status).toBe(304);
    expect(await notModified.text()).toBe("");
    expect(
      await (await onRequest(makeContext("manifest.json", { method: "HEAD" }))).text(),
    ).toBe("");
  });
  it("캐시 적중 응답도 JSON을 한 번만 압축 해제해 읽을 수 있다", async () => {
    let stored: Response | undefined;
    vi.stubGlobal("caches", {
      default: {
        match: vi.fn(async () => stored?.clone()),
        put: vi.fn(async (_key: Request, response: Response) => {
          stored = response;
        }),
      },
    });
    const c = makeContext("indexes/county.json");
    expect(await (await onRequest(c)).json()).toEqual({ ok: true });
    const cached = await onRequest(c);
    expect(c.env.US_BOUNDARIES.get).toHaveBeenCalledTimes(1);
    expect(cached.headers.get("Content-Encoding")).toBeNull();
    expect(await cached.json()).toEqual({ ok: true });
    const revalidated = await onRequest({
      ...c,
      request: new Request(c.request.url, {
        headers: { "If-None-Match": 'W/"test-etag"' },
      }),
    });
    expect(revalidated.status).toBe(304);
  });
  it("저장소 미연결, 누락 파일, 장애는 캐시하지 않는다", async () => {
    const c = makeContext();
    expect((await onRequest({ ...c, env: {} })).status).toBe(503);
    const missing = await onRequest({
      ...c,
      env: { US_BOUNDARIES: { get: async () => null } },
    });
    expect(missing.status).toBe(404);
    const failed = await onRequest({
      ...c,
      env: {
        US_BOUNDARIES: {
          get: async () => {
            throw new Error("private details");
          },
        },
      },
    });
    expect(failed.status).toBe(503);
    expect(failed.headers.get("Cache-Control")).toBe("no-store");
    expect(await failed.text()).not.toContain("private details");
  });
});
