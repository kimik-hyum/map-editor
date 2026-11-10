import { expect, test, type Page } from "@playwright/test";
import { seedGoogleSession } from "./fixtures/auth";
import { readEditorEdits, visibleMapPoint } from "./fixtures/mapNavigation";

async function openEditor(page: Page, locale = "ko", country = "KR") {
  await page.goto(`/${locale}/demo?country=${country}`);
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page
      .getByRole("button", {
        name: locale === "ko" ? "편집기 새 탭으로 열기" : "Open editor in a new tab",
      })
      .click(),
  ]);
  await expect(
    editor.getByLabel("OSM map editor").locator("canvas").first(),
  ).toBeVisible();
  return editor;
}

test("세로 줌을 버튼·키보드·드래그·휠로 조절해도 편집 이력은 유지된다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  await expect(
    editor.getByRole("button", { name: "권역 C 선택", exact: true }),
  ).toBeVisible();
  const before = await readEditorEdits(editor);
  const slider = editor.getByRole("slider", { name: "줌 단계", exact: true });
  const current = editor.getByLabel("현재 줌 단계");
  const initial = Number(await slider.inputValue());
  await editor.getByRole("button", { name: "지도 확대", exact: true }).click();
  await expect(slider).toHaveValue(String(Math.floor(initial) + 1));
  await slider.press("ArrowDown");
  await expect(slider).toHaveValue(String(Math.floor(initial)));
  await expect(current).toHaveText(`Z${Math.floor(initial)}`);

  const box = await slider.boundingBox();
  if (!box) throw new Error("줌 슬라이더가 없습니다.");
  await editor.mouse.move(box.x + box.width / 2, box.y + box.height * 0.5);
  await editor.mouse.down();
  await editor.mouse.move(box.x + box.width / 2, box.y + box.height * 0.25, {
    steps: 8,
  });
  await editor.mouse.up();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(19);

  const zoomBeforeWheel = Number(await slider.inputValue());
  const point = await visibleMapPoint(editor, 0.75, 0.3);
  await editor.mouse.move(point.x, point.y);
  await editor.mouse.wheel(0, 360);
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeLessThan(zoomBeforeWheel - 0.5);
  await slider.press("End");
  await expect(slider).toHaveValue("28");
  await expect(
    editor.getByRole("button", { name: "지도 확대", exact: true }),
  ).toBeDisabled();
  await slider.press("Home");
  const minZoom = Number(await slider.getAttribute("min"));
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeCloseTo(minZoom, 8);
  await expect(
    editor.getByRole("button", { name: "지도 축소", exact: true }),
  ).toBeDisabled();
  expect(await readEditorEdits(editor)).toEqual(before);

  await editor.getByRole("button", { name: "경계 표시 단계 안내" }).click();
  await expect(
    editor.getByRole("region", { name: "경계 표시 단계", exact: true }),
  ).toBeHidden();
});

test("서버의 변경된 최소 줌과 실제 응답 종류를 안내하고 단계 클릭으로 이동한다", async ({
  context,
  page,
}) => {
  await seedGoogleSession(context);
  const requests: number[] = [];
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    const body = route.request().postDataJSON();
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
            min_zoom: 15,
            sort_order: 1,
            selectable: true,
          },
        ],
      });
    } else if (body.operation === "byView") {
      requests.push(body.zoom);
      await route.fulfill({
        json: {
          type: "FeatureCollection",
          country: "KR",
          kind: body.zoom >= 15 ? "adminDong" : "sigungu",
          level: body.zoom >= 15 ? 2 : 1,
          truncated: false,
          features: [
            {
              type: "Feature",
              id: 101,
              properties: { name: "줌 테스트 경계" },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [126.95, 37.54],
                    [127.01, 37.54],
                    [127.01, 37.6],
                    [126.95, 37.6],
                    [126.95, 37.54],
                  ],
                ],
              },
            },
          ],
        },
      });
    } else await route.fulfill({ status: 404, json: { message: "not found" } });
  });
  const editor = await openEditor(page);
  const guide = editor.getByRole("region", { name: "경계 표시 단계", exact: true });
  await expect(guide.getByText("Z15–28")).toBeVisible();
  await expect(guide.getByText(/^Z\d+–14$/)).toBeVisible();
  await editor.getByRole("button", { name: "경계 데이터", exact: true }).click();
  await expect(guide.getByRole("status")).toHaveText("현재 표시: 시군구 · 1개");
  await guide
    .getByRole("button", { name: "행정동 표시 단계로 이동: 줌 15", exact: true })
    .click();
  await expect(
    editor.getByRole("slider", { name: "줌 단계", exact: true }),
  ).toHaveValue("15");
  await expect(guide.getByRole("status")).toHaveText("현재 표시: 행정동 · 1개");
  expect(requests).toContain(15);
  await guide
    .getByRole("button", { name: "시군구 표시 단계로 이동: 줌 14", exact: true })
    .click();
  await expect(guide.getByRole("status")).toHaveText("현재 표시: 시군구 · 1개");
  expect(requests).toContain(14);
});

test("미국 영문 안내는 카테고리 유지와 조회 실패를 정확하게 구분한다", async ({
  context,
  page,
}) => {
  await context.route("**/api/us-boundaries?*", (route) =>
    route.fulfill({ status: 503, json: { error: "unavailable" } }),
  );
  const editor = await openEditor(page, "en", "US");
  const guide = editor.getByRole("region", {
    name: "Boundary zoom levels",
    exact: true,
  });
  await expect(
    guide.getByText("US boundaries keep the selected category at every zoom level."),
  ).toBeVisible();
  await expect(guide.getByText(/^Z\d+–28$/)).toBeVisible();
  await editor.getByRole("button", { name: "Boundary data", exact: true }).click();
  await expect(guide.getByRole("status")).toHaveText(
    "Could not load boundaries. Check the tool options.",
  );
  await editor.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(guide.getByRole("button")).toHaveCount(1);
  await expect(guide.getByText(/^Z\d+–28$/)).toBeVisible();
});
