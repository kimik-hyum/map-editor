import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";

// 호스트가 보내는 "최소 입력"(v2) 샘플 — 헬퍼 없이 손으로 작성합니다.
// 레이어 단계 없이 도형 목록만 보내면, 에디터가 도형 하나당 내부 레이어 하나로 펼쳐 쌓습니다.
//   - 필수: features[].geometry
//   - 선택: id / name / locked / visible / themeToken / properties
//   - 배열 순서 = 그리는 순서: 뒤에 있는 도형이 위에 그려집니다(패널 맨 위 = 배열 마지막)
//   - locked: true = 읽기 전용·참고용(패널 선택만 가능, 이동·정점편집 불가)
//   - 폴리곤 ring은 일부러 닫지 않았습니다(에디터가 자동으로 닫는 것을 보여주기 위함)
export const sampleSceneInput: EditorSceneInput = {
  version: 2,
  id: "sample-seoul-editor-scene",
  name: "서울 샘플 편집 씬",
  viewport: { center: [126.98, 37.57], zoom: 12 },
  features: [
    {
      name: "마스크 예시",
      locked: true,
      themeToken: "mask",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [126.949, 37.559],
            [126.961, 37.559],
            [126.961, 37.551],
            [126.949, 37.551],
          ],
        ],
      },
    },
    {
      name: "스냅 예시",
      locked: true,
      themeToken: "snapTarget",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [126.974, 37.559],
            [126.986, 37.559],
            [126.986, 37.551],
            [126.974, 37.551],
          ],
        ],
      },
    },
    {
      name: "오류 예시",
      locked: true,
      themeToken: "invalid",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.024, 37.559],
            [127.036, 37.559],
            [127.036, 37.551],
            [127.024, 37.551],
          ],
        ],
      },
    },
    {
      name: "참고 1",
      locked: true,
      themeToken: "reference",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [126.999, 37.589],
            [127.011, 37.589],
            [127.011, 37.581],
            [126.999, 37.581],
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
            [127.024, 37.589],
            [127.036, 37.589],
            [127.036, 37.581],
            [127.024, 37.581],
          ],
        ],
      },
    },
    {
      name: "권역 A",
      themeToken: "editable",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [126.924, 37.589],
            [126.936, 37.589],
            [126.936, 37.581],
            [126.924, 37.581],
          ],
        ],
      },
    },
    {
      name: "권역 B",
      themeToken: "active",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [126.949, 37.589],
            [126.961, 37.589],
            [126.961, 37.581],
            [126.949, 37.581],
          ],
        ],
      },
    },
    {
      name: "권역 C",
      themeToken: "selected",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [126.974, 37.589],
            [126.986, 37.589],
            [126.986, 37.581],
            [126.974, 37.581],
          ],
        ],
      },
    },
  ],
};
