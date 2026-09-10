import { Check, Copy } from "lucide-react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";

type DocsCodeBlockProps = {
  className?: string;
  code: string;
  language: Language;
  showLineNumbers?: boolean;
  title?: string;
};

const COPY_FEEDBACK_DURATION_MS = 1_500;

function withStableContentKeys<T>(
  items: readonly T[],
  getContent: (item: T) => string,
): Array<{ item: T; key: string }> {
  const occurrences = new Map<string, number>();

  return items.map((item) => {
    const content = getContent(item);
    const occurrence = (occurrences.get(content) ?? 0) + 1;
    occurrences.set(content, occurrence);
    return { item, key: `${content}\u0000${occurrence}` };
  });
}

// 문서의 실행 예제를 위한 공용 코드 블록입니다. Prism 토큰 색상, 줄 번호,
// 가로 스크롤과 복사 액션을 한곳에서 제공해 문서 페이지에는 코드 문자열만 남깁니다.
export function DocsCodeBlock({
  className,
  code,
  language,
  showLineNumbers = true,
  title,
}: DocsCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);
  const normalizedCode = code.trim();

  useEffect(
    () => () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    },
    [],
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopied(true);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = window.setTimeout(
        () => setCopied(false),
        COPY_FEEDBACK_DURATION_MS,
      );
    } catch {
      setCopied(false);
    }
  };

  return (
    <figure
      className={cn(
        "m-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-[0_18px_38px_-26px_rgba(15,23,42,0.85)]",
        className,
      )}
    >
      <figcaption className="flex min-h-11 items-center justify-between gap-4 border-b border-slate-800 px-4 py-2 text-xs font-extrabold text-slate-300">
        <span>{title ?? language.toUpperCase()}</span>
        <button
          aria-label={copied ? "코드 복사 완료" : "코드 복사"}
          className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          onClick={() => void copyCode()}
          type="button"
        >
          {copied ? (
            <Check aria-hidden="true" size={14} strokeWidth={2.4} />
          ) : (
            <Copy aria-hidden="true" size={14} strokeWidth={2.4} />
          )}
          {copied ? "복사됨" : "복사"}
        </button>
      </figcaption>

      <Highlight code={normalizedCode} language={language} theme={themes.nightOwl}>
        {({
          className: highlightClassName,
          getLineProps,
          getTokenProps,
          style,
          tokens,
        }) => (
          <pre
            className={cn(
              highlightClassName,
              "m-0 max-h-[32rem] overflow-auto p-4 text-sm leading-6",
            )}
            style={{ ...style, background: "transparent" }}
          >
            <code>
              {withStableContentKeys(tokens, (line) =>
                line.map((token) => token.content).join(""),
              ).map(({ item: line, key: lineKey }, lineIndex) => {
                const lineProps = getLineProps({ line });

                return (
                  <span
                    {...lineProps}
                    className={cn(
                      lineProps.className,
                      "table min-h-6 w-full table-fixed",
                    )}
                    key={lineKey}
                  >
                    {showLineNumbers ? (
                      <span
                        aria-hidden="true"
                        className="table-cell w-9 select-none pr-4 text-right text-slate-600"
                      >
                        {lineIndex + 1}
                      </span>
                    ) : null}
                    <span className="table-cell whitespace-pre">
                      {withStableContentKeys(
                        line,
                        (token) => `${token.types.join(".")}:${token.content}`,
                      ).map(({ item: token, key: tokenKey }) => (
                        <span key={tokenKey} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </span>
                );
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </figure>
  );
}
