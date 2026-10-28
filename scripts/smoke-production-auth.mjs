// Fresh anonymous browser: verify the real Google entry page without signing in.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

/**
 * The deployment and PR regression test run the same browser flow.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {{ origin?: string, supabaseUrl?: string }} options
 */
export async function runProductionAuthSmoke(
  context,
  {
    origin = "https://maps-editor.pages.dev",
    supabaseUrl = "https://wmfidaawutwavlwvqauh.supabase.co",
  } = {},
) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Authentication applies to Korean boundaries, regardless of the runner's location.
  await page.goto(`${origin}/ko/demo?country=KR`);
  const openEditor = page.getByRole("button", {
    name: "편집기 새 탭으로 열기",
    exact: true,
  });
  await expect(openEditor).toBeVisible();
  const [editor] = await Promise.all([page.waitForEvent("popup"), openEditor.click()]);
  editor.on("pageerror", (error) => errors.push(error.message));
  await expect(editor).toHaveURL(
    (url) => url.pathname === "/ko/editor/" && url.searchParams.get("country") === "KR",
  );
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  const editedName = "상용 비로그인 편집 확인";
  await editor.getByRole("button", { name: "권역 A 이름 변경", exact: true }).click();
  const nameInput = editor.getByRole("textbox", {
    name: "권역 A 새 이름",
    exact: true,
  });
  await nameInput.fill(editedName);
  await nameInput.press("Enter");
  await expect(editor.getByText(editedName, { exact: true })).toBeVisible();

  await editor.getByRole("button", { name: "경계 데이터", exact: true }).click();
  const dialog = editor.getByRole("alertdialog");
  await expect(dialog).toContainText("경계 데이터를 사용하려면 로그인해주세요");
  const authorizeEndpoint = new URL(`${supabaseUrl}/auth/v1/authorize`);
  const [popup, authorizeRequest] = await Promise.all([
    editor.waitForEvent("popup"),
    context.waitForEvent("request", {
      predicate: (request) => {
        const url = new URL(request.url());
        return (
          url.origin === authorizeEndpoint.origin &&
          url.pathname === authorizeEndpoint.pathname
        );
      },
      timeout: 20000,
    }),
    dialog.getByRole("button", { name: "Google로 로그인", exact: true }).click(),
  ]);
  const authorize = new URL(authorizeRequest.url());
  assert.equal(authorize.searchParams.get("provider"), "google");
  assert.equal(authorize.searchParams.get("redirect_to"), `${origin}/auth/callback`);
  assert.equal(authorize.searchParams.get("code_challenge_method"), "s256");
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
  await expect(editor.getByText(editedName, { exact: true })).toBeVisible();
  const closed = editor.waitForEvent("close");
  await editor.getByRole("button", { name: "저장하고 편집 완료" }).click();
  await closed;
  await expect(page.getByTestId("submitted-scene")).toContainText(editedName);
  assert.deepEqual(errors, []);
  return {
    url: origin,
    missingConfigurationError: false,
    googleAuthorizeRequest: true,
    correctCallback: true,
    googleEmailFormVisible: true,
    loginCompleted: false,
    cancelAndParentSave: true,
    anonymousEditReturned: true,
    appPageErrors: 0,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    console.log(JSON.stringify(await runProductionAuthSmoke(context)));
  } finally {
    await browser.close();
  }
}
