import { Cable, Download, Layers2, Pentagon, PencilRuler } from "lucide-react";
import { useEffect } from "react";
import { TermiaLogo } from "@/shared/branding/TermiaLogo";
import { AppFooter } from "@/shared/layout/AppFooter";
import { AppNavigation } from "@/shared/navigation/AppNavigation";
import "./about.css";

const capabilities = [
  {
    icon: PencilRuler,
    label: "DRAW",
    title: "필요한 경계를 그리다",
    description:
      "지도 위에 직접 도형을 그리거나 기존 경계를 선택하세요. 정점과 반경을 조절해 원하는 영역을 구체화합니다.",
  },
  {
    icon: Layers2,
    label: "COMBINE",
    title: "흩어진 영역을 하나로",
    description:
      "여러 도형을 합치고, 불필요한 부분을 빼고, 겹치는 영역을 남깁니다. 목적에 맞는 권역을 만들어갑니다.",
  },
  {
    icon: Cable,
    label: "INTEGRATE",
    title: "쓰고 있는 지도에 연결하다",
    description:
      "기존 서비스에서 편집기를 열고, 완성한 도형을 다시 돌려받으세요. 익숙한 지도 위에서 작업을 이어갑니다.",
  },
];

const palette = [
  { name: "Mint", color: "#18DDB1", meaning: "가능성의 시작" },
  { name: "Cyan", color: "#23B8DC", meaning: "공간의 연결" },
  { name: "Blue", color: "#3D67F5", meaning: "명확한 경계" },
  { name: "Ink", color: "#111B29", meaning: "단단한 기준" },
];

