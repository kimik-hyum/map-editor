import { expect, test } from "@playwright/test";

test("도형 편집 문서가 선택부터 완료까지 현재 기능을 안내한다", async ({ page }) => {
  await page.goto("/editing");

  await expect(
    page.getByRole("heading", { name: "편집 동작", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "화면 구성" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "도구별 동작" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "필수 단축키" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "저장·취소 조건" })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "폴리곤 연산", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/0.01–1,000km/)).toBeVisible();
  await expect(
    page.getByText(/부모창이 전달한 원본에는 삭제 버튼이 없습니다/),
  ).toBeVisible();
});

test("시작 문서와 화면 구성에서 도형 편집 문서로 이동한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "편집 동작" }).click();
  await expect(page).toHaveURL(/\/editing$/);

  await page.goto("/screen");
  await expect(page).toHaveURL(/\/editing#screen$/);
  await expect(page.getByRole("heading", { name: "화면 구성" })).toBeVisible();
});
