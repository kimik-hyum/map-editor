import { expect, test, type Page } from "@playwright/test";
import { fromLonLat } from "ol/proj.js";
import { sampleSceneInput } from "../src/pages/demo/fixtures/sampleEditorScene";
import { dragAnnotation, readEditorEdits } from "./fixtures/mapNavigation";

type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

type GeometryOpSnapshot = {
  layerCount: number;
  pastCount: number;
  futureCount: number;
  selectedFeatureIds: string[];
  targetGeometry: PolygonGeometry | null;
  otherGeometry: PolygonGeometry | null;
};

const TARGET_GEOMETRY: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [126.96, 37.55],
      [126.99, 37.55],
      [126.99, 37.58],
      [126.96, 37.58],
      [126.96, 37.55],
    ],
  ],
};

const OTHER_GEOMETRY: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [126.98, 37.57],
      [127.01, 37.57],
      [127.01, 37.6],
      [126.98, 37.6],
      [126.98, 37.57],
    ],
  ],
};

async function openEditorWithOverlappingPolygons(page: Page): Promise<Page> {
  await page.goto("/demo");
  const [editorPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await editorPage.waitForLoadState();
  await expect(editorPage.getByText("권역 A")).toBeVisible();

  await page.evaluate(
    ({ targetGeometry, otherGeometry }) => {
      window.open("", "map-editor-child")?.postMessage(
        {
          type: "MAP_EDITOR_INIT",
          sessionId: "geometry-ops-e2e",
          scene: {
            version: 2,
            viewport: { center: [126.985, 37.575], zoom: 13 },
            features: [
              {
                id: "intersection-target",
                name: "교집합 대상",
                geometry: targetGeometry,
              },
              {
                id: "intersection-other",
                name: "겹치는 도형",
                geometry: otherGeometry,
              },
            ],
          },
        },
        window.location.origin,
      );
    },
    { targetGeometry: TARGET_GEOMETRY, otherGeometry: OTHER_GEOMETRY },
  );

  await expect(
    editorPage.getByRole("button", { name: "교집합 대상 선택" }),
  ).toBeVisible();
  return editorPage;
}

async function readGeometryOpSnapshot(page: Page): Promise<GeometryOpSnapshot> {
  return page.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    const state = useEditorStore.getState();
    const features = state.scene?.layers.flatMap((layer) => layer.features) ?? [];
    const target = features.find((feature) => feature.id === "intersection-target");
    const other = features.find((feature) => feature.id === "intersection-other");
    return {
      layerCount: state.scene?.layers.length ?? 0,
      pastCount: state.past.length,
      futureCount: state.future.length,
      selectedFeatureIds: state.selectedFeatureIds,
      targetGeometry: (target?.feature.geometry as PolygonGeometry | undefined) ?? null,
      otherGeometry: (other?.feature.geometry as PolygonGeometry | undefined) ?? null,
    };
  });
}

function polygonBounds(geometry: PolygonGeometry | null): number[] | null {
  if (!geometry) {
    return null;
  }
  const coordinates = geometry.coordinates.flat();
  return [
    Math.min(...coordinates.map(([x]) => x)),
    Math.min(...coordinates.map(([, y]) => y)),
    Math.max(...coordinates.map(([x]) => x)),
    Math.max(...coordinates.map(([, y]) => y)),
  ];
}

async function platformModifier(page: Page): Promise<"Meta" | "Control"> {
  return page.evaluate(() =>
    /Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control",
  );
}

