import { Button } from "@base-ui/react/button";
import { Blend, Combine, Minus, Plus } from "lucide-react";
import { getMapAnnotationMetrics } from "@/pages/editor/theme/mapAnnotationTheme";

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
// 이름과 텍스트가 있는 작업 버튼을 두 행으로 보여줍니다.
// 추가(새 도형)와 합치기(선택 도형 수정)를 구분하고, 빼기는 색·문구로 함께 설명합니다.
// 긴 이름은 최대 3줄과 native title로 제공하며 줌에 따라 읽기/조작 크기를 조정합니다.
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
  const PrimaryIcon = primaryAction === "create" ? Plus : Combine;
  const buttonStyle = {
    minHeight: metrics.buttonHeight,
    fontSize: metrics.buttonFontSize,
  };
  const iconStyle = { width: metrics.iconSize, height: metrics.iconSize };
  const sharedButtonClass =
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md border px-2 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <fieldset
      aria-label={`${name} 경계 작업`}
      data-map-annotation
      data-map-zoom={zoom}
      className="m-0 flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-brand-line bg-white px-2.5 py-2 shadow-[0_2px_8px_rgba(23,32,51,0.18)]"
      style={{ width: canIntersect ? metrics.cardWidth + 72 : metrics.cardWidth }}
    >
      <span
        className="line-clamp-3 w-full break-words text-center font-extrabold text-ink"
        title={name}
        style={{
          fontSize: metrics.labelFontSize,
          lineHeight: `${metrics.lineHeight}px`,
        }}
      >
        {name}
      </span>
      <div className="flex items-center gap-1">
        <Button
          aria-label={`${name} ${primaryLabel}`}
          className={`${sharedButtonClass} border-brand bg-brand text-white hover:border-brand-strong hover:bg-brand-strong`}
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
          <PrimaryIcon aria-hidden style={iconStyle} strokeWidth={2.5} />
          {primaryLabel}
        </Button>
        {canIntersect ? (
          <Button
            aria-label={`${name} 교집합`}
            className={`${sharedButtonClass} border-brand-line bg-brand-soft text-brand-strong hover:border-brand hover:bg-white`}
            style={buttonStyle}
            disabled={disabled}
            onClick={onIntersect}
            title="교집합 (선택 도형과 겹치는 부분만 남기기)"
            type="button"
          >
            <Blend aria-hidden style={iconStyle} strokeWidth={2.5} />
            교집합
          </Button>
        ) : null}
        {canSubtract || showSubtract ? (
          <Button
            aria-label={`${name} 겹친 부분 제거`}
            className={`${sharedButtonClass} border-danger-line bg-danger-soft text-danger hover:border-danger hover:bg-white`}
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
            <Minus aria-hidden style={iconStyle} strokeWidth={2.5} />
            빼기
          </Button>
        ) : null}
      </div>
    </fieldset>
  );
}
