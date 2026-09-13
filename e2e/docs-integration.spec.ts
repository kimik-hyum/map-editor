import { expect, test } from "@playwright/test";

test("전송 예제에는 주석을 표시하고 복사하면 전송 가능한 JSON을 받는다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/integration");
  await page.getByText("새 창에 보낼 scene JSON", { exact: true }).click();
  const example = page.locator("figure").filter({
    has: page.getByText("현재 입력.jsonc · 필드 설명", { exact: true }),
  });
  await expect(example).toContainText("// 필수: 에디터와 주고받는 데이터 형식");
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

test("경복궁 예제를 먼저 보여주고 보조 코드는 접어서 제공한다", async ({ page }) => {
  await page.goto("/integration");
  await expect(
    page.getByRole("heading", { name: "연동 인터페이스", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "경복궁 예제 새 창으로 편집" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "1. 보낼 도형 만들기" }),
  ).toBeVisible();
  await expect(
    page.locator("figcaption").getByText("gyeongbokgung.example.ts"),
  ).toBeVisible();
  await expect(
    page.locator("figcaption").getByText("map-editor-host.example.ts"),
  ).toBeHidden();
  await page.getByText("보조 파일 · 팝업과 메시지 처리", { exact: true }).click();
  await expect(
    page.locator("figcaption").getByText("map-editor-host.example.ts"),
  ).toBeVisible();
  await page
    .getByText("이미 쓰는 지도와 연결하기 · bindMapEditor", { exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "bindMapEditor 연결 인터페이스" }),
  ).toContainText("renderOnMap(featureCollection)");
  await expect(
    page.getByRole("heading", { name: "주소만 열어 바로 그릴 수는 없나요?" }),
  ).toBeVisible();
});

test("경복궁 도형의 실제 편집 결과를 받고 다음 창에 수정본을 보낸다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/integration");
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
    page.getByRole("status").filter({ hasText: "저장 결과를 받았습니다" }),
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

test("시작 문서에서 서비스 지도 연동 문서로 이동한다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("main").getByRole("link", { name: "연동 인터페이스" }).click();
  await expect(page).toHaveURL(/\/integration$/);
  await expect(
    page.getByRole("heading", { name: "연동 인터페이스", level: 1 }),
  ).toBeVisible();
});

test("시작과 Demo는 서비스 지도 폴리곤의 편집·결과 반영을 안내한다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toContainText(
    "서비스에서 사용 중인 지도와 에디터의 입출력 인터페이스를 맞추면",
  );
  await expect(page.getByRole("main")).not.toContainText("지도가 없어도");
  await page.getByRole("link", { name: "연동 데모 실행", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "내 지도의 폴리곤을 편집하고 돌려받기",
    }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "지도 폴리곤 전달 → 새 창에서 편집 → 결과 수신·지도 갱신",
  );
  await expect(page.getByRole("main")).not.toContainText("부모");
});
