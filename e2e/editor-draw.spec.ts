import { expect, test, type Page } from "@playwright/test";

type EditorSnapshot = {
  layerCount: number;
  pastCount: number;
  futureCount: number;
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

async function replaceEditorSession(
  page: Page,
  sessionId: string,
  featureName: string,
) {
  await page.evaluate(
    ({ nextSessionId, nextFeatureName }) => {
      window.open("", "map-editor-child")?.postMessage(
        {
          type: "MAP_EDITOR_INIT",
          sessionId: nextSessionId,
          scene: {
            version: 2,
            features: [
              {
                name: nextFeatureName,
                geometry: { type: "Point", coordinates: [126.98, 37.56] },
              },
            ],
          },
        },
        window.location.origin,
      );
    },
    { nextSessionId: sessionId, nextFeatureName: featureName },
  );
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
      futureCount: state.future.length,
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

async function pasteMarker(page: Page) {
  return page.evaluate(async () => {
    const { serializeClipboardPayload } =
      await import("/src/pages/editor/features/clipboard/model/clipboardPayload.ts");
    const clipboardData = new DataTransfer();
    const text = serializeClipboardPayload([
      {
        name: "붙여넣은 마커",
        geometry: { type: "Point", coordinates: [126.98, 37.56] },
      },
    ]);
    clipboardData.setData("application/json", text);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: clipboardData });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

async function dispatchClipboardEvent(page: Page, type: "copy" | "cut") {
  return page.evaluate((eventType) => {
    const clipboardData = new DataTransfer();
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: clipboardData });
    window.dispatchEvent(event);
    return {
      defaultPrevented: event.defaultPrevented,
      applicationJson: clipboardData.getData("application/json"),
    };
  }, type);
}

test("마커는 클릭 한 번마다 별도 레이어로 즉시 완성된다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  await activateDrawShape(editorPage, "마커");
  expect(await readMapCursor(editorPage)).toContain("data:image/svg+xml");
  expect(await readMapCursor(editorPage)).toContain("10 23");

  const rejectedPoint = await mapPoint(editorPage, 0.5, 0.25);
  await editorPage.mouse.click(rejectedPoint.x, rejectedPoint.y, { button: "right" });
  await editorPage.mouse.click(rejectedPoint.x, rejectedPoint.y, { button: "middle" });
  await editorPage.keyboard.down("Control");
  await editorPage.mouse.click(rejectedPoint.x, rejectedPoint.y);
  await editorPage.keyboard.up("Control");
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);

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
  expect(await readMapCursor(editorPage)).toContain("5 5");

  const cursorTooltip = editorPage.locator('main > [role="status"]');
  const tooltipPoint = await mapPoint(editorPage, 0.5, 0.8);
  await editorPage.mouse.move(tooltipPoint.x, tooltipPoint.y);
  await expect(cursorTooltip).toBeVisible();
  await editorPage.locator("aside").hover();
  await expect(cursorTooltip).toBeHidden();
  const mapBounds = await editorPage.getByLabel("OSM map editor").boundingBox();
  if (!mapBounds) {
    throw new Error("지도 영역을 찾을 수 없습니다.");
  }
  await editorPage.mouse.move(mapBounds.x + mapBounds.width - 2, mapBounds.y + 2);
  await expect(cursorTooltip).toBeVisible();
  await expect
    .poll(async () => {
      const tooltipBounds = await cursorTooltip.boundingBox();
      return (
        tooltipBounds !== null &&
        tooltipBounds.x >= mapBounds.x &&
        tooltipBounds.y >= mapBounds.y &&
        tooltipBounds.x + tooltipBounds.width <= mapBounds.x + mapBounds.width
      );
    })
    .toBe(true);

  await clickMapPoint(editorPage, 0.5, 0.25);
  const finishButton = editorPage.getByRole("button", { name: "패스 그리기 완료" });
  await expect(finishButton).toBeVisible();
  await expect(finishButton).toHaveClass(/bg-emerald-700/);
  await expect(finishButton.locator("svg")).toHaveClass(/lucide-flag-triangle-right/);
  await expect(finishButton).toBeDisabled();
  await expect(finishButton).toContainText("1점");

  const modifier = await platformModifier(editorPage);
  // 첫 정점까지 undo하면 sketch가 잠시 끝나지만, 로컬 redo로 다시 복원할 수 있습니다.
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(finishButton).toBeHidden();
  expect((await readEditorSnapshot(editorPage)).pastCount).toBe(before.pastCount);
  // 전역 past가 비어 있을 때 추가 Undo를 눌러도 복구 가능한 로컬 redo는 유지합니다.
  await editorPage.keyboard.press(`${modifier}+z`);
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect(finishButton).toBeVisible();
  await expect(finishButton).toContainText("1점");

  await clickMapPoint(editorPage, 0.6, 0.35);
  await clickMapPoint(editorPage, 0.7, 0.25);
  await expect(finishButton).toBeEnabled();
  await expect(finishButton).toContainText("3점");

  const rejectedPoint = await mapPoint(editorPage, 0.75, 0.4);
  await editorPage.mouse.click(rejectedPoint.x, rejectedPoint.y, { button: "right" });
  await editorPage.mouse.click(rejectedPoint.x, rejectedPoint.y, { button: "middle" });
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

test("첫 정점 undo의 로컬 redo는 Draw 모드나 도형을 벗어나면 폐기된다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  await activateDrawShape(editorPage, "패스");
  const modifier = await platformModifier(editorPage);
  const finishButton = editorPage.getByRole("button", { name: "패스 그리기 완료" });

  await clickMapPoint(editorPage, 0.5, 0.25);
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(finishButton).toBeHidden();

  await editorPage.getByRole("button", { name: "선택", exact: true }).click();
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await editorPage.getByRole("button", { name: "패스 그리기", exact: true }).click();
  await editorPage
    .getByRole("dialog", { name: "추가할 도형" })
    .getByRole("button", { name: "추가할 도형 닫기" })
    .click();

  await expect(finishButton).toBeHidden();
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);

  // 도형을 바꾸는 경로에서도 이전 Path 좌표가 Polygon으로 복구되지 않습니다.
  await clickMapPoint(editorPage, 0.5, 0.25);
  await editorPage.keyboard.press(`${modifier}+z`);
  await editorPage.getByRole("button", { name: "패스 그리기", exact: true }).click();
  const popup = editorPage.getByRole("dialog", { name: "추가할 도형" });
  await popup.getByRole("button", { name: /^폴리곤/ }).click();
  await popup.getByRole("button", { name: "추가할 도형 닫기" }).click();
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect(finishButton).toBeHidden();
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);
  await editorPage.keyboard.press("Escape");
  await expect(editorPage.getByRole("alertdialog")).toHaveCount(0);
});

