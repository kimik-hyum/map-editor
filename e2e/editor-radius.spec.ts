import { expect, test, type Page } from "@playwright/test";

type RadiusSnapshot = {
  activeMode: string;
  layerCount: number;
  pastCount: number;
  futureCount: number;
  selectedFeatureIds: string[];
  markerGeometry: unknown;
  lastFeature: {
    id: string;
    name?: string;
    geometry: { type: string; coordinates: unknown };
    properties?: Record<string, unknown>;
  } | null;
};

async function openEditorWithMarkers(page: Page): Promise<Page> {
  await page.goto("/demo");
  const [editorPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await editorPage.waitForLoadState();
  // 자식 에디터가 메시지 listener를 붙이고 데모의 최초 INIT을 받은 뒤 테스트 scene으로 교체합니다.
  await expect(editorPage.getByText("권역 A")).toBeVisible();

  await page.evaluate(() => {
    window.open("", "map-editor-child")?.postMessage(
      {
        type: "MAP_EDITOR_INIT",
        sessionId: "radius-e2e",
        scene: {
          version: 2,
          viewport: { center: [126.98, 37.57], zoom: 13 },
          features: [
            {
              id: "existing-area",
              name: "기존 권역",
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [126.96, 37.55],
                    [127, 37.55],
                    [127, 37.59],
                    [126.96, 37.59],
                    [126.96, 37.55],
                  ],
                ],
              },
            },
            {
              id: "existing-route",
              name: "기존 경로",
              geometry: {
                type: "LineString",
                coordinates: [
                  [126.97, 37.56],
                  [126.99, 37.58],
                ],
              },
            },
            {
              id: "radius-marker",
              name: "반경 기준 마커",
              locked: true,
              geometry: { type: "Point", coordinates: [126.98, 37.57] },
            },
          ],
        },
      },
      window.location.origin,
    );
  });

  await expect(
    editorPage.getByRole("button", { name: "반경 기준 마커 선택" }),
  ).toBeVisible();
  return editorPage;
}

async function readRadiusSnapshot(page: Page): Promise<RadiusSnapshot> {
  return page.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    const marker = state.scene?.layers
      .flatMap((layer) => layer.features)
      .find((feature) => feature.id === "radius-marker");
    const lastLayer = state.scene?.layers[state.scene.layers.length - 1];
    const lastFeature = lastLayer?.features[0];
    return {
      activeMode: state.activeMode,
      layerCount: state.scene?.layers.length ?? 0,
      pastCount: state.past.length,
      futureCount: state.future.length,
      selectedFeatureIds: state.selectedFeatureIds,
      markerGeometry: marker?.feature.geometry ?? null,
      lastFeature: lastFeature
        ? {
            id: lastFeature.id,
            name: lastFeature.name,
            geometry: lastFeature.feature.geometry,
            properties: lastFeature.feature.properties,
          }
        : null,
    };
  });
}

async function platformModifier(page: Page): Promise<"Meta" | "Control"> {
  return page.evaluate(() =>
    /Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control",
  );
}

