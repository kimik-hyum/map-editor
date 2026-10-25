import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { onRequest } from "../functions/_middleware";

// Vite에는 Cloudflare IP 메타데이터가 없으므로 실제 Pages middleware에 국가만 주입합니다.
async function viewerCountry(context: BrowserContext, country: string) {
  await context.route(/\/(demo|editor)\/?(?:\?.*)?$/, async (route) => {
    if (!route.request().isNavigationRequest()) return route.fallback();
    const response = await onRequest({
      request: Object.assign(new Request(route.request().url()), { cf: { country } }),
      next: async () => new Response(null, { status: 204 }),
    });
    if (response.status !== 302) return route.fallback();
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: "",
    });
  });
}

async function openEditor(page: Page) {
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 탭으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  return editor;
}

for (const [viewer, expected] of [
  ["KR", "KR"],
  ["US", "US"],
  ["JP", "US"],
  ["DE", "US"],
]) {
  test(`${viewer} 접속은 ${expected} 경계로 초기화하고 부모 데이터 전달도 유지한다`, async ({
    context,
    page,
  }) => {
    await viewerCountry(context, viewer);
    await page.goto("/ko/demo");
    expect(new URL(page.url()).searchParams.get("country")).toBe(expected);
    const editor = await openEditor(page);
    expect(new URL(editor.url()).searchParams.get("country")).toBe(expected);
    await expect(
      editor.getByRole("button", {
        name: "경계 데이터",
        exact: true,
      }),
    ).toBeVisible();
    await expect(editor.getByRole("button", { name: "도형 숨기기" })).toHaveCount(8);
  });
}

for (const [viewer, explicit] of [
  ["KR", "US"],
  ["US", "KR"],
]) {
  test(`${viewer} 접속에서도 명시한 ${explicit} URL을 우선한다`, async ({
    context,
    page,
  }) => {
    await viewerCountry(context, viewer);
    await page.goto(`/ko/demo?country=${explicit}`);
    const editor = await openEditor(page);
    expect(new URL(editor.url()).searchParams.get("country")).toBe(explicit);
    await expect(
      editor.getByRole("button", {
        name: "경계 데이터",
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("SPA로 Demo에 들어와도 새 편집기에서 접속 국가를 판정한다", async ({
  context,
  page,
}) => {
  await viewerCountry(context, "JP");
  await page.goto("/ko/");
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Demo", exact: true })
    .click();
  const editor = await openEditor(page);
  expect(new URL(editor.url()).searchParams.get("country")).toBe("US");
  await expect(
    editor.getByRole("button", { name: "경계 데이터", exact: true }),
  ).toBeVisible();
});

test("상단 Editor 링크도 서버 국가 판정을 거쳐 진입한다", async ({ context, page }) => {
  await viewerCountry(context, "JP");
  await page.goto("/ko/");
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Editor", exact: true })
    .click();
  expect(new URL(page.url()).searchParams.get("country")).toBe("US");
  await expect(
    page.getByRole("button", { name: "경계 데이터", exact: true }),
  ).toBeVisible();
});
