import { expect, test } from "@playwright/test";

test("부모창 연동 문서가 입력·전체 코드·결과 사용 순서로 표시된다", async ({
  page,
}) => {
  await page.goto("/integration");

  await expect(
    page.getByRole("heading", { name: "부모 창 연동", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "메시지 흐름" })).toBeVisible();
  for (const title of [
    "2. 팝업·메시지 처리",
    "3. 결과 검증 스키마",
    "4. 입력 데이터",
  ]) {
    await page.getByText(title, { exact: true }).click();
  }
  await expect(page.getByText("scene.json", { exact: true })).toBeVisible();
  await expect(
    page.locator("figcaption").getByText("editor-contract.example.ts"),
  ).toBeVisible();
  await expect(
    page.locator("figcaption").getByText("map-editor-host.example.ts"),
  ).toBeVisible();
  await expect(
    page.locator("figcaption").getByText("parent-page.example.ts"),
  ).toBeVisible();
  await expect(
    page.getByText("MAP_EDITOR_SUBMIT", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "코드 복사" })).toHaveCount(5);
});

test("시작 문서에서 부모창 연동 문서로 이동한다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("main").getByRole("link", { name: "부모 창 연동" }).click();
  await expect(page).toHaveURL(/\/integration$/);
  await expect(
    page.getByRole("heading", { name: "부모 창 연동", level: 1 }),
  ).toBeVisible();
});
