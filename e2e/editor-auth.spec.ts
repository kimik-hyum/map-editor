import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createGoogleSession } from "./fixtures/auth";

async function openEditor(page: Page) {
  await page.goto("/ko/demo");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 탭으로 열기" }).click(),
  ]);
  await expect(editor.getByText("권역 A", { exact: true })).toBeVisible();
  return editor;
}

async function renameFeature(editor: Page, name: string) {
  await editor.getByRole("button", { name: "권역 A 이름 변경" }).click();
  const input = editor.getByRole("textbox", { name: "권역 A 새 이름" });
  await input.fill(name);
  await input.press("Enter");
  await expect(editor.getByText(name, { exact: true })).toBeVisible();
}

async function mockAuthAndRegions(
  context: BrowserContext,
  failLogin = false,
  refreshSignedInAt = Date.now(),
) {
  const session = createGoogleSession();
  const calls: string[] = [];
  await context.route("**/region-api/auth/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/authorize")) {
      expect(url.searchParams.get("provider")).toBe("google");
      expect(url.searchParams.get("code_challenge_method")).toBe("s256");
      const callback = new URL(url.searchParams.get("redirect_to") ?? "");
      expect(callback.pathname).toBe("/auth/callback");
      callback.searchParams.set("code", "test-authorization-code");
      await route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: `<html><body><h1>OAuth test provider</h1><a href="${callback.href}">테스트 Google 로그인 완료</a></body></html>`,
      });
    } else if (url.pathname.endsWith("/token")) {
      if (url.searchParams.get("grant_type") === "refresh_token") {
        await route.fulfill({ json: createGoogleSession(refreshSignedInAt) });
        return;
      }
      expect(url.searchParams.get("grant_type")).toBe("pkce");
      const body = route.request().postDataJSON() as {
        auth_code: string;
        code_verifier: string;
      };
      expect(body.auth_code).toBe("test-authorization-code");
      expect(body.code_verifier.length).toBeGreaterThanOrEqual(43);
      await route.fulfill(
        failLogin
          ? {
              status: 400,
              json: { error: "invalid_grant", error_description: "Test login denied" },
            }
          : { json: session },
      );
    } else if (url.pathname.endsWith("/logout")) {
      await route.fulfill({ status: 204 });
    } else if (url.pathname.endsWith("/user")) {
      await route.fulfill({ json: session.user });
    } else {
      await route.fulfill({ status: 404, json: {} });
    }
  });
  await context.route("**/region-api/functions/v1/regions", async (route) => {
    const { operation } = route.request().postDataJSON() as { operation: string };
    calls.push(operation);
    expect(route.request().headers().authorization).toBe(
      `Bearer ${session.access_token}`,
    );
    if (operation === "kinds") {
      await route.fulfill({
        json: [
          {
            kind: "sigungu",
            label: "시군구",
            level: 1,
            min_zoom: 0,
            sort_order: 0,
            selectable: false,
          },
          {
            kind: "adminDong",
            label: "행정동",
            level: 2,
            min_zoom: 12,
            sort_order: 1,
            selectable: true,
          },
        ],
      });
    } else {
      await route.fulfill({
        json: {
          type: "FeatureCollection",
          country: "KR",
          kind: "adminDong",
          level: 2,
          truncated: false,
          features: [],
        },
      });
    }
  });
  return calls;
}

async function startLogin(editor: Page) {
  await editor.getByRole("button", { name: "경계 데이터" }).click();
  const dialog = editor.getByRole("alertdialog");
  await expect(dialog).toContainText("경계 데이터를 사용하려면 로그인해주세요");
  const [popup] = await Promise.all([
    editor.waitForEvent("popup"),
    dialog.getByRole("button", { name: "Google로 로그인", exact: true }).click(),
  ]);
  await expect(popup.getByText("OAuth test provider")).toBeVisible();
  return popup;
}

