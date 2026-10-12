import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  US_BOUNDARY_KINDS,
  US_BOUNDARY_VERSION,
} from "../src/shared/config/usBoundaries";
import { readEditorEdits } from "./fixtures/mapNavigation";

async function prepare(context: BrowserContext, page: Page, fail = false) {
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
  await page.goto("/demo");
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
  await editor.getByRole("button", { name: "미국 경계 보기" }).click();
  const panel = editor.getByRole("region", { name: "미국 경계", exact: true });
  await expect(panel.getByRole("status")).toHaveText("카운티 1개 표시");
  await expect.poll(() => blackVectorPixels(editor)).toBeGreaterThan(100);
  await expect(editor.getByRole("button", { name: /Google/ })).toHaveCount(0);
  expect(await readEditorEdits(editor)).toEqual(before);
  const requestsBefore = files.length;
  await panel.getByRole("button", { name: "현재 화면 불러오기" }).click();
  await expect(panel.getByRole("status")).toHaveText("카운티 1개 표시");
  expect(files).toHaveLength(requestsBefore);
  await panel.getByLabel("미국 경계 종류").selectOption("place");
  await panel.getByRole("button", { name: "현재 화면 불러오기" }).click();
  await expect(panel.getByRole("status")).toHaveText("도시·타운 1개 표시");
  await panel.getByRole("button", { name: "미국 경계 닫기" }).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(() => blackVectorPixels(editor)).toBe(0);
  expect(await readEditorEdits(editor)).toEqual(before);
});

test("미국 경계 요청 실패 후 재시도하고 다른 지역의 빈 결과를 표시한다", async ({
  context,
  page,
}) => {
  const { editor } = await prepare(context, page, true);
  await editor.getByRole("button", { name: "미국 경계 보기" }).click();
  const panel = editor.getByRole("region", { name: "미국 경계", exact: true });
  await expect(panel.getByRole("alert")).toContainText("다시 시도");
  await panel.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText("카운티 1개 표시");
  await panel.getByRole("button", { name: "샌프란시스코" }).click();
  await expect(panel.getByRole("status")).toHaveText("카운티 0개 표시");
});
