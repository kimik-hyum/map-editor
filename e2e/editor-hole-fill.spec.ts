import { expect, test, type Page } from "@playwright/test";

async function openEditor(page: Page) {
  await page.goto("/demo");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 C", { exact: true })).toBeVisible();
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().updateFeatureGeometry("feature-7", {
      type: "Polygon",
      coordinates: [
        [
          [126.97, 37.57],
          [126.98, 37.57],
          [126.98, 37.58],
          [126.97, 37.58],
          [126.97, 37.57],
        ],
        [
          [126.971, 37.571],
          [126.9711, 37.571],
          [126.9711, 37.5711],
          [126.971, 37.5711],
          [126.971, 37.571],
        ],
        [
          [126.974, 37.574],
          [126.977, 37.574],
          [126.977, 37.577],
          [126.974, 37.577],
          [126.974, 37.574],
        ],
      ],
    });
  });
  return editor;
}
async function readSnapshot(editor: Page) {
  return editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    return { scene: state.scene, past: state.past.length, future: state.future.length };
  });
}
const button = (editor: Page) =>
  editor.getByRole("button", { name: "권역 C 빈 공간 채우기" });
const popup = (editor: Page) =>
  editor.getByRole("dialog", { name: "빈 공간 채우기", exact: true });

test("연필 옆 페인트통은 조건에 맞을 때만 활성화되고 native title로 이유를 설명한다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  await expect(button(editor)).toBeEnabled();
  await expect(button(editor)).toHaveAttribute("title", /지정 면적 이하/);
  expect(
    await button(editor).evaluate((element) =>
      element.parentElement?.previousElementSibling?.getAttribute("aria-label"),
    ),
  ).toBe("권역 C 이름 변경");
  await expect(
    editor.getByRole("button", { name: "권역 A 빈 공간 채우기" }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "권역 A 빈 공간 채우기" }),
  ).toHaveAttribute("title", /내부 빈 공간이 없습니다/);
  await editor.getByRole("button", { name: "권역 C 잠금", exact: true }).click();
  await expect(button(editor)).toBeDisabled();
  await expect(button(editor)).toHaveAttribute("title", /잠금을 해제/);
  await expect(button(editor).locator("..")).toHaveAttribute("title", /잠금을 해제/);
  await editor.getByRole("button", { name: "권역 C 잠금 해제", exact: true }).click();
  const row = editor.getByRole("listitem").filter({ hasText: "권역 C" });
  await row.getByRole("button", { name: "도형 숨기기" }).click();
  await expect(button(editor)).toBeDisabled();
  await expect(button(editor)).toHaveAttribute("title", /도형을 표시/);
  await row.getByRole("button", { name: "도형 보이기" }).click();
  await expect(button(editor)).toBeEnabled();
  await editor.getByRole("button", { name: "권역 A 이름 변경" }).click();
  await expect(button(editor)).toBeDisabled();
  await expect(button(editor)).toHaveAttribute("title", /이름 편집/);
  await editor.getByRole("button", { name: "이름 변경 취소" }).click();
  await button(editor).hover();
  await expect(editor.getByRole("tooltip")).toHaveCount(0);
});

