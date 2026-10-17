import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  US_BOUNDARY_KINDS,
  US_BOUNDARY_VERSION,
  US_BOUNDARY_ORIGINAL_VERSION,
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
    const original = url.searchParams.get("version") === US_BOUNDARY_ORIGINAL_VERSION;
    expect(url.searchParams.get("version")).toBe(
      original ? US_BOUNDARY_ORIGINAL_VERSION : US_BOUNDARY_VERSION,
    );
    const file = url.searchParams.get("file") ?? "";
    files.push(file);
    const common = {
      version: original ? US_BOUNDARY_ORIGINAL_VERSION : US_BOUNDARY_VERSION,
      country: "US",
      source_version: US_BOUNDARY_ORIGINAL_VERSION,
    };
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
            {
              id: `US:${US_BOUNDARY_ORIGINAL_VERSION}:${kind}:0001`,
              bbox: ny,
              object: `z15-plus/${kind}/0001.json`,
            },
            ...(extra
              ? [
                  {
                    id: `US:${US_BOUNDARY_ORIGINAL_VERSION}:${kind}:0002`,
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
        ...(original ? {} : { tolerance: 0.00008, geometry_role: "display" }),
        original_object: `us/${US_BOUNDARY_ORIGINAL_VERSION}/originals/${kind}/${part}.json`,
        truncated: false,
        features: [
          {
            type: "Feature",
            id: `US:${US_BOUNDARY_ORIGINAL_VERSION}:${kind}:${part}`,
            bbox,
            properties: { kind, code: part, name: "Test boundary" },
            geometry: {
              type: "MultiPolygon",
              coordinates: [
                [
                  [
                    [bbox[0], bbox[1]],
                    [bbox[2], bbox[1]],
                    ...(original ? [[bbox[2] + 0.02, (bbox[1] + bbox[3]) / 2]] : []),
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
    page.getByRole("button", { name: "편집기 새 탭으로 열기" }).click(),
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

async function openUsCards(editor: Page) {
  await editor.getByRole("button", { name: "카운티 경계" }).click();
  await expect(
    editor.getByRole("button", { name: "Test boundary 추가", exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "경계 종류 닫기" }).click();
}
const originalTip = [-73.84, 40.75];
function hasOriginalTip(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    ((value.length === 2 &&
      typeof value[0] === "number" &&
      Math.abs(value[0] - originalTip[0]) < 1e-8 &&
      Math.abs(value[1] - originalTip[1]) < 1e-8) ||
      value.some(hasOriginalTip))
  );
}

test("미국 +는 클릭할 때만 원본을 추가하고 undo/redo와 부모 저장에 원본 좌표를 유지한다", async ({
  context,
  page,
}) => {
  const { editor, files } = await prepare(context, page);
  const before = await readEditorEdits(editor);
  await openUsCards(editor);
  expect(files.filter((file) => file.startsWith("originals/"))).toHaveLength(0);
  await editor.getByRole("button", { name: "Test boundary 추가", exact: true }).click();
  await expect(editor.getByRole("button", { name: "도형 숨기기" })).toHaveCount(9);
  const added = (await readEditorEdits(editor)).layers
    ?.flatMap((layer) => layer.features)
    .find((f) => f.name === "Test boundary");
  expect(hasOriginalTip(added?.feature.geometry.coordinates)).toBe(true);
  expect((await readEditorEdits(editor)).past).toBe(before.past + 1);
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().undo();
  });
  expect((await readEditorEdits(editor)).layers).toEqual(before.layers);
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().redo();
  });
  expect(files.filter((file) => file.startsWith("originals/"))).toHaveLength(1);
  await Promise.all([
    editor.waitForEvent("close"),
    editor.getByRole("button", { name: "저장하고 편집 완료" }).click(),
  ]);
  await expect(page.getByText("완료됨 · 편집 결과 수신")).toBeVisible();
  const saved = JSON.parse(
    (await page.getByTestId("parent-scene").textContent()) ?? "null",
  );
  expect(
    hasOriginalTip(
      saved.features.find((f: { name: string }) => f.name === "Test boundary").geometry
        .coordinates,
    ),
  ).toBe(true);
});

test("미국 합치기와 빼기는 원본을 사용하고 같은 파일을 다시 받지 않는다", async ({
  context,
  page,
}) => {
  const { editor, files } = await prepare(context, page);
  await openUsCards(editor);
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    state.updateFeatureGeometry("feature-7", {
      type: "Polygon",
      coordinates: [
        [
          [-74.12, 40.6],
          [-74.0, 40.6],
          [-74.0, 40.9],
          [-74.12, 40.9],
          [-74.12, 40.6],
        ],
      ],
    });
    state.setSelectedFeatureIds(["feature-7"]);
  });
  const before = await readEditorEdits(editor);
  const target = async () =>
    (await readEditorEdits(editor)).layers
      ?.flatMap((layer) => layer.features)
      .find((f) => f.id === "feature-7")?.feature.geometry;
  await editor
    .getByRole("button", { name: "Test boundary 합치기", exact: true })
    .click();
  await expect
    .poll(async () => (await readEditorEdits(editor)).past)
    .toBe(before.past + 1);
  expect(hasOriginalTip((await target())?.coordinates)).toBe(true);
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().undo();
  });
  expect((await readEditorEdits(editor)).layers).toEqual(before.layers);
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().updateFeatureGeometry("feature-7", {
      type: "Polygon",
      coordinates: [
        [
          [-73.9, 40.6],
          [-73.8, 40.6],
          [-73.8, 40.9],
          [-73.9, 40.9],
          [-73.9, 40.6],
        ],
      ],
    });
  });
  const beforeSubtract = await readEditorEdits(editor);
  await editor
    .getByRole("button", { name: "Test boundary 겹친 부분 제거", exact: true })
    .click();
  await expect
    .poll(async () => (await readEditorEdits(editor)).past)
    .toBe(beforeSubtract.past + 1);
  // 표시 사각형으로 빼면 없는 원본의 돌출 꼭짓점이 결과 경계에 남아야 합니다.
  expect(hasOriginalTip((await target())?.coordinates)).toBe(true);
  expect(files.filter((file) => file.startsWith("originals/"))).toHaveLength(1);
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().undo();
  });
  expect((await readEditorEdits(editor)).layers).toEqual(beforeSubtract.layers);
});

