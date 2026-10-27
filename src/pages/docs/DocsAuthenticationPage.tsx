import { useT } from "@/shared/i18n/useT";
import { LocalizedLink as Link } from "@/shared/i18n/LocalizedLink";
import {
  Callout,
  DocsArticle,
  DocsCode,
  DocsCodeBlock,
  DocsHero,
  DocsList,
  DocsListItem,
  DocsSection,
  DocsText,
} from "./components";
import { DocsTable } from "./components/DocsTable";

const configuration =
  "VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...\n# 선택: 정확한 서비스 페이지의 사이트 주소(origin)를 쉼표로 구분\nVITE_EDITOR_PARENT_ORIGINS=https://service.example.com";

export function DocsAuthenticationPage() {
  const t = useT();
  return (
    <DocsArticle>
      <DocsHero
        title={t("Google·Supabase 구성 (선택)")}
        eyebrow={t("직접 운영 안내 · 기본 공급자")}
        description={t(
          "현재 공개 서비스와 같은 Google 로그인·Supabase 경계 서버 구성을 유지할 때 사용하는 운영 안내입니다. 서비스 페이지에 Termia 편집기를 연결하는 개발자나 다른 데이터 공급자를 선택한 편집기 운영자에게는 필요하지 않습니다.",
        )}
      />
      <Callout tone="note" title={t("모든 배포의 필수 설정이 아닙니다")}>
        {t("자체 JSON이나 별도 서버를 사용하고 로그인 정책을 직접 정하려면")}{" "}
        <Link to="/self-hosting/boundaries">{t("경계 데이터 어댑터")}</Link>
        {t(
          "를 따르세요. 아래 Google 사용자·JWT·callback 정책은 기본 Supabase 공급자에만 해당합니다.",
        )}
      </Callout>
      <DocsSection id="flow" title={t("경계를 선택할 때만 로그인")}>
        <DocsList>
          <DocsListItem>
            {t(
              "비로그인: 일반 편집·서비스 페이지 데이터 수신·결과 반환을 허용하고, 경계 카탈로그와 도형 API는 요청하지 않습니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "경계 선택: 로그인 안내를 표시합니다. 취소하면 이전 도구와 진행 중 편집을 유지합니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "확인: 별도 Google 로그인 창에서 PKCE 인증을 진행합니다. 편집 창은 이동하지 않아 서비스 페이지와의 연결·편집 데이터·편집 이력이 유지됩니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "로그아웃: 참고 경계를 숨기고 경계 조회를 중단합니다. 이미 편집 데이터에 추가한 도형은 삭제하지 않습니다.",
            )}
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="configuration" title={t("환경 변수와 callback")}>
        <DocsCodeBlock
          translateExample
          code={configuration}
          language="bash"
          title={t(".env — 공개 빌드 설정")}
        />
        <DocsText className="mt-4">
          {t(
            "변경한 환경 변수는 다시 빌드해야 반영됩니다. 로컬 개발 서버도 재시작하세요. Google Client Secret과 Supabase secret/service-role key는 프런트엔드나 VITE 변수에 넣지 않습니다.",
          )}
        </DocsText>
        <DocsTable
          label={t("인증 주소와 허용 목록")}
          headers={[t("설정 위치"), t("등록할 값"), t("역할")]}
          rows={[
            {
              key: "google",
              cells: [
                t("Google OAuth 클라이언트"),
                <DocsCode key="google-callback">
                  https://&lt;project-ref&gt;.supabase.co/auth/v1/callback
                </DocsCode>,
                t("Google에서 Supabase로 복귀"),
              ],
            },
            {
              key: "supabase",
              cells: [
                "Supabase Auth Redirect URLs",
                <DocsCode key="editor-callback">
                  https://&lt;editor-domain&gt;/auth/callback
                </DocsCode>,
                t("Supabase에서 편집기의 로그인 창으로 복귀"),
              ],
            },
            {
              key: "edge",
              cells: [
                t("regions 함수의 서버 허용 origin"),
                <DocsCode key="editor-origin">https://&lt;editor-domain&gt;</DocsCode>,
                t("경계 API를 호출하는 편집기의 사이트 주소 허용"),
              ],
            },
            {
              key: "parent",
              cells: [
                <DocsCode key="parent-setting">VITE_EDITOR_PARENT_ORIGINS</DocsCode>,
                <DocsCode key="parent-origin">https://&lt;service-domain&gt;</DocsCode>,
                t("편집 시작 데이터를 보낼 서비스 페이지 허용"),
              ],
            },
          ]}
        />
        <Callout
          className="mt-4"
          title={t("편집기의 로컬·프리뷰 주소도 각각 등록합니다")}
          tone="note"
        >
          <DocsCode>http://localhost:4174</DocsCode>
          {t("와")} <DocsCode>http://127.0.0.1:4174</DocsCode>
          {t(
            "는 다른 사이트 주소(origin)입니다. 사용할 편집기의 사이트 주소는 함수 허용 목록에, 해당 편집기의",
          )}{" "}
          <DocsCode>/auth/callback</DocsCode>
          {t(
            "은 Supabase 복귀 목록에 등록해야 합니다. 편집 창을 여는 서비스 페이지 주소를 이 두 목록에 등록하는 것이 아닙니다.",
          )}
        </Callout>
      </DocsSection>
      <DocsSection id="security" title={t("서로 다른 두 접근 경계")}>
        <DocsTable
          label={t("서비스 페이지 연결과 경계 API의 보안 경계")}
          headers={[t("대상"), t("검사·소유권")]}
          rows={[
            {
              key: "host",
              cells: [
                t("서비스 페이지 ↔ 편집 창"),
                t(
                  "창 연결(opener)·사이트 주소(origin)·메시지 구조를 검사합니다. 완료·취소 알림은 편집 작업 ID(sessionId)를 확인합니다. 서비스는 서버 저장 권한을 따로 검증합니다.",
                ),
              ],
            },
            {
              key: "api",
              cells: [
                t("편집 창 → regions 함수"),
                t(
                  "사용자 access token을 전달합니다. 서버가 JWT·Google 사용자·허용 origin·호출량을 검사합니다.",
                ),
              ],
            },
            {
              key: "database",
              cells: [
                t("함수 → 데이터베이스"),
                t(
                  "서버 내부 권한으로 읽습니다. 브라우저의 테이블 SELECT·RPC 직접 호출은 허용하지 않습니다.",
                ),
              ],
            },
          ]}
        />
        <DocsList className="mt-4">
          <DocsListItem>
            {t(
              "허용 목록을 설정하지 않으면 HTTPS 사이트는 도메인 등록 없이 연동할 수 있습니다. HTTP 사이트는 편집기와 프로토콜·도메인·포트가 같을 때 기본 허용됩니다. 다른 HTTP 주소도 허용하거나 특정 사이트로 제한하려면 정확한 사이트 주소(origin) 목록을 설정하세요.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "Origin/CORS는 사용자 인증을 대신하지 않습니다. 로그인 사용자가 자기 토큰을 curl에 넣어 요청하는 것까지 차단하는 구조는 아닙니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t("특정 Google 계정만 허용하려면 서버의")}{" "}
            <DocsCode>MAPS_EDITOR_ALLOWED_EMAILS</DocsCode> {t("또는")}{" "}
            <DocsCode>MAPS_EDITOR_ALLOWED_EMAIL_DOMAINS</DocsCode>
            {t("를 설정합니다. 미설정이면 유효한 Google 사용자를 허용합니다.")}
          </DocsListItem>
          <DocsListItem>
            {t(
              "서비스 페이지에는 로그인 토큰을 보내지 않습니다. 브라우저에 공개되는 publishable key만으로 경계 데이터를 읽을 수 없습니다.",
            )}
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="troubleshooting" title={t("문제 해결")}>
        <DocsTable
          label={t("인증·경계 조회 문제 해결")}
          headers={[t("증상"), t("조치")]}
          rows={[
            {
              key: "blocked",
              cells: [
                t("로그인 팝업 차단·수동 종료"),
                t(
                  "팝업을 허용한 뒤 편집 창에서 로그인 취소 → 다시 시도합니다. 기존 편집 내용은 유지됩니다.",
                ),
              ],
            },
            {
              key: "callback",
              cells: [
                t("로그인 후 돌아오지 않음"),
                t(
                  "Google/Supabase 복귀 주소를 구분해 확인합니다. 정적 배포에 auth/callback/index.html과 올바른 JS/CSS 경로가 있어야 합니다.",
                ),
              ],
            },
            {
              key: "401",
              cells: [
                t("경계 요청 401"),
                t(
                  "로그인 세션이 없거나 유효하지 않습니다. 로그아웃 후 다시 로그인하고 올바른 Supabase 프로젝트인지 확인합니다.",
                ),
              ],
            },
            {
              key: "403",
              cells: [
                t("경계 요청 403"),
                t(
                  "서버의 편집기 사이트 주소(origin) 허용 목록과 계정·이메일 도메인 제한을 확인합니다.",
                ),
              ],
            },
            {
              key: "429",
              cells: [
                t("경계 요청 429"),
                t(
                  "사용자별 호출량 제한입니다. 잠시 기다린 뒤 재시도하고 과도한 반복 호출을 줄입니다.",
                ),
              ],
            },
          ]}
        />
        <DocsText className="mt-4">
          {t(
            "새 편집 시작 데이터 수신·편집·도구 변경이 로그인 대기 중 발생하면 이전 경계 전환을 취소합니다. iframe의 저장소 분할 환경은 지원을 검증하지 않았습니다.",
          )}
        </DocsText>
      </DocsSection>
    </DocsArticle>
  );
}
