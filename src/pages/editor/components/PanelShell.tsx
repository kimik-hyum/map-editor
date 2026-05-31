import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type PanelShellProps = {
  children?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
};

// 에디터 패널 공통 골격입니다. 세로 flex + 스크롤 본문 + 선택적 header/footer를 제공합니다.
// FloatingPanel(드래그 패널)과 좌측 도킹 패널이 같은 chrome 구조를 공유하도록 추출했습니다.
export function PanelShell({
  children,
  header,
  footer,
  ariaLabel,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
}: PanelShellProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn("flex h-full min-h-0 w-full flex-col overflow-hidden", className)}
    >
      {header ? (
        <header className={cn("shrink-0 border-b border-line", headerClassName)}>
          {header}
        </header>
      ) : null}
      <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>
        {children}
      </div>
      {footer ? (
        <footer className={cn("shrink-0 border-t border-line", footerClassName)}>
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
