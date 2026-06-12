export const editorDefaultTheme = {
  name: "default",
  polygon: {
    editable: {
      strokeColor: "#2563eb",
      fillColor: "rgba(37, 99, 235, 0.22)",
      strokeWidth: 3,
    },
    active: {
      strokeColor: "#0284c7",
      fillColor: "rgba(14, 165, 233, 0.24)",
      strokeWidth: 4,
    },
    selected: {
      strokeColor: "#4f46e5",
      fillColor: "rgba(79, 70, 229, 0.24)",
      strokeWidth: 3,
    },
    readonly: {
      strokeColor: "#475569",
      fillColor: "rgba(71, 85, 105, 0.14)",
      strokeWidth: 2,
    },
    reference: {
      strokeColor: "#6b7280",
      fillColor: "rgba(107, 114, 128, 0.12)",
      strokeWidth: 2,
    },
    background: {
      strokeColor: "rgba(100, 116, 139, 0.3)",
      fillColor: "rgba(100, 116, 139, 0.3)",
      strokeWidth: 2,
    },
    mask: {
      strokeColor: "#dc2626",
      fillColor: "rgba(220, 38, 38, 0.18)",
      strokeWidth: 2,
    },
    snapTarget: {
      strokeColor: "#7c3aed",
      fillColor: "rgba(124, 58, 237, 0.14)",
      strokeWidth: 2,
    },
    warning: {
      strokeColor: "#d97706",
      fillColor: "rgba(245, 158, 11, 0.2)",
      strokeWidth: 2,
    },
    invalid: {
      strokeColor: "#e11d48",
      fillColor: "rgba(225, 29, 72, 0.18)",
      strokeWidth: 3,
    },
  },
  // 호버/선택 강조 파라미터입니다. 선택은 도형의 원래 색을 바꾸지 않고
  // (원색 식별 보존) 선 굵기·채움 불투명도·바깥 halo로만 강조합니다.
  emphasis: {
    hovered: {
      fillAlphaMultiplier: 1.5,
    },
    selected: {
      fillAlphaMultiplier: 2.1,
      strokeWidthDelta: 2,
      // 본 선 아래에 깔리는 반투명 글로우. 같은 색 도형이 겹쳐도 선택이 구분된다.
      haloColor: "rgba(79, 70, 229, 0.28)",
      haloWidthDelta: 6,
    },
  },
  // 선택된 도형의 꼭짓점에 표시하는 핸들(동그라미) 스타일입니다.
  vertexHandle: {
    radius: 5,
    fillColor: "#ffffff",
    strokeColor: "#4f46e5",
    strokeWidth: 2,
  },
  label: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderColor: "rgba(15, 23, 42, 0.2)",
    color: "#0f172a",
    haloColor: "rgba(255, 255, 255, 0.92)",
  },
} as const;

export type EditorPolygonThemeToken = keyof typeof editorDefaultTheme.polygon;
export type EditorPolygonThemeStyle =
  (typeof editorDefaultTheme.polygon)[EditorPolygonThemeToken];
