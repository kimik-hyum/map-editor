import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedGoogleSession } from "./fixtures/auth";

const names: Record<string, string> = {
  adminDong: "행정동 테스트",
  legalDong: "법정동 테스트",
  postalCode: "01010",
};
function boundary(id: number, name: string, x = 126.95, y = 37.54, width = 0.06) {
  return {
    type: "Feature",
    id,
    properties: { name },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [x, y],
          [x + width, y],
          [x + width, y + width],
          [x, y + width],
          [x, y],
        ],
      ],
    },
  };
}
async function mockBoundaries(context: BrowserContext, dense = false) {
  const requests: Array<{ operation: string; zoom?: number; kind?: string }> = [];
  await seedGoogleSession(context);
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    if (body.operation === "kinds") {
      await route.fulfill({
        json: Object.keys(names).map((kind, index) => ({
          kind,
          label: ["행정동", "법정동", "우편번호"][index],
          level: 2,
          min_zoom: 12,
          sort_order: index,
          selectable: true,
        })),
      });
    } else if (body.operation === "byView") {
      const features = dense
        ? Array.from({ length: 400 }, (_, index) =>
            boundary(
              index + 1000,
              `밀집 경계 ${index}`,
              126.92 + (index % 20) * 0.006,
              37.51 + Math.floor(index / 20) * 0.006,
              0.006,
            ),
          )
        : [boundary(101, names[body.kind])];
      await route.fulfill({
        json: {
          type: "FeatureCollection",
          country: "KR",
          kind: body.kind,
          level: 2,
          truncated: false,
          features,
        },
      });
    } else if (body.operation === "byId") {
      await route.fulfill({ json: boundary(101, "행정동 테스트") });
    } else await route.fulfill({ status: 404, json: { message: "not found" } });
  });
  return requests;
}
async function openEditor(page: Page) {
  await page.goto("/demo");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await expect(
    editor.getByRole("button", { name: "권역 C 선택", exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "행정동 경계" }).click();
  await expect(editor.getByText("현재 화면:")).toBeVisible();
  await editor.getByRole("button", { name: "경계 종류 닫기" }).click();
  return editor;
}
const card = (page: Page, name = "행정동 테스트") =>
  page.getByRole("group", { name: `${name} 경계 작업`, exact: true });

test("행정동·법정동·우편번호 모두 호버 없이 이름과 작업 버튼을 표시한다", async ({
  context,
  page,
}) => {
  const requests = await mockBoundaries(context);
  const editor = await openEditor(page);
  await expect(card(editor)).toBeVisible();
  await expect(
    card(editor).getByRole("button", { name: "행정동 테스트 추가" }),
  ).toHaveText("추가");
  await expect(
    card(editor).getByRole("button", { name: "행정동 테스트 겹친 부분 제거" }),
  ).toBeDisabled();
  for (const [kind, label, previousLabel] of [
    ["legalDong", "법정동", "행정동"],
    ["postalCode", "우편번호", "법정동"],
  ]) {
    await editor
      .getByRole("button", { name: `${previousLabel} 경계`, exact: true })
      .click();
    await editor.getByRole("button", { name: `${label} z12부터 표시` }).click();
    await editor.getByRole("button", { name: "경계 종류 닫기" }).click();
    await expect(card(editor, names[kind])).toBeVisible();
    await expect(
      card(editor, names[kind]).getByRole("button", { name: `${names[kind]} 추가` }),
    ).toBeEnabled();
    await expect(card(editor)).toHaveCount(0);
  }
  expect(requests.filter((request) => request.operation === "byId")).toHaveLength(0);
  await editor.getByRole("button", { name: "선택", exact: true }).click();
  await expect(editor.locator("[data-map-annotation]")).toHaveCount(0);
});

test("확대·축소에 따라 이름과 버튼이 커지고 상시 노출 및 현재 면적 맥락을 유지한다", async ({
  context,
  page,
}) => {
  await mockBoundaries(context);
  const editor = await openEditor(page);
  const name = card(editor).getByText("행정동 테스트", { exact: true });
  const add = card(editor).getByRole("button", { name: "행정동 테스트 추가" });
  await expect(name).toHaveCSS("font-size", "15px");
  await expect(add).toHaveCSS("min-height", "34px");
  await expect(add).toHaveCSS("background-color", "rgb(15, 118, 110)");
  await expect(add).toHaveCSS("color", "rgb(255, 255, 255)");
  await editor.getByTitle("지도 축소", { exact: true }).click();
  await expect(name).toHaveCSS("font-size", "14px");
  await expect(add).toHaveCSS("min-height", "32px");
  for (let i = 0; i < 4; i++) {
    await editor.getByTitle("지도 확대", { exact: true }).click();
    await expect(card(editor)).toHaveAttribute("data-map-zoom", String(12 + i));
  }
  await expect(name).toHaveCSS("font-size", "16px");
  await expect(add).toHaveCSS("min-height", "36px");
  await expect(add).toBeVisible();
  const zoom = editor.getByTitle("지도 확대", { exact: true });
  await expect(zoom).toHaveCSS("width", "36px");
});

test("선택 상태에 맞춰 추가와 합치기를 구분하고 겹칠 때만 빼기를 활성화한다", async ({
  context,
  page,
}) => {
  await mockBoundaries(context);
  const editor = await openEditor(page);
  const subtract = card(editor).getByRole("button", {
    name: "행정동 테스트 겹친 부분 제거",
  });
  await expect(subtract).toBeDisabled();
  await expect(subtract).toHaveAttribute("title", /폴리곤 하나를 선택/);
  await editor.getByRole("button", { name: "권역 C 선택", exact: true }).click();
  const merge = card(editor).getByRole("button", { name: "행정동 테스트 합치기" });
  await expect(merge).toHaveText("합치기");
  await expect(subtract).toBeEnabled();
  await expect(subtract).toHaveCSS("color", "rgb(190, 18, 60)");
  await editor.getByRole("button", { name: "권역 C 잠금", exact: true }).click();
  await expect(
    card(editor).getByRole("button", { name: "행정동 테스트 추가" }),
  ).toBeEnabled();
  await expect(subtract).toBeDisabled();
});

test("밀집한 경계도 카드가 겹치지 않고 재배치만으로 원본 API를 호출하지 않는다", async ({
  context,
  page,
}) => {
  const requests = await mockBoundaries(context, true);
  const editor = await openEditor(page);
  await expect
    .poll(() => editor.locator("[data-map-annotation]").count())
    .toBeGreaterThan(2);
  const rectangles = await editor
    .locator("[data-map-annotation]")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
      }),
    );
  expect(rectangles.length).toBeLessThanOrEqual(48);
  for (let i = 0; i < rectangles.length; i++) {
    for (let j = i + 1; j < rectangles.length; j++) {
      const a = rectangles[i],
        b = rectangles[j];
      expect(
        a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
      ).toBe(false);
    }
  }
  expect(requests.filter((request) => request.operation === "byId")).toHaveLength(0);
});

test("키보드만으로 상시 버튼을 실행하고 동일 지도 인스턴스를 유지한다", async ({
  context,
  page,
}) => {
  await mockBoundaries(context);
  const editor = await openEditor(page);
  const viewport = editor.locator(".ol-viewport");
  await viewport.evaluate((element) =>
    element.setAttribute("data-annotation-stability", "stable"),
  );
  const add = card(editor).getByRole("button", { name: "행정동 테스트 추가" });
  await add.focus();
  await expect(add).toBeFocused();
  await add.press("Enter");
  await expect(editor.getByRole("button", { name: "도형 숨기기" })).toHaveCount(9);
  await expect(viewport).toHaveAttribute("data-annotation-stability", "stable");
});