test("붙여넣기 scene 편집은 그보다 오래된 Draw 로컬 redo를 폐기한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  const modifier = await platformModifier(editorPage);
  await activateDrawShape(editorPage, "패스");
  const finishButton = editorPage.getByRole("button", { name: "패스 그리기 완료" });

  await clickMapPoint(editorPage, 0.5, 0.25);
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(finishButton).toBeHidden();

  await pasteMarker(editorPage);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);

  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect(finishButton).toBeHidden();
});

test("진행 중 sketch에서는 copy/cut/paste를 차단하고 로컬 history만 유지한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  const modifier = await platformModifier(editorPage);
  await activateDrawShape(editorPage, "패스");
  const finishButton = editorPage.getByRole("button", { name: "패스 그리기 완료" });

  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);
  await expect(finishButton).toContainText("2점");

  const copyResult = await dispatchClipboardEvent(editorPage, "copy");
  const cutResult = await dispatchClipboardEvent(editorPage, "cut");
  expect(copyResult).toEqual({ defaultPrevented: true, applicationJson: "" });
  expect(cutResult.defaultPrevented).toBe(true);
  expect(await pasteMarker(editorPage)).toBe(true);
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);
  await expect(finishButton).toContainText("2점");

  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(finishButton).toContainText("1점");
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect(finishButton).toContainText("2점");
  expect((await readEditorSnapshot(editorPage)).pastCount).toBe(before.pastCount);
});

