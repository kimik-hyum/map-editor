import { expect, test } from "@playwright/test";

const integrationDocuments = [
  ["/", "내 지도에 연결하는 폴리곤 편집기"],
  ["/integration", "연동 인터페이스"],
  ["/editing", "편집 도구 안내"],
];
const selfHostingDocuments = [
  ["/self-hosting", "직접 운영·커스텀"],
  ["/self-hosting/boundaries", "경계 데이터 어댑터"],
  ["/authentication", "Google·Supabase 구성 (선택)"],
];
const documents = [...integrationDocuments, ...selfHostingDocuments];

test("대상별 문서 목차의 모든 경로·앵커가 유효하며 비로그인 경계 API를 호출하지 않는다", async ({
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
    await expect(page).toHaveTitle(`${title} | Termia`);
    const selfHosted = selfHostingDocuments.some(([route]) => route === path);
    const expectedDocuments = selfHosted ? selfHostingDocuments : integrationDocuments;
    const nav = page.getByRole("navigation", {
      name: selfHosted ? "내재화 안내" : "사용·연동 안내",
    });
    const audiences = page.getByRole("navigation", { name: "문서 대상 선택" });
    await expect(audiences.locator('a[aria-current="true"]')).toHaveAttribute(
      "href",
      selfHosted ? "/self-hosting" : "/",
    );
    const anchors = await nav
      .locator('a[href^="#"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    for (const anchor of anchors)
      await expect(page.locator(anchor as string)).toHaveCount(1);
    const routes = await nav
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(routes).toEqual(expectedDocuments.map(([route]) => route));
  }
  expect(regionCalls).toEqual([]);
});

test("사용자는 연동과 결과를 읽고 운영자는 별도 목차로 전환한다", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "사용·연동 안내" });
  await expect(nav.getByRole("link", { name: /인증|Supabase|어댑터/ })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "저장하면 무엇을 받나요?" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "문서 대상 선택" })
    .getByRole("link", { name: /직접 운영·커스텀/ })
    .click();
  await expect(page).toHaveURL(/\/self-hosting$/);
  await page
    .getByRole("navigation", { name: "내재화 안내" })
    .getByRole("link", { name: "경계 데이터 어댑터", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "로그인 없이 사용하거나 자체 인증 연결하기" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "자동 등록되거나 환경 변수만으로 활성화되지 않습니다",
  );
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
  await page
    .getByText("이미 쓰는 지도와 연결하기 · bindMapEditor", { exact: true })
    .click();
  const figure = page.locator("figure").filter({
    has: page.locator("figcaption").filter({ hasText: "service-page.example.ts" }),
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
