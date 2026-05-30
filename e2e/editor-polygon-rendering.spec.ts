import { expect, test, type Page } from "@playwright/test";
import { PNG } from "pngjs";

type RgbColor = [red: number, green: number, blue: number];

const polygonStrokeColors: RgbColor[] = [
  [37, 99, 235],
  [220, 38, 38],
  [124, 58, 237],
  [225, 29, 72],
];

function countSimilarPixels(
  image: PNG,
  [targetRed, targetGreen, targetBlue]: RgbColor,
  tolerance = 30,
) {
  let count = 0;

  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index];
    const green = image.data[index + 1];
    const blue = image.data[index + 2];
    const alpha = image.data[index + 3];

    if (
      alpha > 200 &&
      Math.abs(red - targetRed) <= tolerance &&
      Math.abs(green - targetGreen) <= tolerance &&
      Math.abs(blue - targetBlue) <= tolerance
    ) {
      count += 1;
    }
  }

  return count;
}

// 에디터는 순수 consumer이므로 데모(호스트)를 통해 새 창으로 열고 postMessage로 scene을 받는다.
// 호스트가 보낸 scene이 렌더링될 때까지(레이어 패널의 레이어 이름) 기다린 뒤 에디터 페이지를 반환한다.
async function openEditorViaDemo(page: Page): Promise<Page> {
  await page.goto("/demo");

  const [editorPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);

  await editorPage.waitForLoadState();
  await expect(editorPage.getByText("편집 대상 권역")).toBeVisible();

  return editorPage;
}

test("에디터 지도에 샘플 폴리곤이 렌더링된다", async ({ page }) => {
  const editorPage = await openEditorViaDemo(page);

  const map = editorPage.getByLabel("OSM map editor");
  const mapCanvas = map.locator("canvas");

  await expect(map).toBeVisible();
  await expect(editorPage.locator(".ol-viewport")).toBeVisible();
  await expect(mapCanvas).toHaveCount(1);

  await editorPage.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[aria-label="OSM map editor"] canvas',
    );

    return Boolean(canvas && canvas.width > 0 && canvas.height > 0);
  });

  await expect
    .poll(
      async () => {
        const screenshot = await map.screenshot();
        const image = PNG.sync.read(screenshot);

        return polygonStrokeColors
          .map((color) => countSimilarPixels(image, color))
          .filter((count) => count > 20).length;
      },
      { timeout: 5000 },
    )
    .toBeGreaterThanOrEqual(3);
});

test("레이어 눈 아이콘으로 레이어 표시 상태를 토글하고 지도 인스턴스를 유지한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);

  const mapViewport = editorPage.locator(".ol-viewport");
  const hideButton = editorPage.getByRole("button", { name: "레이어 숨기기" }).first();

  await expect(mapViewport).toBeVisible();
  await mapViewport.evaluate((element) => {
    element.setAttribute("data-map-stability-check", "stable");
  });
  await expect(hideButton).toBeVisible();
  await expect(hideButton).toHaveAttribute("aria-pressed", "true");

  await hideButton.click();

  const showButton = editorPage.getByRole("button", { name: "레이어 보이기" }).first();

  await expect(showButton).toBeVisible();
  await expect(showButton).toHaveAttribute("aria-pressed", "false");
  await expect(mapViewport).toHaveAttribute("data-map-stability-check", "stable");

  await showButton.click();

  await expect(hideButton).toHaveAttribute("aria-pressed", "true");
  await expect(mapViewport).toHaveAttribute("data-map-stability-check", "stable");
});

test("도형 눈 아이콘으로 표시 상태를 토글하고 지도 인스턴스를 유지한다", async ({
  page,
}) => {
  const editorPage = await openEditorViaDemo(page);

  const mapViewport = editorPage.locator(".ol-viewport");
  const hideButton = editorPage.getByRole("button", { name: "도형 숨기기" }).first();

  await expect(mapViewport).toBeVisible();
  await mapViewport.evaluate((element) => {
    element.setAttribute("data-map-stability-check", "stable");
  });
  await expect(hideButton).toBeVisible();
  await expect(hideButton).toHaveAttribute("aria-pressed", "true");

  await hideButton.click();

  const showButton = editorPage.getByRole("button", { name: "도형 보이기" }).first();

  await expect(showButton).toBeVisible();
  await expect(showButton).toHaveAttribute("aria-pressed", "false");
  await expect(mapViewport).toHaveAttribute("data-map-stability-check", "stable");

  await showButton.click();

  await expect(hideButton).toHaveAttribute("aria-pressed", "true");
  await expect(mapViewport).toHaveAttribute("data-map-stability-check", "stable");
});
