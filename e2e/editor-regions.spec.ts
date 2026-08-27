import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";

const REGION_FEATURE = {
  type: "Feature",
  id: 101,
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [126.95, 37.54],
          [127.01, 37.54],
          [127.01, 37.6],
          [126.95, 37.6],
          [126.95, 37.54],
        ],
      ],
    ],
  },
  properties: { name: "테스트 경계" },
};

async function installRegionApiMock(
  context: BrowserContext,
  options: { catalogError?: boolean; fullResolutionDelayMs?: number } = {},
) {
  await context.route("**/region-api/rest/v1/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/region_kind?")) {
      if (options.catalogError) {
        await route.fulfill({ status: 503, json: { message: "catalog unavailable" } });
        return;
      }
      await route.fulfill({
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
            kind: "testDistrict",
            label: "테스트 구역",
            level: 4,
            min_zoom: 15,
            sort_order: 2,
            selectable: true,
          },
        ],
      });
      return;
    }

    if (url.endsWith("/regions_by_view")) {
      await route.fulfill({
        json: {
          type: "FeatureCollection",
          country: "KR",
          kind: "sigungu",
          level: 1,
          truncated: true,
          features: [REGION_FEATURE],
        },
      });
      return;
    }

    if (url.endsWith("/region_by_id")) {
      if (options.fullResolutionDelayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.fullResolutionDelayMs),
        );
      }
      await route.fulfill({ json: REGION_FEATURE });
      return;
    }

    await route.fulfill({ status: 404, json: { message: "not found" } });
  });
}

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

async function hoverMapUntilVisible(
  page: Page,
  map: Locator,
  target: Locator,
  position = { x: 620, y: 360 },
) {
  const mapBox = await map.boundingBox();
  if (!mapBox) {
    throw new Error("지도 영역을 찾을 수 없습니다.");
  }

  await expect(async () => {
    // 레이어 sync 전에 단발 hover가 지나가도 pointermove를 다시 발생시켜 준비 완료를 기다립니다.
    await page.mouse.move(mapBox.x + 8, mapBox.y + 8);
    await map.hover({ position });
    await expect(target).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000, intervals: [100, 250, 500] });
}

test("카탈로그 조회 실패 때 사이드메뉴가 기본 경계 종류를 제공한다", async ({
  context,
  page,
}) => {
  await installRegionApiMock(context, { catalogError: true });
  const editorPage = await openEditorViaDemo(page);

  await editorPage.getByRole("button", { name: "행정동 경계" }).click();

  await expect(
    editorPage.getByText("종류를 불러오지 못해 기본 종류를 표시합니다."),
  ).toHaveCount(1);
  await expect(
    editorPage.getByRole("button", { name: "법정동 법정 구역 단위", exact: true }),
  ).toBeVisible();
  await expect(
    editorPage.getByRole("button", { name: "우편번호 우편번호 권역", exact: true }),
  ).toBeVisible();
  await expect(editorPage.getByRole("region", { name: "경계 보기" })).toHaveCount(0);

  await editorPage.getByRole("button", { name: "경계 숨기기" }).click();
  await expect(
    editorPage.getByText("경계 종류를 선택하면 화면에 표시됩니다."),
  ).toBeVisible();
});

test("서버 경계 카탈로그와 조회 상태를 경계 도구에 표시한다", async ({
  context,
  page,
}) => {
  await installRegionApiMock(context);
  const editorPage = await openEditorViaDemo(page);

  const boundaryTool = editorPage.getByRole("button", { name: "행정동 경계" });
  await expect(boundaryTool).toHaveCount(1);
  await boundaryTool.click();

  await expect(
    editorPage.getByRole("button", { name: "테스트 구역 z15부터 표시" }),
  ).toBeVisible();
  await expect(editorPage.getByText("현재 화면:")).toBeVisible();
  await expect(editorPage.getByText("시군구")).toBeVisible();
  await expect(editorPage.getByText("일부만 표시됨 — 지도를 확대하세요")).toBeVisible();
});

test("준비된 scene에서 경계 +는 원본 geometry를 새 편집 피처로 복사한다", async ({
  context,
  page,
}) => {
  await installRegionApiMock(context, { fullResolutionDelayMs: 300 });
  const editorPage = await openEditorViaDemo(page);

  const boundaryTool = editorPage.getByRole("button", { name: "행정동 경계" });
  await expect(boundaryTool).toHaveCount(1);
  await boundaryTool.click();
  await expect(editorPage.getByText("현재 화면:")).toBeVisible();

  const map = editorPage.getByLabel("OSM map editor");
  const mergeButton = editorPage.getByRole("button", {
    name: "테스트 경계 병합",
  });
  await hoverMapUntilVisible(editorPage, map, mergeButton);
  await mergeButton.click();

  await expect(
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeDisabled();

  await expect(editorPage.getByRole("button", { name: "도형 숨기기" })).toHaveCount(9);
  await expect(
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeEnabled();
});

test("원본 조회 중 새 INIT이 오면 이전 경계 연산 결과를 버린다", async ({
  context,
  page,
}) => {
  await installRegionApiMock(context, { fullResolutionDelayMs: 500 });
  const editorPage = await openEditorViaDemo(page);

  await editorPage.getByRole("button", { name: "행정동 경계" }).click();
  await expect(editorPage.getByText("현재 화면:")).toBeVisible();
  const map = editorPage.getByLabel("OSM map editor");
  const mergeButton = editorPage.getByRole("button", { name: "테스트 경계 병합" });
  await hoverMapUntilVisible(editorPage, map, mergeButton);
  await mergeButton.click();

  await page.evaluate(() => {
    window.open("", "map-editor-child")?.postMessage(
      {
        type: "MAP_EDITOR_INIT",
        sessionId: "replacement-session",
        scene: {
          version: 2,
          id: "replacement-scene",
          features: [
            {
              name: "교체 도형",
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [126.97, 37.56],
                    [126.98, 37.56],
                    [126.98, 37.57],
                    [126.97, 37.56],
                  ],
                ],
              },
            },
          ],
        },
      },
      window.location.origin,
    );
  });

  await expect(editorPage.getByText("교체 도형")).toBeVisible();
  await expect(editorPage.getByRole("button", { name: "도형 숨기기" })).toHaveCount(1);
  await editorPage.waitForTimeout(600);
  await expect(editorPage.getByRole("button", { name: "도형 숨기기" })).toHaveCount(1);
});
