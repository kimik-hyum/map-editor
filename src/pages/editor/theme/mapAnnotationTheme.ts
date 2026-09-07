// 화면상의 글씨/조작 크기는 지도 geometry의 크기와 분리합니다.
// 멀리서도 읽을 수 있는 최솟값을 유지하고, 확대할 때 세 단계로 커집니다.
const overview = {
  labelFontSize: 14,
  lineHeight: 20,
  buttonFontSize: 13,
  buttonHeight: 32,
  iconSize: 16,
  cardWidth: 180,
  maxCards: 24,
};
const standard = {
  labelFontSize: 15,
  lineHeight: 22,
  buttonFontSize: 14,
  buttonHeight: 34,
  iconSize: 17,
  cardWidth: 204,
  maxCards: 48,
};
const detail = {
  labelFontSize: 16,
  lineHeight: 24,
  buttonFontSize: 14,
  buttonHeight: 36,
  iconSize: 18,
  cardWidth: 224,
  maxCards: 72,
};

export function getMapAnnotationMetrics(zoom: number) {
  if (!Number.isFinite(zoom) || zoom < 12) return overview;
  return zoom < 15 ? standard : detail;
}

export function getMapAnnotationZoom(resolution: number) {
  // 편집기 지도는 기본 EPSG:3857 / 256px 타일을 사용합니다.
  return resolution > 0 ? Math.log2(156543.03392804097 / resolution) : 12;
}

export function estimateMapAnnotationHeight(name: string, zoom: number) {
  const metrics = getMapAnnotationMetrics(zoom);
  const width = Array.from(name).reduce(
    (sum, char) => sum + (char.charCodeAt(0) < 128 ? 0.65 : 1) * metrics.labelFontSize,
    0,
  );
  const lines = Math.min(3, Math.max(1, Math.ceil(width / (metrics.cardWidth - 24))));
  return lines * metrics.lineHeight + metrics.buttonHeight + 24;
}
