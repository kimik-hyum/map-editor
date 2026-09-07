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

async function selectAndCenterFeature(page: Page, name: string) {
  const row = page.getByRole("button", { name: `${name} 선택` });
  await row.click();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  // 패널 선택의 지도 중심 이동 애니메이션(350ms)이 끝난 뒤 도형 중심에서 드래그합니다.
  await page.waitForTimeout(400);
}

async function readFeatureSnapshot(page: Page, name: string) {
  return page.evaluate(async (featureName) => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    for (const layer of state.scene?.layers ?? []) {
      for (const feature of layer.features) {
        if (feature.name === featureName) {
          return {
            geometry: feature.feature.geometry,
            pastCount: state.past.length,
          };
        }
      }
    }
    throw new Error(`${featureName} 도형을 찾을 수 없습니다.`);
  }, name);
}

async function dragFromMapCenter(
  page: Page,
  options: {
    modifier?: "Meta" | "Control";
    releaseModifierBeforePointerUp?: boolean;
  } = {},
) {
  const map = page.getByLabel("OSM map editor");
  const box = await map.boundingBox();
  if (!box) {
    throw new Error("지도 영역을 찾을 수 없습니다.");
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  if (options.modifier) {
    await page.keyboard.down(options.modifier);
  }
  let modifierReleased = false;
  try {
    await page.mouse.down();
    await page.mouse.move(startX + 80, startY + 40, { steps: 8 });
    if (options.modifier && options.releaseModifierBeforePointerUp) {
      await page.keyboard.up(options.modifier);
      modifierReleased = true;
    }
    await page.mouse.up();
  } finally {
    if (options.modifier && !modifierReleased) {
      await page.keyboard.up(options.modifier);
    }
  }
}

async function platformModifier(page: Page): Promise<"Meta" | "Control"> {
  return page.evaluate(() =>
    /Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control",
  );
}

test("패널에 포커스가 있어도 폴리곤 내부 첫 드래그는 지도만 이동한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  await selectAndCenterFeature(editorPage, "권역 C");
  const before = await readFeatureSnapshot(editorPage, "권역 C");
  const anchor = editorPage.locator("[data-map-annotation]").first();
  const position = await anchor.boundingBox();
  if (!position) throw new Error("지도 이동을 관찰할 라벨이 없습니다.");
  await editorPage.getByRole("button", { name: "권역 C 선택", exact: true }).focus();

  await dragFromMapCenter(editorPage);
  await expect
    .poll(async () => {
      const next = await anchor.boundingBox();
      return next ? Math.hypot(next.x - position.x, next.y - position.y) : 0;
    })
    .toBeGreaterThan(20);

  const after = await readFeatureSnapshot(editorPage, "권역 C");
  expect(after.geometry).toEqual(before.geometry);
  expect(after.pastCount).toBe(before.pastCount);
});

test("Cmd/Ctrl 드래그만 도형을 이동하고 Undo 한 번으로 복원한다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  await selectAndCenterFeature(editorPage, "권역 C");
  const before = await readFeatureSnapshot(editorPage, "권역 C");
  const modifier = await platformModifier(editorPage);

  await dragFromMapCenter(editorPage, { modifier });

  const moved = await readFeatureSnapshot(editorPage, "권역 C");
  expect(moved.geometry).not.toEqual(before.geometry);
  expect(moved.pastCount).toBe(before.pastCount + 1);

  await editorPage.keyboard.press(`${modifier}+z`);
  const undone = await readFeatureSnapshot(editorPage, "권역 C");
  expect(undone.geometry).toEqual(before.geometry);
  expect(undone.pastCount).toBe(before.pastCount);
});

test("이동 중 Cmd/Ctrl을 먼저 놓으면 원래 geometry로 취소한다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);
  await selectAndCenterFeature(editorPage, "권역 C");
  const before = await readFeatureSnapshot(editorPage, "권역 C");
  const modifier = await platformModifier(editorPage);

  await dragFromMapCenter(editorPage, {
    modifier,
    releaseModifierBeforePointerUp: true,
  });

  const after = await readFeatureSnapshot(editorPage, "권역 C");
  expect(after.geometry).toEqual(before.geometry);
  expect(after.pastCount).toBe(before.pastCount);
});

test("큰 작업 카드가 이동 보조키를 가로채지 않고 키 해제·창 복귀 뒤 다시 조작된다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);
  await selectAndCenterFeature(editorPage, "권역 C");
  const card = editorPage.locator("[data-map-annotation]").first();
  const modifier = await platformModifier(editorPage);
  const hitState = () =>
    card.evaluate((element) => {
      const overlay = element.closest(".ol-overlay-container");
      if (!overlay) throw new Error("작업 카드의 지도 오버레이가 없습니다.");
      return {
        inert: element.closest("[inert]") !== null,
        pointerEvents: getComputedStyle(overlay).pointerEvents,
      };
    });

  await expect(card).toBeVisible();
  await editorPage.keyboard.down(modifier);
  await expect(card).toBeVisible();
  await expect.poll(hitState).toEqual({ inert: true, pointerEvents: "none" });
  await editorPage.keyboard.up(modifier);
  await expect.poll(hitState).toEqual({ inert: false, pointerEvents: "auto" });

  await editorPage.keyboard.down(modifier);
  await editorPage.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(hitState).toEqual({ inert: false, pointerEvents: "auto" });
  await editorPage.keyboard.up(modifier);
  await card.getByRole("button").first().focus();
  await expect(card.getByRole("button").first()).toBeFocused();
});
