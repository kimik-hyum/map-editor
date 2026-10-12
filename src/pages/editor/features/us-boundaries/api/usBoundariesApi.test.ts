import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { US_BOUNDARY_KINDS, US_BOUNDARY_VERSION } from "@/shared/config/usBoundaries";
import { fetchUsBoundaryView, usManifestOptions } from "./usBoundariesApi";

const version = US_BOUNDARY_VERSION;
const shard = "z15-plus/county/0001.json";
const bbox = [-74.1, 40.6, -73.8, 40.9] as [number, number, number, number];
const feature = {
  type: "Feature",
  id: "ny",
  bbox,
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [-74.1, 40.6],
          [-73.8, 40.6],
          [-73.8, 40.9],
          [-74.1, 40.6],
        ],
      ],
    ],
  },
  properties: { kind: "county", code: "001", name: "Test County" },
};
const collection = {
  type: "FeatureCollection",
  country: "US",
  version,
  kind: "county",
  tolerance: 0.00008,
  geometry_role: "display",
  truncated: false,
  features: [feature],
};
const index = {
  version,
  country: "US",
  kind: "county",
  items: [{ id: "ny", bbox, object: shard }],
};
const clients: QueryClient[] = [];
function prepare() {
  const client = new QueryClient();
  clients.push(client);
  client.setQueryData(usManifestOptions().queryKey, {
    schema: "us-boundaries-display-v1",
    version,
    country: "US",
    crs: "EPSG:4326",
    profile: "z15-plus",
    tolerance: 0.00008,
    kinds: US_BOUNDARY_KINDS.map((kind) => ({
      kind,
      label: kind,
      features: 1,
      index: `indexes/${kind}.json`,
      shards: [{ key: shard, bytes: 100, features: 1 }],
    })),
  });
  const fetcher = vi.fn(async (url: string) =>
    Response.json(
      new URL(url, "https://test.example").searchParams
        .get("file")
        ?.startsWith("indexes/")
        ? index
        : collection,
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  return { client, fetcher, signal: new AbortController().signal };
}
afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
  vi.unstubAllGlobals();
});
describe("미국 경계 R2 조회", () => {
  it("필요한 경계를 반환하고 같은 파일은 캐시에서 재사용한다", async () => {
    const { client, fetcher, signal } = prepare();
    const first = await fetchUsBoundaryView(client, "county", bbox, signal);
    expect(first.features.map((f) => f.id)).toEqual(["ny"]);
    expect(first.features[0].properties.code).toBe("001");
    expect(await fetchUsBoundaryView(client, "county", bbox, signal)).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const empty = await fetchUsBoundaryView(
      client,
      "county",
      [126, 36, 128, 38],
      signal,
    );
    expect(empty.features).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("파일 오류나 피처 누락을 빈 성공으로 처리하지 않는다", async () => {
    const { client, fetcher, signal } = prepare();
    fetcher
      .mockResolvedValueOnce(Response.json(index))
      .mockResolvedValueOnce(new Response("missing", { status: 404 }));
    await expect(fetchUsBoundaryView(client, "county", bbox, signal)).rejects.toThrow(
      "다시 시도",
    );
    fetcher.mockResolvedValueOnce(
      Response.json({ ...collection, features: [{ ...feature, id: "other" }] }),
    );
    await expect(fetchUsBoundaryView(client, "county", bbox, signal)).rejects.toThrow(
      "누락",
    );
  });
  it("종류 변경·패널 닫기의 취소 신호를 실제 다운로드에 전달한다", async () => {
    const { client, fetcher } = prepare();
    const controller = new AbortController();
    fetcher.mockImplementation(async (_url: string, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) =>
        signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        ),
      );
    });
    const pending = fetchUsBoundaryView(client, "county", bbox, controller.signal);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
