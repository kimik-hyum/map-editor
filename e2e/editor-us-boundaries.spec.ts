import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  US_BOUNDARY_KINDS,
  US_BOUNDARY_VERSION,
} from "../src/shared/config/usBoundaries";
import { readEditorEdits } from "./fixtures/mapNavigation";

async function prepare(
  context: BrowserContext,
  page: Page,
  fail = false,
  country = "US",
  extra = false,
) {
  let shouldFail = fail;
  const files: string[] = [];
  await context.route("**/api/us-boundaries?*", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("version")).toBe(US_BOUNDARY_VERSION);
    const file = url.searchParams.get("file") ?? "";
    files.push(file);
    const common = { version: US_BOUNDARY_VERSION, country: "US" };
    if (file === "manifest.json")
      return route.fulfill({
        json: {
          ...common,
          schema: "us-boundaries-display-v1",
          crs: "EPSG:4326",
          profile: "z15-plus",
          tolerance: 0.00008,
          kinds: US_BOUNDARY_KINDS.map((kind) => ({
            kind,
            label: kind,
            features: extra ? 2 : 1,
            index: `indexes/${kind}.json`,
            shards: (extra ? ["0001", "0002"] : ["0001"]).map((part) => ({
              key: `z15-plus/${kind}/${part}.json`,
              bytes: 1000,
              features: 1,
            })),
          })),
        },
      });
    const kind = file.startsWith("indexes/")
      ? file.split("/")[1].replace(".json", "")
      : file.split("/")[1];
    const ny = [-74.08, 40.65, -73.86, 40.85];
    const east = [-73, 40.65, -72.95, 40.75];
    const part = file.endsWith("0002.json") ? "0002" : "0001";
    const bbox = part === "0002" ? east : ny;
    if (file.startsWith("indexes/"))
      return route.fulfill({
        json: {
          ...common,
          kind,
          items: [
            { id: `${kind}-0001`, bbox: ny, object: `z15-plus/${kind}/0001.json` },
            ...(extra
              ? [
                  {
                    id: `${kind}-0002`,
                    bbox: east,
                    object: `z15-plus/${kind}/0002.json`,
                  },
                ]
              : []),
          ],
        },
      });
    if (shouldFail) {
      shouldFail = false;
      return route.fulfill({ status: 503, json: { error: "unavailable" } });
    }
    return route.fulfill({
      json: {
        ...common,
        type: "FeatureCollection",
        kind,
        tolerance: 0.00008,
        geometry_role: "display",
        truncated: false,
        features: [
          {
            type: "Feature",
            id: `${kind}-${part}`,
            bbox,
            properties: { kind, code: "001", name: "Test boundary" },
            geometry: {
              type: "MultiPolygon",
              coordinates: [
                [
                  [
                    [bbox[0], bbox[1]],
                    [bbox[2], bbox[1]],
                    [bbox[2], bbox[3]],
                    [bbox[0], bbox[3]],
                    [bbox[0], bbox[1]],
                  ],
                ],
              ],
            },
          },
        ],
      },
    });
  });
  await page.goto(`/demo?country=${country}`);
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  return { editor, files };
}

async function blackVectorPixels(editor: Page) {
  return editor
    .locator('[aria-label="OSM map editor"] .ol-layer canvas')
    .evaluateAll((canvases) =>
      canvases.reduce((total, element) => {
        const canvas = element as HTMLCanvasElement;
        const data = canvas
          .getContext("2d")
          ?.getImageData(0, 0, canvas.width, canvas.height).data;
        if (!data) return total;
        let count = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] < 25 && data[i + 1] < 25 && data[i + 2] < 25 && data[i + 3] > 200)
            count++;
        return total + count;
      }, 0),
    );
}

test("미국 경계를 로그인 없이 캔버스에 표시하고 편집 도형과 분리한다", async ({
  context,
  page,
}) => {
  const { editor } = await prepare(context, page);
  const before = await readEditorEdits(editor);
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  const panel = editor.getByRole("dialog", { name: "경계 종류", exact: true });
  await expect(panel.getByRole("status")).toHaveText("카운티 1개 표시");
  await expect.poll(() => blackVectorPixels(editor)).toBeGreaterThan(100);
  await expect(editor.getByRole("button", { name: /Google/ })).toHaveCount(0);
  expect(await readEditorEdits(editor)).toEqual(before);
  await panel
    .getByRole("button", { name: "도시·타운 미국 Census 경계", exact: true })
    .click();
  await expect(panel.getByRole("status")).toHaveText("도시·타운 1개 표시");
  await panel.getByRole("button", { name: "경계 숨기기" }).click();
  await expect.poll(() => blackVectorPixels(editor)).toBe(0);
  expect(await readEditorEdits(editor)).toEqual(before);
});