export function AboutPage() {
  useEffect(() => {
    document.title = "Termia 소개 · 경계를 그리고, 공간에 가치를 더하다";
  }, []);

  return (
    <div className="termia-about">
      <AppNavigation />
      <a className="termia-skip-link" href="#about-content">
        본문으로 건너뛰기
      </a>
      <main id="about-content" tabIndex={-1}>
        <section aria-labelledby="about-title" className="termia-hero">
          <div className="termia-container termia-hero-grid">
            <div>
              <p className="termia-eyebrow">ABOUT TERMIA</p>
              <h1 id="about-title">
                경계를 그리고,
                <br />
                공간에 <span className="termia-hero-accent">가치를 더하다.</span>
              </h1>
              <p className="termia-hero-description">
                지도 위의 영역을 더 쉽게, 더 정확하게.
                <br />
                Termia는 필요한 권역을 직접 만들고 다듬는 공간 편집 도구입니다.
              </p>
              <p className="termia-tagline">DEFINE YOUR TERRITORY</p>
            </div>
            <figure className="termia-hero-mark">
              <img
                alt="지도와 공간을 접은 T에 경계선과 편집점을 담은 Termia 심볼"
                height={1024}
                src="/brand/termia-symbol.png"
                width={1024}
              />
              <figcaption>작은 점에서 시작되는 새로운 영역.</figcaption>
            </figure>
          </div>
        </section>

        <section
          aria-labelledby="termia-story-title"
          className="termia-container termia-story"
        >
          <div>
            <p className="termia-eyebrow">THE NAME</p>
            <h2 id="termia-story-title">
              경계에서 시작한 이름,
              <br />
              Termia.
            </h2>
          </div>
          <div className="termia-story-copy">
            <p>
              Termia(테르미아)는 로마 신화에서 경계석을 지키는 신,
              <strong> 테르미누스(Terminus)</strong>에서 착안한 이름입니다. 경계를
              표시하던 작은 돌처럼, 지도 위에 명확한 기준을 세운다는 뜻을 담았습니다.
            </p>
            <p>
              점을 잇고 면을 다듬어, 나에게 필요한 공간으로. Termia는 그 과정이
              누구에게나 쉽고 자연스러워지기를 바랍니다.
            </p>
            <a href="https://academic.oup.com/edited-volume/61673/chapter-abstract/548207236">
              이름의 모티프 · Oxford Classical Dictionary
            </a>
          </div>
        </section>

        <section
          aria-label="Termia가 공간을 다루는 방법"
          className="termia-container termia-capabilities"
        >
          {capabilities.map(({ icon: Icon, label, title, description }) => (
            <article className="termia-capability" key={label}>
              <Icon aria-hidden="true" size={30} strokeWidth={1.5} />
              <p className="termia-eyebrow">{label}</p>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>

        <section aria-labelledby="identity-title" className="termia-identity">
          <div className="termia-container">
            <div className="termia-section-heading">
              <div>
                <p className="termia-eyebrow">OUR IDENTITY</p>
                <h2 id="identity-title">공간을 담은 T, 가능성을 잇는 점.</h2>
              </div>
              <p>지도와 경계, 편집의 순간을 하나의 심볼에 담았습니다.</p>
            </div>

            <div className="termia-logo-grid">
              <figure className="termia-logo-primary">
                <span className="termia-spec-label">PRIMARY LOGO</span>
                <img
                  alt="청록·파랑 심볼과 짙은 남색 Termia 워드마크"
                  height={512}
                  loading="lazy"
                  src="/brand/termia-logo.png"
                  width={1536}
                />
                <figcaption>Termia · Define your territory</figcaption>
              </figure>
              <figure className="termia-logo-dark">
                <span className="termia-spec-label">ON DARK</span>
                <TermiaLogo className="termia-display-logo" inverse />
                <figcaption>선명한 색, 또렷한 이름.</figcaption>
              </figure>
            </div>

            <div className="termia-symbol-story">
              <div>
                <span aria-hidden="true" className="termia-letter-icon">
                  T
                </span>
                <p>
                  <strong>Termia의 T</strong>이름의 첫 글자를 담은 형태
                </p>
              </div>
              <div>
                <Layers2 aria-hidden="true" size={28} strokeWidth={1.5} />
                <p>
                  <strong>지도와 공간</strong>겹치고 이어지는 면
                </p>
              </div>
              <div>
                <Pentagon aria-hidden="true" size={28} strokeWidth={1.5} />
                <p>
                  <strong>경계와 편집점</strong>새로운 영역을 만드는 연결
                </p>
              </div>
            </div>

            <section aria-label="브랜드 색상" className="termia-palette">
              {palette.map(({ name, color, meaning }) => (
                <div className="termia-color" key={name}>
                  <div
                    className="termia-color-swatch"
                    style={{ backgroundColor: color }}
                  />
                  <div className="termia-color-label">
                    <strong>{name}</strong>
                    <span>{color}</span>
                  </div>
                  <p>{meaning}</p>
                </div>
              ))}
            </section>
          </div>
        </section>

        <section
          aria-labelledby="brand-assets-title"
          className="termia-container termia-downloads"
        >
          <div>
            <p className="termia-eyebrow">BRAND ASSETS</p>
            <h2 id="brand-assets-title">Termia를 소개할 때.</h2>
            <p>
              투명 배경의 로고·심볼과 벡터 워드마크를 사용하세요. 원래의 비율과 색상을
              유지하고, 주변에 충분한 여백을 남겨주세요.
            </p>
          </div>
          <div className="termia-download-actions">
            <a
              className="termia-download-link"
              download="termia-logo.png"
              href="/brand/termia-logo.png"
            >
              <Download aria-hidden="true" size={18} />
              로고 PNG
            </a>
            <a
              className="termia-download-link"
              download="termia-symbol.png"
              href="/brand/termia-symbol.png"
            >
              <Download aria-hidden="true" size={18} />
              심볼 PNG
            </a>
            <a
              className="termia-download-link"
              download="termia-wordmark.svg"
              href="/brand/termia-wordmark.svg"
            >
              <Download aria-hidden="true" size={18} />
              워드마크 SVG
            </a>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
