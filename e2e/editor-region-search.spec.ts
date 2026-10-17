import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedGoogleSession } from "./fixtures/auth";
import { readEditorEdits } from "./fixtures/mapNavigation";

const labels: Record<string, string> = {
  adminDong: "행정동",
  legalDong: "법정동",
  postalCode: "우편번호",
};
async function prepare(context: BrowserContext, page: Page, fail = false) {
  await seedGoogleSession(context);
  const searches: { kind: string; query: string }[] = [];
  const views: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
    zoom: number;
  }[] = [];
  let failure = fail;
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    const body = route.request().postDataJSON();
    if (body.operation === "kinds")
      return route.fulfill({
        json: Object.entries(labels).map(([kind, label], i) => ({
          kind,
          label,
          level: 2,
          min_zoom: 12 + i,
          sort_order: i,
          selectable: true,
        })),
      });
    if (body.operation === "byView") {
      views.push(body);
      return route.fulfill({
        json: {
          type: "FeatureCollection",
          country: "KR",
          kind: body.kind,
          level: 2,
          truncated: false,
          features: [],
        },
      });
    }
    return route.fulfill({ status: 404, json: { message: "unsupported" } });
  });
  await context.route("**/region-api/functions/v1/region-search", async (route) => {
    const body = route.request().postDataJSON();
    searches.push(body);
    if (failure) {
      failure = false;
      return route.fulfill({ status: 429, json: { message: "rate limited" } });
    }
    if (body.query === "없음")
      return route.fulfill({
        json: { country: "KR", kind: body.kind, items: [], hasMore: false },
      });
    return route.fulfill({
      json: {
        country: "KR",
        kind: body.kind,
        hasMore: false,
        items: [
          {
            id: `result-${body.kind}`,
            kind: body.kind,
            code: "test-code",
            name: body.kind === "postalCode" ? "47500" : "연산동",
            context: "부산광역시 연제구",
            center: [129.076, 35.179],
            bbox: [129.07, 35.17, 129.09, 35.19],
            minZoom: 12,
          },
        ],
      },
    });
  });
  await page.goto("/demo");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 탭으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "행정동 경계", exact: true }).click();
  await editor.getByRole("button", { name: "경계 종류 닫기", exact: true }).click();
  return { editor, searches, views };
}
test("레이어와 같은 검색 패널에서 결과 선택은 지도만 이동한다", async ({
  context,
  page,
}) => {
  const { editor, searches, views } = await prepare(context, page);
  const panel = editor.getByRole("region", { name: "행정동 검색", exact: true });
  await expect(panel).toBeVisible();
  const before = await readEditorEdits(editor);
  await panel.getByRole("textbox").fill("연");
  await editor.waitForTimeout(400);
  expect(searches).toHaveLength(0);
  await panel.getByRole("textbox").fill("연산");
  const row = panel.getByRole("button", {
    name: "부산광역시 연제구 연산동 위치로 이동",
  });
  await expect(row).toBeVisible();
  await row.focus();
  await editor.keyboard.press("Enter");
  await expect(row).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => views.some((v) => v.minLng > 128 && v.minLat < 36 && v.zoom >= 12))
    .toBe(true);
  expect(await readEditorEdits(editor)).toEqual(before);
  const header = panel.getByRole("heading", { name: "행정동 검색" });
  const box = await header.boundingBox();
  const panelBefore = await panel.boundingBox();
  if (!box || !panelBefore) throw new Error("패널 위치가 없습니다");
  await editor.mouse.move(box.x + 30, box.y + 8);
  await editor.mouse.down();
  await editor.mouse.move(box.x - 70, box.y + 70, { steps: 10 });
  await editor.mouse.up();
  expect((await panel.boundingBox())?.x).toBeLessThan(panelBefore.x - 50);
  await panel.getByRole("button", { name: "행정동 검색 닫기" }).click();
  await expect(panel).toHaveCount(0);
  await editor.getByRole("button", { name: "행정동 경계", exact: true }).click();
  await expect(panel).toBeVisible();
});
test("종류 전환은 검색 결과를 분리하고 우편번호 검색을 지원한다", async ({
  context,
  page,
}) => {
  const { editor, searches } = await prepare(context, page);
  await editor
    .getByRole("region", { name: "행정동 검색", exact: true })
    .getByRole("textbox")
    .fill("연산");
  await expect.poll(() => searches.length).toBe(1);
  for (const kind of ["legalDong", "postalCode"]) {
    await editor.getByRole("button", { name: /^(행정동|법정동) 경계$/ }).click();
    await editor
      .getByRole("button", { name: new RegExp(`^${labels[kind]} z`) })
      .click();
    const panel = editor.getByRole("region", {
      name: `${labels[kind]} 검색`,
      exact: true,
    });
    await expect(panel.getByRole("textbox")).toHaveValue("");
    await expect(panel.getByRole("button", { name: /위치로 이동/ })).toHaveCount(0);
    await panel.getByRole("textbox").fill(kind === "postalCode" ? "475" : "연산");
    await expect(panel.getByRole("button", { name: /위치로 이동/ })).toBeVisible();
    expect(searches.at(-1)?.kind).toBe(kind);
  }
  await editor.getByRole("button", { name: "선택", exact: true }).click();
  await expect(
    editor.getByRole("region", { name: "우편번호 검색", exact: true }),
  ).toHaveCount(0);
});
test("검색 오류 재시도와 빈 결과, 검색어 초기화를 표시한다", async ({
  context,
  page,
}) => {
  const { editor } = await prepare(context, page, true);
  const panel = editor.getByRole("region", { name: "행정동 검색", exact: true });
  await panel.getByRole("textbox").fill("연산");
  await expect(panel.getByRole("alert")).toContainText("검색 요청이 많습니다");
  await panel.getByRole("button", { name: "다시 시도" }).click();
  await expect(panel.getByRole("button", { name: /위치로 이동/ })).toBeVisible();
  await panel.getByRole("textbox").fill("없음");
  await expect(panel.getByText("검색 결과가 없습니다", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "검색어 지우기" }).click();
  await expect(
    panel.getByText("검색어를 2자 이상 입력하세요", { exact: true }),
  ).toBeVisible();
});

