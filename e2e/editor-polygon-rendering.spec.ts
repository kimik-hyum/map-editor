import { expect, test } from "@playwright/test";
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

test("에디터 지도에 샘플 폴리곤이 렌더링된다", async ({ page }) => {
  await page.goto("/editor");

  const map = page.getByLabel("OSM map editor");
  const mapCanvas = map.locator("canvas");

  await expect(map).toBeVisible();
  await expect(page.locator(".ol-viewport")).toBeVisible();
  await expect(mapCanvas).toHaveCount(1);

  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[aria-label="OSM map editor"] canvas',
    );

    return Boolean(canvas && canvas.width > 0 && canvas.height > 0);
  });

  const screenshot = await map.screenshot();
  const image = PNG.sync.read(screenshot);
  const matchedColorCounts = polygonStrokeColors.map((color) =>
    countSimilarPixels(image, color),
  );

  expect(
    matchedColorCounts.filter((count) => count > 20).length,
  ).toBeGreaterThanOrEqual(3);
});

test("도형 눈 아이콘으로 표시 상태를 토글하고 지도 인스턴스를 유지한다", async ({
  page,
}) => {
  await page.goto("/editor");

  const mapViewport = page.locator(".ol-viewport");
  const hideButton = page.getByRole("button", { name: "도형 숨기기" }).first();

  await expect(mapViewport).toBeVisible();
  await mapViewport.evaluate((element) => {
    element.setAttribute("data-map-stability-check", "stable");
  });
  await expect(hideButton).toBeVisible();
  await expect(hideButton).toHaveAttribute("aria-pressed", "true");

  await hideButton.click();

  const showButton = page.getByRole("button", { name: "도형 보이기" }).first();

  await expect(showButton).toBeVisible();
  await expect(showButton).toHaveAttribute("aria-pressed", "false");
  await expect(mapViewport).toHaveAttribute("data-map-stability-check", "stable");

  await showButton.click();

  await expect(hideButton).toHaveAttribute("aria-pressed", "true");
  await expect(mapViewport).toHaveAttribute("data-map-stability-check", "stable");
});
