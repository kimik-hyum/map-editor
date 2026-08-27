import { expect, test } from "@playwright/test";

test("부모창 연동 문서가 입력·전체 코드·결과 사용 순서로 표시된다", async ({
  page,
}) => {
  await page.goto("/integration");

  await expect(
    page.getByRole("heading", { name: "부모창 연동", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "부모창이 해야 할 네 가지" }),
  ).toBeVisible();
  await expect(page.getByText("input-scene.json")).toBeVisible();
  await expect(page.getByText("editor-contract.ts")).toBeVisible();
  await expect(page.getByText("map-editor-host.ts")).toBeVisible();
  await expect(page.getByText("parent-page.ts")).toBeVisible();
  await expect(
    page.getByText("MAP_EDITOR_SUBMIT", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "코드 복사" })).toHaveCount(4);
});

test("시작 문서에서 부모창 연동 문서로 이동한다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: /postMessage 연동/ }).click();
  await expect(page).toHaveURL(/\/integration$/);
  await expect(
    page.getByRole("heading", { name: "부모창 연동", level: 1 }),
  ).toBeVisible();
});