test("선택된 마커에서 반경 입력·미리보기·생성을 한 history 단계에 커밋한다", async ({
  page,
}) => {
  const editorPage = await openEditorWithMarkers(page);
  const markerButton = editorPage.getByRole("button", {
    name: "반경 기준 마커 선택",
  });
  await markerButton.click();
  const before = await readRadiusSnapshot(editorPage);

  await editorPage.getByRole("button", { name: "반경", exact: true }).click();
  const popup = editorPage.getByRole("dialog", { name: "반경 입력" });
  await expect(popup).toBeVisible();
  await expect(popup).toContainText("기준: 반경 기준 마커");

  const input = popup.getByRole("textbox", { name: "반경" });
  await expect(input).toBeFocused();
  await input.fill("1.234");
  await expect(popup).toContainText("소수점 이하 두 자리");
  await expect(popup.getByRole("button", { name: "원형 폴리곤 추가" })).toBeDisabled();

  await input.fill("1.25");
  await expect(popup.getByRole("button", { name: "원형 폴리곤 추가" })).toBeEnabled();
  // 입력 중에는 scene/history가 바뀌지 않고 OpenLayers 임시 미리보기만 표시됩니다.
  const duringPreview = await readRadiusSnapshot(editorPage);
  expect(duringPreview.layerCount).toBe(before.layerCount);
  expect(duringPreview.pastCount).toBe(before.pastCount);
  expect(duringPreview.markerGeometry).toEqual(before.markerGeometry);
  expect(duringPreview.selectedFeatureIds).toEqual(before.selectedFeatureIds);

  await popup.getByRole("button", { name: "원형 폴리곤 추가" }).click();
  await expect(popup).toBeHidden();

  const created = await readRadiusSnapshot(editorPage);
  expect(created.activeMode).toBe("select");
  expect(created.layerCount).toBe(before.layerCount + 1);
  expect(created.pastCount).toBe(before.pastCount + 1);
  expect(created.markerGeometry).toEqual(before.markerGeometry);
  expect(created.lastFeature?.name).toBe("반경 1.25 km");
  expect(created.lastFeature?.geometry.type).toBe("Polygon");
  expect(created.lastFeature?.properties).toMatchObject({
    radiusKm: 1.25,
    radiusSourceFeatureId: "radius-marker",
  });
  expect(created.selectedFeatureIds).toEqual([created.lastFeature?.id]);

  const modifier = await platformModifier(editorPage);
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect
    .poll(async () => (await readRadiusSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount);
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect
    .poll(async () => (await readRadiusSnapshot(editorPage)).layerCount)
    .toBe(before.layerCount + 1);
});

test("반경 도구는 마커 단독 선택에만 활성화되고 선택 해제 시 입력을 닫는다", async ({
  page,
}) => {
  const editorPage = await openEditorWithMarkers(page);
  const radiusButton = editorPage.getByRole("button", { name: "반경", exact: true });
  const markerButton = editorPage.getByRole("button", { name: "반경 기준 마커 선택" });
  const areaButton = editorPage.getByRole("button", { name: "기존 권역 선택" });
  const popup = editorPage.getByRole("dialog", { name: "반경 입력" });
  await expect(radiusButton).toBeDisabled();
  await expect(radiusButton).toHaveAttribute("title", "마커를 선택해야합니다");
  const radiusWrapper = radiusButton.locator("..");
  await expect(radiusWrapper).toHaveAttribute("title", "마커를 선택해야합니다");
  await radiusWrapper.hover();
  // disabled 버튼 대신 래퍼가 포인터를 받아 브라우저의 기본 title을 표시합니다.
  expect(
    await radiusWrapper.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return (
        document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) ===
        element
      );
    }),
  ).toBe(true);
  await expect(popup).toBeHidden();
  await areaButton.click();
  await expect(radiusButton).toBeDisabled();
  await editorPage.getByRole("button", { name: "기존 경로 선택" }).click();
  await expect(radiusButton).toBeDisabled();
  await markerButton.click();
  await expect(radiusButton).toBeEnabled();
  await expect(radiusWrapper).not.toHaveAttribute("title");
  await areaButton.click({ modifiers: [await platformModifier(editorPage)] });
  await expect(radiusButton).toBeDisabled();
  await markerButton.click();
  await expect(radiusButton).toBeEnabled();
  await markerButton.click();
  await expect(radiusButton).toBeDisabled();

  // 잠긴 마커는 목록으로 참조할 수 있습니다. 지도 클릭 검증은 잠금을 해제해 수행합니다.
  await editorPage.getByRole("button", { name: "반경 기준 마커 잠금 해제" }).click();
  await editorPage.waitForTimeout(450);

  const mapBox = await editorPage.getByLabel("OSM map editor").boundingBox();
  if (!mapBox) {
    throw new Error("지도 영역을 찾을 수 없습니다.");
  }
  await editorPage.mouse.click(
    mapBox.x + mapBox.width / 2,
    // MapPin의 좌표 anchor는 핀 끝이므로 불투명한 핀 몸체 안쪽을 누릅니다.
    mapBox.y + mapBox.height / 2 - 12,
  );

  await expect
    .poll(async () => (await readRadiusSnapshot(editorPage)).selectedFeatureIds)
    .toEqual(["radius-marker"]);
  await expect(radiusButton).toBeEnabled();
  const before = await readRadiusSnapshot(editorPage);
  await radiusButton.click();
  await expect(popup).toBeVisible();
  await expect(popup).toContainText("기준: 반경 기준 마커");
  await popup.getByRole("textbox", { name: "반경" }).fill("2");
  await markerButton.click();
  await expect(radiusButton).toBeDisabled();
  await expect(popup).toBeHidden();
  const after = await readRadiusSnapshot(editorPage);
  expect(after.activeMode).toBe("select");
  expect(after.layerCount).toBe(before.layerCount);
  expect(after.pastCount).toBe(before.pastCount);
});

test("날짜변경선을 넘는 원은 오류를 안내하고 scene에 추가하지 않는다", async ({
  page,
}) => {
  const editorPage = await openEditorWithMarkers(page);
  await page.evaluate(() => {
    window.open("", "map-editor-child")?.postMessage(
      {
        type: "MAP_EDITOR_INIT",
        sessionId: "radius-dateline-e2e",
        scene: {
          version: 2,
          viewport: { center: [179, 0], zoom: 4 },
          features: [
            {
              id: "dateline-marker",
              name: "날짜변경선 마커",
              geometry: { type: "Point", coordinates: [179, 0] },
            },
          ],
        },
      },
      window.location.origin,
    );
  });

  await editorPage.getByRole("button", { name: "날짜변경선 마커 선택" }).click();
  const before = await readRadiusSnapshot(editorPage);
  await editorPage.getByRole("button", { name: "반경", exact: true }).click();
  const popup = editorPage.getByRole("dialog", { name: "반경 입력" });
  await popup.getByRole("textbox", { name: "반경" }).fill("1000");

  await expect(popup).toContainText("날짜변경선 또는 극점");
  await expect(popup.getByRole("button", { name: "원형 폴리곤 추가" })).toBeDisabled();
  expect((await readRadiusSnapshot(editorPage)).layerCount).toBe(before.layerCount);
});
