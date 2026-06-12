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

test("끌기 핸들로 행을 끌어 스택 순서를 바꾼다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  const rows = editorPage.locator("ol > li");

  // 초기 스택(위→아래): 권역 C, 권역 B …
  await expect(rows.nth(0)).toContainText("권역 C");
  await expect(rows.nth(1)).toContainText("권역 B");

  // 권역 C의 끌기 핸들을 잡고 권역 B 아래까지 끌어 내린다.
  const handle = editorPage.getByRole("button", { name: "권역 C 끌어서 순서 변경" });
  const handleBox = await handle.boundingBox();
  const targetBox = await rows.nth(1).boundingBox();
  if (!handleBox || !targetBox) {
    throw new Error("끌기 대상 위치를 찾지 못했습니다");
  }

  await editorPage.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await editorPage.mouse.down();
  await editorPage.mouse.move(
    handleBox.x + handleBox.width / 2,
    targetBox.y + targetBox.height * 0.8,
    { steps: 12 },
  );
  await editorPage.mouse.up();

  await expect(rows.nth(0)).toContainText("권역 B");
  await expect(rows.nth(1)).toContainText("권역 C");
});

test("행 본문 드래그로는 순서가 바뀌지 않는다(핸들 전용)", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  const rows = editorPage.locator("ol > li");

  await expect(rows.nth(0)).toContainText("권역 C");

  // 행 본문(이름 영역)을 잡고 아래로 끌어도 재정렬이 일어나지 않는다.
  const body = editorPage.getByRole("button", { name: "권역 C 선택" });
  const bodyBox = await body.boundingBox();
  const targetBox = await rows.nth(2).boundingBox();
  if (!bodyBox || !targetBox) {
    throw new Error("끌기 대상 위치를 찾지 못했습니다");
  }

  await editorPage.mouse.move(
    bodyBox.x + bodyBox.width / 2,
    bodyBox.y + bodyBox.height / 2,
  );
  await editorPage.mouse.down();
  await editorPage.mouse.move(
    bodyBox.x + bodyBox.width / 2,
    targetBox.y + targetBox.height * 0.8,
    { steps: 12 },
  );
  await editorPage.mouse.up();

  await expect(rows.nth(0)).toContainText("권역 C");
});

test("키보드로도 순서를 바꿀 수 있다(핸들 포커스 후 스페이스와 방향키)", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  const rows = editorPage.locator("ol > li");

  await expect(rows.nth(0)).toContainText("권역 C");

  const handle = editorPage.getByRole("button", { name: "권역 C 끌어서 순서 변경" });
  await handle.focus();
  // 키 입력 사이에 짧은 간격을 둔다(끌기 시작/이동/놓기 상태 반영 시간).
  await editorPage.keyboard.press("Space"); // 끌기 시작
  await editorPage.waitForTimeout(200);
  await editorPage.keyboard.press("ArrowDown"); // 한 칸 아래로
  await editorPage.waitForTimeout(200);
  await editorPage.keyboard.press("Space"); // 놓기

  await expect(rows.nth(0)).toContainText("권역 B");
  await expect(rows.nth(1)).toContainText("권역 C");
});
