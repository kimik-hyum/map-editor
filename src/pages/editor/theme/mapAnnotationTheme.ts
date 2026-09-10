// 화면상의 글씨/조작 크기는 지도 geometry의 크기와 분리합니다.
// 이름 한 줄 + 작은 아이콘 행만 예약해 지도를 가리는 면적을 제한합니다.
const overview = {
  labelFontSize: 13,
  lineHeight: 18,
  buttonSize: 24,
  iconSize: 14,
  maxWidth: 128,
  maxCards: 24,
};
const standard = {
  labelFontSize: 14,
  lineHeight: 20,
  buttonSize: 26,
  iconSize: 15,
  maxWidth: 144,
  maxCards: 48,
};
const detail = {
  labelFontSize: 14,
  lineHeight: 20,
  buttonSize: 28,
  iconSize: 16,
  maxWidth: 160,
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

export function getMapAnnotationSize(name: string, zoom: number, buttonCount = 2) {
  const metrics = getMapAnnotationMetrics(zoom);
  const width = Array.from(name).reduce(
    (sum, char) => sum + (char.charCodeAt(0) < 128 ? 0.65 : 1) * metrics.labelFontSize,
    0,
  );
  return {
    width: Math.max(
      Math.min(metrics.maxWidth, Math.ceil(width) + 4),
      buttonCount * metrics.buttonSize + (buttonCount - 1) * 4,
    ),
    height: metrics.lineHeight + 2 + metrics.buttonSize,
  };
}
