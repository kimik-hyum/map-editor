import { expect, test, type Page } from "@playwright/test";

type EditorSnapshot = {
  layerCount: number;
  pastCount: number;
  selectedFeatureIds: string[];
  lastFeature: {
    id: string;
    geometry: {
      type: string;
      coordinates: unknown;
    };
  } | null;
};

async function openEditorViaDemo(page: Page): Promise<Page> {
  await page.goto("/demo");
  const [editorPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await editorPage.waitForLoadState();
  await expect(editorPage.getByText("권역 A")).toBeVisible();
  return editorPage;
}

async function readEditorSnapshot(page: Page): Promise<EditorSnapshot> {
  return page.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    const lastLayer = state.scene?.layers[state.scene.layers.length - 1];
    const lastFeature = lastLayer?.features[0];
    return {
      layerCount: state.scene?.layers.length ?? 0,
      pastCount: state.past.length,
      selectedFeatureIds: state.selectedFeatureIds,
      lastFeature: lastFeature
        ? {
            id: lastFeature.id,
            geometry: lastFeature.feature.geometry,
          }
        : null,
    };
  });
}

async function activateDrawShape(page: Page, shape: "폴리곤" | "패스" | "마커") {
  await page.getByRole("button", { name: "폴리곤 그리기" }).click();
  const popup = page.getByRole("dialog", { name: "추가할 도형" });
  await expect(popup).toBeVisible();
  if (shape !== "폴리곤") {
    await popup.getByRole("button", { name: new RegExp(`^${shape}`) }).click();
  }
  await popup.getByRole("button", { name: "추가할 도형 닫기" }).click();
}

async function mapPoint(page: Page, xRatio: number, yRatio: number) {
  const box = await page.getByLabel("OSM map editor").boundingBox();
  if (!box) {
    throw new Error("지도 영역을 찾을 수 없습니다.");
  }
  return { x: box.x + box.width * xRatio, y: box.y + box.height * yRatio };
}

async function clickMapPoint(page: Page, xRatio: number, yRatio: number) {
  const point = await mapPoint(page, xRatio, yRatio);
  await page.mouse.click(point.x, point.y);
}

async function readMapCursor(page: Page): Promise<string> {
  return page
    .getByLabel("OSM map editor")
    .locator(".ol-viewport")
    .evaluate((element) => {
      return (element as HTMLElement).style.cursor;
    });
}

async function platformModifier(page: Page): Promise<"Meta" | "Control"> {
  return page.evaluate(() =>
    /Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control",
  );
}

test("마커는 클릭 한 번마다 별도 레이어로 즉시 완성된다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  await activateDrawShape(editorPage, "마커");
  expect(await readMapCursor(editorPage)).toContain("data:image/svg+xml");
  expect(await readMapCursor(editorPage)).toContain("13 30");

  await clickMapPoint(editorPage, 0.55, 0.3);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);

  const first = await readEditorSnapshot(editorPage);
  expect(first.lastFeature?.geometry.type).toBe("Point");
  expect(first.pastCount).toBe(before.pastCount + 1);
  expect(first.selectedFeatureIds).toEqual([first.lastFeature?.id]);

  // Draw 도구는 sticky이므로 두 번째 클릭도 새 레이어를 만듭니다.
  await clickMapPoint(editorPage, 0.6, 0.35);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 2);
});

