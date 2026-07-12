import { cn } from "@/shared/utils/cn";

type RegionKindButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

// 사이드 메뉴의 경계 종류 한 줄(행정동/법정동/우편번호). 누르면 해당 경계를 그립니다.
export function RegionKindButton({ label, active, onClick }: RegionKindButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "w-full rounded-md px-3 py-2 text-left text-sm font-bold transition-colors",
        active
          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-300"
          : "text-slate-600 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );
}
