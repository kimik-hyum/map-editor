import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";
import { seedGoogleSession } from "./fixtures/auth";

type ViewRequest = {
  operation: string;
  kind: string;
  zoom: number;
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};
function feature(id: number, name: string, x: number) {
  return {
    type: "Feature",
    id,
    properties: { name },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [x, 36.8],
          [x + 0.3, 36.8],
          [x + 0.3, 37.1],
          [x, 37.1],
          [x, 36.8],
        ],
      ],
    },
  };
}
async function mockRegions(
  context: BrowserContext,
  options: { auto?: boolean; failStatus?: number } = {},
) {
  await seedGoogleSession(context);
  let auto = options.auto ?? false;
  let failing = Boolean(options.failStatus);
  let failedKey: string | null = null;
  const ids = new Map<string, number>();
  const calls: ViewRequest[] = [];
  const pending = new Map<Route, { body: ViewRequest; id: number; key: string }>();
  const finish = async (route: Route) => {
    const entry = pending.get(route);
    if (!entry) return;
    pending.delete(route);
    if (failing && entry.key === failedKey) {
      await route.fulfill({
        status: options.failStatus,
        json: { error: "test failure" },
      });
      return;
    }
    await route.fulfill({
      json: {
        type: "FeatureCollection",
        country: "KR",
        kind: "sigungu",
        level: 1,
        truncated: false,
        features: [
          feature(1, "공통 경계", 126.2),
          feature(
            entry.id,
            `${entry.body.kind}-z${entry.body.zoom}-${entry.id}`,
            126.8 + (entry.id % 8) * 0.4,
          ),
        ],
      },
    });
  };
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    const body = route.request().postDataJSON() as ViewRequest;
    if (body.operation === "kinds") {
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
            kind: "legalDong",
            label: "법정동",
            level: 2,
            min_zoom: 12,
            sort_order: 2,
            selectable: true,
          },
        ],
      });
      return;
    }
    if (body.operation !== "byView") {
      await route.fulfill({ status: 404 });
      return;
    }
    calls.push(body);
    const key = JSON.stringify(body);
    if (!failedKey) failedKey = key;
    if (!ids.has(key)) ids.set(key, 100 + ids.size);
    const id = ids.get(key);
    if (id === undefined) throw new Error("missing test id");
    pending.set(route, { body, key, id });
    if (auto) await finish(route);
  });
  return {
    calls,
    pending,
    finish,
    recover: () => {
      failing = false;
    },
    flush: async () => {
      auto = true;
      await Promise.all([...pending.keys()].map(finish));
    },
  };
}
async function openNationalEditor(page: Page) {
  await page.goto("/demo");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  // 기본 z12에서 z7로 이동한 뒤 경계를 켜서 초기 지도 애니메이션과 요청을 분리합니다.
  for (let i = 0; i < 5; i++) {
    await editor.getByTitle("지도 축소", { exact: true }).click();
    await editor.waitForTimeout(350);
  }
  await editor.getByRole("button", { name: "행정동 경계", exact: true }).click();
  return editor;
}
const count = (editor: Page, n: number) =>
  expect(editor.getByText(/현재 화면:/)).toContainText(`· ${n}개`);

test("전국은 두 요청씩 시작하고 첫 조각을 즉시 표시하며 중복 제거·캐시를 유지한다", async ({
  context,
  page,
}) => {
  const mock = await mockRegions(context);
  const editor = await openNationalEditor(page);
  await expect.poll(() => mock.calls.length).toBe(2);
  expect(mock.calls.every((call) => call.zoom === 7)).toBe(true);
  await editor.waitForTimeout(150);
  expect(mock.calls).toHaveLength(2);
  await mock.finish([...mock.pending.keys()][0]);
  await expect.poll(() => mock.calls.length).toBe(3);
  await count(editor, 2);
  await expect(editor.getByText("경계 불러오는 중… 1/8개 구역")).toBeVisible();
  await expect(
    editor.getByRole("group", { name: "공통 경계 경계 작업", exact: true }),
  ).toBeVisible();
  await editor.screenshot({ path: test.info().outputPath("partial-boundaries.png") });
  await mock.flush();
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  await count(editor, 9);
  expect(mock.calls).toHaveLength(8);
  await editor.getByRole("button", { name: "경계 숨기기" }).click();
  await editor.getByRole("button", { name: "행정동 z12부터 표시" }).click();
  await count(editor, 9);
  await editor.waitForTimeout(200);
  expect(mock.calls).toHaveLength(8);
});

