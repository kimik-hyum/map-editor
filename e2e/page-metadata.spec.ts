import { expect, test } from "@playwright/test";

test("직접 접속한 SPA 화면에도 공유 메타데이터와 파비콘을 만든다", async ({
  page,
  request,
}) => {
  await page.goto("/en/demo?country=KR#map");
  await expect(page).toHaveTitle("New-tab integration demo | Termia");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Try Termia integration/,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://maps-editor.pages.dev/en/demo/",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://maps-editor.pages.dev/brand/social-en.png",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    "href",
    "/favicon.svg",
  );
  for (const url of [
    "/favicon.svg",
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/brand/social-ko.png",
    "/brand/social-en.png",
  ]) {
    expect((await request.get(url)).ok(), url).toBe(true);
  }
});

test("언어 왕복과 문서 이동은 공유 태그를 중복 없이 갱신한다", async ({ page }) => {
  await page.goto("/en/integration?country=US#addresses");
  for (const locale of ["ko", "en", "ko"]) {
    await page.getByRole("button", { name: /Select language:|언어 선택:/ }).click();
    await page
      .getByRole("menuitemradio", { name: locale === "ko" ? "한국어" : "English" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page).toHaveTitle(
      locale === "ko"
        ? "편집 창 연동하기 | Termia"
        : "Integrate the editor window | Termia",
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      locale === "ko" ? "ko_KR" : "en_US",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `https://maps-editor.pages.dev/brand/social-${locale}.png`,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://maps-editor.pages.dev/${locale}/integration/`,
    );
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
      "href",
      "https://maps-editor.pages.dev/ko/integration/",
    );
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[name="twitter:image"]',
      'link[rel="canonical"]',
    ]) {
      await expect(page.locator(selector)).toHaveCount(1);
    }
    expect(
      await page.locator('meta[property="og:title"]').getAttribute("content"),
    ).toBe(await page.title());
    expect(
      await page.locator('meta[name="twitter:description"]').getAttribute("content"),
    ).toBe(await page.locator('meta[name="description"]').getAttribute("content"));
  }
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "소개", exact: true })
    .click();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /경계를 그리고 공간에 가치를 더하는 Termia/,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://maps-editor.pages.dev/ko/about/",
  );
});