test("전역 undo가 실행되면 로컬 redo 분기를 버리고 전역 redo 순서를 지킨다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  const modifier = await platformModifier(editorPage);

  await activateDrawShape(editorPage, "마커");
  await clickMapPoint(editorPage, 0.55, 0.3);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);

  await editorPage.getByRole("button", { name: "마커 그리기" }).click();
  const popup = editorPage.getByRole("dialog", { name: "추가할 도형" });
  await popup.getByRole("button", { name: /^패스/ }).click();
  await popup.getByRole("button", { name: "추가할 도형 닫기" }).click();
  const finishButton = editorPage.getByRole("button", { name: "패스 그리기 완료" });

  await clickMapPoint(editorPage, 0.5, 0.25);
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(finishButton).toBeHidden();

  await editorPage.keyboard.press(`${modifier}+z`);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount);

  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);
  await expect(finishButton).toBeHidden();
});

test("진행 중 sketch에서는 로컬 redo가 없어도 전역 redo를 실행하지 않는다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  const modifier = await platformModifier(editorPage);

  await activateDrawShape(editorPage, "마커");
  await clickMapPoint(editorPage, 0.55, 0.3);
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).futureCount)
    .toBe(1);

  await editorPage.getByRole("button", { name: "마커 그리기" }).click();
  const popup = editorPage.getByRole("dialog", { name: "추가할 도형" });
  await popup.getByRole("button", { name: /^패스/ }).click();
  await popup.getByRole("button", { name: "추가할 도형 닫기" }).click();
  const finishButton = editorPage.getByRole("button", { name: "패스 그리기 완료" });

  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);
  await expect(finishButton).toContainText("2점");

  const beforeRedo = await readEditorSnapshot(editorPage);
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect(finishButton).toContainText("2점");
  const afterBlockedRedo = await readEditorSnapshot(editorPage);
  expect(afterBlockedRedo.layerCount).toBe(beforeRedo.layerCount);
  expect(afterBlockedRedo.pastCount).toBe(beforeRedo.pastCount);
  expect(afterBlockedRedo.futureCount).toBe(beforeRedo.futureCount);

  // sketch 취소 뒤에는 보존된 전역 future를 다시 적용할 수 있습니다.
  await editorPage.keyboard.press("Escape");
  await editorPage
    .getByRole("alertdialog", { name: "그리기를 취소할까요?" })
    .getByRole("button", { name: "그리기 취소" })
    .click();
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);
});

