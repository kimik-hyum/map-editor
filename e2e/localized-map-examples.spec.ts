import { expect, test, type Page } from "@playwright/test";
import type { EditorSceneInput } from "../src/pages/editor/types/editorTypes";

async function readScene(page: Page, id: string): Promise<EditorSceneInput> {
  return JSON.parse((await page.getByTestId(id).textContent()) ?? "null");
}
async function switchLanguage(page: Page, language: "한국어" | "English") {
  await page.getByRole("button", { name: /Select language:|언어 선택:/ }).click();
  await page.getByRole("menuitemradio", { name: language }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    language === "한국어" ? "ko" : "en",
  );
}
for (const path of ["/", "/integration", "/demo"]) {
  test(`${path}는 언어에 맞는 지역의 지도를 선택하고 한국어 예제를 유지한다`, async ({
    page,
  }) => {
    const id = path === "/demo" ? "parent-scene" : "example-scene";
    await page.goto(`/ko${path}?country=KR`);
    const korean = await readScene(page, id);
    expect(JSON.stringify(korean)).toContain("126.9");
    await switchLanguage(page, "English");
    await expect(page).toHaveURL(
      new RegExp(`/en${path.replace(/\/$/, "/")}\\?country=KR$`),
    );
    const english = await readScene(page, id);
    expect(JSON.stringify(english)).toContain("-73.");
    expect(JSON.stringify(english)).not.toContain("126.9");
    expect(english.viewport?.center?.[0]).toBeLessThan(-73);
    await switchLanguage(page, "한국어");
    expect(await readScene(page, id)).toEqual(korean);
  });
}

for (const path of ["/demo", "/integration"]) {
  test(`${path}의 편집 중 언어를 바꿔도 미국 결과는 미국 예제에만 반영한다`, async ({
    page,
  }) => {
    const demo = path === "/demo";
    const id = demo ? "parent-scene" : "example-scene";
    const name = demo ? "Area A" : "Central Park example area";
    const openLabel = demo
      ? "Open editor in a new tab"
      : "Edit the Central Park example in a new tab";
    await page.goto(`/en${path}?country=US`);
    const original = await readScene(page, id);
    const [editor] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("button", { name: openLabel }).click(),
    ]);
    await expect(editor).toHaveURL(/\/en\/editor\/\?country=US$/);
    await editor.getByRole("button", { name: `Rename ${name}`, exact: true }).click();
    const field = editor.getByRole("textbox", {
      name: `New name for ${name}`,
      exact: true,
    });
    await field.fill("Edited US area");
    await field.press("Enter");
    await switchLanguage(page, "한국어");
    const korean = await readScene(page, id);
    await Promise.all([
      editor.waitForEvent("close"),
      editor
        .getByRole("button", { name: "Save and finish editing", exact: true })
        .click(),
    ]);
    expect(await readScene(page, id)).toEqual(korean);
    await switchLanguage(page, "English");
    const edited = await readScene(page, id);
    expect(edited.features.some((feature) => feature.name === "Edited US area")).toBe(
      true,
    );
    expect(edited).not.toEqual(original);
    const [reopened] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("button", { name: openLabel }).click(),
    ]);
    await expect(
      reopened.getByRole("button", { name: "Select Edited US area", exact: true }),
    ).toBeVisible();
    await reopened.close();
    if (!demo) {
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      expect(await readScene(page, id)).toEqual(original);
    }
  });
}

test("영문 Docs의 복사 JSON도 센트럴파크 지도와 일치한다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/en/integration");
  await page.getByText("JSON to send to the editor", { exact: true }).click();
  const example = page
    .locator("figure")
    .filter({ has: page.getByRole("button", { name: "Copy JSON", exact: true }) });
  await expect(example).toContainText("Central Park example area");
  await expect(example).toContainText("-73.978");
  await example.getByRole("button", { name: "Copy JSON", exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied)).toEqual(await readScene(page, "example-scene"));
});

test("영문 편집 안내는 센트럴파크 화면과 해당 도구 위치를 보여준다", async ({
  page,
}) => {
  await page.goto("/en/editing");
  const image = page.locator("#editor-tour-preview img");
  await expect(image).toHaveAttribute("src", "/docs/editor-central-park.jpg");
  await expect(image).toHaveAttribute("alt", /Central Park/);
  await page
    .locator('button[aria-controls="editor-tour-preview editor-tour-explanation"]')
    .nth(2)
    .click();
  await expect(image).toHaveAttribute("src", "/docs/editor-draw-tools-en.jpg");
  const left = await page
    .getByTestId("editor-tour-highlight")
    .evaluate((element) => Number.parseFloat((element as HTMLElement).style.left));
  expect(left).toBeGreaterThan(70);
  const buttons = page.locator(
    'button[aria-controls="editor-tour-preview editor-tour-explanation"]',
  );
  await buttons.nth(4).click();
  await expect(image).toHaveAttribute("src", "/docs/editor-radius-en.jpg");
  await expect(image).toHaveAttribute("alt", /radius input on the right/);
  await buttons.nth(6).click();
  await expect(image).toHaveAttribute("src", "/docs/editor-panel-collapsed-en.jpg");
  await expect(page.locator("#editor-tour-explanation")).toContainText("expand button");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(image).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