test("비로그인도 부모 데이터를 편집하고 반환하며 경계 API를 호출하지 않는다", async ({
  page,
  context,
}) => {
  const calls = await mockAuthAndRegions(context);
  const editor = await openEditor(page);
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toHaveCount(0);
  await renameFeature(editor, "비로그인 편집 결과");
  const closed = editor.waitForEvent("close");
  await editor.getByRole("button", { name: "저장하고 편집 완료" }).click();
  await closed;
  await expect(page.getByTestId("submitted-scene")).toContainText("비로그인 편집 결과");
  expect(calls).toEqual([]);
});

test("로그인 안내를 취소하면 기존 그리기 도구와 진행 중 패스를 유지한다", async ({
  page,
  context,
}) => {
  const calls = await mockAuthAndRegions(context);
  const editor = await openEditor(page);
  await editor.getByRole("button", { name: "폴리곤 그리기" }).click();
  await editor.getByRole("button", { name: /^패스/ }).click();
  const map = editor.getByLabel("OSM map editor");
  await map.click({ position: { x: 700, y: 300 } });
  await map.click({ position: { x: 780, y: 350 } });
  await expect(editor.getByRole("button", { name: "패스 그리기 완료" })).toBeEnabled();
  await editor.getByRole("button", { name: "경계 데이터" }).click();
  const dialog = editor.getByRole("alertdialog");
  await expect(dialog).toContainText("경계 데이터를 사용하려면 로그인해주세요");
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(
    editor.getByRole("button", { name: "패스 그리기", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(editor.getByRole("button", { name: "패스 그리기 완료" })).toBeEnabled();
  expect(calls).toEqual([]);
});

test("팝업 로그인 뒤 같은 에디터와 부모 연결, 편집 내용을 유지하고 경계 도구로 이동한다", async ({
  page,
  context,
}) => {
  const calls = await mockAuthAndRegions(context);
  const editor = await openEditor(page);
  await renameFeature(editor, "로그인 전 편집 결과");
  const timeOrigin = await editor.evaluate(() => performance.timeOrigin);
  const popup = await startLogin(editor);
  await popup.getByRole("link", { name: "테스트 Google 로그인 완료" }).click();
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toBeVisible();
  await expect(editor.getByRole("button", { name: "경계 데이터" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(editor.getByText("현재 화면:")).toBeVisible();
  await expect(editor.getByText("로그인 전 편집 결과", { exact: true })).toBeVisible();
  expect(await editor.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  expect(calls).toContain("byView");
  const closed = editor.waitForEvent("close");
  await editor.getByRole("button", { name: "저장하고 편집 완료" }).click();
  await closed;
  await expect(page.getByTestId("submitted-scene")).toContainText(
    "로그인 전 편집 결과",
  );
});

test("팝업 차단에도 편집 내용과 이전 도구를 유지한다", async ({ page, context }) => {
  const calls = await mockAuthAndRegions(context, true);
  await context.addInitScript(() => {
    const originalOpen = window.open;
    window.open = (url, target, features) => {
      if (target?.startsWith("maps-editor-google-")) return null;
      return originalOpen.call(window, url, target, features);
    };
  });
  const editor = await openEditor(page);
  await renameFeature(editor, "팝업 차단에도 보존");
  await editor.getByRole("button", { name: "경계 데이터" }).click();
  await editor
    .getByRole("alertdialog")
    .getByRole("button", { name: "Google로 로그인" })
    .click();
  await expect(editor.getByRole("alert")).toContainText("팝업이 차단");
  await expect(
    editor.getByRole("button", { name: "선택", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(editor.getByText("팝업 차단에도 보존", { exact: true })).toBeVisible();
  expect(calls).toEqual([]);
});

test("OAuth 실패와 팝업 수동 종료 후 취소에도 비로그인 편집을 계속한다", async ({
  page,
  context,
}) => {
  const calls = await mockAuthAndRegions(context, true);
  const editor = await openEditor(page);
  let popup = await startLogin(editor);
  await popup.getByRole("link", { name: "테스트 Google 로그인 완료" }).click();
  await expect(editor.getByRole("alert")).toContainText("완료되지 않았습니다");
  await editor.getByRole("button", { name: "닫기", exact: true }).click();
  popup = await startLogin(editor);
  await popup.close();
  await editor.getByRole("button", { name: "로그인 취소" }).click();
  await expect(editor.getByRole("button", { name: "로그인 취소" })).toHaveCount(0);
  await renameFeature(editor, "로그인 취소 후 편집");
  expect(calls).toEqual([]);
});

test("로그인 중 새 INIT이 오면 이전 로그인 메뉴 전환을 취소하고 새 데이터를 보존한다", async ({
  page,
  context,
}) => {
  await mockAuthAndRegions(context);
  const editor = await openEditor(page);
  await startLogin(editor);
  await page.evaluate(() => {
    window.open("", "map-editor-child")?.postMessage(
      {
        type: "MAP_EDITOR_INIT",
        sessionId: "new-auth-session",
        scene: {
          version: 2,
          features: [
            {
              name: "새 호스트 데이터",
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [126.97, 37.56],
                    [126.99, 37.56],
                    [126.99, 37.58],
                    [126.97, 37.56],
                  ],
                ],
              },
            },
          ],
        },
      },
      window.location.origin,
    );
  });
  await expect(editor.getByText("새 호스트 데이터", { exact: true })).toBeVisible();
  await expect(editor.getByRole("button", { name: "로그인 취소" })).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "선택", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(editor.getByText("권역 A", { exact: true })).toHaveCount(0);
});

test("로그아웃하면 경계 참조만 중단하고 편집 내용은 유지한다", async ({
  page,
  context,
}) => {
  const calls = await mockAuthAndRegions(context);
  const editor = await openEditor(page);
  await renameFeature(editor, "로그아웃 후에도 보존");
  const popup = await startLogin(editor);
  await popup.getByRole("link", { name: "테스트 Google 로그인 완료" }).click();
  await expect(editor.getByText("현재 화면:")).toBeVisible();
  await editor.getByRole("button", { name: "Google 로그아웃" }).click();
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "선택", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(editor.getByText("로그아웃 후에도 보존", { exact: true })).toBeVisible();
  const count = calls.length;
  await editor.getByRole("button", { name: "경계 데이터" }).click();
  await expect(editor.getByRole("alertdialog")).toBeVisible();
  expect(calls.length).toBe(count);
});

test("미국에서 한국 선택 시 즉시 로그인하고 성공한 뒤 국가와 경계를 전환한다", async ({
  page,
  context,
}) => {
  const calls = await mockAuthAndRegions(context);
  await context.route("**/api/us-boundaries/**", (route) =>
    route.fulfill({ status: 503, json: { error: "test" } }),
  );
  await page.goto("/ko/demo?country=US");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 탭으로 열기" }).click(),
  ]);
  await expect(
    editor.getByRole("button", { name: "권역 A 선택", exact: true }),
  ).toBeVisible();
  await renameFeature(editor, "국가 변경 전 편집");
  await editor.getByRole("button", { name: "경계 데이터", exact: true }).click();
  await editor.getByRole("combobox", { name: "국가 선택: 미국" }).click();
  await editor.getByRole("option", { name: /대한민국/ }).click();
  const dialog = editor.getByRole("alertdialog");
  await expect(dialog).toContainText("경계 데이터를 사용하려면 로그인해주세요");
  expect(new URL(editor.url()).searchParams.get("country")).toBe("US");
  expect(calls).toEqual([]);
  const [popup] = await Promise.all([
    editor.waitForEvent("popup"),
    dialog.getByRole("button", { name: "Google로 로그인" }).click(),
  ]);
  await popup.getByRole("link", { name: "테스트 Google 로그인 완료" }).click();
  await expect(
    editor.getByRole("combobox", { name: "국가 선택: 대한민국" }),
  ).toBeVisible();
  expect(new URL(editor.url()).searchParams.get("country")).toBe("KR");
  await expect.poll(() => calls.includes("byView")).toBe(true);
  await expect(
    editor.getByRole("button", { name: "국가 변경 전 편집 선택", exact: true }),
  ).toBeVisible();
});

const sevenDays = 7 * 24 * 60 * 60 * 1000;

async function saveSession(
  page: Page,
  session: ReturnType<typeof createGoogleSession>,
) {
  await page.goto("/ko/demo");
  await page.evaluate((value) => {
    localStorage.setItem("sb-127-auth-token", JSON.stringify(value));
    localStorage.setItem("unrelated-preference", "keep");
  }, session);
}

test("7일 지난 저장 세션은 재접속 시 현재 브라우저만 로그아웃하고 다시 로그인할 수 있다", async ({
  page,
  context,
}) => {
  await mockAuthAndRegions(context);
  await saveSession(page, createGoogleSession(Date.now() - sevenDays - 1000));
  const logout = page.waitForRequest((request) =>
    new URL(request.url()).pathname.endsWith("/logout"),
  );
  const editor = await openEditor(page);
  expect(new URL((await logout).url()).searchParams.get("scope")).toBe("local");
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toHaveCount(0);
  await expect
    .poll(() => editor.evaluate(() => localStorage.getItem("sb-127-auth-token")))
    .toBe(null);
  expect(
    await editor.evaluate(() => localStorage.getItem("unrelated-preference")),
  ).toBe("keep");
  const popup = await startLogin(editor);
  await popup.getByRole("link", { name: "테스트 Google 로그인 완료" }).click();
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toBeVisible();
});

test("사용 중 7일이 되면 모든 같은 브라우저 탭에서 로그아웃하고 편집 결과를 보존한다", async ({
  page,
  context,
}) => {
  await mockAuthAndRegions(context);
  const start = Math.floor(Date.now() / 1000) * 1000;
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  await saveSession(page, createGoogleSession(start - sevenDays + 60_000));
  const editor = await openEditor(page);
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toBeVisible();
  await renameFeature(editor, "세션 만료 후에도 보존");
  await page.clock.fastForward(60_001);
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("sb-127-auth-token")))
    .toBe(null);
  await expect(
    editor.getByText("세션 만료 후에도 보존", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "경계 데이터" }).click();
  await expect(editor.getByRole("alertdialog")).toBeVisible();
  await editor.getByRole("button", { name: "취소", exact: true }).click();
  const closed = editor.waitForEvent("close");
  await editor.getByRole("button", { name: "저장하고 편집 완료" }).click();
  await closed;
  await expect(page.getByTestId("submitted-scene")).toContainText(
    "세션 만료 후에도 보존",
  );
});

test("액세스 토큰을 갱신해도 로그인 기한을 늘리지 않고 탭 복귀 때 만료를 확인한다", async ({
  page,
  context,
}) => {
  const now = Date.now();
  const signedInAt = now - sevenDays + 120_000;
  await mockAuthAndRegions(context, false, signedInAt);
  const session = createGoogleSession(signedInAt);
  session.expires_at = Math.floor(now / 1000) - 1;
  // 저장 직후 부모나 편집기 어느 탭에서 갱신해도 요청을 놓치지 않습니다.
  const refreshed = context.waitForEvent("request", {
    predicate: (request) =>
      new URL(request.url()).searchParams.get("grant_type") === "refresh_token",
  });
  await saveSession(page, session);
  const editor = await openEditor(page);
  await refreshed;
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toBeVisible();
  // 타이머 실행 없이 시간만 바꿔 절전 상태에서 돌아오는 상황을 재현합니다.
  await page.clock.setFixedTime(now + 180_000);
  await editor.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(editor.getByRole("button", { name: "Google 로그아웃" })).toHaveCount(0);
  await expect
    .poll(() => editor.evaluate(() => localStorage.getItem("sb-127-auth-token")))
    .toBe(null);
});
