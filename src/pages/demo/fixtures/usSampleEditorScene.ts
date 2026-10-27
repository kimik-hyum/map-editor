import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";

// 뉴욕 주변의 도형 편집 연습용 데이터이며 실제 행정 경계가 아닙니다.
export const usSampleSceneInput: EditorSceneInput = {
  version: 2,
  id: "sample-new-york-editor-scene",
  name: "New York sample editing scene",
  viewport: { center: [-73.98, 40.77], zoom: 12 },
  features: [
    {
      name: "Mask example",
      locked: true,
      themeToken: "mask",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-74.011, 40.759],
            [-73.999, 40.759],
            [-73.999, 40.751],
            [-74.011, 40.751],
          ],
        ],
      },
    },
    {
      name: "Snap example",
      locked: true,
      themeToken: "snapTarget",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.986, 40.759],
            [-73.974, 40.759],
            [-73.974, 40.751],
            [-73.986, 40.751],
          ],
        ],
      },
    },
    {
      name: "Invalid example",
      locked: true,
      themeToken: "invalid",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.936, 40.759],
            [-73.924, 40.759],
            [-73.924, 40.751],
            [-73.936, 40.751],
          ],
        ],
      },
    },
    {
      name: "Reference 1",
      locked: true,
      themeToken: "reference",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.961, 40.789],
            [-73.949, 40.789],
            [-73.949, 40.781],
            [-73.961, 40.781],
          ],
        ],
      },
    },
    // 가장 단순한 형태: geometry만(잠금도 생략 = 편집 가능). 이름·id는 에디터가 채움.
    {
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.936, 40.789],
            [-73.924, 40.789],
            [-73.924, 40.781],
            [-73.936, 40.781],
          ],
        ],
      },
    },
    {
      name: "Area A",
      themeToken: "editable",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-74.036, 40.789],
            [-74.024, 40.789],
            [-74.024, 40.781],
            [-74.036, 40.781],
          ],
        ],
      },
    },
    {
      name: "Area B",
      themeToken: "active",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-74.011, 40.789],
            [-73.999, 40.789],
            [-73.999, 40.781],
            [-74.011, 40.781],
          ],
        ],
      },
    },
    {
      name: "Area C",
      themeToken: "selected",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.986, 40.789],
            [-73.974, 40.789],
            [-73.974, 40.781],
            [-73.986, 40.781],
          ],
        ],
      },
    },
  ],
};