test("Path는 정점 로컬 undo/redo 후 완료 버튼으로 별도 레이어가 된다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  await activateDrawShape(editorPage, "패스");
  expect(await readMapCursor(editorPage)).toContain("data:image/svg+xml");
  expect(await readMapCursor(editorPage)).toContain("7 7");

  await clickMapPoint(editorPage, 0.5, 0.25);
  const finishButton = editorPage.getByRole("button", { name: "패스 그리기 완료" });
  await expect(finishButton).toBeVisible();
  await expect(finishButton).toHaveClass(/bg-emerald-600/);
  await expect(finishButton.locator("svg")).toHaveClass(/lucide-flag-triangle-right/);
  await expect(finishButton).toBeDisabled();
  await expect(finishButton).toContainText("1점");

  const modifier = await platformModifier(editorPage);
  // 첫 정점까지 undo하면 sketch가 잠시 끝나지만, 로컬 redo로 다시 복원할 수 있습니다.
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(finishButton).toBeHidden();
  expect((await readEditorSnapshot(editorPage)).pastCount).toBe(before.pastCount);
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect(finishButton).toBeVisible();
  await expect(finishButton).toContainText("1점");

  await clickMapPoint(editorPage, 0.6, 0.35);
  await clickMapPoint(editorPage, 0.7, 0.25);
  await expect(finishButton).toBeEnabled();
  await expect(finishButton).toContainText("3점");

  const duringSketch = await readEditorSnapshot(editorPage);
  expect(duringSketch.layerCount).toBe(before.layerCount);
  expect(duringSketch.pastCount).toBe(before.pastCount);

  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(finishButton).toContainText("2점");
  expect((await readEditorSnapshot(editorPage)).pastCount).toBe(before.pastCount);

  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect(finishButton).toContainText("3점");

  await finishButton.click();
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);

  const completed = await readEditorSnapshot(editorPage);
  expect(completed.lastFeature?.geometry.type).toBe("LineString");
  expect(completed.lastFeature?.geometry.coordinates).toHaveLength(3);
  expect(completed.pastCount).toBe(before.pastCount + 1);

  // sketch가 끝난 뒤의 undo는 완성된 레이어 전체를 되돌립니다.
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount);
});

test("Path는 완성 가능한 상태에서 Enter로 모달 없이 완성된다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  await activateDrawShape(editorPage, "패스");

  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);
  await editorPage.keyboard.press("Enter");

  await expect(editorPage.getByRole("alertdialog")).toHaveCount(0);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);

  const completed = await readEditorSnapshot(editorPage);
  expect(completed.lastFeature?.geometry.type).toBe("LineString");
  expect(completed.pastCount).toBe(before.pastCount + 1);
});

test("폴리곤은 마지막 정점이 아니라 시작점을 클릭해야 별도 레이어로 완성된다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  await activateDrawShape(editorPage, "폴리곤");
  expect(await readMapCursor(editorPage)).toContain("data:image/svg+xml");
  expect(await readMapCursor(editorPage)).toContain("7 7");

  const start = await mapPoint(editorPage, 0.5, 0.3);
  const second = await mapPoint(editorPage, 0.62, 0.2);
  const third = await mapPoint(editorPage, 0.68, 0.4);
  await editorPage.mouse.click(start.x, start.y);
  await editorPage.mouse.click(second.x, second.y);
  await editorPage.mouse.click(third.x, third.y);

  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);

  // 폴리곤은 Enter 완료를 지원하지 않고, 시작점 클릭 규칙만 유지합니다.
  await editorPage.keyboard.press("Enter");
  await expect(editorPage.getByRole("alertdialog")).toHaveCount(0);
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);

  // OpenLayers 기본 동작과 달리 마지막 정점 재클릭으로는 끝내지 않습니다.
  await editorPage.mouse.click(third.x, third.y);
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);

  await editorPage.mouse.click(start.x, start.y);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);

  const completed = await readEditorSnapshot(editorPage);
  expect(completed.lastFeature?.geometry.type).toBe("Polygon");
  const coordinates = completed.lastFeature?.geometry.coordinates as number[][][];
  expect(coordinates[0][coordinates[0].length - 1]).toEqual(coordinates[0][0]);
  expect(completed.pastCount).toBe(before.pastCount + 1);
});

test("ESC 확인 모달에서 계속 그리거나 Path sketch만 취소할 수 있다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  await activateDrawShape(editorPage, "패스");

  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);
  await expect(
    editorPage.getByRole("button", { name: "패스 그리기 완료" }),
  ).toBeVisible();

  await editorPage.keyboard.press("Escape");
  const dialog = editorPage.getByRole("alertdialog", { name: "그리기를 취소할까요?" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("지금까지 찍은 점 2개는 저장되지 않습니다."),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "계속 그리기" })).toBeFocused();

  // 모달의 ESC는 안전한 기본값인 '계속 그리기'로 닫힙니다.
  await editorPage.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    editorPage.getByRole("button", { name: "패스 그리기 완료" }),
  ).toBeVisible();
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);

  await editorPage.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "그리기 취소" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    editorPage.getByRole("button", { name: "패스 그리기 완료" }),
  ).toBeHidden();
  const after = await readEditorSnapshot(editorPage);
  expect(after.layerCount).toBe(before.layerCount);
  expect(after.pastCount).toBe(before.pastCount);
});
