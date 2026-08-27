import { expect, test, type Page } from "@playwright/test";

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

test("잠금 해제된 도형 이름을 인라인으로 바꾸고 부모에게 반환한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);

  await expect(
    editorPage.getByRole("button", { name: "참고 1 이름 변경" }),
  ).toHaveCount(0);

  await editorPage.getByRole("button", { name: "권역 A 이름 변경" }).click();
  const nameInput = editorPage.getByRole("textbox", { name: "권역 A 새 이름" });
  await expect(nameInput).toBeFocused();
  await expect(nameInput).toHaveValue("권역 A");

  await nameInput.fill("   ");
  await expect(
    editorPage.getByRole("button", { name: "이름 변경 저장" }),
  ).toBeDisabled();

  await nameInput.fill("  배송 권역 A  ");
  await nameInput.press("Enter");
  await expect(
    editorPage.getByRole("button", { name: "배송 권역 A 선택" }),
  ).toBeVisible();

  const closed = editorPage.waitForEvent("close");
  await editorPage.getByRole("button", { name: "저장하고 편집 완료" }).click();
  await closed;

  const submittedScene = JSON.parse(
    (await page.getByTestId("submitted-scene").textContent()) ?? "null",
  ) as { features?: Array<{ name?: string }> };
  expect(
    submittedScene.features?.some((feature) => feature.name === "배송 권역 A"),
  ).toBe(true);
});

test("잠금 해제 후에는 참고 도형도 이름을 바꿀 수 있다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);

  await editorPage.getByRole("button", { name: "참고 1 잠금 해제" }).click();
  const renameButton = editorPage.getByRole("button", {
    name: "참고 1 이름 변경",
  });
  await expect(renameButton).toBeVisible();

  await renameButton.click();
  const nameInput = editorPage.getByRole("textbox", { name: "참고 1 새 이름" });
  await nameInput.fill("수정된 참고 도형");
  await editorPage.getByRole("button", { name: "이름 변경 취소" }).click();

  await expect(editorPage.getByRole("button", { name: "참고 1 선택" })).toBeVisible();
});