test("지도·도형·정점·선 커서를 구분하고 창 포커스를 잃으면 쥔 손을 해제한다", async ({
  page,
}) => {
  const editor = await openEditorWithOverlappingPolygons(page);
  const viewport = editor.locator(".editor-map-viewport");
  await expect(viewport).toBeVisible();
  await editor.waitForTimeout(600);
  const box = await viewport.boundingBox();
  if (!box) throw new Error("지도 영역이 없습니다.");
  // 재INIT은 콘텐츠만 바꾸고 기존 지도 뷰를 유지하므로 최초 Demo 뷰를 기준으로 합니다.
  const initialViewport = sampleSceneInput.viewport;
  if (!initialViewport) throw new Error("Demo 최초 뷰가 없습니다.");
  const center = fromLonLat(initialViewport.center);
  const resolution = 156543.03392804097 / 2 ** initialViewport.zoom;
  const hover = async (coordinate: number[]) => {
    const projected = fromLonLat(coordinate);
    await editor.mouse.move(
      box.x + box.width / 2 + (projected[0] - center[0]) / resolution,
      box.y + box.height / 2 - (projected[1] - center[1]) / resolution,
    );
  };
  await hover([126.94, 37.565]);
  await expect(viewport).toHaveCSS("cursor", "grab");
  await hover([126.967, 37.558]);
  await expect(viewport).toHaveCSS("cursor", "pointer");
  // 패널의 자동 중심 이동 없이 선택만 바꿔 같은 지도 좌표로 정점 히트를 검증합니다.
  await editor.evaluate(async () => {
    const { useEditorStore } = await import("/src/pages/editor/state/editorStore.ts");
    useEditorStore.getState().setSelectedFeatureIds(["intersection-target"]);
  });
  const before = await readEditorEdits(editor);
  await hover([126.96, 37.55]);
  await expect(viewport).toHaveCSS("cursor", "move");
  await hover([126.96, 37.565]);
  await expect(viewport).toHaveCSS("cursor", "crosshair");
  await hover([126.94, 37.565]);
  await expect(viewport).toHaveCSS("cursor", "grab");
  await editor.mouse.down();
  await hover([126.945, 37.568]);
  await expect(viewport).toHaveCSS("cursor", "grabbing");
  await editor.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(viewport).not.toHaveAttribute("data-map-panning");
  await expect(viewport).toHaveCSS("cursor", "grab");
  await editor.mouse.up();
  expect(await readEditorEdits(editor)).toEqual(before);
});

test("도형 이름·세 연산 버튼 위 드래그는 지도만 이동하고 키보드 교집합은 유지한다", async ({
  page,
}) => {
  const editor = await openEditorWithOverlappingPolygons(page);
  await editor.getByRole("button", { name: "교집합 대상 선택" }).click();
  const marker = editor.getByRole("group", {
    name: "겹치는 도형 경계 작업",
    exact: true,
  });
  const before = await readEditorEdits(editor);
  for (const target of [
    marker.getByText("겹치는 도형", { exact: true }),
    ...(await marker.getByRole("button").all()),
  ]) {
    await dragAnnotation(editor, target, marker);
    expect(await readEditorEdits(editor)).toEqual(before);
  }
  const intersection = marker.getByRole("button", { name: "겹치는 도형 교집합" });
  await intersection.focus();
  await editor.keyboard.press("Enter");
  await expect
    .poll(async () => (await readEditorEdits(editor)).past)
    .toBe(before.past + 1);
  await editor.waitForTimeout(300);
  expect((await readEditorEdits(editor)).selected).toEqual(before.selected);
});

test("교집합은 선택 도형만 겹치는 면으로 바꾸고 undo 한 단계로 기록한다", async ({
  page,
}) => {
  const editorPage = await openEditorWithOverlappingPolygons(page);
  await editorPage.getByRole("button", { name: "교집합 대상 선택" }).click();

  const intersectButton = editorPage.getByRole("button", {
    name: "겹치는 도형 교집합",
  });
  await expect(intersectButton).toBeVisible();
  await expect(intersectButton).toHaveText("");
  await expect(intersectButton).toHaveCSS("width", "26px");
  await expect(intersectButton).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(intersectButton).toHaveCSS("background-color", "rgb(128, 0, 255)");
  await expect(intersectButton).toHaveAttribute("title", /교집합/);
  await intersectButton.hover();
  await expect(intersectButton).toHaveCSS("background-color", "rgb(128, 0, 255)");
  await expect(intersectButton).toHaveCSS("color", "rgb(255, 255, 255)");
  const before = await readGeometryOpSnapshot(editorPage);

  await intersectButton.click();
  await expect
    .poll(async () =>
      polygonBounds((await readGeometryOpSnapshot(editorPage)).targetGeometry),
    )
    .toEqual([126.98, 37.57, 126.99, 37.58]);

  const intersected = await readGeometryOpSnapshot(editorPage);
  expect(intersected.layerCount).toBe(before.layerCount);
  expect(intersected.pastCount).toBe(before.pastCount + 1);
  expect(intersected.futureCount).toBe(0);
  expect(intersected.selectedFeatureIds).toEqual(["intersection-target"]);
  expect(intersected.otherGeometry).toEqual(OTHER_GEOMETRY);

  const modifier = await platformModifier(editorPage);
  await editorPage.keyboard.press(`${modifier}+z`);
  await expect
    .poll(async () =>
      polygonBounds((await readGeometryOpSnapshot(editorPage)).targetGeometry),
    )
    .toEqual([126.96, 37.55, 126.99, 37.58]);

  await editorPage.keyboard.press(`${modifier}+Shift+z`);
  await expect
    .poll(async () =>
      polygonBounds((await readGeometryOpSnapshot(editorPage)).targetGeometry),
    )
    .toEqual([126.98, 37.57, 126.99, 37.58]);
});
