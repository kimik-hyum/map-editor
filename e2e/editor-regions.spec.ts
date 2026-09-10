import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedGoogleSession } from "./fixtures/auth";
import { dragAnnotation, readEditorEdits } from "./fixtures/mapNavigation";
import {
  installGeometryOverlapProbe,
  readGeometryOverlapChecks,
} from "./fixtures/geometryOverlapProbe";
import {
  UNION_REGRESSION_TARGET,
  UNION_REGRESSION_BOUNDARY,
} from "../src/pages/editor/features/geometry-ops/model/fixtures/degenerateUnion";
import type {
  PolygonalGeometry,
  EditorSceneInput,
} from "../src/pages/editor/types/editorTypes";

// INIT 누락 시 양쪽 창의 메시지/탐색을 남깁니다. 재전송이나 재시도로 실패를 숨기지 않습니다.
const handshakeLogs = new WeakMap<BrowserContext, string[]>();
test.beforeEach(async ({ context }) => {
  const events: string[] = [];
  handshakeLogs.set(context, events);
  const record = (event: string) => events.push(`${Date.now()} ${event}`);
  context.on("page", (page) => {
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) record(`navigate ${page.url()}`);
    });
    page.on("pageerror", (error) => record(`pageerror ${page.url()} ${error.message}`));
    page.on("console", (message) => {
      if (message.text().startsWith("[vite]")) record(message.text());
    });
  });
  await context.exposeBinding(
    "__recordRegionHandshake",
    ({ page }, event: { type: string; origin: string; fromOpener: boolean }) =>
      record(`${page.url()} ${JSON.stringify(event)}`),
  );
  await context.addInitScript(() => {
    window.addEventListener("message", (event) => {
      const type = event.data?.type;
      if (typeof type !== "string" || !type.startsWith("MAP_EDITOR_")) return;
      const target = window as typeof window & {
        __recordRegionHandshake: (event: {
          type: string;
          origin: string;
          fromOpener: boolean;
        }) => Promise<void>;
      };
      void target.__recordRegionHandshake({
        type,
        origin: event.origin,
        fromOpener: event.source === window.opener,
      });
    });
  });
});
test.afterEach(async ({ context }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await testInfo.attach("region-handshake", {
      body: (handshakeLogs.get(context) ?? []).join("\n"),
      contentType: "text/plain",
    });
  }
});

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
  options: {
    catalogError?: boolean;
    fullResolutionDelayMs?: number;
    fullGeometry?: PolygonalGeometry;
  } = {},
) {
  await seedGoogleSession(context);
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    const body = route.request().postDataJSON() as { operation?: string };

    if (body.operation === "kinds") {
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

    if (body.operation === "byView") {
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

    if (body.operation === "byId") {
      if (options.fullResolutionDelayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.fullResolutionDelayMs),
        );
      }
      await route.fulfill({
        json: {
          ...REGION_FEATURE,
          geometry: options.fullGeometry ?? REGION_FEATURE.geometry,
        },
      });
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
  await expect(page.getByText("연결됨 · scene 전달 완료")).toBeVisible();
  await expect(editorPage.getByText("권역 A")).toBeVisible();
  return editorPage;
}

test("경계 버튼은 팬/줌에서 교집합을 재계산하지 않고 실제 도형 변경 때 갱신한다", async ({
  context,
  page,
}) => {
  await installGeometryOverlapProbe(context);
  await installRegionApiMock(context);
  const editor = await openEditorViaDemo(page);
  await editor.getByRole("button", { name: "행정동 경계", exact: true }).click();
  await editor.getByRole("button", { name: "테스트 경계 추가", exact: true }).click();
  const marker = editor.getByRole("group", {
    name: "테스트 경계 경계 작업",
    exact: true,
  });
  const subtract = editor.getByRole("button", {
    name: "테스트 경계 겹친 부분 제거",
    exact: true,
  });
  await expect(subtract).toBeEnabled();
  await expect(
    editor.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeEnabled();
  const checks = await readGeometryOverlapChecks(editor);
  expect(checks).toBeGreaterThan(0);
  const before = await readEditorEdits(editor);
  await dragAnnotation(
    editor,
    marker.getByText("테스트 경계", { exact: true }),
    marker,
  );
  for (const title of ["지도 확대", "지도 축소", "지도 확대", "지도 축소"]) {
    await editor.getByTitle(title, { exact: true }).click();
    await editor.waitForTimeout(600);
    await expect(subtract).toBeEnabled();
  }
  expect(await readGeometryOverlapChecks(editor)).toBe(checks);
  expect(await readEditorEdits(editor)).toEqual(before);

  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    state.updateFeatureGeometry(state.selectedFeatureIds[0], {
      type: "Polygon",
      coordinates: [
        [
          [126.97, 37.55],
          [127.03, 37.55],
          [127.03, 37.59],
          [126.97, 37.59],
          [126.97, 37.55],
        ],
      ],
    });
  });
  await expect.poll(() => readGeometryOverlapChecks(editor)).toBeGreaterThan(checks);
  await expect(subtract).toBeEnabled();
  const afterEdit = await readGeometryOverlapChecks(editor);
  const modifier = await editor.evaluate(() =>
    /Mac/.test(navigator.platform) ? "Meta" : "Control",
  );
  await editor.keyboard.press(`${modifier}+z`);
  await expect
    .poll(async () => (await readEditorEdits(editor)).layers)
    .toEqual(before.layers);
  await expect(subtract).toBeEnabled();
  expect(await readGeometryOverlapChecks(editor)).toBe(afterEdit);
});

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

