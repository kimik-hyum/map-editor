import type { EditorSceneInput } from "./editor-contract.example";

export const inputScene = {
  version: 2,
  id: "delivery-area-edit",
  name: "배송 권역 편집",
  viewport: {
    center: [127.0276, 37.4979],
    zoom: 13,
  },
  features: [
    {
      id: "service-area-1",
      name: "강남 배송권역",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.01, 37.51],
            [127.05, 37.51],
            [127.05, 37.48],
            [127.01, 37.48],
            [127.01, 37.51],
          ],
        ],
      },
      properties: {
        serviceAreaId: 42,
      },
    },
    {
      id: "store-1",
      name: "강남점",
      locked: true,
      geometry: {
        type: "Point",
        coordinates: [127.0276, 37.4979],
      },
    },
  ],
} satisfies EditorSceneInput;
