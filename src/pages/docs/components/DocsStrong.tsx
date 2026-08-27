import type { ReactNode } from "react";

type DocsStrongProps = {
  children: ReactNode;
};

// 문장 안에서 강조하는 구절. 본문보다 진한 잉크색 볼드로 표시합니다.
export function DocsStrong({ children }: DocsStrongProps) {
  return <strong className="font-bold text-ink">{children}</strong>;
}