for (const { code, status, message } of [
  {
    code: "REGION_COUNTRY_BLOCKED",
    status: 403,
    message: "경계 데이터는 한국에서만 이용할 수 있습니다.",
  },
  {
    code: "REGION_GATEWAY_REQUIRED",
    status: 403,
    message: "한국 접속 확인을 위해 에디터를 새로고침해주세요.",
  },
  {
    code: "INTERNAL_ERROR",
    status: 500,
    message: "검색 결과를 불러오지 못했습니다. 다시 시도해주세요.",
  },
]) {
  test(`검색은 ${code} 오류에 맞는 안내를 표시한다`, async ({ context, page }) => {
    const { editor } = await prepare(context, page);
    await context.route("**/region-api/functions/v1/region-search", (route) =>
      route.fulfill({
        status,
        json: { code, message: "upstream diagnostic details" },
      }),
    );
    const panel = editor.getByRole("region", { name: "행정동 검색", exact: true });
    await panel.getByRole("textbox").fill("연산");
    await expect(panel.getByRole("alert")).toContainText(message);
    await expect(panel.getByRole("alert")).not.toContainText(
      "upstream diagnostic details",
    );
  });
}

for (const [kind, label] of Object.entries(labels)) {
  test(`${label} 검색은 한글 조합 확정 없이 마지막 입력 후 300ms에 요청한다`, async ({
    context,
    page,
  }) => {
    const { editor, searches } = await prepare(context, page);
    if (kind !== "adminDong") {
      await editor.getByRole("button", { name: "행정동 경계", exact: true }).click();
      await editor.getByRole("button", { name: new RegExp(`^${label} z`) }).click();
      await editor.getByRole("button", { name: "경계 종류 닫기", exact: true }).click();
    }
    const panel = editor.getByRole("region", { name: `${label} 검색`, exact: true });
    const input = panel.getByRole("textbox");
    await input.focus();
    await editor.clock.install();
    await editor.clock.pauseAt(new Date(Date.now() + 1_000));
    const cdp = await context.newCDPSession(editor);
    // fill()은 조합 과정을 건너뛰므로 브라우저의 IME 입력 경로로 재현합니다.
    for (const text of ["ㅈ", "조", "종"]) {
      await cdp.send("Input.imeSetComposition", {
        text,
        selectionStart: text.length,
        selectionEnd: text.length,
      });
    }
    await cdp.send("Input.insertText", { text: "종" });
    await cdp.send("Input.imeSetComposition", {
      text: "ㄹ",
      selectionStart: 1,
      selectionEnd: 1,
    });
    await editor.clock.runFor(200);
    expect(searches).toHaveLength(0);
    await cdp.send("Input.imeSetComposition", {
      text: "로",
      selectionStart: 1,
      selectionEnd: 1,
    });
    await expect(input).toHaveValue("종로");
    await expect(panel.getByRole("status")).toHaveText("검색 준비 중…");
    await editor.clock.runFor(299);
    expect(searches).toHaveLength(0);
    await editor.clock.runFor(1);
    await expect
      .poll(() => searches.map(({ kind, query }) => ({ kind, query })))
      .toEqual([{ kind, query: "종로" }]);
    // 가짜 시계를 사용하는 동안 Query의 응답 알림 타이머도 진행시킵니다.
    await expect
      .poll(async () => {
        await editor.clock.runFor(16);
        return panel.getByRole("button", { name: /위치로 이동/ }).count();
      })
      .toBe(1);
    await expect(panel.getByRole("button", { name: /위치로 이동/ })).toBeVisible();
    // 마지막 음절의 확정과 Enter는 같은 검색을 중복 실행하지 않습니다.
    await cdp.send("Input.insertText", { text: "로" });
    await editor.keyboard.press("Enter");
    await editor.clock.runFor(500);
    expect(searches).toHaveLength(1);
    // 입력을 지우면 예약된 다음 검색도 취소합니다.
    await input.fill("종로구");
    await editor.clock.runFor(200);
    await input.fill("");
    await editor.clock.runFor(500);
    expect(searches).toHaveLength(1);
    await expect(panel.getByRole("status")).toHaveText("0개");
  });
}