test("진행 중 sketch를 두고 도형이나 모드를 바꾸면 취소 확인을 거친다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  await activateDrawShape(editorPage, "패스");
  const finishButton = editorPage.getByRole("button", { name: "패스 그리기 완료" });
  const map = editorPage.getByLabel("OSM map editor");

  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);
  await editorPage.getByRole("button", { name: "패스 그리기", exact: true }).click();
  let popup = editorPage.getByRole("dialog", { name: "추가할 도형" });
  await popup.getByRole("button", { name: /^폴리곤/ }).click();

  const dialog = editorPage.getByRole("alertdialog", { name: "그리기를 취소할까요?" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("지금까지 찍은 점 2개는 저장되지 않습니다."),
  ).toBeVisible();
  await editorPage.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(map).toBeFocused();
  await expect(finishButton).toContainText("2점");

  await editorPage.getByRole("button", { name: "패스 그리기", exact: true }).click();
  popup = editorPage.getByRole("dialog", { name: "추가할 도형" });
  await popup.getByRole("button", { name: /^폴리곤/ }).click();
  await dialog.getByRole("button", { name: "그리기 취소" }).click();
  await expect(dialog).toBeHidden();
  await expect(editorPage.getByRole("button", { name: "폴리곤 그리기" })).toBeVisible();
  await expect(finishButton).toBeHidden();
  await expect(popup).toBeHidden();
  await editorPage.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await activateDrawShape(editorPage, "패스");
  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);
  await editorPage.getByRole("button", { name: "선택", exact: true }).click();
  await expect(dialog).toBeVisible();
  await editorPage.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(map).toBeFocused();
  await expect(finishButton).toContainText("2점");

  await editorPage.getByRole("button", { name: "선택", exact: true }).click();
  await dialog.getByRole("button", { name: "그리기 취소" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    editorPage.getByRole("button", { name: "선택", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(finishButton).toBeHidden();
});

test("새 INIT은 이전 session의 draw 확인과 지연된 모드·도형 전환을 취소한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  await activateDrawShape(editorPage, "패스");
  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);

  await editorPage.getByRole("button", { name: "행정동 경계" }).click();
  const dialog = editorPage.getByRole("alertdialog", { name: "그리기를 취소할까요?" });
  await expect(dialog).toBeVisible();
  await replaceEditorSession(page, "mode-replacement", "모드 교체 도형");
  await expect(dialog).toBeHidden();
  await expect(editorPage.getByText("모드 교체 도형")).toBeVisible();
  await expect(
    editorPage.getByRole("button", { name: "선택", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  await activateDrawShape(editorPage, "패스");
  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);
  await editorPage.getByRole("button", { name: "패스 그리기", exact: true }).click();
  const popup = editorPage.getByRole("dialog", { name: "추가할 도형" });
  await popup.getByRole("button", { name: /^마커/ }).click();
  await expect(dialog).toBeVisible();

  await replaceEditorSession(page, "shape-replacement", "도형 교체 도형");
  await expect(dialog).toBeHidden();
  await expect(editorPage.getByText("도형 교체 도형")).toBeVisible();
  await editorPage.getByRole("button", { name: "선택", exact: true }).click();
  await expect(editorPage.getByRole("button", { name: "폴리곤 그리기" })).toBeVisible();
});

test("Path는 완성 가능한 상태에서 Enter로 모달 없이 완성된다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  const crosshair = editorPage.getByTestId("draw-keyboard-crosshair");
  await activateDrawShape(editorPage, "패스");

  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);
  await expect(crosshair).toHaveCount(0);
  await editorPage.keyboard.press("Enter");

  await expect(editorPage.getByRole("alertdialog")).toHaveCount(0);
  await expect(crosshair).toHaveCount(0);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);

  const completed = await readEditorSnapshot(editorPage);
  expect(completed.lastFeature?.geometry.type).toBe("LineString");
  expect(completed.pastCount).toBe(before.pastCount + 1);
});

test("키보드로 지도 중심에 Marker·Path·Polygon을 추가할 수 있다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  const map = editorPage.getByLabel("OSM map editor");

  await activateDrawShape(editorPage, "마커");
  await expect(map).toHaveAttribute("tabindex", "0");
  await expect(map).toHaveAttribute("aria-keyshortcuts", "K Space");
  await map.focus();
  await expect(map).toBeFocused();
  const crosshair = editorPage.getByTestId("draw-keyboard-crosshair");
  await expect(crosshair).toHaveCount(0);
  await editorPage.keyboard.press("Space");
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);
  await editorPage.keyboard.press("k");
  await expect(crosshair).toBeVisible();
  await editorPage.keyboard.press("k");
  await expect(crosshair).toHaveCount(0);
  await editorPage.keyboard.press("Space");
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);
  await editorPage.keyboard.press("k");
  await expect(crosshair).toBeVisible();
  await editorPage.keyboard.press("Space");
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);
  await expect(crosshair).toHaveCount(0);

  await editorPage.getByRole("button", { name: "마커 그리기" }).click();
  let popup = editorPage.getByRole("dialog", { name: "추가할 도형" });
  await popup.getByRole("button", { name: /^패스/ }).click();
  await popup.getByRole("button", { name: "추가할 도형 닫기" }).click();
  await expect(map).toHaveAttribute("aria-keyshortcuts", "K Space Enter");
  await map.focus();
  await editorPage.keyboard.press("k");
  await expect(crosshair).toBeVisible();
  await editorPage.keyboard.press("Space");
  await editorPage.keyboard.press("ArrowRight");
  await editorPage.waitForTimeout(300);
  await editorPage.keyboard.press("Space");
  await expect(
    editorPage.getByRole("button", { name: "패스 그리기 완료" }),
  ).toBeEnabled();
  await editorPage.keyboard.press("Enter");
  await expect(crosshair).toHaveCount(0);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 2);

  await editorPage.getByRole("button", { name: "패스 그리기" }).click();
  popup = editorPage.getByRole("dialog", { name: "추가할 도형" });
  await popup.getByRole("button", { name: /^폴리곤/ }).click();
  await popup.getByRole("button", { name: "추가할 도형 닫기" }).click();
  await expect(map).toHaveAttribute("aria-keyshortcuts", "K Space");
  await map.focus();
  await editorPage.keyboard.press("k");
  await expect(crosshair).toBeVisible();
  await editorPage.keyboard.press("Space");
  await editorPage.keyboard.press("ArrowRight");
  await editorPage.waitForTimeout(300);
  await editorPage.keyboard.press("Space");
  await editorPage.keyboard.press("ArrowDown");
  await editorPage.waitForTimeout(300);
  await editorPage.keyboard.press("Space");
  const closeButton = editorPage.getByRole("button", {
    name: "폴리곤 시작점에서 닫기",
  });
  await expect(closeButton).toBeEnabled();
  await closeButton.focus();
  await editorPage.keyboard.press("Enter");
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 3);
  expect((await readEditorSnapshot(editorPage)).lastFeature?.geometry.type).toBe(
    "Polygon",
  );
});

