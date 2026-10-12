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
            features: 1,
            index: `indexes/${kind}.json`,
            shards: [{ key: `z15-plus/${kind}/0001.json`, bytes: 1000, features: 1 }],
          })),
        },
      });
    const kind = file.startsWith("indexes/")
      ? file.split("/")[1].replace(".json", "")
      : file.split("/")[1];
    const bbox = [-74.08, 40.65, -73.86, 40.85];
    if (file.startsWith("indexes/"))
      return route.fulfill({
        json: {
          ...common,
          kind,
          items: [{ id: `${kind}-ny`, bbox, object: `z15-plus/${kind}/0001.json` }],
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
            id: `${kind}-ny`,
            bbox,
            properties: { kind, code: "001", name: "Test boundary" },
            geometry: {
              type: "MultiPolygon",
              coordinates: [
                [
                  [
                    [-74.08, 40.65],
                    [-73.86, 40.65],
                    [-73.86, 40.85],
                    [-74.08, 40.85],
                    [-74.08, 40.65],
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
  const { editor, files } = await prepare(context, page);
  const before = await readEditorEdits(editor);
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  const panel = editor.getByRole("dialog", { name: "경계 종류", exact: true });
  await expect(panel.getByRole("status")).toHaveText("카운티 1개 표시");
  await expect.poll(() => blackVectorPixels(editor)).toBeGreaterThan(100);
  await expect(editor.getByRole("button", { name: /Google/ })).toHaveCount(0);
  expect(await readEditorEdits(editor)).toEqual(before);
  const requestsBefore = files.length;
  await panel.getByRole("button", { name: "현재 화면 불러오기" }).click();
  await expect(panel.getByRole("status")).toHaveText("카운티 1개 표시");
  expect(files).toHaveLength(requestsBefore);
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
