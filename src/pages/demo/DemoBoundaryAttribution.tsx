import { useContext } from "react";
import { LocaleContext } from "@/shared/i18n/localeContext";

export function DemoBoundaryAttribution() {
  const locale = useContext(LocaleContext) ?? "ko";
  const linkStyle = "underline underline-offset-2 hover:text-ink";
  return (
    <p className="mb-0 mt-3 text-xs leading-5 text-ink-soft">
      {locale === "ko" ? (
        <>
          서울 행정동 8곳을 단순화한 편집용 샘플입니다. 원자료:{" "}
          <a className={linkStyle} href="https://sgis.kostat.go.kr">
            통계청 SGIS
          </a>{" "}
          (공공누리 제1유형), 가공:{" "}
          <a className={linkStyle} href="https://github.com/vuski/admdongkor">
            vuski/admdongkor
          </a>{" "}
          (
          <a className={linkStyle} href="https://creativecommons.org/licenses/by/4.0/">
            CC BY 4.0
          </a>
          ).
        </>
      ) : (
        <>
          Simplified samples of eight NYC neighborhood statistical areas (2020 NTAs).
          Source:{" "}
          <a className={linkStyle} href="https://data.cityofnewyork.us/d/9nt8-h7nd">
            NYC Department of City Planning
          </a>
          .
        </>
      )}
    </p>
  );
}
