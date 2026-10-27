import { expect, test } from "@playwright/test";
import { runProductionAuthSmoke } from "../scripts/smoke-production-auth.mjs";

test("배포 후 인증 검사를 같은 UI 흐름으로 PR에서도 검증한다", async ({
  context,
  baseURL,
}) => {
  if (!baseURL) throw new Error("로컬 테스트 서버 주소가 필요합니다.");
  const providerUrl = "https://accounts.google.com/termia-smoke-test";
  let authorizeRequests = 0;
  let providerVisits = 0;
  await context.route("**/region-api/auth/v1/authorize?*", async (route) => {
    authorizeRequests++;
    // 별도 탐색으로 이동해야 Playwright가 공급자 페이지도 네트워크 없이 가로챕니다.
    await route.fulfill({
      contentType: "text/html",
      body: `<script>location.replace(${JSON.stringify(providerUrl)})</script>`,
    });
  });
  await context.route(providerUrl, async (route) => {
    providerVisits++;
    await route.fulfill({
      contentType: "text/html",
      body: '<html lang="en"><body><label>Email or phone<input type="email"></label></body></html>',
    });
  });

  const result = await runProductionAuthSmoke(context, {
    origin: baseURL,
    supabaseUrl: `${baseURL}/region-api`,
  });
  expect(authorizeRequests).toBe(1);
  expect(providerVisits).toBe(1);
  expect(result).toMatchObject({
    loginCompleted: false,
    anonymousEditReturned: true,
    cancelAndParentSave: true,
    appPageErrors: 0,
  });
});
