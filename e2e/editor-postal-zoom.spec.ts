import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedGoogleSession } from "./fixtures/auth";

async function mockRegions(context: BrowserContext, truncated = false) {
  await seedGoogleSession(context);
  const calls: { kind: string; zoom: number }[] = [];
  const kinds = [
    { kind: "sigungu", label: "시군구", min_zoom: 0, selectable: false },
    { kind: "adminDong", label: "행정동", min_zoom: 12, selectable: true },
    { kind: "legalDong", label: "법정동", min_zoom: 12, selectable: true },
    { kind: "postalCode", label: "우편번호", min_zoom: 16, selectable: true },
  ].map((kind, index) => ({ ...kind, level: index + 1, sort_order: index }));
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    const body = route.request().postDataJSON();
    if (body.operation === "kinds") return route.fulfill({ json: kinds });
    expect(body.operation).toBe("byView");
    calls.push(body);
    const selected = kinds.find((entry) => entry.kind === body.kind);
    const actual = selected && body.zoom >= selected.min_zoom ? selected : kinds[0];
    await route.fulfill({
      json: {
        type: "FeatureCollection",
        country: "KR",
        kind: actual.kind,
        level: actual.level,
        truncated: truncated && actual.kind === "postalCode",
        features: [
          {
            type: "Feature",
            id: actual.kind,
            properties: { name: actual.label },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [126.979, 37.569],
                  [126.981, 37.569],
                  [126.981, 37.571],
                  [126.979, 37.569],
                ],
              ],
            },
          },
        ],
      },
    });
  });
  return calls;
}

async function openEditor(page: Page) {
  await page.goto("/ko/demo");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 탭으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "경계 데이터", exact: true }).click();
  return editor;
}

test("행정동·법정동은 12, 우편번호는 16에서 전환하며 줌 안내와 실제 경계가 일치한다", async ({
  context,
  page,
}) => {
  const calls = await mockRegions(context);
  const editor = await openEditor(page);
  const status = editor.getByText(/현재 화면:/);
  await expect(status).toContainText("행정동");
  await editor.getByRole("button", { name: "법정동 z12부터 표시" }).click();
  await expect(status).toContainText("법정동");
  await editor.getByRole("button", { name: "우편번호 z16부터 표시" }).click();
  await expect(status).toContainText("시군구");
  await editor
    .getByRole("button", { name: "우편번호 표시 단계로 이동: 줌 16" })
    .click();
  await expect(editor.getByLabel("현재 줌 단계")).toHaveText("Z16");
  await expect(status).toContainText("우편번호");
  await editor.getByRole("slider", { name: "줌 단계" }).press("ArrowLeft");
  await expect(editor.getByLabel("현재 줌 단계")).toHaveText("Z15");
  await expect(status).toContainText("시군구");
  await expect(
    editor.getByRole("button", { name: "우편번호 z16부터 표시" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    calls.filter((call) => call.kind === "postalCode").map((call) => call.zoom),
  ).toEqual([12, 16, 15]);
});

test("확대 후에도 응답 제한에 걸리면 자동 분할 요청 없이 확대 안내를 표시한다", async ({
  context,
  page,
}) => {
  const calls = await mockRegions(context, true);
  const editor = await openEditor(page);
  await editor.getByRole("button", { name: "우편번호 z16부터 표시" }).click();
  await editor
    .getByRole("button", { name: "우편번호 표시 단계로 이동: 줌 16" })
    .click();
  await expect(editor.getByText(/일부만 표시됨 — 지도를 확대하세요/)).toBeVisible();
  await expect(editor.getByText(/경계 불러오는 중/)).toHaveCount(0);
  expect(
    calls.filter((call) => call.kind === "postalCode" && call.zoom === 16),
  ).toHaveLength(1);
});
