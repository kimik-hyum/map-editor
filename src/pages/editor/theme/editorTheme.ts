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
