import { expect, test, type Page } from "@playwright/test";
import type { EditorSceneInput } from "../src/pages/editor/types/editorTypes";

async function readParentScene(page: Page): Promise<EditorSceneInput> {
  return JSON.parse((await page.getByTestId("parent-scene").textContent()) ?? "null");
}

async function openEditor(page: Page) {
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await expect(
    editor.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeEnabled();
  return editor;
}

async function saveAndClose(editor: Page) {
  await Promise.all([
    editor.waitForEvent("close"),
    editor.getByRole("button", { name: "저장하고 편집 완료" }).click(),
  ]);
}

async function rename(editor: Page, before: string, after: string) {
  await editor
    .getByRole("button", { name: `${before} 이름 변경`, exact: true })
    .click();
  const input = editor.getByRole("textbox", { name: `${before} 새 이름`, exact: true });
  await input.fill(after);
  await input.press("Enter");
}

test("샘플 지도에서 시작해 이름·표시를 저장하고 수정본으로 다시 편집한다", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(
    page.getByRole("application", { name: "샘플 지도", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("전체 8개 · 표시 8개 · 숨김 0개")).toBeVisible();
  const viewport = page.locator('[aria-label="샘플 지도"] .ol-viewport');
  await expect(viewport).toBeVisible();
  await viewport.evaluate((element) =>
    element.setAttribute("data-stability", "retained"),
  );
  const editor = await openEditor(page);
  await rename(editor, "권역 A", "배송 권역 A");
  const row = editor.getByRole("listitem").filter({ hasText: "권역 B" });
  await row.getByRole("button", { name: "도형 숨기기" }).click();
  // 저장 전에는 부모 데이터를 덮지 않습니다.
  expect(
    (await readParentScene(page)).features.some((f) => f.name === "배송 권역 A"),
  ).toBe(false);
  await saveAndClose(editor);
  await expect(page.getByText("완료됨 · 편집 결과 수신")).toBeVisible();
  await expect(page.getByText("전체 8개 · 표시 7개 · 숨김 1개")).toBeVisible();
  expect(
    (await readParentScene(page)).features.find((f) => f.name === "배송 권역 A"),
  ).toBeDefined();
  await expect(viewport).toHaveAttribute("data-stability", "retained");

  const reopened = await openEditor(page);
  await expect(
    reopened.getByRole("button", { name: "배송 권역 A 선택", exact: true }),
  ).toBeVisible();
  await expect(
    reopened
      .getByRole("listitem")
      .filter({ hasText: "권역 B" })
      .getByRole("button", { name: "도형 보이기" }),
  ).toBeVisible();
  await rename(reopened, "배송 권역 A", "두 번째 저장");
  await saveAndClose(reopened);
  expect(
    (await readParentScene(page)).features.some((f) => f.name === "두 번째 저장"),
  ).toBe(true);
});

test("새 도형 geometry를 부모에게 돌려주고 취소하면 마지막 저장 상태를 유지한다", async ({
  page,
}) => {
  await page.goto("/demo");
  const editor = await openEditor(page);
  await editor.getByRole("button", { name: "폴리곤 그리기" }).click();
  const shapePicker = editor.getByRole("dialog", { name: "추가할 도형" });
  await shapePicker.getByRole("button", { name: /^마커/ }).click();
  await shapePicker.getByRole("button", { name: "추가할 도형 닫기" }).click();
  const map = editor.getByLabel("OSM map editor");
  const box = await map.boundingBox();
  if (!box) throw new Error("에디터 지도가 없습니다.");
  await editor.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.4);
  await saveAndClose(editor);
  await expect(page.getByText("전체 9개 · 표시 9개 · 숨김 0개")).toBeVisible();
  const saved = await readParentScene(page);
  expect(saved.features.filter((f) => f.geometry.type === "Point")).toHaveLength(1);
  const reopened = await openEditor(page);
  await rename(reopened, "권역 A", "취소할 이름");
  await reopened.getByRole("button", { name: "편집 취소", exact: true }).click();
  await Promise.all([
    reopened.waitForEvent("close"),
    reopened.getByRole("button", { name: "저장하지 않고 닫기" }).click(),
  ]);
  await expect(page.getByText("취소됨 · 반환 데이터 없음")).toBeVisible();
  expect(await readParentScene(page)).toEqual(saved);
  const third = await openEditor(page);
  await expect(
    third.getByRole("button", { name: "권역 A 선택", exact: true }),
  ).toBeVisible();
  await expect(third.getByText("취소할 이름", { exact: true })).toHaveCount(0);
});

test("중복 열기와 팝업 수동 종료로 부모 데이터가 초기화되지 않는다", async ({
  page,
  context,
}) => {
  await page.goto("/demo");
  const before = await readParentScene(page);
  const editor = await openEditor(page);
  await rename(editor, "권역 A", "진행 중 이름");
  await page.getByRole("button", { name: "편집기 새 창으로 열기" }).click();
  expect(context.pages()).toHaveLength(2);
  await expect(
    editor.getByRole("button", { name: "진행 중 이름 선택", exact: true }),
  ).toBeVisible();
  await editor.close();
  await expect(page.getByText("에디터 창이 닫힘 · 서비스 데이터 유지")).toBeVisible();
  expect(await readParentScene(page)).toEqual(before);
});

test("모바일에서도 지도·현재 데이터와 편집 버튼이 화면 폭 안에 있다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await expect(
    page.getByRole("button", { name: "편집기 새 창으로 열기" }),
  ).toBeVisible();
  await expect(
    page.getByRole("application", { name: "샘플 지도", exact: true }),
  ).toBeVisible();
  await page.getByText("현재 scene JSON 보기", { exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("기존 폴리곤 좌표 수정이 샘플 지도 데이터와 다음 편집에도 유지된다", async ({
  page,
}) => {
  await page.goto("/demo");
  const before = (await readParentScene(page)).features.find(
    (f) => f.name === "권역 A",
  )?.geometry;
  if (before?.type !== "Polygon") throw new Error("샘플 폴리곤이 없습니다.");
  const editor = await openEditor(page);
  await editor.getByRole("button", { name: "권역 A 선택", exact: true }).click();
  // 선택 도형으로 이동하는 기존 350ms 지도 애니메이션이 끝난 뒤 조작합니다.
  await editor.waitForTimeout(400);
  const box = await editor.getByLabel("OSM map editor").boundingBox();
  if (!box) throw new Error("에디터 지도가 없습니다.");
  const modifier = await editor.evaluate(() =>
    /Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control",
  );
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await editor.mouse.move(x, y);
  await editor.keyboard.down(modifier);
  await editor.mouse.down();
  await editor.mouse.move(x + 70, y + 35, { steps: 8 });
  await editor.mouse.up();
  await editor.keyboard.up(modifier);
  await saveAndClose(editor);
  const after = (await readParentScene(page)).features.find(
    (f) => f.name === "권역 A",
  )?.geometry;
  if (after?.type !== "Polygon") throw new Error("반환 폴리곤이 없습니다.");
  expect(after.coordinates[0][0]).not.toEqual(before.coordinates[0][0]);
  const reopened = await openEditor(page);
  await saveAndClose(reopened);
  expect(
    (await readParentScene(page)).features.find((f) => f.name === "권역 A")?.geometry,
  ).toEqual(after);
});