test("키보드 Polygon은 같은 좌표를 무시하고 서로 다른 정점 세 개에서만 닫힌다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  const map = editorPage.getByLabel("OSM map editor");
  const modifier = await platformModifier(editorPage);
  await activateDrawShape(editorPage, "폴리곤");
  await map.focus();
  await editorPage.keyboard.press("k");

  await editorPage.keyboard.press("Space");
  await editorPage.keyboard.press("Space");
  await editorPage.keyboard.press("Space");
  const closeButton = editorPage.getByRole("button", {
    name: "폴리곤 시작점에서 닫기",
  });
  await expect(closeButton).toContainText("1점");
  await expect(closeButton).toBeDisabled();
  expect((await readEditorSnapshot(editorPage)).layerCount).toBe(before.layerCount);

  // 무시된 두 입력은 로컬 history를 만들지 않아 undo 한 번으로 첫 정점만 제거됩니다.
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(closeButton).toBeHidden();
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect(closeButton).toContainText("1점");

  await editorPage.keyboard.press("ArrowRight");
  await editorPage.waitForTimeout(300);
  await editorPage.keyboard.press("Space");
  await editorPage.keyboard.press("ArrowDown");
  await editorPage.waitForTimeout(300);
  await editorPage.keyboard.press("Space");
  await expect(closeButton).toBeEnabled();
  await closeButton.click();

  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);
  const completed = await readEditorSnapshot(editorPage);
  const ring = completed.lastFeature?.geometry.coordinates as number[][][];
  expect(
    new Set(ring[0].slice(0, -1).map((coordinate) => coordinate.join(","))).size,
  ).toBe(3);
});

test("지도 크기가 바뀌면 커서 툴팁을 새 경계 안으로 다시 배치한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  await editorPage.setViewportSize({ width: 1280, height: 820 });
  await activateDrawShape(editorPage, "마커");
  const map = editorPage.getByLabel("OSM map editor");
  const tooltip = editorPage.locator('main > [role="status"]');

  await editorPage.mouse.move(760, 580);
  await expect(tooltip).toBeVisible();
  await editorPage.setViewportSize({ width: 800, height: 600 });

  await expect
    .poll(async () => {
      const [mapBounds, tooltipBounds] = await Promise.all([
        map.boundingBox(),
        tooltip.boundingBox(),
      ]);
      return (
        mapBounds !== null &&
        tooltipBounds !== null &&
        tooltipBounds.x >= mapBounds.x &&
        tooltipBounds.y >= mapBounds.y &&
        tooltipBounds.x + tooltipBounds.width <= mapBounds.x + mapBounds.width &&
        tooltipBounds.y + tooltipBounds.height <= mapBounds.y + mapBounds.height
      );
    })
    .toBe(true);
});

test("ESC로 계속 그리기를 선택한 뒤 Enter는 Path를 완성한다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  await activateDrawShape(editorPage, "패스");
  const map = editorPage.getByLabel("OSM map editor");

  await clickMapPoint(editorPage, 0.5, 0.25);
  await clickMapPoint(editorPage, 0.6, 0.35);
  await editorPage.keyboard.press("Escape");
  const dialog = editorPage.getByRole("alertdialog", { name: "그리기를 취소할까요?" });
  await expect(dialog).toBeVisible();
  await editorPage.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(map).toBeFocused();

  await editorPage.keyboard.press("Enter");
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);
  await expect(editorPage.getByRole("dialog", { name: "추가할 도형" })).toHaveCount(0);
});