for (const failStatus of [500, 429]) {
  test(`부분 ${failStatus} 오류 때 성공 경계를 유지하고 실패 조각만 재시도한다`, async ({
    context,
    page,
  }) => {
    const mock = await mockRegions(context, { auto: true, failStatus });
    const editor = await openNationalEditor(page);
    const retry = editor.getByRole("button", { name: "실패 구역 다시 불러오기" });
    await expect(retry).toBeVisible();
    await expect(editor.getByRole("alert")).toContainText("1/8개 구역");
    await count(editor, 8);
    const before = failStatus === 500 ? 9 : 8;
    expect(mock.calls).toHaveLength(before);
    mock.recover();
    await retry.click();
    await expect(retry).toHaveCount(0);
    await expect(editor.getByRole("alert")).toHaveCount(0);
    await count(editor, 9);
    expect(mock.calls).toHaveLength(before + 1);
  });
}

test("종류 변경 시 이전 대기 조각을 취소하고 늦은 응답을 섞지 않는다", async ({
  context,
  page,
}) => {
  const mock = await mockRegions(context);
  const editor = await openNationalEditor(page);
  await expect.poll(() => mock.calls.length).toBe(2);
  const old = [...mock.pending.keys()];
  await editor.getByRole("button", { name: "법정동 z12부터 표시" }).click();
  await expect
    .poll(() => mock.calls.filter((call) => call.kind === "legalDong").length)
    .toBe(2);
  await Promise.all(old.map(mock.finish));
  await mock.flush();
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  await count(editor, 9);
  expect(mock.calls.filter((call) => call.kind === "adminDong")).toHaveLength(2);
  expect(mock.calls.filter((call) => call.kind === "legalDong")).toHaveLength(8);
  await expect(editor.getByRole("group", { name: /adminDong-/ })).toHaveCount(0);
});

test("줌 8로 확대하면 이전 분할을 취소하고 단일 요청으로 돌아간다", async ({
  context,
  page,
}) => {
  const mock = await mockRegions(context);
  const editor = await openNationalEditor(page);
  await expect.poll(() => mock.calls.length).toBe(2);
  await editor.getByTitle("지도 확대", { exact: true }).click();
  await expect.poll(() => mock.calls.filter((call) => call.zoom === 8).length).toBe(1);
  await mock.flush();
  if (!(await editor.getByText(/현재 화면:/).isVisible())) {
    await editor.getByRole("button", { name: "행정동 경계", exact: true }).click();
  }
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  await count(editor, 2);
  expect(mock.calls.filter((call) => call.zoom === 7)).toHaveLength(2);
  expect(mock.calls.filter((call) => call.zoom === 8)).toHaveLength(1);
  await expect(editor.getByRole("group", { name: /adminDong-z7-/ })).toHaveCount(0);
});

test("부분 로딩 중 로그아웃하면 대기 요청과 늦은 응답을 버리고 편집 내용은 보존한다", async ({
  context,
  page,
}) => {
  const mock = await mockRegions(context);
  await context.route("**/region-api/auth/v1/logout*", (route) =>
    route.fulfill({ status: 204 }),
  );
  const editor = await openNationalEditor(page);
  await expect.poll(() => mock.calls.length).toBe(2);
  await mock.finish([...mock.pending.keys()][0]);
  await count(editor, 2);
  await expect.poll(() => mock.calls.length).toBe(3);
  await editor.getByRole("button", { name: "Google 로그아웃" }).click();
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toHaveCount(0);
  await mock.flush();
  await expect(editor.locator("[data-map-annotation]")).toHaveCount(0);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  expect(mock.calls).toHaveLength(3);
  await editor.getByRole("button", { name: "행정동 경계", exact: true }).click();
  await expect(editor.getByRole("alertdialog")).toBeVisible();
  expect(mock.calls).toHaveLength(3);
});
