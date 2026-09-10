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
  "VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...\n# 선택: 정확한 부모 origin을 쉼표로 구분\nVITE_EDITOR_PARENT_ORIGINS=https://service.example.com";

export function DocsAuthenticationPage() {
  return (
    <DocsArticle>
      <DocsHero
        title="경계 데이터·인증"
        eyebrow="에디터 운영 설정"
        description="부모 서비스 로그인과 경계 API 인증은 별개입니다. 아래 설정은 에디터를 직접 개발·배포할 때 필요합니다."
      />
      <DocsSection id="flow" title="경계를 선택할 때만 로그인">
        <DocsList>
          <DocsListItem>
            비로그인: 일반 편집·부모 데이터 수신·결과 반환을 허용하고, 경계 카탈로그와
            도형 API는 요청하지 않습니다.
          </DocsListItem>
          <DocsListItem>
            경계 선택: 로그인 안내를 표시합니다. 취소하면 이전 도구와 진행 중 편집을
            유지합니다.
          </DocsListItem>
          <DocsListItem>
            확인: 별도 Google 팝업에서 PKCE 인증을 진행합니다. 에디터 창은 이동하지 않아
            부모 연결·scene·편집 이력이 유지됩니다.
          </DocsListItem>
          <DocsListItem>
            로그아웃: 참고 경계를 숨기고 경계 조회를 중단합니다. 이미 scene에 채택한
            도형은 삭제하지 않습니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="configuration" title="환경 변수와 callback">
        <DocsCodeBlock
          code={configuration}
          language="bash"
          title=".env — 공개 빌드 설정"
        />
        <DocsText className="mt-4">
          변경한 환경 변수는 다시 빌드해야 반영됩니다. 로컬 개발 서버도 재시작하세요.
          Google Client Secret과 Supabase secret/service-role key는 프런트엔드나 VITE
          변수에 넣지 않습니다.
        </DocsText>
        <DocsTable
          label="인증 주소와 허용 목록"
          headers={["설정 위치", "등록할 값", "역할"]}
          rows={[
            {
              key: "google",
              cells: [
                "Google OAuth 클라이언트",
                <DocsCode key="google-callback">
                  https://&lt;project-ref&gt;.supabase.co/auth/v1/callback
                </DocsCode>,
                "Google에서 Supabase로 복귀",
              ],
            },
            {
              key: "supabase",
              cells: [
                "Supabase Auth Redirect URLs",
                <DocsCode key="editor-callback">
                  https://&lt;editor-domain&gt;/auth/callback
                </DocsCode>,
                "Supabase에서 에디터 인증 팝업으로 복귀",
              ],
            },
            {
              key: "edge",
              cells: [
                "regions 함수의 서버 허용 origin",
                <DocsCode key="editor-origin">https://&lt;editor-domain&gt;</DocsCode>,
                "경계 API를 호출하는 에디터 origin 허용",
              ],
            },
            {
              key: "parent",
              cells: [
                <DocsCode key="parent-setting">VITE_EDITOR_PARENT_ORIGINS</DocsCode>,
                <DocsCode key="parent-origin">https://&lt;parent-domain&gt;</DocsCode>,
                "INIT을 보낼 부모 서비스 허용",
              ],
            },
          ]}
        />
        <Callout
          className="mt-4"
          title="로컬·프리뷰 주소도 각각 등록합니다"
          tone="note"
        >
          <DocsCode>http://localhost:4174</DocsCode>와{" "}
          <DocsCode>http://127.0.0.1:4174</DocsCode>는 다른 origin입니다. 사용할
          origin은 함수 허용 목록에, 그 origin의 <DocsCode>/auth/callback</DocsCode>은
          Supabase 복귀 목록에 등록해야 합니다.
        </Callout>
      </DocsSection>
      <DocsSection id="security" title="서로 다른 두 접근 경계">
        <DocsTable
          label="부모 연결과 경계 API의 보안 경계"
          headers={["대상", "검사·소유권"]}
          rows={[
            {
              key: "host",
              cells: [
                "부모 ↔ 에디터",
                "opener·정확한 origin·메시지 구조를 검사합니다. SUBMIT/CANCEL은 sessionId를 확인합니다. 부모는 결과 저장 권한을 따로 검증합니다.",
              ],
            },
            {
              key: "api",
              cells: [
                "에디터 → regions 함수",
                "사용자 access token을 전달합니다. 서버가 JWT·Google 사용자·허용 origin·호출량을 검사합니다.",
              ],
            },
            {
              key: "database",
              cells: [
                "함수 → 데이터베이스",
                "서버 내부 권한으로 읽습니다. 브라우저의 테이블 SELECT·RPC 직접 호출은 허용하지 않습니다.",
              ],
            },
          ]}
        />
        <DocsList className="mt-4">
          <DocsListItem>
            부모 origin을 미설정하면 기본적으로 모든 HTTPS 부모와 로컬 동일 origin을
            허용합니다. 특정 서비스용 배포는 정확한 목록을 설정하세요.
          </DocsListItem>
          <DocsListItem>
            Origin/CORS는 사용자 인증을 대신하지 않습니다. 로그인 사용자가 자기 토큰을
            curl에 넣어 요청하는 것까지 차단하는 구조는 아닙니다.
          </DocsListItem>
          <DocsListItem>
            특정 Google 계정만 허용하려면 서버의{" "}
            <DocsCode>MAPS_EDITOR_ALLOWED_EMAILS</DocsCode> 또는{" "}
            <DocsCode>MAPS_EDITOR_ALLOWED_EMAIL_DOMAINS</DocsCode>를 설정합니다.
            미설정이면 유효한 Google 사용자를 허용합니다.
          </DocsListItem>
          <DocsListItem>
            부모 호스트에는 로그인 토큰을 보내지 않습니다. 브라우저에 공개되는
            publishable key만으로 경계 데이터를 읽을 수 없습니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="troubleshooting" title="문제 해결">
        <DocsTable
          label="인증·경계 조회 문제 해결"
          headers={["증상", "조치"]}
          rows={[
            {
              key: "blocked",
              cells: [
                "로그인 팝업 차단·수동 종료",
                "팝업을 허용한 뒤 에디터에서 로그인 취소 → 다시 시도합니다. 기존 편집 내용은 유지됩니다.",
              ],
            },
            {
              key: "callback",
              cells: [
                "로그인 후 돌아오지 않음",
                "Google/Supabase 복귀 주소를 구분해 확인합니다. 정적 배포에 auth/callback/index.html과 올바른 JS/CSS 경로가 있어야 합니다.",
              ],
            },
            {
              key: "401",
              cells: [
                "경계 요청 401",
                "세션이 없거나 유효하지 않습니다. 로그아웃 후 다시 로그인하고 올바른 Supabase 프로젝트인지 확인합니다.",
              ],
            },
            {
              key: "403",
              cells: [
                "경계 요청 403",
                "서버의 에디터 origin 허용 목록과 계정·이메일 도메인 제한을 확인합니다.",
              ],
            },
            {
              key: "429",
              cells: [
                "경계 요청 429",
                "사용자별 호출량 제한입니다. 잠시 기다린 뒤 재시도하고 과도한 반복 호출을 줄입니다.",
              ],
            },
          ]}
        />
        <DocsText className="mt-4">
          새 INIT·편집·도구 변경이 로그인 대기 중 발생하면 이전 경계 전환을 취소합니다.
          iframe의 저장소 분할 환경은 지원을 검증하지 않았습니다.
        </DocsText>
      </DocsSection>
    </DocsArticle>
  );
}
