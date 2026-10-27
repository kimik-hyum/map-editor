import { expect, test } from "@playwright/test";
import { readEditorEdits } from "./fixtures/mapNavigation";

test("기존 주소는 쿼리·해시를 유지하며 한국어 경로로 이동한다", async ({ page }) => {
  await page.goto("/integration?country=US#addresses");
  await expect(page).toHaveURL(/\/ko\/integration\?country=US#addresses$/);
  await expect(
    page.getByRole("heading", { name: "편집 창 연동하기", level: 1 }),
  ).toBeVisible();
});

test("영어 문서는 직접 진입하고 모든 메뉴가 언어를 보존한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/en/integration?country=KR#addresses");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Integrate the editor window", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Usage and integration" }),
  ).toBeVisible();
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: "About" }),
  ).toHaveAttribute("href", "/en/about");
  await expect(
    page.getByRole("button", { name: "Edit the Gyeongbokgung example in a new tab" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Select language: English" }).click();
  await page.getByRole("menuitemradio", { name: "한국어" }).click();
  await expect(page).toHaveURL(/\/ko\/integration\?country=KR#addresses$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("button", { name: "언어 선택: 한국어" })).toHaveText(
    "KR",
  );
  await expect(
    page.getByRole("heading", { name: "편집 창 연동하기", level: 1 }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("언어 전환은 지도·scene·편집 이력·국가·호스트 연결을 보존한다", async ({
  page,
}) => {
  await page.goto("/en/demo?country=US");
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Open editor in a new tab" }).click(),
  ]);
  await expect(editor).toHaveURL(/\/en\/editor\/\?country=US$/);
  await expect(
    editor.getByRole("button", { name: "Select 권역 A", exact: true }),
  ).toBeVisible();
  await expect(editor.locator(".ol-zoom-in")).toHaveAttribute("title", "Zoom in");
  await editor.getByRole("button", { name: "Add layer", exact: true }).click();
  await expect(
    editor.getByRole("button", { name: "Select New layer 1", exact: true }),
  ).toBeVisible();
  const before = await readEditorEdits(editor);
  await editor
    .locator(".ol-viewport")
    .evaluate((node) => node.setAttribute("data-retained-map", "yes"));
  await editor.getByRole("button", { name: "Select language: English" }).click();
  await editor.getByRole("menuitemradio", { name: "한국어" }).click();
  await expect(editor).toHaveURL(/\/ko\/editor\/\?country=US$/);
  await expect(
    editor.getByRole("button", { name: "New layer 1 선택", exact: true }),
  ).toBeVisible();
  await expect(editor.locator(".ol-zoom-in")).toHaveAttribute("title", "지도 확대");
  await expect(editor.locator(".ol-viewport")).toHaveAttribute(
    "data-retained-map",
    "yes",
  );
  expect(await readEditorEdits(editor)).toEqual(before);
  await editor.getByRole("button", { name: "저장하고 편집 완료" }).click();
  await expect(
    page.getByText("Completed · Result received", { exact: false }),
  ).toBeVisible();
});

test("데모에서 언어를 바꾼 뒤 열어도 현재 언어를 새 탭에 전달한다", async ({
  page,
}) => {
  await page.goto("/ko/demo?country=US");
  await page.getByRole("button", { name: "언어 선택: 한국어" }).click();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Open editor in a new tab" }).click(),
  ]);
  await expect(editor).toHaveURL(/\/en\/editor\/\?country=US$/);
  await expect(
    editor.getByRole("button", { name: "Boundary data", exact: true }),
  ).toBeVisible();
});
