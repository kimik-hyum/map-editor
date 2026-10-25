import { expect, test } from "@playwright/test";

for (const { path, label } of [
  { path: "/ko/", label: "편집 흐름 체험하기" },
  { path: "/ko/integration", label: "문서 안의 실습" },
]) {
  test(`${path}의 실습 링크는 현재 창에서 해당 구역으로 이동한다`, async ({
    page,
    context,
  }) => {
    await page.goto(path);
    const link = page.getByRole("main").getByRole("link", { name: label, exact: true });
    const section = page.locator("#quickstart");
    const pageCount = context.pages().length;
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}#quickstart$`));
    await expect.poll(async () => (await section.boundingBox())?.y).toBeGreaterThan(60);
    await expect.poll(async () => (await section.boundingBox())?.y).toBeLessThan(200);
    expect(context.pages()).toHaveLength(pageCount);

    // 이미 같은 해시인 상태에서도 다시 누르면 실습 위치로 이동해야 합니다.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await link.click();
    await expect.poll(async () => (await section.boundingBox())?.y).toBeLessThan(200);
  });
}

test("전송 예제에는 주석을 표시하고 복사하면 전송 가능한 JSON을 받는다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/ko/integration");
  await page.getByText("편집 창에 보낼 데이터 JSON", { exact: true }).click();
  const example = page.locator("figure").filter({
    has: page.getByText("현재 입력.jsonc · 필드 설명", { exact: true }),
  });
  await expect(example).toContainText("// 필수: 편집 창과 주고받는 데이터 형식");
  await expect(example).toContainText("[경도, 위도]");
  await expect(example).toContainText("필드명과 값은 서비스에서 자유롭게 정합니다");
  await example.getByRole("button", { name: "JSON 복사", exact: true }).click();
  await expect(
    example.getByRole("button", { name: "JSON 복사 완료", exact: true }),
  ).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied)).toEqual(
    JSON.parse(await page.getByTestId("palace-scene").innerText()),
  );
});

test("연결 조건과 메시지 다음에 최소 예제를 보여주고 보조 코드는 접어서 제공한다", async ({
  page,
}) => {
  await page.goto("/ko/integration");
  await expect(
    page.getByRole("heading", { name: "편집 창 연동하기", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "경복궁 예제 새 창으로 편집" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "사각형 하나를 보내고 결과 JSON 받기" }),
  ).toBeVisible();
  await expect(
    page.locator("figcaption").getByText("minimal-service.example.ts"),
  ).toBeVisible();
  const sections = await page
    .locator("main section[id]")
    .evaluateAll((elements) => elements.map((element) => element.id));
  expect(sections.slice(0, 7)).toEqual([
    "addresses",
    "messages",
    "example",
    "scene",
    "roundtrip",
    "quickstart",
    "validation",
  ]);
  await expect(
    page.locator("figcaption").getByText("map-editor-host.example.ts"),
  ).toBeHidden();
  await page
    .getByText("필수 보조 파일 · 창 연결과 메시지 처리", { exact: true })
    .click();
  await expect(
    page.locator("figcaption").getByText("map-editor-host.example.ts"),
  ).toBeVisible();
  await page
    .getByText("지도 화면에 결과 반영하기 · bindMapEditor", { exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "서비스 페이지 연결 함수" }),
  ).toContainText("renderOnMap(featureCollection)");
  await expect(
    page.getByRole("heading", { name: "주소만 직접 열면 편집 데이터를 기다립니다" }),
  ).toBeVisible();
});

