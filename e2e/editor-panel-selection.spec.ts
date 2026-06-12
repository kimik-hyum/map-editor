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

test("패널 도형 행 클릭으로 선택하고, 다른 행 클릭은 선택을 교체한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);

  const featureA = editorPage.getByRole("button", { name: "권역 A 선택" }).first();
  const featureB = editorPage.getByRole("button", { name: "권역 B 선택" }).first();

  await expect(featureA).toHaveAttribute("aria-pressed", "false");

  // 클릭 = 선택.
  await featureA.click();
  await expect(featureA).toHaveAttribute("aria-pressed", "true");

  // 다른 행 클릭 = 교체(단일 선택).
  await featureB.click();
  await expect(featureB).toHaveAttribute("aria-pressed", "true");
  await expect(featureA).toHaveAttribute("aria-pressed", "false");

  // 같은 행 다시 클릭 = 해제.
  await featureB.click();
  await expect(featureB).toHaveAttribute("aria-pressed", "false");
});

test("읽기 전용(참고) 도형도 패널에서 선택할 수 있다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);

  const referenceFeature = editorPage
    .getByRole("button", { name: "참고 1 선택" })
    .first();

  await referenceFeature.click();
  await expect(referenceFeature).toHaveAttribute("aria-pressed", "true");
});
