import { expect, test, type Page } from "@playwright/test";

async function openEditor(page: Page) {
  await page.goto("/demo");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 탭으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  return editor;
}

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    return {
      layers: state.scene?.layers ?? [],
      activeLayerId: state.activeLayerId,
      pastCount: state.past.length,
    };
  });
}

async function modifier(page: Page) {
  return page.evaluate(() =>
    /Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control",
  );
}

async function mapClick(page: Page, x: number, y: number) {
  const box = await page.getByLabel("OSM map editor").boundingBox();
  if (!box) throw new Error("지도를 찾을 수 없습니다");
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
}

test("빈 레이어 생성·이름 변경 후 같은 레이어에 폴리곤을 그리고 undo/redo한다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  const before = await snapshot(editor);
  await editor.getByRole("button", { name: "레이어 추가", exact: true }).click();
  await expect(
    editor.getByRole("button", { name: "새 레이어 1 선택", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const created = await snapshot(editor);
  expect(created.layers).toHaveLength(before.layers.length + 1);
  expect(created.layers.at(-1)?.features).toEqual([]);

  await editor
    .getByRole("button", { name: "새 레이어 1 이름 변경", exact: true })
    .click();
  await editor.getByRole("textbox", { name: "새 레이어 1 새 이름" }).fill("배송 권역");
  await editor.getByRole("button", { name: "이름 변경 저장" }).click();
  await editor.getByRole("button", { name: "배송 권역에 도형 그리기" }).click();
  await mapClick(editor, 0.62, 0.28);
  await expect(
    editor.getByRole("button", { name: "레이어 추가", exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "배송 권역 삭제", exact: true }),
  ).toBeDisabled();
  await mapClick(editor, 0.78, 0.28);
  await mapClick(editor, 0.78, 0.55);
  await editor.keyboard.press("Enter");
  await expect(
    editor.getByRole("button", { name: "배송 권역에 도형 그리기" }),
  ).toHaveCount(0);
  const filled = await snapshot(editor);
  expect(filled.layers).toHaveLength(created.layers.length);
  expect(filled.layers.at(-1)).toMatchObject({
    id: created.activeLayerId,
    name: "배송 권역",
    features: [{ name: "배송 권역", feature: { geometry: { type: "Polygon" } } }],
  });

  const key = await modifier(editor);
  await editor.keyboard.press(`${key}+z`);
  await expect(
    editor.getByRole("button", { name: "배송 권역에 도형 그리기" }),
  ).toBeVisible();
  expect((await snapshot(editor)).layers.at(-1)?.features).toEqual([]);
  await editor.keyboard.press(`${key}+Shift+z`);
  await expect(
    editor.getByRole("button", { name: "배송 권역에 도형 그리기" }),
  ).toHaveCount(0);
});

test("여러 빈 레이어 중 선택한 레이어를 채우고 다음 마커는 새 레이어에 만든다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  await editor.getByRole("button", { name: "레이어 추가", exact: true }).click();
  await editor.getByRole("button", { name: "레이어 추가", exact: true }).click();
  const before = await snapshot(editor);
  await editor.getByRole("button", { name: "새 레이어 1 선택", exact: true }).click();
  await editor.getByRole("button", { name: "폴리곤 그리기", exact: true }).click();
  const popup = editor.getByRole("region", { name: "추가할 도형" });
  await popup.getByRole("button", { name: /^마커/ }).click();
  await mapClick(editor, 0.7, 0.3);
  await expect(
    editor.getByRole("button", { name: "새 레이어 1에 도형 그리기" }),
  ).toHaveCount(0);
  const filled = await snapshot(editor);
  expect(filled.layers).toHaveLength(before.layers.length);
  expect(
    filled.layers.find((layer) => layer.name === "새 레이어 1")?.features,
  ).toHaveLength(1);
  expect(filled.layers.find((layer) => layer.name === "새 레이어 2")?.features).toEqual(
    [],
  );
  await mapClick(editor, 0.8, 0.4);
  await expect
    .poll(async () => (await snapshot(editor)).layers.length)
    .toBe(before.layers.length + 1);
});

test("빈 scene에서도 추가하고 잠금·숨김·삭제 취소·복원을 지원한다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().setScene({ version: 1, layers: [] });
  });
  await editor.getByRole("button", { name: "레이어 추가", exact: true }).click();
  const draw = editor.getByRole("button", { name: "새 레이어 1에 도형 그리기" });
  await editor.getByRole("button", { name: "새 레이어 1 잠금", exact: true }).click();
  await expect(draw).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "새 레이어 1 삭제", exact: true }),
  ).toHaveCount(0);
  await editor
    .getByRole("button", { name: "새 레이어 1 잠금 해제", exact: true })
    .click();
  await editor.getByRole("button", { name: "레이어 숨기기", exact: true }).click();
  await expect(draw).toBeDisabled();
  await editor.getByRole("button", { name: "레이어 보이기", exact: true }).click();
  await expect(draw).toBeEnabled();
  await editor.getByRole("button", { name: "새 레이어 1 삭제", exact: true }).click();
  const dialog = editor.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(draw).toBeVisible();
  await editor.getByRole("button", { name: "새 레이어 1 삭제", exact: true }).click();
  await dialog.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(draw).toHaveCount(0);
  const key = await modifier(editor);
  await editor.keyboard.press(`${key}+z`);
  await expect(draw).toBeVisible();
  await editor.keyboard.press(`${key}+Shift+z`);
  await expect(draw).toHaveCount(0);
});
