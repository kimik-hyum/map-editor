import { Link } from "react-router";
import { plannedPages, stackItems } from "./docsContent";

export function DocsPage() {
  return (
    <main className="docs-page">
      <section className="docs-hero selection:bg-teal-100 selection:text-teal-950">
        <div>
          <p className="eyebrow">Maps Editor</p>
          <h1>지도 도형 편집기 설계 메모</h1>
          <p className="lead">
            OSM 기반 지도 위에서 polygon과 path를 편집하고, 외부 서비스와 postMessage로
            GeoJSON을 주고받는 정적 Vite 앱입니다.
          </p>
        </div>
        <div className="map-preview" role="img" aria-label="지도 편집기 미리보기">
          <div className="route-line" />
          <div className="polygon-shape" />
          <span className="pin pin-a" />
          <span className="pin pin-b" />
        </div>
      </section>

      <section className="docs-section">
        <div className="section-heading">
          <p className="eyebrow">Stack</p>
          <h2>결정된 라이브러리</h2>
        </div>
        <div className="info-grid">
          {stackItems.map((item) => (
            <article className="info-card" key={item.name}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-section">
        <div className="section-heading">
          <p className="eyebrow">Pages</p>
          <h2>예정된 페이지</h2>
        </div>
        <div className="page-list">
          {plannedPages.map((page) => (
            <Link className="page-row" key={page.path} to={page.path}>
              <code>{page.path}</code>
              <div>
                <h3>{page.title}</h3>
                <p>{page.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
