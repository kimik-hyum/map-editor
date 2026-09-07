import { Button } from "@base-ui/react/button";
import { Blend, Minus, Plus } from "lucide-react";
import {
  getMapAnnotationMetrics,
  getMapAnnotationSize,
} from "@/pages/editor/theme/mapAnnotationTheme";

type GeometryOpMarkerProps = {
  // 후보 폴리곤 표시명(이름, 없으면 호출부가 id로 폴백해 항상 채워 보낸다).
  name: string;
  // 선택 도형과 실제 면적이 겹쳐 제거·교집합 연산이 가능한 후보인지.
  canSubtract: boolean;
  canIntersect: boolean;
  onMerge: () => void;
  onSubtract: () => void;
  onIntersect: () => void;
  primaryAction?: "create" | "merge";
  showSubtract?: boolean;
  disabled?: boolean;
  zoom?: number;
};

// 후보 폴리곤 하나의 내부 대표점에 뜨는 칩입니다(위치는 ol/Overlay가 잡으므로 내용만 그림).
// 배경 카드 없이 이름 한 줄과 아이콘만 표시합니다. 동작 설명은 aria-label/native title에 둡니다.
// 긴 이름은 말줄임으로 지도 가림을 제한하며 전체 이름은 native title로 제공합니다.
export function GeometryOpMarker({
  name,
  canSubtract,
  canIntersect,
  onMerge,
  onSubtract,
  onIntersect,
  primaryAction = "merge",
  showSubtract = false,
  disabled = false,
  zoom = 12,
}: GeometryOpMarkerProps) {
  const metrics = getMapAnnotationMetrics(zoom);
  const primaryLabel = primaryAction === "create" ? "추가" : "합치기";
  const showSubtractButton = canSubtract || showSubtract;
  const size = getMapAnnotationSize(
    name,
    zoom,
    1 + Number(canIntersect) + Number(showSubtractButton),
  );
  const buttonStyle = {
    width: metrics.buttonSize,
    height: metrics.buttonSize,
  };
  const iconStyle = { width: metrics.iconSize, height: metrics.iconSize };
  const sharedButtonClass =
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border p-0 transition-colors enabled:hover:ring-2 enabled:hover:ring-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <fieldset
      aria-label={`${name} 경계 작업`}
      data-map-annotation
      data-map-zoom={zoom}
      className="m-0 flex min-w-0 flex-col items-center gap-0.5 border-0 p-0"
      style={{ width: size.width }}
    >
      <span
        className="w-full truncate text-center font-semibold text-ink"
        title={name}
        style={{
          fontSize: metrics.labelFontSize,
          lineHeight: `${metrics.lineHeight}px`,
          textShadow:
            "0 1px 2px #fff, 0 -1px 2px #fff, 1px 0 2px #fff, -1px 0 2px #fff",
        }}
      >
        {name}
      </span>
      <div className="flex items-center gap-1">
        <Button
          aria-label={`${name} ${primaryLabel}`}
          className={`${sharedButtonClass} border-map-add bg-map-add text-white focus-visible:outline-map-add`}
          style={buttonStyle}
          disabled={disabled}
          onClick={onMerge}
          title={
            disabled
              ? "경계 연산이 완료될 때까지 기다려주세요"
              : primaryAction === "create"
                ? "이 경계를 새 도형으로 추가"
                : "이 경계를 선택 도형과 합치기"
          }
          type="button"
        >
          <Plus aria-hidden style={iconStyle} strokeWidth={2} />
        </Button>
        {canIntersect ? (
          <Button
            aria-label={`${name} 교집합`}
            className={`${sharedButtonClass} border-map-intersect bg-map-intersect text-white focus-visible:outline-map-intersect`}
            style={buttonStyle}
            disabled={disabled}
            onClick={onIntersect}
            title="교집합 (선택 도형과 겹치는 부분만 남기기)"
            type="button"
          >
            <Blend aria-hidden style={iconStyle} strokeWidth={2} />
          </Button>
        ) : null}
        {showSubtractButton ? (
          <Button
            aria-label={`${name} 겹친 부분 제거`}
            className={`${sharedButtonClass} border-map-subtract bg-map-subtract text-white focus-visible:outline-map-subtract`}
            style={buttonStyle}
            disabled={disabled || !canSubtract}
            onClick={onSubtract}
            title={
              disabled
                ? "경계 연산이 완료될 때까지 기다려주세요"
                : !canSubtract
                  ? "편집 가능한 폴리곤 하나를 선택하고 이 경계와 겹칠 때 사용할 수 있습니다"
                  : "선택 도형에서 이 경계와 겹친 부분 빼기"
            }
            type="button"
          >
            <Minus aria-hidden style={iconStyle} strokeWidth={2} />
          </Button>
        ) : null}
      </div>
    </fieldset>
  );
}
