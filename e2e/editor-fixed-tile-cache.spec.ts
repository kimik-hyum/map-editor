import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedGoogleSession } from "./fixtures/auth";
const version = (letter: string) =>
  `12345678-1234-1234-1234-123456789012.${letter.repeat(32)}`;
type Call = {
  operation: string;
  zoom?: number;
  kind?: string;
  version?: string;
  z?: number;
  x?: number;
  y?: number;
};
function tiles() {
  const all = [];
  for (let z = 6; z <= 9; z++) {
    const n = 2 ** z;
    const y = (lat: number) =>
      Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n);
    for (
      let x = Math.floor(((124 + 180) / 360) * n);
      x <= Math.floor(((132 + 180) / 360) * n);
      x++
    )
      for (let row = y(40); row <= y(32); row++) all.push({ z, x, y: row });
  }
  return all;
}
async function mock(context: BrowserContext, rotateOnTile = false) {
  await seedGoogleSession(context);
  const calls: Call[] = [];
  let current = version("a"),
    rotate = rotateOnTile;
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    const body = route.request().postDataJSON() as Call;
    calls.push(body);
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    if (body.operation === "kinds")
      return route.fulfill({
        json: [
          {
            kind: "sigungu",
            label: "시군구",
            level: 1,
            min_zoom: 0,
            sort_order: 0,
            selectable: false,
          },
          {
            kind: "adminDong",
            label: "행정동",
            level: 2,
            min_zoom: 12,
            sort_order: 1,
            selectable: true,
          },
          {
            kind: "legalDong",
            label: "법정동",
            level: 2,
            min_zoom: 12,
            sort_order: 2,
            selectable: true,
          },
        ],
      });
    if (body.operation === "tileManifest")
      return route.fulfill({
        json: {
          country: "KR",
          version: current,
          profile: "sigungu-4x-full-v1",
          kind: "sigungu",
          maxDisplayZoom: 10,
          minTileZoom: 6,
          maxTileZoom: 9,
          tiles: tiles(),
        },
      });
    if (body.operation === "byTile") {
      expect(body.zoom).toBeLessThanOrEqual(10);
      if (rotate) {
        rotate = false;
        current = version("b");
      }
      if (body.version !== current)
        return route.fulfill({ status: 409, json: { error: "version changed" } });
    } else expect(body.operation).toBe("byView");
    await route.fulfill({
      json: {
        type: "FeatureCollection",
        country: "KR",
        kind: "sigungu",
        level: 1,
        truncated: false,
        ...(body.operation === "byTile"
          ? {
              cache: {
                version: current,
                profile: "sigungu-4x-full-v1",
                status: "HIT",
                z: body.z,
                x: body.x,
                y: body.y,
              },
            }
          : {}),
        features: [
          {
            type: "Feature",
            id: 1,
            properties: {
              name:
                body.operation === "byTile"
                  ? current === version("a")
                    ? "캐시 경계"
                    : "새 버전 경계"
                  : "기존 bbox 경계",
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [126.8, 37.4],
                  [127.2, 37.4],
                  [127.2, 37.8],
                  [126.8, 37.8],
                  [126.8, 37.4],
                ],
              ],
            },
          },
        ],
      },
    });
  });
  return {
    calls,
    rotate: () => {
      current = version("b");
    },
  };
}
async function openZoom10(page: Page) {
  await page.goto("/demo");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await editor.getByTitle("지도 축소", { exact: true }).click();
    await editor.waitForTimeout(350);
  }
  await editor.getByRole("button", { name: "행정동 경계", exact: true }).click();
  return editor;
}
test("줌10은 고정 타일, 11은 bbox이며 메뉴 변경/줌 복귀는 캐시를 재사용한다", async ({
  context,
  page,
}) => {
  const server = await mock(context);
  const editor = await openZoom10(page);
  await expect(editor.getByText(/현재 화면:/)).toContainText("· 1개");
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  const initial = server.calls.filter((c) => c.operation === "byTile").length;
  expect(initial).toBeGreaterThan(0);
  expect(server.calls.filter((c) => c.operation === "byView")).toHaveLength(0);
  expect(
    server.calls
      .filter((c) => c.operation === "byTile")
      .every((c) => c.zoom === 10 && c.z === 9),
  ).toBe(true);
  await editor.getByRole("button", { name: "법정동 z12부터 표시" }).click();
  await editor.waitForTimeout(200);
  expect(server.calls.filter((c) => c.operation === "byTile")).toHaveLength(initial);
  await editor.getByTitle("지도 확대", { exact: true }).click();
  await expect
    .poll(
      () =>
        server.calls.filter((c) => c.operation === "byView" && c.zoom === 11).length,
    )
    .toBe(1);
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  await editor.getByTitle("지도 축소", { exact: true }).click();
  await editor.waitForTimeout(500);
  expect(server.calls.filter((c) => c.operation === "byTile")).toHaveLength(initial);
  // Map controls close the menu, but the actual boundary layer remains visible.
  await expect(
    editor.getByRole("group", { name: "캐시 경계 경계 작업", exact: true }),
  ).toBeVisible();
});
test("409이면 manifest를 다시 읽고 서로 다른 버전을 섞지 않는다", async ({
  context,
  page,
}) => {
  const server = await mock(context, true);
  const editor = await openZoom10(page);
  await expect
    .poll(() => server.calls.filter((c) => c.operation === "tileManifest").length)
    .toBeGreaterThanOrEqual(2);
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await expect(
    editor.getByRole("group", { name: "새 버전 경계 경계 작업", exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByRole("group", { name: "캐시 경계 경계 작업", exact: true }),
  ).toHaveCount(0);
  expect(server.calls.filter((c) => c.operation === "byView")).toHaveLength(0);
});
test("열린 창에서도 1분 메타데이터 갱신으로 새로운 데이터 버전을 반영한다", async ({
  context,
  page,
}) => {
  const server = await mock(context);
  // 팝업을 포함한 context 전체에 먼저 설치해야 최초 query interval도 제어됩니다.
  await page.clock.install();
  const editor = await openZoom10(page);
  await expect(editor.getByText(/현재 화면:/)).toContainText("· 1개");
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  const manifestCalls = server.calls.filter(
    (c) => c.operation === "tileManifest",
  ).length;
  server.rotate();
  await editor.clock.fastForward(61_000);
  await expect
    .poll(() => server.calls.filter((c) => c.operation === "tileManifest").length)
    .toBeGreaterThan(manifestCalls);
  await expect(
    editor.getByRole("group", { name: "새 버전 경계 경계 작업", exact: true }),
  ).toBeVisible();
  expect(
    server.calls.filter((c) => c.operation === "byTile" && c.version === version("b"))
      .length,
  ).toBeGreaterThan(0);
});
