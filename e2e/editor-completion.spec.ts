import { expect, test, type Page } from "@playwright/test";

async function openConnectedEditor(parentPage: Page): Promise<Page> {
  await parentPage.goto("/demo");
  const [editorPage] = await Promise.all([
    parentPage.waitForEvent("popup"),
    parentPage.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await editorPage.waitForLoadState();
  await expect(parentPage.getByText("연결됨")).toBeVisible();
  await expect(editorPage.getByText("권역 A")).toBeVisible();
  return editorPage;
}

async function hideAreaA(editorPage: Page) {
  const row = editorPage.getByRole("listitem").filter({ hasText: "권역 A" });
  await row.getByRole("button", { name: "도형 숨기기" }).click();
  await expect(
    editorPage.getByText("저장하지 않은 변경사항이 있습니다."),
  ).toBeVisible();
}

test("저장하고 완료하면 공개 v2 scene을 부모에게 반환하고 부모가 팝업을 닫는다", async ({
  page,
}) => {
  const editorPage = await openConnectedEditor(page);
  await hideAreaA(editorPage);

  const closed = editorPage.waitForEvent("close");
  await editorPage.getByRole("button", { name: "저장하고 편집 완료" }).click();
  await closed;

  await expect(page.getByText("완료됨 · 편집 결과 수신")).toBeVisible();
  const submittedScene = JSON.parse(
    (await page.getByTestId("submitted-scene").textContent()) ?? "null",
  ) as {
    version?: number;
    layers?: unknown;
    features?: Array<{ name?: string; visible?: boolean }>;
  };

  expect(submittedScene.version).toBe(2);
  expect(submittedScene.layers).toBeUndefined();
  expect(
    submittedScene.features?.find((feature) => feature.name === "권역 A"),
  ).toMatchObject({ visible: false });
});

test("미저장 변경 취소는 확인 뒤 CANCEL만 반환한다", async ({ page }) => {
  const editorPage = await openConnectedEditor(page);
  await hideAreaA(editorPage);

  await editorPage.getByRole("button", { name: "편집 취소" }).click();
  await expect(editorPage.getByRole("alertdialog")).toBeVisible();
  await editorPage.getByRole("button", { name: "계속 편집" }).click();
  await expect(editorPage.getByText("권역 A")).toBeVisible();

  await editorPage.getByRole("button", { name: "편집 취소" }).click();
  const closed = editorPage.waitForEvent("close");
  await editorPage.getByRole("button", { name: "저장하지 않고 닫기" }).click();
  await closed;

  await expect(page.getByText("취소됨 · 반환 데이터 없음")).toBeVisible();
  await expect(page.getByTestId("submitted-scene")).toHaveCount(0);
});