test("미국 경계 요청 실패 후 재시도하고 다른 지역의 빈 결과를 표시한다", async ({
  context,
  page,
}) => {
  const { editor } = await prepare(context, page, true);
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  const panel = editor.getByRole("dialog", { name: "경계 종류", exact: true });
  await expect(panel.getByRole("alert")).toContainText("다시 시도");
  await panel.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText("카운티 1개 표시");
  await panel.getByRole("button", { name: "샌프란시스코" }).click();
  await expect(panel.getByRole("status")).toHaveText("카운티 0개 표시");
});

test("URL 국가를 메뉴 검색과 키보드로 바꿔도 편집 데이터와 이력은 유지한다", async ({
  context,
  page,
}) => {
  const { editor } = await prepare(context, page);
  expect(new URL(editor.url()).searchParams.get("country")).toBe("US");
  const before = await readEditorEdits(editor);
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  const menu = editor.getByRole("dialog", { name: "경계 종류", exact: true });
  await expect(menu.getByRole("status")).toHaveText("카운티 1개 표시");
  await editor.getByRole("combobox", { name: "국가 선택: 미국" }).click();
  const search = editor.getByRole("combobox", { name: "국가 이름 또는 코드 검색" });
  await search.fill("Japan");
  await expect(editor.getByText("지원하는 국가를 찾지 못했습니다.")).toBeVisible();
  await search.fill("Korea");
  await expect(editor.getByRole("option", { name: /대한민국/ })).toBeVisible();
  await search.press("Enter");
  await expect(
    menu.getByRole("combobox", { name: "국가 선택: 대한민국" }),
  ).toBeVisible();
  expect(new URL(editor.url()).searchParams.get("country")).toBe("KR");
  await expect(menu.getByRole("button", { name: "한국 경계 불러오기" })).toBeVisible();
  await expect.poll(() => blackVectorPixels(editor)).toBe(0);
  await expect(editor.getByRole("alertdialog")).toHaveCount(0);
  expect(await readEditorEdits(editor)).toEqual(before);
  await editor.getByRole("combobox", { name: "국가 선택: 대한민국" }).click();
  await search.fill("US");
  await search.press("Escape");
  expect(new URL(editor.url()).searchParams.get("country")).toBe("KR");
  await expect(menu).toBeVisible();
  await editor.getByRole("combobox", { name: "국가 선택: 대한민국" }).click();
  await search.fill("미국");
  await editor.getByRole("option", { name: /미국/ }).click();
  await expect(menu.getByRole("status")).toHaveText("카운티 1개 표시");
  await expect.poll(() => blackVectorPixels(editor)).toBeGreaterThan(100);
  expect(new URL(editor.url()).searchParams.get("country")).toBe("US");
  expect(await readEditorEdits(editor)).toEqual(before);
});

test("한국 시작 화면에서 로그인 없이 미국을 고르고 좁은 화면에서도 국가 메뉴를 사용한다", async ({
  context,
  page,
}) => {
  const regionCalls: string[] = [];
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    regionCalls.push(route.request().url());
    await route.fulfill({ status: 500, json: {} });
  });
  const { editor } = await prepare(context, page, false, "KR");
  await editor.setViewportSize({ width: 390, height: 700 });
  await editor.getByRole("button", { name: "행정동 경계" }).click();
  await editor.getByRole("combobox", { name: "국가 선택: 대한민국" }).click();
  const search = editor.getByRole("combobox", { name: "국가 이름 또는 코드 검색" });
  await search.fill("USA");
  const option = editor.getByRole("option", { name: /미국/ });
  const bounds = await option.boundingBox();
  if (!bounds) throw new Error("국가 옵션이 화면에 없습니다.");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await option.click();
  const menu = editor.getByRole("dialog", { name: "경계 종류", exact: true });
  await menu
    .getByRole("button", { name: "카운티 미국 Census 경계", exact: true })
    .click();
  await expect(menu.getByRole("status")).toHaveText("카운티 1개 표시");
  await expect(editor.getByRole("alertdialog")).toHaveCount(0);
  expect(regionCalls).toHaveLength(0);
});

