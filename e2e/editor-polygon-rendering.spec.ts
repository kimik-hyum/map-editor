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
  await expect(map).toBeVisible();
  await expect(page.locator(".ol-viewport")).toBeVisible();
  await expect(page.locator(".editor-map canvas")).toHaveCount(1);

  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".editor-map canvas");

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
