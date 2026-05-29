import { Link } from "react-router";
import { plannedPages, stackItems } from "./docsContent";

const eyebrowClassName = "mb-2.5 mt-0 text-[13px] font-extrabold uppercase text-brand";
const leadClassName = "mt-[18px] max-w-[640px] text-lg leading-[1.7] text-ink-soft";
const sectionClassName = "grid gap-[22px] border-t border-line py-[34px]";
const sectionTitleClassName = "m-0 text-[28px] font-bold text-ink";
const itemTitleClassName = "mb-2 mt-0 text-base font-bold text-ink";
const itemDescriptionClassName = "m-0 leading-[1.6] text-ink-muted";

export function DocsPage() {
  return (
    <main className="mx-auto max-w-[1120px] px-6 pb-16 pt-10 max-[560px]:px-4 max-[560px]:pb-12 max-[560px]:pt-7">
      <section className="grid min-h-[360px] grid-cols-[minmax(0,1fr)_minmax(320px,420px)] items-center gap-8 selection:bg-teal-100 selection:text-teal-950 max-[900px]:min-h-0 max-[900px]:grid-cols-1">
        <div>
          <p className={eyebrowClassName}>Maps Editor</p>
          <h1 className="m-0 text-[clamp(40px,7vw,72px)] leading-[1.1] text-ink">
            지도 도형 편집기 설계 메모
          </h1>
          <p className={leadClassName}>
            OSM 기반 지도 위에서 polygon과 path를 편집하고, 외부 서비스와 postMessage로
            GeoJSON을 주고받는 정적 Vite 앱입니다.
          </p>
        </div>
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[#bdd6cd] bg-[#eef6f2] bg-[length:42px_42px] [background-image:linear-gradient(90deg,rgba(26,94,84,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(26,94,84,0.08)_1px,transparent_1px)] before:absolute before:left-[-8%] before:right-[-8%] before:top-[26%] before:h-[18px] before:rotate-[-7deg] before:bg-[#f6d58a] before:content-[''] after:absolute after:left-[-8%] after:right-[-8%] after:top-[70%] after:h-[14px] after:rotate-[11deg] after:bg-[#f6d58a] after:content-['']"
          role="img"
          aria-label="지도 편집기 미리보기"
        >
          <div className="absolute left-[12%] right-[14%] top-[52%] z-[2] rotate-[23deg] border-t-4 border-[#dc7a2a]" />
          <div className="absolute inset-[18%_12%_14%_12%] border-[3px] border-[#2563eb] bg-[#2563eb]/[0.14] [clip-path:polygon(22%_24%,74%_18%,86%_62%,46%_82%,18%_58%)]" />
          <span className="absolute left-[25%] top-[35%] z-[3] h-[18px] w-[18px] rounded-full border-[3px] border-white bg-ink" />
          <span className="absolute bottom-[24%] right-[26%] z-[3] h-[18px] w-[18px] rounded-full border-[3px] border-white bg-ink" />
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <p className={eyebrowClassName}>Stack</p>
          <h2 className={sectionTitleClassName}>결정된 라이브러리</h2>
        </div>
        <div className="grid grid-cols-4 gap-3.5 max-[900px]:grid-cols-1">
          {stackItems.map((item) => (
            <article
              className="rounded-lg border border-line bg-white p-[18px]"
              key={item.name}
            >
              <h3 className={itemTitleClassName}>{item.name}</h3>
              <p className={itemDescriptionClassName}>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <p className={eyebrowClassName}>Pages</p>
          <h2 className={sectionTitleClassName}>예정된 페이지</h2>
        </div>
        <div className="grid gap-2.5">
          {plannedPages.map((page) => (
            <Link
              className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-[18px] rounded-lg border border-line bg-white px-[18px] py-4 no-underline transition-[border-color,transform] duration-150 ease-in-out hover:-translate-y-px hover:border-brand-line max-[560px]:grid-cols-1"
              key={page.path}
              to={page.path}
            >
              <code className="font-extrabold text-brand">{page.path}</code>
              <div>
                <h3 className={itemTitleClassName}>{page.title}</h3>
                <p className={itemDescriptionClassName}>{page.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