async function dragNorth(editor: Page) {
  const map = await editor.getByLabel("OSM map editor").boundingBox();
  if (!map) throw new Error("지도가 없습니다.");
  // 왼쪽 메뉴와 레이어를 피해 실제 지도를 세 번 드래그합니다.
  for (let i = 0; i < 3; i++) {
    await editor.mouse.move(map.x + map.width * 0.75, map.y + map.height * 0.3);
    await editor.mouse.down();
    await editor.mouse.move(map.x + map.width * 0.75, map.y + map.height * 0.8, {
      steps: 15,
    });
    await editor.mouse.up();
  }
}

test("메뉴를 닫아도 드래그 후 범위를 자동 갱신하고 돌아오면 캐시를 재사용한다", async ({
  context,
  page,
}) => {
  const { editor, files } = await prepare(context, page);
  const before = await readEditorEdits(editor);
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  const menu = editor.getByRole("dialog", { name: "경계 종류", exact: true });
  await expect(menu.getByRole("status")).toHaveText("카운티 1개 표시");
  await editor.getByRole("button", { name: "경계 종류 닫기" }).click();
  await dragNorth(editor);
  // 메뉴를 열거나 새로고침 버튼을 누르기 전에 참고 레이어가 갱신되어야 합니다.
  await expect.poll(() => blackVectorPixels(editor)).toBe(0);
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  await expect(menu.getByRole("status")).toHaveText("카운티 0개 표시");
  const requests = files.length;
  await menu.getByRole("button", { name: "뉴욕", exact: true }).click();
  await expect(menu.getByRole("status")).toHaveText("카운티 1개 표시");
  await expect.poll(() => blackVectorPixels(editor)).toBeGreaterThan(100);
  expect(files).toHaveLength(requests);
  expect(await readEditorEdits(editor)).toEqual(before);
});

test("줌 축소로 새 파일을 자동 조회하고 확대할 때 캐시에서 현재 화면만 표시한다", async ({
  context,
  page,
}) => {
  const { editor, files } = await prepare(context, page, false, "US", true);
  const before = await readEditorEdits(editor);
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  const menu = editor.getByRole("dialog", { name: "경계 종류", exact: true });
  await expect(menu.getByRole("status")).toHaveText("카운티 1개 표시");
  await editor.getByRole("button", { name: "경계 종류 닫기" }).click();
  for (let i = 0; i < 3; i++)
    await editor.getByTitle("지도 축소", { exact: true }).click();
  await expect.poll(() => files.includes("z15-plus/county/0002.json")).toBe(true);
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  await expect(menu.getByRole("status")).toHaveText("카운티 2개 표시");
  await editor.getByRole("button", { name: "경계 종류 닫기" }).click();
  const requests = files.length;
  for (let i = 0; i < 3; i++)
    await editor.getByTitle("지도 확대", { exact: true }).click();
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  await expect(menu.getByRole("status")).toHaveText("카운티 1개 표시");
  expect(files).toHaveLength(requests);
  expect(files.filter((file) => file === "z15-plus/county/0002.json")).toHaveLength(1);
  expect(await readEditorEdits(editor)).toEqual(before);
});

test("지도 이동을 시작하면 이전 범위의 대기 다운로드를 취소한다", async ({
  context,
  page,
}) => {
  const { editor } = await prepare(context, page);
  let started = false;
  const aborted: string[] = [];
  editor.on("requestfailed", (request) => {
    if (request.url().includes("z15-plus")) aborted.push(request.url());
  });
  await context.route(
    (url) =>
      url.pathname === "/api/us-boundaries" &&
      url.searchParams.get("file")?.startsWith("z15-plus/") === true,
    () => {
      started = true;
    },
  );
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  await expect.poll(() => started).toBe(true);
  await editor.getByRole("button", { name: "경계 종류 닫기" }).click();
  await dragNorth(editor);
  await expect.poll(() => aborted.length).toBe(1);
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  const menu = editor.getByRole("dialog", { name: "경계 종류", exact: true });
  await expect(menu.getByRole("status")).toHaveText("카운티 0개 표시");
  await expect(menu.getByRole("alert")).toHaveCount(0);
});
