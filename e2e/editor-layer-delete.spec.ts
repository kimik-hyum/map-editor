import { expect, test, type Page } from "@playwright/test";

type DeleteSnapshot = {
  layerCount: number;
  pastCount: number;
  futureCount: number;
  selectedFeatureIds: string[];
  featureNames: string[];
};

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

async function readDeleteSnapshot(page: Page): Promise<DeleteSnapshot> {
  return page.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    return {
      layerCount: state.scene?.layers.length ?? 0,
      pastCount: state.past.length,
      futureCount: state.future.length,
      selectedFeatureIds: state.selectedFeatureIds,
      featureNames:
        state.scene?.layers.flatMap((layer) =>
          layer.features.map((feature) => feature.name ?? feature.id),
        ) ?? [],
    };
  });
}

async function platformModifier(page: Page): Promise<"Meta" | "Control"> {
  return page.evaluate(() =>
    /Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control",
  );
}

test("부모 원본은 보호하고 로컬 생성 레이어만 확인 후 삭제·복원한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);

  // 부모 INIT에서 받은 원본에는 삭제 버튼을 제공하지 않습니다.
  await expect(editorPage.getByRole("button", { name: "권역 A 삭제" })).toHaveCount(0);

  await editorPage.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().addFeatures([
      {
        name: "임시 교집합 결과",
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
    ]);
  });

  const deleteButton = editorPage.getByRole("button", {
    name: "임시 교집합 결과 삭제",
  });
  await expect(deleteButton).toBeVisible();
  const beforeDelete = await readDeleteSnapshot(editorPage);

  // 취소하면 아무것도 바뀌지 않습니다.
  await deleteButton.click();
  const dialog = editorPage.getByRole("alertdialog", {
    name: "“임시 교집합 결과” 레이어를 삭제할까요?",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "취소" })).toBeFocused();
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(deleteButton).toBeVisible();
  expect(await readDeleteSnapshot(editorPage)).toEqual(beforeDelete);

  // 확인하면 레이어와 선택이 함께 정리되고 history 한 단계가 추가됩니다.
  await deleteButton.click();
  await dialog.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(deleteButton).toBeHidden();

  const deleted = await readDeleteSnapshot(editorPage);
  expect(deleted.layerCount).toBe(beforeDelete.layerCount - 1);
  expect(deleted.pastCount).toBe(beforeDelete.pastCount + 1);
  expect(deleted.futureCount).toBe(0);
  expect(deleted.selectedFeatureIds).toEqual([]);
  expect(deleted.featureNames).not.toContain("임시 교집합 결과");

  const modifier = await platformModifier(editorPage);
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect(deleteButton).toBeVisible();
  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect(deleteButton).toBeHidden();
});
