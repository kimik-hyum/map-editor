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
  await expect(editorPage.getByText("이름을 입력하세요.")).toBeVisible();
  await expect(editorPage.getByText("0/100")).toBeVisible();
  await expect(nameInput).toHaveAttribute("maxlength", "100");
  await expect(
    editorPage.getByRole("button", { name: "이름 변경 저장" }),
  ).toBeDisabled();

  await nameInput.fill("  배송 권역 A  ");
  await expect(
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeDisabled();
  await expect(editorPage.getByRole("button", { name: "편집 취소" })).toBeDisabled();
  await expect(
    editorPage.getByText("진행 중인 편집을 먼저 완료하거나 취소하세요."),
  ).toBeVisible();
  const preventsUnload = await editorPage.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(preventsUnload).toBe(true);

  await nameInput.press("Enter");
  const renamedSelectButton = editorPage.getByRole("button", {
    name: "배송 권역 A 선택",
  });
  const renamedEditButton = editorPage.getByRole("button", {
    name: "배송 권역 A 이름 변경",
  });
  await expect(renamedSelectButton).toBeVisible();
  await expect(renamedEditButton).toBeFocused();

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

test("새 INIT은 같은 feature id에 남아 있던 이름 초안을 폐기한다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);

  await editorPage.getByRole("button", { name: "권역 A 이름 변경" }).click();
  const oldDraft = editorPage.getByRole("textbox", { name: "권역 A 새 이름" });
  await oldDraft.fill("이전 세션 초안");

  await page.evaluate(() => {
    window.open("", "map-editor-child")?.postMessage(
      {
        type: "MAP_EDITOR_INIT",
        sessionId: "replacement-rename-session",
        scene: {
          version: 2,
          features: [
            {
              id: "feature-5",
              name: "새 세션 권역",
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [126.97, 37.56],
                    [126.99, 37.56],
                    [126.99, 37.58],
                    [126.97, 37.56],
                  ],
                ],
              },
            },
          ],
        },
      },
      window.location.origin,
    );
  });

  await expect(oldDraft).toHaveCount(0);
  await expect(
    editorPage.getByRole("button", { name: "새 세션 권역 선택" }),
  ).toBeVisible();

  await editorPage.getByRole("button", { name: "새 세션 권역 이름 변경" }).click();
  await expect(
    editorPage.getByRole("textbox", { name: "새 세션 권역 새 이름" }),
  ).toHaveValue("새 세션 권역");
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
