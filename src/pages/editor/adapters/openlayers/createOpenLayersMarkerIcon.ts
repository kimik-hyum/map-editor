import Icon from "ol/style/Icon";

type MarkerIconOptions = {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  width: number;
};

// 현재 UI 아이콘 체계(lucide-react)의 MapPin 24px path를 OpenLayers canvas에서
// 사용할 수 있도록 data URI SVG로 변환합니다. 외부 이미지 요청 없이 동일한 핀 형태를 유지합니다.
export function createOpenLayersMarkerIcon({
  fillColor,
  strokeColor,
  strokeWidth,
  width,
}: MarkerIconOptions): Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/><circle cx="12" cy="10" r="3" fill="${strokeColor}" stroke="none"/></svg>`;

  return new Icon({
    anchor: [0.5, 1],
    anchorXUnits: "fraction",
    anchorYUnits: "fraction",
    // width 옵션은 생성 시 HTMLImageElement를 요구하므로 SSR/Node에서도 안전한 scale을 사용합니다.
    scale: width / 24,
    src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  });
}
