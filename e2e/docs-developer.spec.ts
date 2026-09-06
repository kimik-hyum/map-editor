import { expect, test } from "@playwright/test";

const documents = [
  ["/", "빠른 시작"],
  ["/integration", "부모 창 연동"],
  ["/authentication", "경계 데이터·인증"],
  ["/editing", "편집 동작"],
];

test("개발자 목차의 모든 경로·앵커가 유효하며 비로그인 경계 API를 호출하지 않는다", async ({
  page,
}) => {
  const regionCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/functions/v1/regions"))
      regionCalls.push(request.url());
  });
  for (const [path, title] of documents) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page).toHaveTitle(`${title} | Maps Editor`);
    const nav = page.getByRole("navigation", { name: "개발자 문서" });
    const anchors = await nav
      .locator('a[href^="#"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    for (const anchor of anchors)
      await expect(page.locator(anchor as string)).toHaveCount(1);
    const routes = await nav
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(routes).toEqual(documents.map(([route]) => route));
  }
  expect(regionCalls).toEqual([]);
});

test("인증 문서는 공개 설정·callback·실제 권한 경계를 구분한다", async ({ page }) => {
  await page.goto("/authentication");
  await expect(
    page.getByRole("heading", { name: "경계를 선택할 때만 로그인" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("figure")
      .filter({ hasText: ".env — 공개 빌드 설정" })
      .locator("code"),
  ).toContainText("VITE_SUPABASE_PUBLISHABLE_KEY");
  await expect(page.getByText(/로그인 사용자가 자기 토큰을 curl/)).toBeVisible();
  await expect(page.getByText(/secret\/service-role key/)).toBeVisible();
});

test("예제 코드를 복사할 수 있다", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/integration");
  const figure = page.locator("figure").filter({
    has: page.locator("figcaption").filter({ hasText: "parent-page.example.ts" }),
  });
  await figure.getByRole("button", { name: "코드 복사", exact: true }).click();
  await expect(figure.getByRole("button", { name: "코드 복사 완료" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("export function bindMapEditor");
  expect(copied).toContain("editorUrl");
});

test("좁은 화면에서도 본문이 화면 밖으로 넘치지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, title] of documents) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, path).toBe(false);
  }
});

test("다른 문서의 섹션 링크와 이전 screen 주소가 해당 본문으로 이동한다", async ({
  page,
}) => {
  await page.goto("/integration");
  await page.getByRole("link", { name: "저장 가능 조건", exact: true }).click();
  await expect(page).toHaveURL(/\/editing#finish$/);
  const finish = page.locator("#finish");
  await expect.poll(async () => (await finish.boundingBox())?.y).toBeGreaterThan(60);
  await expect.poll(async () => (await finish.boundingBox())?.y).toBeLessThan(200);

  await page.goto("/screen");
  await expect(page).toHaveURL(/\/editing#screen$/);
  await expect
    .poll(async () => (await page.locator("#screen").boundingBox())?.y)
    .toBeLessThan(200);
});
