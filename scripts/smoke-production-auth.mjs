// Fresh anonymous browser: verify the real Google entry page without signing in.
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const origin = "https://maps-editor.pages.dev";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/demo/`);
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  editor.on("pageerror", (error) => errors.push(error.message));
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "행정동 경계", exact: true }).click();
  const dialog = editor.getByRole("alertdialog");
  await expect(dialog).toContainText("경계 데이터를 사용하려면 로그인해주세요");
  const [popup, authorizeRequest] = await Promise.all([
    editor.waitForEvent("popup"),
    context.waitForEvent("request", {
      predicate: (request) => {
        const url = new URL(request.url());
        return (
          url.hostname === "wmfidaawutwavlwvqauh.supabase.co" &&
          url.pathname === "/auth/v1/authorize"
        );
      },
      timeout: 20000,
    }),
    dialog.getByRole("button", { name: "Google로 로그인", exact: true }).click(),
  ]);
  const authorize = new URL(authorizeRequest.url());
  assert.equal(authorize.searchParams.get("provider"), "google");
  assert.equal(authorize.searchParams.get("redirect_to"), `${origin}/auth/callback`);
  await popup.waitForURL((url) => url.hostname === "accounts.google.com", {
    timeout: 20000,
  });
  await expect(
    popup.getByRole("textbox", { name: /Email or phone|이메일.*전화/ }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    editor.getByText("Supabase 설정(VITE_SUPABASE_URL/PUBLISHABLE_KEY)이 없습니다.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await editor.getByRole("button", { name: "로그인 취소", exact: true }).click();
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  const closed = editor.waitForEvent("close");
  await editor.getByRole("button", { name: "저장하고 편집 완료" }).click();
  await closed;
  await expect(page.getByTestId("submitted-scene")).toContainText("권역 A");
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      url: origin,
      missingConfigurationError: false,
      googleAuthorizeRequest: true,
      correctCallback: true,
      realGoogleEmailFormVisible: true,
      loginCompleted: false,
      cancelAndParentSave: true,
      appPageErrors: 0,
    }),
  );
} finally {
  await browser.close();
}
