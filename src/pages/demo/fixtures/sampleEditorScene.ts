import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";

// 호스트가 보내는 "최소 입력"(v2) 샘플 — 헬퍼 없이 손으로 작성합니다.
// 호스트가 실제로 채우는 값이 얼마나 적은지 보여주는 것이 목적입니다.
//   - 필수: layers[].features[].geometry
//   - 선택: id / name / role / zIndex / visible / opacity / themeToken / properties
//   - 에디터가 채움: id 자동생성, geometryKind 파생, state/view/behavior 기본값,
//     폴리곤 ring 자동 닫기(아래 좌표는 일부러 닫지 않았습니다)
// themeToken은 선택이지만, 데모/렌더링 확인을 위해 일부 피처에만 지정합니다.
export const sampleSceneInput: EditorSceneInput = {
  version: 2,
  id: "sample-seoul-editor-scene",
  name: "서울 샘플 편집 씬",
  viewport: { center: [126.98, 37.57], zoom: 12 },
  layers: [
    {
      name: "편집 대상 권역",
      role: "editable",
      features: [
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
    },
    {
      name: "참고 권역",
      role: "reference",
      features: [
        {
          name: "참고 1",
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
        // 가장 단순한 형태: geometry만. id·name·themeToken 전부 생략 → 에디터가 채움.
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
      ],
    },
    {
      name: "검증 표시 권역",
      role: "reference",
      features: [
        {
          name: "마스크 예시",
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
      ],
    },
  ],
};