test("경계의 추가 버튼은 호버 없이 표시되고 원본 geometry를 새 편집 피처로 복사한다", async ({
  context,
  page,
}) => {
  await installRegionApiMock(context, { fullResolutionDelayMs: 300 });
  const editorPage = await openEditorViaDemo(page);

  const boundaryTool = editorPage.getByRole("button", { name: "행정동 경계" });
  await expect(boundaryTool).toHaveCount(1);
  await boundaryTool.click();
  await expect(editorPage.getByText("현재 화면:")).toBeVisible();

  const mergeButton = editorPage.getByRole("button", {
    name: "테스트 경계 추가",
  });
  await expect(mergeButton).toBeVisible();
  await mergeButton.click();

  await expect(
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeDisabled();

  await expect(editorPage.getByRole("button", { name: "도형 숨기기" })).toHaveCount(9);
  await expect(
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeEnabled();
  await Promise.all([
    editorPage.waitForEvent("close"),
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }).click(),
  ]);
  await expect(page.getByText("완료됨 · 편집 결과 수신")).toBeVisible();
});

test("퇴화 ring을 만드는 경계 병합도 저장·부모 갱신·다시 열기까지 완료한다", async ({
  context,
  page,
}) => {
  await installRegionApiMock(context, { fullGeometry: UNION_REGRESSION_BOUNDARY });
  const editorPage = await openEditorViaDemo(page);
  // 실제 병합 오류에서 축소한 입력을 넣되 부모와 연결된 회차는 그대로 유지합니다.
  await editorPage.evaluate(async (geometry) => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().updateFeatureGeometry("feature-7", geometry);
  }, UNION_REGRESSION_TARGET);
  await editorPage.getByRole("button", { name: "권역 C 선택", exact: true }).click();
  await editorPage.getByRole("button", { name: "행정동 경계" }).click();
  await expect(editorPage.getByText("현재 화면:")).toBeVisible();
  const mergeButton = editorPage.getByRole("button", { name: "테스트 경계 합치기" });
  await expect(mergeButton).toBeVisible();
  await mergeButton.press("Enter");
  await expect(async () => {
    const geometry = await editorPage.evaluate(async () => {
      const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
      return useEditorStore
        .getState()
        .scene?.layers.flatMap((l) => l.features)
        .find((f) => f.id === "feature-7")?.feature.geometry;
    });
    expect(geometry).not.toEqual(UNION_REGRESSION_TARGET);
  }).toPass();
  await Promise.all([
    editorPage.waitForEvent("close"),
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }).click(),
  ]);
  await expect(page.getByText("완료됨 · 편집 결과 수신")).toBeVisible();
  const saved = JSON.parse(
    (await page.getByTestId("parent-scene").textContent()) ?? "null",
  ) as EditorSceneInput;
  expect(saved.features).toHaveLength(8);
  const geometry = saved.features.find((f) => f.name === "권역 C")?.geometry;
  expect(geometry?.type).toBe("Polygon");
  expect(geometry?.coordinates).toHaveLength(1);
  const [reopened] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await expect(page.getByText("연결됨 · scene 전달 완료")).toBeVisible();
  await expect(
    reopened.getByRole("button", { name: "권역 C 선택", exact: true }),
  ).toBeVisible();
  expect(
    await reopened.evaluate(async () => {
      const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
      return useEditorStore
        .getState()
        .scene?.layers.flatMap((l) => l.features)
        .find((f) => f.id === "feature-7")?.feature.geometry;
    }),
  ).toEqual(geometry);
});

test("원본 경계의 반올림으로 무너진 내부 ring을 정리한 뒤 저장한다", async ({
  context,
  page,
}) => {
  const geometry = structuredClone(REGION_FEATURE.geometry) as PolygonalGeometry;
  if (geometry.type !== "MultiPolygon") throw new Error("잘못된 fixture");
  geometry.coordinates[0].push([
    [126.98, 37.57],
    [126.98, 37.57],
    [126.981, 37.571],
    [126.98, 37.57],
  ]);
  await installRegionApiMock(context, { fullGeometry: geometry });
  const editorPage = await openEditorViaDemo(page);
  await editorPage.getByRole("button", { name: "행정동 경계" }).click();
  await expect(editorPage.getByText("현재 화면:")).toBeVisible();
  const mergeButton = editorPage.getByRole("button", { name: "테스트 경계 추가" });
  await expect(mergeButton).toBeVisible();
  await mergeButton.press("Enter");
  await expect(editorPage.getByRole("button", { name: "도형 숨기기" })).toHaveCount(9);
  await Promise.all([
    editorPage.waitForEvent("close"),
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }).click(),
  ]);
  const saved = JSON.parse(
    (await page.getByTestId("parent-scene").textContent()) ?? "null",
  ) as EditorSceneInput;
  expect(saved.features.find((f) => f.name === "테스트 경계")?.geometry).toEqual(
    REGION_FEATURE.geometry,
  );
});

test("원본 조회 중 새 INIT이 오면 이전 경계 연산 결과를 버린다", async ({
  context,
  page,
}) => {
  await installRegionApiMock(context, { fullResolutionDelayMs: 500 });
  const editorPage = await openEditorViaDemo(page);

  await editorPage.getByRole("button", { name: "행정동 경계" }).click();
  await expect(editorPage.getByText("현재 화면:")).toBeVisible();
  const mergeButton = editorPage.getByRole("button", { name: "테스트 경계 추가" });
  await expect(mergeButton).toBeVisible();
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