test("폴리곤은 마지막 정점이 아니라 시작점을 클릭해야 별도 레이어로 완성된다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  await activateDrawShape(editorPage, "폴리곤");
  expect(await readMapCursor(editorPage)).toContain("data:image/svg+xml");
  expect(await readMapCursor(editorPage)).toContain("5 5");

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

test("Polygon 정점 수와 undo/redo는 이동 중 커서가 아니라 확정 좌표를 보존한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const before = await readEditorSnapshot(editorPage);
  const modifier = await platformModifier(editorPage);
  await activateDrawShape(editorPage, "폴리곤");

  const start = await mapPoint(editorPage, 0.5, 0.3);
  const second = await mapPoint(editorPage, 0.62, 0.2);
  const third = await mapPoint(editorPage, 0.68, 0.4);
  const movedCursor = await mapPoint(editorPage, 0.8, 0.6);

  // 같은 화면 좌표로 먼저 기준 Polygon을 완성해 원래 세 번째 좌표를 기록합니다.
  await editorPage.mouse.click(start.x, start.y);
  await editorPage.mouse.click(second.x, second.y);
  await editorPage.mouse.click(third.x, third.y);
  await editorPage.mouse.click(start.x, start.y);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);
  const baseline = await readEditorSnapshot(editorPage);
  const baselineRing = baseline.lastFeature?.geometry.coordinates as number[][][];

  await editorPage.keyboard.press(`${modifier}+z`);
  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount);

  await editorPage.mouse.click(start.x, start.y);
  await editorPage.mouse.click(second.x, second.y);
  await editorPage.mouse.click(third.x, third.y);
  await editorPage.mouse.move(movedCursor.x, movedCursor.y, { steps: 10 });

  await editorPage.keyboard.press("Escape");
  const dialog = editorPage.getByRole("alertdialog", { name: "그리기를 취소할까요?" });
  await expect(
    dialog.getByText("지금까지 찍은 점 3개는 저장되지 않습니다."),
  ).toBeVisible();
  await editorPage.keyboard.press("Escape");

  await editorPage.keyboard.press(`${modifier}+z`);
  await editorPage.keyboard.press("Escape");
  await expect(
    dialog.getByText("지금까지 찍은 점 2개는 저장되지 않습니다."),
  ).toBeVisible();
  await editorPage.keyboard.press("Escape");
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await editorPage.mouse.click(start.x, start.y);

  await expect
    .poll(async () => (await readEditorSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);
  const restored = await readEditorSnapshot(editorPage);
  const restoredRing = restored.lastFeature?.geometry.coordinates as number[][][];
  expect(restoredRing[0][2]).toEqual(baselineRing[0][2]);
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
  const cursorTooltip = editorPage.locator('main > [role="status"]');
  await expect(cursorTooltip).toBeHidden();
  const [modalZIndex, tooltipZIndex] = await Promise.all([
    dialog.evaluate((element) =>
      Number.parseInt(
        getComputedStyle(element.parentElement as HTMLElement).zIndex,
        10,
      ),
    ),
    cursorTooltip.evaluate((element) =>
      Number.parseInt(getComputedStyle(element).zIndex, 10),
    ),
  ]);
  expect(modalZIndex).toBeGreaterThan(tooltipZIndex);

  // 모달이 열린 동안에는 배경 sketch의 history를 변경하지 않습니다.
  const modifier = await platformModifier(editorPage);
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(
    editorPage.locator('button[aria-label="패스 그리기 완료"]'),
  ).toContainText("2점");
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  // alertdialog가 배경을 접근성 트리에서 숨기므로 DOM에서 직접 sketch 상태를 확인합니다.
  await expect(
    editorPage.locator('button[aria-label="패스 그리기 완료"]'),
  ).toContainText("2점");
  await expect(
    dialog.getByText("지금까지 찍은 점 2개는 저장되지 않습니다."),
  ).toBeVisible();

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
