import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 문서용 실제 화면 캡처. 실행 중인 개발 서버에서 경복궁 예제를 정상 연동으로 엽니다.
// DOCS_BASE_URL=http://127.0.0.1:4186 node scripts/capture-editor-docs.mjs
const root = resolve(fileURLToPath(import.meta.url), "../..");
const output = resolve(root, "public/docs");
const baseUrl = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4186";
const viewport = { width: 1440, height: 900 };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(new URL("/integration", baseUrl).href);
  const [editor] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "경복궁 예제 새 창으로 편집" }).click(),
  ]);
  await editor.setViewportSize(viewport);
  await editor
    .getByRole("button", { name: "경복궁 예제 권역 선택", exact: true })
    .click();
  for (let step = 0; step < 3; step += 1) {
    await editor.mouse.move(754, 395);
    await editor.mouse.wheel(0, -450);
    // OpenLayers의 휠 입력 묶음과 줌 애니메이션이 완료된 뒤 다음 입력을 줍니다.
    await editor.waitForTimeout(700);
  }
  await editor.mouse.move(1100, 700);
  await expect(
    editor.getByRole("button", { name: "저장하고 편집 완료" }),
  ).toBeEnabled();
  // 화면 내 OSM 타일 응답까지 기다려 빈 배경을 문서에 넣지 않습니다.
  await editor.waitForLoadState("networkidle");
  await mkdir(output, { recursive: true });
  await editor.screenshot({
    path: resolve(output, "editor-palace.jpg"),
    type: "jpeg",
    quality: 90,
  });
  const names = {
    select: "선택",
    draw: "폴리곤 그리기",
    boundary: "행정동 경계",
    radius: "반경",
    layers: "경복궁 예제 권역 선택",
    finish: "저장하고 편집 완료",
  };
  const bounds = {};
  for (const [key, name] of Object.entries(names)) {
    const box = await editor.getByRole("button", { name, exact: true }).boundingBox();
    if (!box) throw new Error(`캡처 위치 없음: ${name}`);
    bounds[key] = {
      x: (box.x / viewport.width) * 100,
      y: (box.y / viewport.height) * 100,
      width: (box.width / viewport.width) * 100,
      height: (box.height / viewport.height) * 100,
    };
  }
  await editor.getByRole("button", { name: "폴리곤 그리기", exact: true }).click();
  await editor.getByText("추가할 도형", { exact: true }).waitFor();
  await editor.mouse.move(1100, 700);
  await editor.waitForTimeout(250);
  await editor.screenshot({
    path: resolve(output, "editor-draw-tools.jpg"),
    type: "jpeg",
    quality: 90,
  });
  await writeFile(
    resolve(root, "src/pages/docs/content/editorTourCapture.json"),
    `${JSON.stringify(
      {
        viewport,
        capturedAt: new Date().toISOString(),
        bounds,
        note: "실제 편집 화면. 경복궁 사각형 INIT 후 선택·수동 확대. OSM 기여자 표기 포함.",
      },
      null,
      2,
    )}\n`,
  );
  console.log("문서용 실제 편집 화면 2개와 강조 위치를 저장했습니다.");
} finally {
  await browser.close();
}
