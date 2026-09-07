import { expect, type Locator, type Page } from "@playwright/test";

export async function readEditorEdits(page: Page) {
  return page.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    return {
      layers: state.scene?.layers,
      selected: state.selectedFeatureIds,
      past: state.past.length,
      future: state.future.length,
    };
  });
}

// 지도 좌표에 고정된 라벨의 화면 이동까지 확인해, geometry만 불변인 거짓 성공을 막습니다.
export async function dragAnnotation(page: Page, target: Locator, anchor: Locator) {
  await expect(target).toBeVisible();
  // 선택 시 중심 이동과 이전 드래그의 관성이 끝난 뒤 측정합니다.
  await page.waitForTimeout(600);
  const start = await target.boundingBox();
  const before = await anchor.boundingBox();
  if (!start || !before) throw new Error("지도 작업 아이콘을 찾을 수 없습니다.");
  const x = start.x + start.width / 2;
  const y = start.y + start.height / 2;
  const viewport = await page.getByLabel("OSM map editor").boundingBox();
  if (!viewport) throw new Error("지도 영역이 없습니다.");
  // 연속 검사로 라벨을 화면 밖으로 밀어내지 않도록 항상 화면 중앙 방향으로 끕니다.
  const dx = x > viewport.x + viewport.width / 2 ? -60 : 60;
  const dy = y > viewport.y + viewport.height / 2 ? -30 : 30;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const after = await anchor.boundingBox();
      return after ? Math.hypot(after.x - before.x, after.y - before.y) : 0;
    })
    .toBeGreaterThan(20);
  // 호출부에서 지연 singleclick·관성이 끝난 뒤에도 편집 상태가 불변인지 비교합니다.
  await page.waitForTimeout(650);
}
