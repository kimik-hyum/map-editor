import { expect, test, type Page } from "@playwright/test";

// 데모(호스트)를 통해 에디터를 새 창으로 열고 scene 수신까지 기다립니다.
async function openEditorViaDemo(page: Page): Promise<Page> {
  await page.goto("/demo");

  const [editorPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);

  await editorPage.waitForLoadState();
  await expect(editorPage.getByText("권역 A")).toBeVisible();

  return editorPage;
}

test("화살표 버튼으로 행을 아래/위로 이동하고 스택 순서가 바뀐다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  const rows = editorPage.locator("ol > li");

  // 초기 스택(위→아래): 권역 C, 권역 B, 권역 A …
  await expect(rows.nth(0)).toContainText("권역 C");
  await expect(rows.nth(1)).toContainText("권역 B");

  // 행을 선택하면 순서 화살표가 같은 자리(#N)에 나타난다.
  await editorPage.getByRole("button", { name: "권역 B 선택" }).click();
  await editorPage.getByRole("button", { name: "권역 B 아래로 이동" }).click();

  await expect(rows.nth(1)).toContainText("권역 A");
  await expect(rows.nth(2)).toContainText("권역 B");

  // 다시 위로 올리면 원래 순서로 돌아온다.
  await editorPage.getByRole("button", { name: "권역 B 위로 이동" }).click();
  await expect(rows.nth(1)).toContainText("권역 B");
  await expect(rows.nth(2)).toContainText("권역 A");
});

test("맨 위 행은 위로 이동이 비활성화된다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);

  await editorPage.getByRole("button", { name: "권역 C 선택" }).click();

  await expect(
    editorPage.getByRole("button", { name: "권역 C 위로 이동" }),
  ).toBeDisabled();
  await expect(
    editorPage.getByRole("button", { name: "권역 C 아래로 이동" }),
  ).toBeEnabled();
});
