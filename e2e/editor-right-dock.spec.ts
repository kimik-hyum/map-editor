import { expect, test, type Page } from "@playwright/test";
import { readEditorEdits } from "./fixtures/mapNavigation";

async function openEditor(page: Page) {
  await page.goto("/ko/demo?country=US");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 탭으로 열기" }).click(),
  ]);
  await expect(
    editor.getByRole("button", { name: "권역 A 선택", exact: true }),
  ).toBeVisible();
  return editor;
}

test("오른쪽 패널은 지도에 겹치며 접고 펼쳐도 지도 크기·도형 위치·편집 상태를 보존한다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  const dock = editor.getByRole("complementary", { name: "속성과 레이어 패널" });
  const options = editor.getByRole("region", { name: "도구 옵션", exact: true });
  const layers = editor.getByRole("region", { name: "레이어", exact: true });
  const map = editor.getByLabel("OSM map editor");
  await editor.getByRole("button", { name: "권역 C 선택", exact: true }).click();
  // 선택 도형으로 이동하는 기존 350ms 애니메이션이 끝난 뒤 위치를 비교합니다.
  await editor.waitForTimeout(400);
  const [mapBox, dockBox, optionsBox, layersBox] = await Promise.all([
    map.boundingBox(),
    dock.boundingBox(),
    options.boundingBox(),
    layers.boundingBox(),
  ]);
  if (!mapBox || !dockBox || !optionsBox || !layersBox)
    throw new Error("패널 위치를 찾을 수 없습니다");
  expect(dockBox.x).toBeGreaterThan(mapBox.x);
  expect(dockBox.x + dockBox.width).toBe(mapBox.x + mapBox.width);
  expect(optionsBox.y + optionsBox.height).toBeLessThanOrEqual(layersBox.y);
  expect(optionsBox.x).toBe(layersBox.x);
  const before = await readEditorEdits(editor);
  const viewport = map.locator(".ol-viewport");
  const annotation = editor.locator("[data-map-annotation]").first();
  await expect(annotation).toBeVisible();
  const annotationBox = await annotation.boundingBox();
  await viewport.evaluate((node) => node.setAttribute("data-same-map", "yes"));
  await editor.getByRole("button", { name: "오른쪽 패널 접기" }).click();
  await expect(layers).toBeHidden();
  expect(await map.boundingBox()).toEqual(mapBox);
  expect(await annotation.boundingBox()).toEqual(annotationBox);
  await editor.getByRole("button", { name: "오른쪽 패널 펼치기" }).click();
  await expect(layers).toBeVisible();
  expect(await map.boundingBox()).toEqual(mapBox);
  expect(await annotation.boundingBox()).toEqual(annotationBox);
  await expect(viewport).toHaveAttribute("data-same-map", "yes");
  expect(await readEditorEdits(editor)).toEqual(before);
});

test("도구별 옵션은 오른쪽에서 바뀌고 지도 클릭과 도형 생성 뒤에도 유지된다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  await editor.getByRole("button", { name: "폴리곤 그리기" }).click();
  const options = editor.getByRole("region", { name: "추가할 도형" });
  await options.getByRole("button", { name: /^마커/ }).click();
  const before = await readEditorEdits(editor);
  await editor.getByLabel("OSM map editor").click({ position: { x: 350, y: 200 } });
  await expect(options).toBeVisible();
  await expect(
    editor.getByRole("region", { name: "레이어", exact: true }),
  ).toContainText("9개 도형");
  expect((await readEditorEdits(editor)).past).not.toEqual(before.past);
  await editor.getByRole("button", { name: "선택", exact: true }).click();
  await expect(editor.getByRole("region", { name: "선택 옵션" })).toBeVisible();
  await expect(options).toHaveCount(0);
});

test("좁은 화면에서 패널을 접고 도구를 누르면 화면 안에서 다시 열린다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  await editor.setViewportSize({ width: 390, height: 700 });
  await editor.getByRole("button", { name: "오른쪽 패널 접기" }).click();
  await editor.getByRole("button", { name: "폴리곤 그리기" }).click();
  const dock = editor.getByRole("complementary", { name: "속성과 레이어 패널" });
  const bounds = await dock.boundingBox();
  if (!bounds) throw new Error("패널이 없습니다");
  expect(bounds.x).toBeGreaterThanOrEqual(72);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(
    await editor.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await editor.getByRole("button", { name: "오른쪽 패널 접기" }).click();
  await expect(editor.getByRole("region", { name: "추가할 도형" })).toBeHidden();
  await expect(editor.getByLabel("OSM map editor")).toBeVisible();
});