test("경복궁 도형의 실제 편집 결과를 받고 다음 창에 수정본을 보낸다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ko/integration");
  const original = JSON.parse(await page.getByTestId("palace-scene").innerText());
  expect(
    original.features.map(
      (feature: { geometry: { type: string } }) => feature.geometry.type,
    ),
  ).toEqual(["Polygon", "LineString", "Point"]);
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "경복궁 예제 새 창으로 편집" }).click(),
  ]);
  await editor.setViewportSize({ width: 1440, height: 900 });
  for (const name of ["경복궁 예제 권역", "경복궁 예제 경로", "경복궁 예제 마커"]) {
    await expect(
      editor.getByRole("button", { name: `${name} 선택`, exact: true }),
    ).toBeVisible();
  }
  await editor
    .getByRole("button", { name: "경복궁 예제 권역 선택", exact: true })
    .click();
  // 레이어 선택에 따른 지도 중심 이동 애니메이션이 끝난 뒤 도형을 드래그합니다.
  await editor.waitForTimeout(450);
  const map = await editor
    .getByRole("application", { name: "OSM map editor" })
    .boundingBox();
  if (!map) throw new Error("지도가 없습니다.");
  const x = map.x + map.width / 2;
  const y = map.y + map.height / 2;
  const modifier = await editor.evaluate(() =>
    /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "Meta" : "Control",
  );
  await editor.keyboard.down(modifier);
  await editor.mouse.move(x, y);
  await editor.mouse.down();
  await editor.mouse.move(x + 70, y + 30, { steps: 12 });
  await editor.mouse.up();
  await editor.keyboard.up(modifier);
  await editor.getByRole("button", { name: "저장하고 편집 완료" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "편집 결과를 받았습니다" }),
  ).toBeVisible();
  const result = JSON.parse(await page.getByTestId("palace-scene").innerText());
  expect(result.features[0].id).toBe("gyeongbokgung-area");
  expect(result.features[0].properties).toEqual({ serviceAreaId: "palace-001" });
  expect(result.features[0].geometry).not.toEqual(original.features[0].geometry);
  expect(result.features.slice(1)).toEqual(original.features.slice(1));
  await expect.poll(() => editor.isClosed()).toBe(true);
  const [reopened] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "경복궁 예제 새 창으로 편집" }).click(),
  ]);
  await reopened
    .getByRole("button", { name: "경복궁 예제 권역 선택", exact: true })
    .waitFor();
  await expect(
    reopened.getByRole("button", { name: "경복궁 예제 경로 선택", exact: true }),
  ).toBeVisible();
  await expect(
    reopened.getByRole("button", { name: "경복궁 예제 마커 선택", exact: true }),
  ).toBeVisible();
  await reopened.getByRole("button", { name: "편집 취소", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "취소했습니다" }),
  ).toBeVisible();
  expect(JSON.parse(await page.getByTestId("palace-scene").innerText())).toEqual(
    result,
  );
  await page.getByRole("button", { name: "초기화", exact: true }).click();
  expect(JSON.parse(await page.getByTestId("palace-scene").innerText())).toEqual(
    original,
  );
});

test("소개 문서에서 편집 창 연동 문서로 이동한다", async ({ page }) => {
  await page.goto("/ko/");

  await page.getByRole("main").getByRole("link", { name: "연동 인터페이스" }).click();
  await expect(page).toHaveURL(/\/integration$/);
  await expect(
    page.getByRole("heading", { name: "편집 창 연동하기", level: 1 }),
  ).toBeVisible();
});

test("소개와 데모는 서비스 페이지의 데이터 전송과 편집 결과 반영을 안내한다", async ({
  page,
}) => {
  await page.goto("/ko/");
  await expect(page.getByRole("main")).toContainText(
    "서비스 페이지에서 편집 창을 열고 도형 데이터를 보내세요",
  );
  await expect(page.getByRole("table", { name: "두 화면의 역할" })).toContainText(
    "편집 창을 열고 편집할 데이터를 보냅니다",
  );
  await page.getByRole("link", { name: "지도 연동 데모", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "내 지도의 폴리곤을 편집하고 돌려받기",
    }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "지도 폴리곤 전달 → 새 탭에서 편집 → 결과 수신·지도 갱신",
  );
  await expect(page.getByRole("main")).not.toContainText("부모");
});
