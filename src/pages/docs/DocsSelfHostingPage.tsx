import { Link } from "react-router";
import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsCode,
  DocsCodeBlock,
  DocsHero,
  DocsList,
  DocsListItem,
  DocsSection,
  DocsText,
} from "./components";
import { DocsTable } from "./components/DocsTable";

export function DocsSelfHostingPage() {
  return (
    <DocsArticle>
      <DocsHero
        title="직접 운영·커스텀"
        eyebrow="내재화 안내"
        description="저장소를 가져와 에디터를 직접 운영하는 분을 위한 안내입니다. 공통 입출력 계약 위에 자신의 경계 데이터, 인증, 화면과 배포 환경을 연결합니다."
      />
      <Callout tone="note" title="경계 데이터와 인증은 운영 환경에 맞게 선택합니다">
        Google·Supabase는 현재 공개 서비스가 사용하는 구성입니다. 자체 JSON 파일이나
        별도 API를 연결할 수 있으며, 공개 데이터만 사용하는 배포에는 로그인이 필요하지
        않습니다. 아래 교체 지점을 자신의 소스에 적용하세요.
      </Callout>
      <DocsSection id="shared" title="사용·연동 안내는 공통입니다">
        <DocsText>
          직접 배포해도 서비스 페이지가 데이터를 보내고 결과를 받는 방식은 같습니다.
          에디터 주소를 자신의 주소로 바꾸고 같은 v2 계약을 유지하면 기존 연동을
          재사용할 수 있습니다.
        </DocsText>
        <div className="mt-4 flex flex-wrap gap-3">
          <DocsButton to="/integration">연동 인터페이스</DocsButton>
          <DocsButton to="/editing" variant="secondary">
            편집 도구 안내
          </DocsButton>
        </div>
      </DocsSection>
      <DocsSection id="run" title="소스를 가져와 로컬에서 실행하기">
        <DocsText className="mb-4">
          저장소를 복제한 폴더에서 Node.js 22 이상과 npm을 사용합니다.
        </DocsText>
        <DocsCodeBlock
          code={"npm ci\nnpm run dev -- --port 4174"}
          language="bash"
          title="터미널"
        />
        <DocsText className="mt-4">
          <DocsCode>http://localhost:4174/demo</DocsCode>에서 편집 창을 열어
          입력·편집·결과 수신을 확인하세요. 문서와 직접 그리기는 환경 변수 없이 실행할
          수 있습니다. 경계 선택에는 다음 단계에서 데이터 공급자와 접근 정책을
          연결합니다.
        </DocsText>
      </DocsSection>
      <DocsSection id="architecture" title="변경하려는 기능의 연결 지점">
        <DocsTable
          label="커스텀 위치"
          headers={["바꾸려는 것", "소스 위치", "유지할 계약"]}
          rows={[
            {
              key: "data",
              cells: [
                "JSON·자체 서버의 경계 데이터",
                "src/pages/editor/features/regions/api/regionsApi.ts",
                "종류·표시용 도형·원본 도형 조회",
              ],
            },
            {
              key: "auth",
              cells: [
                "로그인 없이 사용·사내 인증",
                "src/features/auth/hooks/useBoundaryAccess.ts · features/regions/hooks/useBoundaryLogin.ts",
                "allowed·subject, 접근 요청 결과",
              ],
            },
            {
              key: "theme",
              cells: [
                "도형·경계 색상",
                "src/pages/editor/theme/editorTheme.ts",
                "의미 기반 테마 토큰",
              ],
            },
            {
              key: "map",
              cells: [
                "배경지도·지도 렌더링",
                "src/pages/editor/adapters/openlayers/",
                "지도 객체와 도메인 상태 분리",
              ],
            },
            {
              key: "tools",
              cells: [
                "패널·도구·편집 동작",
                "src/pages/editor/features/ · state/editorStore.ts",
                "도메인 변경과 undo/redo 일관성",
              ],
            },
            {
              key: "messaging",
              cells: [
                "서비스와의 입출력",
                "src/pages/editor/messaging/",
                "공개 v2 scene과 세션 검증",
              ],
            },
          ]}
        />
        <DocsText className="mt-4">
          경계 데이터 어댑터는 JSON·HTTP 응답을 에디터의 데이터 형식으로 바꿉니다.
          OpenLayers 어댑터는 이 데이터를 지도 객체로 바꿉니다. 데이터 공급자를 교체할
          때 지도 렌더링이나 도형 편집 로직에 서버 코드를 넣지 않습니다.
        </DocsText>
        <DocsText className="mt-4">
          현재는 조회 함수가 <DocsCode>regionsApi.ts</DocsCode>에 모여 있고 Google 접근
          정책이 별도로 연결되어 있습니다. 공급자를 설정 한 줄로 바꾸는 등록 API는 아직
          없습니다. <Link to="/self-hosting/boundaries">경계 데이터 어댑터</Link>에서
          현재 소스에 적용할 연결 방법을 확인하세요.
        </DocsText>
      </DocsSection>
      <DocsSection id="deployment" title="자신의 환경으로 배포하기">
        <DocsList>
          <DocsListItem>
            자체 JSON·별도 API: 데이터 어댑터와 인증 정책을 바꾼 다음{" "}
            <DocsCode>npm run verify</DocsCode>, <DocsCode>npm run build</DocsCode>로
            검사하고 <DocsCode>dist/</DocsCode>를 자신의 정적 호스팅에 배포합니다.
          </DocsListItem>
          <DocsListItem>
            원래 Google·Supabase 구성을 유지할 때:{" "}
            <Link to="/authentication">선택 구성 안내</Link>에 따라 프로젝트·공개
            키·callback을 연결합니다. 경계 서버 함수와 적재 데이터는 이 저장소에
            포함되어 있지 않습니다.
          </DocsListItem>
          <DocsListItem>
            기본 <DocsCode>deploy:production</DocsCode> 명령과 GitHub Actions는 원래
            운영 서비스의 Google·Supabase 설정과 Cloudflare 프로젝트를 전제로 합니다.
            내재화한 배포에서는 환경 검사·배포 대상·인증 smoke test를 자신의 정책에 맞게
            수정하세요.
          </DocsListItem>
          <DocsListItem>
            HTTP·로컬의 다른 origin을 허용하거나 연결 서비스를 한정하려면{" "}
            <DocsCode>VITE_EDITOR_PARENT_ORIGINS</DocsCode>에 정확한 서비스 origin을
            쉼표로 구분합니다. 이 값은 경계 API의 인증과 별개입니다.
          </DocsListItem>
        </DocsList>
        <Callout className="mt-4" tone="note" title="운영 방식을 바꿔도 유지할 것">
          서비스 연결의 source·origin·sessionId 검증, 외부 geometry 검증, 원본 도형의
          안정적인 ID, 편집 결과와 참고 데이터의 분리를 유지하세요.
        </Callout>
      </DocsSection>
    </DocsArticle>
  );
}