test("미리보기·취소는 scene과 이력을 바꾸지 않고 적용은 한 단계 undo/redo를 지원한다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  const before = await readSnapshot(editor);
  await button(editor).click();
  await expect(popup(editor)).toContainText("대상: 권역 C");
  await expect(popup(editor)).toContainText("전체 2개 중 1개 채우기");
  await expect(
    editor.getByRole("button", { name: "저장하고 편집 완료", includeHidden: true }),
  ).toBeDisabled();
  expect(await readSnapshot(editor)).toEqual(before);
  await popup(editor).getByRole("button", { name: "취소", exact: true }).click();
  await expect(popup(editor)).toBeHidden();
  expect(await readSnapshot(editor)).toEqual(before);
  await expect(button(editor)).toBeFocused();
  await button(editor).press("Enter");
  await popup(editor).getByRole("button", { name: "채우기 적용" }).click();
  await expect(popup(editor)).toBeHidden();
  const after = await readSnapshot(editor);
  expect(after.past).toBe(before.past + 1);
  const expected = structuredClone(before.scene);
  const geometry = expected?.layers
    .flatMap((layer) => layer.features)
    .find((feature) => feature.id === "feature-7")?.feature.geometry;
  if (geometry?.type !== "Polygon") throw new Error("Polygon fixture required");
  geometry.coordinates.splice(1, 1);
  const result = after.scene?.layers
    .flatMap((layer) => layer.features)
    .find((feature) => feature.id === "feature-7");
  expect(result?.feature.geometry).toEqual(geometry);
  await editor.keyboard.press("ControlOrMeta+z");
  expect((await readSnapshot(editor)).scene).toEqual(before.scene);
  await editor.keyboard.press("ControlOrMeta+Shift+z");
  expect((await readSnapshot(editor)).scene).toEqual(after.scene);
});

test("면적 입력 검증, 해당 구멍 없음, Escape 취소, 배경 단축키 차단", async ({
  page,
}) => {
  const editor = await openEditor(page);
  const before = await readSnapshot(editor);
  await button(editor).click();
  const input = popup(editor).getByRole("spinbutton");
  await input.fill("0");
  await expect(popup(editor).getByRole("alert")).toContainText("0보다 큰");
  await expect(
    popup(editor).getByRole("button", { name: "채우기 적용" }),
  ).toBeDisabled();
  await input.fill("1");
  await expect(popup(editor)).toContainText("전체 2개 중 0개 채우기");
  await expect(
    popup(editor).getByRole("button", { name: "채우기 적용" }),
  ).toBeDisabled();
  await input.fill("1000000");
  await expect(popup(editor)).toContainText("전체 2개 중 2개 채우기");
  await popup(editor).getByRole("button", { name: "채우기 적용" }).focus();
  await editor.keyboard.press("ControlOrMeta+z");
  await editor.keyboard.press("ControlOrMeta+v");
  expect(await readSnapshot(editor)).toEqual(before);
  await editor.keyboard.press("Escape");
  await expect(popup(editor)).toBeHidden();
  expect(await readSnapshot(editor)).toEqual(before);
});

test("진행 중 다른 scene 또는 선택으로 바뀌면 오래된 미리보기를 폐기한다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  await button(editor).click();
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().setSelectedFeatureIds(["feature-1"]);
  });
  await expect(popup(editor)).toBeHidden();
  await button(editor).click();
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const { EditorMessageType } =
      await import("/src/pages/editor/types/editorTypes.ts");
    const state = useEditorStore.getState();
    if (state.scene)
      state.initializeFromMessage({
        type: EditorMessageType.Init,
        sessionId: "replacement",
        scene: structuredClone(state.scene),
      });
  });
  await expect(popup(editor)).toBeHidden();
  expect((await readSnapshot(editor)).past).toBe(0);
});

test("전체 채우기 후 버튼을 비활성화하고 저장 결과를 부모 Demo로 돌려준다", async ({
  page,
}) => {
  const editor = await openEditor(page);
  await button(editor).click();
  await popup(editor).getByRole("spinbutton").fill("1000000");
  await popup(editor).getByRole("button", { name: "채우기 적용" }).click();
  await expect(button(editor)).toBeDisabled();
  await expect(button(editor)).toHaveAttribute("title", /내부 빈 공간이 없습니다/);
  await Promise.all([
    editor.waitForEvent("close"),
    editor.getByRole("button", { name: "저장하고 편집 완료" }).click(),
  ]);
  await expect(page.getByText("완료됨 · 편집 결과 수신")).toBeVisible();
  const result = JSON.parse(
    (await page.getByTestId("submitted-scene").textContent()) ?? "null",
  );
  expect(
    result.features.find((feature: { name: string }) => feature.name === "권역 C")
      .geometry.coordinates,
  ).toHaveLength(1);
});
