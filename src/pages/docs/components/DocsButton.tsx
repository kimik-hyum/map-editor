import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@/shared/utils/cn";

type DocsButtonVariant = "primary" | "secondary";

type DocsButtonProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  icon?: LucideIcon;
  iconPosition?: "start" | "end";
  onClick?: () => void;
  to?: string;
  variant?: DocsButtonVariant;
};

const baseClassName =
  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-extrabold no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variantClassName: Record<DocsButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-teal-800",
  secondary:
    "border border-line bg-white text-ink-soft hover:border-brand-line hover:text-brand",
};

// 내부 라우트(to)·외부 링크(href)·동작(onClick)을 한 가지 모양으로 묶는 docs 전용 버튼입니다.
export function DocsButton({
  children,
  className,
  href,
  icon: Icon,
  iconPosition = "end",
  onClick,
  to,
  variant = "primary",
}: DocsButtonProps) {
  const classes = cn(baseClassName, variantClassName[variant], className);
  const icon = Icon ? <Icon aria-hidden="true" size={16} strokeWidth={2.4} /> : null;
  const content = (
    <>
      {iconPosition === "start" ? icon : null}
      {children}
      {iconPosition === "end" ? icon : null}
    </>
  );

  if (to) {
    return (
      <Link className={classes} to={to}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a className={classes} href={href} rel="noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <button className={classes} onClick={onClick} type="button">
      {content}
    </button>
  );
}
