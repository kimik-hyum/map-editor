import { expect, test, type Page } from "@playwright/test";

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

test("교집합은 선택 도형만 겹치는 면으로 바꾸고 undo 한 단계로 기록한다", async ({
  page,
}) => {
  const editorPage = await openEditorWithOverlappingPolygons(page);
  await editorPage.getByRole("button", { name: "교집합 대상 선택" }).click();

  const intersectButton = editorPage.getByRole("button", {
    name: "겹치는 도형 교집합",
  });
  await expect(intersectButton).toBeVisible();
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
