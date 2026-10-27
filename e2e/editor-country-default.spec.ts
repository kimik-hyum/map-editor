import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { onRequest } from "../functions/_middleware";

// Vite에도 실제 Pages middleware를 적용해 접속 IP가 언어별 기본값을 덮지 않는지 검사합니다.
async function viewerCountry(context: BrowserContext, country: string) {
  await context.route(/\/(demo|editor)\/?(?:\?.*)?$/, async (route) => {
    if (!route.request().isNavigationRequest()) return route.fallback();
    const response = await onRequest({
      request: Object.assign(new Request(route.request().url()), { cf: { country } }),
      next: async () => new Response(null, { status: 204 }),
    });
    if (!response.headers.has("Location")) return route.fallback();
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: "",
    });
  });
}

async function openEditor(page: Page, locale = "ko", docs = false) {
  const name = docs
    ? "Edit the Central Park example in a new tab"
    : locale === "en"
      ? "Open editor in a new tab"
      : "편집기 새 탭으로 열기";
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name, exact: true }).click(),
  ]);
  await expect(
    editor.getByRole("button", {
      name: locale === "en" ? "Boundary data" : "경계 데이터",
      exact: true,
    }),
  ).toBeVisible();
  await expect.poll(async () => (await boundarySelection(editor)).connected).toBe(true);
  return editor;
}

async function boundarySelection(page: Page) {
  return page.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    return {
      country: state.activeBoundaryCountry,
      kind: state.activeBoundaryKind,
      connected: state.scene !== null,
    };
  });
}

for (const locale of ["ko", "en"]) {
  for (const viewer of ["KR", "US"]) {
    test(`${viewer} 접속에서도 ${locale} 데모의 언어별 경계를 초기화한다`, async ({
      context,
      page,
    }) => {
      await viewerCountry(context, viewer);
      await page.goto(`/${locale}/demo`);
      expect(new URL(page.url()).search).toBe("");
      const editor = await openEditor(page, locale);
      const country = locale === "en" ? "US" : "KR";
      expect(new URL(editor.url()).searchParams.get("country")).toBe(country);
      expect(await boundarySelection(editor)).toMatchObject({
        country,
        kind: locale === "en" ? "county" : "adminDong",
      });
      await expect(
        editor.getByRole("button", {
          name: locale === "en" ? "Hide Shape" : "도형 숨기기",
          exact: true,
        }),
      ).toHaveCount(8);
    });
  }
  test(`${locale} 화면에서 명시한 국가는 언어 기본값보다 우선한다`, async ({
    page,
  }) => {
    const country = locale === "en" ? "KR" : "US";
    await page.goto(`/${locale}/demo?country=${country}`);
    const editor = await openEditor(page, locale);
    expect(new URL(editor.url()).searchParams.get("country")).toBe(country);
    expect(await boundarySelection(editor)).toMatchObject({
      country,
      kind: country === "US" ? "county" : "adminDong",
    });
  });
  test(`${locale} 상단 Editor 링크도 언어별 기본 경계를 사용한다`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Editor", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: locale === "en" ? "Boundary data" : "경계 데이터",
        exact: true,
      }),
    ).toBeVisible();
    expect(new URL(page.url()).search).toBe("");
    expect(await boundarySelection(page)).toMatchObject({
      country: locale === "en" ? "US" : "KR",
      kind: locale === "en" ? "county" : "adminDong",
    });
  });
}

for (const path of ["/en/demo", "/en/integration"]) {
  test(`${path} 기본 경계 요청은 Google 로그인 없이 미국 API를 사용한다`, async ({
    context,
    page,
  }) => {
    // 실제 외부 서버 상태와 무관하게 인증 없이 미국 API까지 요청하는지 확인합니다.
    await context.route("**/api/us-boundaries?*", (route) =>
      route.fulfill({
        status: 503,
        json: { error: "unavailable" },
      }),
    );
    await page.goto(path);
    const editor = await openEditor(page, "en", path.includes("integration"));
    const [request] = await Promise.all([
      editor.waitForRequest("**/api/us-boundaries?*"),
      editor.getByRole("button", { name: "Boundary data", exact: true }).click(),
    ]);
    expect(request.headers().authorization).toBeUndefined();
    await expect(editor.getByRole("alert")).toContainText(
      "Could not load US boundaries",
    );
    await expect(editor.getByRole("button", { name: /Google/ })).toHaveCount(0);
    expect(await boundarySelection(editor)).toMatchObject({
      country: "US",
      kind: "county",
    });
  });
}

test("데모에서 언어를 바꾸면 새 창은 새 기본값을 쓰고 편집 중 언어 변경은 국가를 유지한다", async ({
  page,
}) => {
  await page.goto("/ko/demo");
  await page.getByRole("button", { name: "언어 선택: 한국어" }).click();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/demo$/);
  const editor = await openEditor(page, "en");
  expect(await boundarySelection(editor)).toMatchObject({
    country: "US",
    kind: "county",
  });
  await editor.getByRole("button", { name: "Select language: English" }).click();
  await editor.getByRole("menuitemradio", { name: "한국어" }).click();
  await expect(editor).toHaveURL(/\/ko\/editor\/\?country=US$/);
  expect(await boundarySelection(editor)).toMatchObject({
    country: "US",
    kind: "county",
  });
});

test("SPA로 영어 Demo에 진입해도 미국 기본 경계를 전달한다", async ({ page }) => {
  await page.goto("/en/");
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Demo", exact: true })
    .click();
  const editor = await openEditor(page, "en");
  expect(await boundarySelection(editor)).toMatchObject({
    country: "US",
    kind: "county",
  });
});
