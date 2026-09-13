import { cn } from "@/shared/utils/cn";

type TermiaLogoProps = {
  className?: string;
  inverse?: boolean;
};

export function TermiaLogo({ className, inverse = false }: TermiaLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5", className)}>
      <img
        alt=""
        className="termia-symbol h-10 w-10 object-contain"
        height={40}
        src="/brand/termia-symbol.png"
        width={40}
      />
      <img
        alt="Termia"
        className={cn("termia-wordmark h-6 w-auto", inverse && "brightness-0 invert")}
        height={318}
        src="/brand/termia-wordmark.svg"
        width={1267}
      />
    </span>
  );
}