test("미국 원본 조회 실패는 scene을 바꾸지 않으며 다시 시도할 수 있다", async ({
  context,
  page,
}) => {
  const { editor } = await prepare(context, page);
  await openUsCards(editor);
  const before = await readEditorEdits(editor);
  await context.route(
    (url) => url.searchParams.get("version") === US_BOUNDARY_ORIGINAL_VERSION,
    (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }),
    { times: 1 },
  );
  await editor.getByRole("button", { name: "Test boundary 추가", exact: true }).click();
  await expect(
    editor.getByText("경계 원본을 가져오거나 병합하지 못했습니다. 다시 시도해주세요."),
  ).toBeVisible();
  expect(await readEditorEdits(editor)).toEqual(before);
  await editor.getByRole("button", { name: "경계 종류 닫기" }).click();
  await editor.getByRole("button", { name: "Test boundary 추가", exact: true }).click();
  await expect(editor.getByRole("button", { name: "도형 숨기기" })).toHaveCount(9);
});

test("미국 원본 대기 중 새 INIT은 다운로드를 취소하고 이전 편집 결과를 버린다", async ({
  context,
  page,
}) => {
  const { editor } = await prepare(context, page);
  await openUsCards(editor);
  let started = false;
  let aborted = false;
  editor.on("requestfailed", (request) => {
    if (
      new URL(request.url()).searchParams.get("version") ===
      US_BOUNDARY_ORIGINAL_VERSION
    )
      aborted = true;
  });
  await context.route(
    (url) => url.searchParams.get("version") === US_BOUNDARY_ORIGINAL_VERSION,
    () => {
      started = true;
    },
  );
  await editor.getByRole("button", { name: "Test boundary 추가", exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await expect(
    editor.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeDisabled();
  await page.evaluate(() =>
    window.open("", "map-editor-child")?.postMessage(
      {
        type: "MAP_EDITOR_INIT",
        sessionId: "us-replacement",
        scene: {
          version: 2,
          id: "replacement",
          features: [
            {
              name: "교체 도형",
              geometry: { type: "Point", coordinates: [-74, 40.7] },
            },
          ],
        },
      },
      window.location.origin,
    ),
  );
  await expect(editor.getByText("교체 도형", { exact: true })).toBeVisible();
  await expect.poll(() => aborted).toBe(true);
  await expect(editor.getByRole("button", { name: "도형 숨기기" })).toHaveCount(1);
  expect((await readEditorEdits(editor)).past).toBe(0);
});

test("미국 경계 추가 직후 제거하고 원본에만 있는 부분도 캐시로 판정한다", async ({
  context,
  page,
}) => {
  const { editor, files } = await prepare(context, page);
  await openUsCards(editor);
  const minus = editor.getByRole("button", {
    name: "Test boundary 겹친 부분 제거",
    exact: true,
  });
  await expect(minus).toBeDisabled();
  expect(files.filter((file) => file.startsWith("originals/"))).toHaveLength(0);
  await editor.getByRole("button", { name: "Test boundary 추가", exact: true }).click();
  await expect(minus).toBeEnabled();
  const added = (await readEditorEdits(editor)).layers
    ?.flatMap((layer) => layer.features)
    .find((feature) => feature.name === "Test boundary");
  if (!added) throw new Error("missing added boundary");
  await minus.click();
  await expect(editor.getByRole("button", { name: "도형 숨기기" })).toHaveCount(8);
  await editor.evaluate(async (id) => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().undo();
    // 선택은 history 대상이 아니므로 복원한 도형을 다시 선택합니다.
    useEditorStore.getState().setSelectedFeatureIds([id]);
  }, added.id);
  await expect(minus).toBeEnabled();
  await editor.evaluate(async (id) => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    // 표시 사각형 밖, 원본의 돌출부 안에만 있는 합성 도형입니다.
    useEditorStore.getState().updateFeatureGeometry(id, {
      type: "Polygon",
      coordinates: [
        [
          [-73.853, 40.749],
          [-73.849, 40.749],
          [-73.849, 40.751],
          [-73.853, 40.751],
          [-73.853, 40.749],
        ],
      ],
    });
  }, added.id);
  await expect(minus).toBeEnabled();
  await minus.click();
  await expect(editor.getByRole("button", { name: "도형 숨기기" })).toHaveCount(8);
  expect(files.filter((file) => file.startsWith("originals/"))).toHaveLength(1);
});
