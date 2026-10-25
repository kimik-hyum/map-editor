import { useT } from "@/shared/i18n/useT";
import { Button } from "@base-ui/react/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/shared/utils/cn";

type LayerVisibilityIconProps = {
  isDimmed: boolean;
  isVisible: boolean;
  onToggle: () => void;
  // 접근성 라벨에 쓰일 대상 명칭입니다. 예: "레이어", "도형".
  subject: string;
  // 부모 레이어가 숨김일 때처럼 토글을 막아야 하는 경우입니다.
  disabled?: boolean;
};

export function LayerVisibilityIcon({
  isDimmed,
  isVisible,
  onToggle,
  subject,
  disabled = false,
}: LayerVisibilityIconProps) {
  const t = useT();
  const statusLabel = disabled
    ? t("현재 상태에서는 표시를 변경할 수 없습니다")
    : isVisible
      ? isDimmed
        ? t("흐리게 표시")
        : t("표시")
      : t("숨김");
  const actionLabel = isVisible
    ? t("{{v0}} 숨기기", { v0: subject })
    : t("{{v0}} 보이기", { v0: subject });

  return (
    <Button
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
        isVisible
          ? "border-slate-300 bg-white text-slate-600"
          : "border-slate-200 bg-slate-100 text-slate-400",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-teal-400 hover:text-teal-700",
      )}
      aria-label={actionLabel}
      aria-pressed={isVisible}
      disabled={disabled}
      title={statusLabel}
      type="button"
      onClick={onToggle}
    >
      {isVisible ? (
        <Eye
          aria-hidden
          className={cn("h-4 w-4", isDimmed && "opacity-50")}
          strokeWidth={2}
        />
      ) : (
        <EyeOff aria-hidden className="h-4 w-4 opacity-60" strokeWidth={2} />
      )}
    </Button>
  );
}
