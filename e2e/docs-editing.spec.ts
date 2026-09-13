import { expect, test } from "@playwright/test";

test("도형 편집 문서가 선택부터 완료까지 현재 기능을 안내한다", async ({ page }) => {
  await page.goto("/editing");

  await expect(
    page.getByRole("heading", { name: "편집 도구 안내", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "화면 구성" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "도구별 동작" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "합치기·빼기·교집합 아이콘" }),
  ).toBeVisible();
  await expect(page.getByRole("table", { name: "도형 연산 아이콘" })).toContainText(
    "참고 경계에는 교집합 버튼이 없습니다",
  );
  await expect(page.getByRole("heading", { name: "필수 단축키" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "저장·취소 조건" })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "폴리곤 연산", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/0.01–1,000km/)).toBeVisible();
  await expect(
    page.getByText(/서비스 페이지가 전달한 원본에는 삭제 버튼이 없습니다/),
  ).toBeVisible();
});

test("시작 문서와 화면 구성에서 도형 편집 문서로 이동한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "편집 도구 안내" }).click();
  await expect(page).toHaveURL(/\/editing$/);

  await page.goto("/screen");
  await expect(page).toHaveURL(/\/editing#screen$/);
  await expect(page.getByRole("heading", { name: "화면 구성" })).toBeVisible();
});

test("실제 화면 안내에서 선택한 도구 위치와 설명이 바뀐다", async ({ page }) => {
  await page.goto("/editing");
  const tour = page.getByRole("figure", { name: "실제 편집 화면 도구 안내" });
  await expect(tour.getByRole("img")).toHaveAttribute("src", "/docs/editor-palace.jpg");
  const original = await tour
    .getByTestId("editor-tour-highlight")
    .getAttribute("style");
  await tour.getByRole("button", { name: "3. 그리기", exact: true }).click();
  await expect(tour.getByRole("img")).toHaveAttribute(
    "src",
    "/docs/editor-draw-tools.jpg",
  );
  await expect(
    tour.getByRole("heading", { name: "폴리곤·패스·마커 중 만들 도형을 고릅니다" }),
  ).toBeVisible();
  expect(
    await tour.getByTestId("editor-tour-highlight").getAttribute("style"),
  ).not.toBe(original);
  await tour.getByRole("button", { name: "7. 저장·완료", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    tour.getByRole("button", { name: "7. 저장·완료", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    tour.getByRole("heading", { name: "완료하면 원래 페이지로 결과를 돌려줍니다" }),
  ).toBeVisible();
  await expect(tour.locator("iframe")).toHaveCount(0);
});

test("직접 연 에디터는 여전히 입력을 기다리고 완료를 허용하지 않는다", async ({
  page,
}) => {
  await page.goto("/editor/");
  await expect(
    page.getByText("호스트(부모 창)에서 데이터를 기다리는 중…", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "저장하고 편집 완료" })).toHaveCount(0);
});
