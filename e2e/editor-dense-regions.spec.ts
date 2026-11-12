import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedGoogleSession } from "./fixtures/auth";

type View = {
  operation: string;
  kind: string;
  zoom: number;
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

async function mockDenseRegions(context: BrowserContext, failWest = false) {
  await seedGoogleSession(context);
  const calls: View[] = [];
  let root: View | undefined;
  let failing = failWest;
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    const body = route.request().postDataJSON() as View;
    if (body.operation === "kinds") {
      return route.fulfill({
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
            kind: "postalCode",
            label: "우편번호",
            level: 2,
            min_zoom: 13,
            sort_order: 2,
            selectable: true,
          },
        ],
      });
    }
    expect(body.operation).toBe("byView");
    if (body.kind === "postalCode") calls.push(body);
    if (body.kind === "postalCode" && !root) root = body;
    const width = body.maxLng - body.minLng;
    const rootWidth = root ? root.maxLng - root.minLng : width;
    // 첫 응답과 그 자식도 제한에 걸립니다. 한 번만 나누면 여전히 구멍이 남습니다.
    const truncated = body.kind === "postalCode" && width > rootWidth / 3;
    const west = root && body.minLng === root.minLng && body.minLat === root.minLat;
    if (failing && !truncated && west) {
      return route.fulfill({ status: 429, json: { error: "test rate limit" } });
    }
    const id = `${body.minLng}:${body.minLat}`;
    const feature = {
      type: "Feature",
      id,
      properties: { name: `우편번호 ${id}` },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [body.minLng, body.minLat],
            [body.maxLng, body.minLat],
            [body.maxLng, body.maxLat],
            [body.minLng, body.minLat],
          ],
        ],
      },
    };
    await route.fulfill({
      json: {
        type: "FeatureCollection",
        country: "KR",
        kind: body.kind,
        level: 2,
        truncated,
        // 조각 사이에 걸친 경계 ID는 중복으로 내려옵니다.
        features: [
          feature,
          { ...feature, id: "shared", properties: { name: "공통 우편번호" } },
        ],
      },
    });
  });
  return {
    calls,
    recover: () => {
      failing = false;
    },
  };
}

async function openPostalEditor(page: Page) {
  await page.goto("/ko/demo");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 탭으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  await editor.getByRole("slider", { name: "줌 단계" }).press("ArrowRight");
  await expect(editor.getByLabel("현재 줌 단계")).toHaveText("Z13");
  await editor.getByRole("button", { name: "경계 데이터", exact: true }).click();
  await editor.getByRole("button", { name: "우편번호 z13부터 표시" }).click();
  return editor;
}

test("잘린 우편번호 bbox를 반복 분할하여 빈 영역을 채우고 종류 복귀 때 캐시를 재사용한다", async ({
  page,
  context,
}) => {
  const mock = await mockDenseRegions(context);
  const editor = await openPostalEditor(page);
  await expect(editor.getByText(/현재 화면:/)).toContainText("· 17개");
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  await expect(editor.getByText(/일부만 표시됨/)).toHaveCount(0);
  expect(mock.calls).toHaveLength(21);
  expect(mock.calls.every((call) => call.zoom === 13)).toBe(true);
  await editor.getByRole("button", { name: "행정동 z12부터 표시" }).click();
  await expect(editor.getByText(/현재 화면:/)).toContainText("행정동");
  await editor.getByRole("button", { name: "우편번호 z13부터 표시" }).click();
  await expect(editor.getByText(/현재 화면:/)).toContainText("· 17개");
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  expect(mock.calls).toHaveLength(21);
});

test("분할된 우편번호 일부가 실패하면 성공 경계를 유지하고 실패한 bbox만 다시 조회한다", async ({
  page,
  context,
}) => {
  const mock = await mockDenseRegions(context, true);
  const editor = await openPostalEditor(page);
  const retry = editor.getByRole("button", { name: "실패 구역 다시 불러오기" });
  await expect(retry).toBeVisible();
  await expect(editor.getByText(/현재 화면:/)).toContainText("· 16개");
  await expect(editor.getByRole("alert")).toContainText("1/16개 구역");
  const before = mock.calls.length;
  mock.recover();
  await retry.click();
  await expect(editor.getByText(/현재 화면:/)).toContainText("· 17개");
  await expect(retry).toHaveCount(0);
  expect(mock.calls).toHaveLength(before + 1);
});
