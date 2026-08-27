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

test("커밋 전 그리기 작업도 저장과 무경고 이탈을 막는다", async ({ page }) => {
  const editorPage = await openConnectedEditor(page);
  await editorPage.getByRole("button", { name: "폴리곤 그리기" }).click();
  const shapeDialog = editorPage.getByRole("dialog", { name: "추가할 도형" });
  await expect(shapeDialog).toBeVisible();
  await shapeDialog.getByRole("button", { name: "추가할 도형 닫기" }).click();

  const mapBox = await editorPage.getByLabel("OSM map editor").boundingBox();
  if (!mapBox) {
    throw new Error("지도 영역을 찾을 수 없습니다.");
  }
  await editorPage.mouse.click(
    mapBox.x + mapBox.width * 0.55,
    mapBox.y + mapBox.height * 0.3,
  );

  await expect(
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeDisabled();
  await expect(editorPage.getByRole("button", { name: "편집 취소" })).toBeDisabled();

  const preventsUnload = await editorPage.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(preventsUnload).toBe(true);
});

test("일반 상태 문구는 숨기고 반환할 폴리곤이 없을 때만 안내한다", async ({ page }) => {
  const editorPage = await openConnectedEditor(page);
  await expect(
    editorPage.getByText("현재 상태를 그대로 완료할 수 있습니다."),
  ).toHaveCount(0);

  await page.evaluate(() => {
    window.open("", "map-editor-child")?.postMessage(
      {
        type: "MAP_EDITOR_INIT",
        sessionId: "point-only-session",
        scene: {
          version: 2,
          features: [
            {
              name: "마커만 있는 결과",
              geometry: { type: "Point", coordinates: [126.98, 37.57] },
            },
          ],
        },
      },
      window.location.origin,
    );
  });

  await expect(editorPage.getByText("반환할 폴리곤이 없습니다.")).toBeVisible();
  await expect(
    editorPage.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeEnabled();
});
