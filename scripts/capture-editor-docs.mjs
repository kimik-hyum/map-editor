import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 개발 서버와 Ego Lite가 실행 중일 때 저장소 루트에서 실행합니다.
// DOCS_BASE_URL=http://127.0.0.1:4177 node scripts/capture-editor-docs.mjs
// DOCS_TASK_SPACE_ID 지정 시 기존 작업 공간을 이어가며 완료 처리는 호출자가 담당합니다.
const options = {
  root: resolve(fileURLToPath(import.meta.url), "../.."),
  baseUrl: process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4177",
  taskSpaceId: process.env.DOCS_TASK_SPACE_ID,
};
const result = spawnSync("ego-browser", ["nodejs"], {
  input: `const capture = ${captureDocs.toString()}; await capture(${JSON.stringify(options)});`,
  stdio: ["pipe", "inherit", "inherit"],
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

async function captureDocs(options) {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const root = options.root;
  const output = resolve(root, "public/docs");
  const baseUrl = options.baseUrl;
  const existingSpace = options.taskSpaceId;
  const task = await taskSpace(
    existingSpace ? Number(existingSpace) : "Termia editor guide capture",
  );
  console.log({ taskSpaceId: task.spaceId });
  const parent = task.page("p1");
  const viewport = { width: 1440, height: 900 };
  const metadata = [];
  const images = [];
  await mkdir(output, { recursive: true });

  for (const locale of ["ko", "en"]) {
    const en = locale === "en";
    const names = {
      open: en
        ? "Edit the Central Park example in a new tab"
        : "경복궁 예제 새 창으로 편집",
      area: en ? "Select Central Park example area" : "경복궁 예제 권역 선택",
      marker: en ? "Select Central Park example marker" : "경복궁 예제 마커 선택",
      select: en ? "Select" : "선택",
      draw: en ? "Draw Polygon" : "폴리곤 그리기",
      boundary: en ? "Boundary data" : "경계 데이터",
      radius: en ? "Radius" : "반경",
      finish: en ? "Save and finish editing" : "저장하고 편집 완료",
      shape: en ? "Shape to add" : "추가할 도형",
      radiusInput: en ? "Enter radius" : "반경 입력",
      cancelRadius: en ? "Cancel radius input" : "반경 입력 취소",
      collapse: en ? "Collapse right panel" : "오른쪽 패널 접기",
      expand: en ? "Expand right panel" : "오른쪽 패널 펼치기",
    };
    const url = new URL(`/${locale}/integration#quickstart`, baseUrl).href;
    if ((await parent.url()) !== url) await parent.goto(url);
    await parent.waitForSelector('[data-testid="example-scene"]', {
      state: "attached",
    });
    const scene = await parent.evaluate(() =>
      JSON.parse(document.querySelector('[data-testid="example-scene"]').textContent),
    );
    const pending = parent.waitForEvent("popup");
    await parent.click(`loc=role:button[name="${names.open}"]`);
    const editor = await pending;
    await editor.cdp("Emulation.setDeviceMetricsOverride", {
      ...viewport,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const aria = (name) => `[aria-label="${name}"]`;
    await editor.waitForSelector(aria(names.area));
    await editor.click(aria(names.area));
    if (!en) {
      for (let step = 0; step < 3; step += 1) {
        await editor.click(".ol-zoom-in");
        // OL 기본 줌 버튼의 250ms 애니메이션이 끝나야 다음 줌을 누적합니다.
        await editor.waitForTimeout(300);
      }
    }
    const box = async (selector, parentRow = false) =>
      editor.evaluate(
        ({ selector, parentRow }) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`캡처 대상 없음: ${selector}`);
          const rect = (
            parentRow ? element.closest("li") : element
          ).getBoundingClientRect();
          return {
            x: (rect.x / innerWidth) * 100,
            y: (rect.y / innerHeight) * 100,
            width: (rect.width / innerWidth) * 100,
            height: (rect.height / innerHeight) * 100,
          };
        },
        { selector, parentRow },
      );
    const capture = async (file) => {
      await editor.mouse.move(1050, 870);
      await editor.waitForLoadState("networkidle");
      await editor.waitForFunction(() =>
        document
          .getAnimations()
          .every(
            (animation) =>
              animation.playState !== "running" ||
              animation.effect?.getComputedTiming().iterations === Infinity,
          ),
      );
      // OL 타일의 canvas fade(250ms)도 끝낸 뒤 원래 해상도로 캡처합니다.
      await editor.waitForTimeout(350);
      const image = await editor.cdp("Page.captureScreenshot", {
        format: "jpeg",
        quality: 90,
      });
      images.push({ file, data: Buffer.from(image.data, "base64") });
      console.log({ locale, file });
    };
    const bounds = {
      select: await box(aria(names.select)),
      boundary: await box(aria(names.boundary)),
      layers: await box(aria(names.area), true),
      finish: await box(aria(names.finish)),
    };
    // 목록 선택은 도형을 지도 중앙으로 이동시킵니다. 실제 예제의 투영 범위와 줌 15를 사용합니다.
    const map = await box('[role="application"][aria-label="OSM map editor"]');
    const ring = scene.features.find((feature) => feature.geometry.type === "Polygon")
      .geometry.coordinates[0];
    const projected = ring.map(([lng, lat]) => [
      ((lng * Math.PI) / 180) * 6378137,
      Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 6378137,
    ]);
    const resolution = 156543.03392804097 / 2 ** 15;
    const width =
      (Math.max(...projected.map(([x]) => x)) -
        Math.min(...projected.map(([x]) => x))) /
        resolution +
      16;
    const height =
      (Math.max(...projected.map(([, y]) => y)) -
        Math.min(...projected.map(([, y]) => y))) /
        resolution +
      16;
    bounds.vertex = {
      x: map.x + map.width / 2 - (width / viewport.width) * 50,
      y: map.y + map.height / 2 - (height / viewport.height) * 50,
      width: (width / viewport.width) * 100,
      height: (height / viewport.height) * 100,
    };
    await editor.click(aria(names.draw));
    await editor.waitForSelector(aria(names.shape));
    bounds.draw = await box(aria(names.shape));
    await capture(en ? "editor-draw-tools-en.jpg" : "editor-draw-tools.jpg");
    await editor.click(aria(names.select));
    await capture(en ? "editor-central-park.jpg" : "editor-palace.jpg");
    await editor.click(aria(names.marker));
    await editor.click(aria(names.radius));
    await editor.waitForSelector(aria(names.radiusInput));
    await editor.fill("#radius-km-input", "0.30");
    bounds.radius = await box(aria(names.radiusInput));
    await capture(en ? "editor-radius-en.jpg" : "editor-radius.jpg");
    await editor.click(aria(names.cancelRadius));
    await editor.click(aria(names.area));
    await editor.click(aria(names.collapse));
    await editor.waitForSelector(aria(names.expand));
    bounds.panel = await box(aria(names.expand));
    await capture(en ? "editor-panel-collapsed-en.jpg" : "editor-panel-collapsed.jpg");
    metadata.push({ locale, viewport, bounds, capturedAt: new Date().toISOString() });
    await editor.close();
  }
  // public 이미지와 소스 변경에 따른 HMR이 캡처를 초기화하지 않도록 모두 마지막에 저장합니다.
  for (const { file, data } of images) await writeFile(resolve(output, file), data);
  for (const { locale, ...data } of metadata) {
    await writeFile(
      resolve(
        root,
        `src/pages/docs/content/editorTourCapture${locale === "en" ? ".en" : ""}.json`,
      ),
      `${JSON.stringify(data, null, 2)}\n`,
    );
  }
  if (!existingSpace) await task.finish({ keep: [] });
}
